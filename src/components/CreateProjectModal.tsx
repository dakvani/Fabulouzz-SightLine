import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, UserPlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SAUDI_CITIES } from "@/data/saudiCities";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateProjectModal = ({ isOpen, onClose, onCreated }: CreateProjectModalProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    project_ref: "",
    project_manager: "",
    reporting_to: "",
    project_engineer: "",
    location: "",
    company: "",
    start_date: "",
    end_date: "",
  });
  const [contacts, setContacts] = useState({
    client_contact_person: "",
    client_contact_phone: "",
    contractor_contact_person: "",
    contractor_contact_phone: "",
  });

  // Member assignment
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      supabase.from("profiles").select("id, email, full_name").then(({ data }) => {
        setAllUsers(data || []);
        setLoadingUsers(false);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Project title is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      // Use client contact person as fallback for reporting_to if empty
      const payload = {
        ...form,
        reporting_to: form.reporting_to.trim() || contacts.client_contact_person.trim(),
        created_by: userId || null,
      };

      const { data: project, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Save client and contractor contact persons and direct numbers
      if (project && typeof window !== "undefined") {
        localStorage.setItem(
          `sightline_project_contacts_${project.id}`,
          JSON.stringify({
            clientContactPerson: contacts.client_contact_person.trim() || form.reporting_to.trim(),
            clientContactPhone: contacts.client_contact_phone.trim(),
            contractorContactPerson: contacts.contractor_contact_person.trim() || form.project_manager.trim(),
            contractorContactPhone: contacts.contractor_contact_phone.trim(),
          })
        );
      }

      // Add selected members
      if (selectedMembers.length > 0 && project) {
        const memberRows = selectedMembers.map((uid) => ({
          project_id: project.id,
          user_id: uid,
        }));
        await supabase.from("project_members").insert(memberRows);
      }

      // Also add the creator as a member
      if (userId && project) {
        await supabase.from("project_members").insert({
          project_id: project.id,
          user_id: userId,
        }).select(); // ignore duplicate error
      }

      toast({ title: "Project created successfully with contact directory!" });
      setForm({ title: "", client_name: "", project_ref: "", project_manager: "", reporting_to: "", project_engineer: "", location: "", company: "", start_date: "", end_date: "" });
      setContacts({ client_contact_person: "", client_contact_phone: "", contractor_contact_person: "", contractor_contact_phone: "" });
      setSelectedMembers([]);
      onCreated();
      onClose();
    } catch (err: any) {
      toast({ title: "Error creating project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  if (!isOpen) return null;

  const fields = [
    { key: "title", label: "Project Title", required: true },
    { key: "client_name", label: "Client Name" },
    { key: "project_ref", label: "Project Reference" },
    { key: "project_manager", label: "Project Manager" },
    { key: "reporting_to", label: "Reporting To" },
    { key: "project_engineer", label: "Project Engineer" },
    { key: "location", label: "Location" },
    { key: "company", label: "Company" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "end_date", label: "End Date", type: "date" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card border border-border/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-border/30">
            <h2 className="text-lg font-bold text-foreground">Create New Project</h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Project Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className={f.key === "title" ? "sm:col-span-2" : ""}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </label>
                  <input
                    type={f.type || "text"}
                    list={f.key === "location" ? "create-saudi-cities" : undefined}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    required={f.required}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={f.label}
                  />
                  {f.key === "location" && (
                    <datalist id="create-saudi-cities">
                      {SAUDI_CITIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.arabicName} — {c.region}
                        </option>
                      ))}
                    </datalist>
                  )}
                </div>
              ))}
            </div>

            {/* Key Contact Persons & Direct Numbers */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Key Contact Persons & Direct Phone Numbers
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Synced to Dashboard & Executive PDF</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Client Contact Person
                  </label>
                  <input
                    type="text"
                    value={contacts.client_contact_person}
                    onChange={(e) => setContacts((prev) => ({ ...prev, client_contact_person: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary/60 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Mohammed Burhan"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Client Contact Number
                  </label>
                  <input
                    type="tel"
                    value={contacts.client_contact_phone}
                    onChange={(e) => setContacts((prev) => ({ ...prev, client_contact_phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary/60 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. +966 50 123 4567"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Contractor Contact Person (Company doing the job)
                  </label>
                  <input
                    type="text"
                    value={contacts.contractor_contact_person}
                    onChange={(e) => setContacts((prev) => ({ ...prev, contractor_contact_person: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary/60 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Riyaz Siraj"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Contractor Contact Number
                  </label>
                  <input
                    type="tel"
                    value={contacts.contractor_contact_phone}
                    onChange={(e) => setContacts((prev) => ({ ...prev, contractor_contact_phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary/60 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. +966 54 987 6543"
                  />
                </div>
              </div>
            </div>

            {/* Assign Members */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Assign Members
              </label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading users...
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto border border-border/30 rounded-lg p-2">
                  {allUsers.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                        selectedMembers.includes(u.id)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-secondary/50 text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                        className="rounded border-border/50 text-primary focus:ring-primary/50"
                      />
                      <span className="font-medium">{u.full_name || u.email}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{u.email}</span>
                    </label>
                  ))}
                  {allUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">No users found</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-primary-foreground disabled:opacity-50 flex items-center gap-2"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {loading ? "Creating..." : "Create Project"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateProjectModal;
