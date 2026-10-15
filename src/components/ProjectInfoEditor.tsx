import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Building2, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { SAUDI_CITIES } from "@/data/saudiCities";

const ProjectInfoEditor = () => {
  const { projectInfo, projectId, canEditProject, userRole, refresh } = useProjectData();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(projectInfo);

  const startEdit = () => {
    if (!canEditProject) {
      toast({
        title: "Access Denied",
        description: "Only Super Admins and assigned Project Managers can edit project data.",
        variant: "destructive",
      });
      return;
    }
    setForm(projectInfo);
    setEditing(true);
  };

  const save = async () => {
    if (!projectId || !canEditProject) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: form.title,
          client_name: form.client,
          project_ref: form.projectRef,
          project_manager: form.projectManager,
          reporting_to: form.reportingTo,
          project_engineer: form.projectEngineer,
          location: form.location,
          company: form.company,
          start_date: form.startDate,
          end_date: form.endDate,
        })
        .eq("id", projectId);

      if (error) throw error;
      toast({ title: "Project updated", description: "Project information saved successfully." });
      setEditing(false);
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const inputClass = "bg-secondary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full";
  const labelClass = "text-[10px] text-muted-foreground uppercase tracking-wider font-medium";

  if (!editing) {
    return (
      <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-secondary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Project Information</h3>
            {canEditProject ? (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                {userRole === "admin" ? "Admin Control" : "PM Access"}
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Stakeholder Read-Only
              </span>
            )}
          </div>
          {canEditProject && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              Edit Project
            </motion.button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["Title", projectInfo.title],
            ["Client", projectInfo.client],
            ["Ref", projectInfo.projectRef],
            ["PM", projectInfo.projectManager],
            ["Reporting To", projectInfo.reportingTo],
            ["Engineer", projectInfo.projectEngineer],
            ["Location", projectInfo.location],
            ["Company", projectInfo.company],
            ["Start", projectInfo.startDate],
            ["End", projectInfo.endDate],
          ].map(([label, val]) => (
            <div key={label} className="flex flex-col">
              <span className={labelClass}>{label}</span>
              <span className="text-foreground truncate">{val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        Edit Project Information
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {([
          ["title", "Title"],
          ["client", "Client"],
          ["projectRef", "Project Ref"],
          ["projectManager", "Project Manager"],
          ["reportingTo", "Reporting To"],
          ["projectEngineer", "Project Engineer"],
          ["location", "Location (KSA City / Zone)"],
          ["company", "Company"],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className={labelClass}>{label}</label>
            <input
              list={key === "location" ? "editor-saudi-cities" : undefined}
              value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              className={`${inputClass} mt-1`}
              placeholder={key === "location" ? "Select Saudi city or type..." : undefined}
            />
            {key === "location" && (
              <datalist id="editor-saudi-cities">
                {SAUDI_CITIES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.arabicName} - {c.region}
                  </option>
                ))}
              </datalist>
            )}
          </div>
        ))}
        <div>
          <label className={labelClass}>Start Date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
            className={`${inputClass} mt-1`}
          />
        </div>
        <div>
          <label className={labelClass}>End Date</label>
          <input
            type="date"
            value={form.endDate}
            onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
            className={`${inputClass} mt-1`}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={save}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </motion.button>
        <button
          onClick={() => setEditing(false)}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ProjectInfoEditor;
