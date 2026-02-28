import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Shield, X, Users, Loader2, CheckCircle2, LayoutList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import TaskManagement from "./TaskManagement";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  pm: { label: "Project Manager", color: "text-primary" },
  engineer: { label: "Project Engineer", color: "text-processing" },
  client: { label: "Client", color: "text-initiating" },
};

const AdminPanel = ({ isOpen, onClose }: AdminPanelProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"pm" | "engineer" | "client">("client");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "tasks">("tasks");

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    
    if (profiles && roles) {
      const merged = profiles.map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.id)?.role || "client",
      }));
      setUsers(merged);
    }
    setLoadingUsers(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, fullName, role },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "User created", description: `${email} added as ${roleLabels[role].label}` });
      setEmail(""); setPassword(""); setFullName(""); setRole("client");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl glass-card p-6 overflow-y-auto max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 bg-secondary/30 rounded-lg border border-border/30">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "tasks" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Scope & Schedule
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> User Management
            </button>
          </div>

          {activeTab === "tasks" && <TaskManagement />}

          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Create User Form */}
              <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-xl border border-border/50 bg-secondary/20">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Create New User
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name"
                    className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
                    className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6}
                    className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <select value={role} onChange={e => setRole(e.target.value as any)}
                    className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="pm">Project Manager</option>
                    <option value="engineer">Project Engineer</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {loading ? "Creating..." : "Create User"}
                </motion.button>
              </form>

              {/* Users List */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary" /> Registered Users
                </h3>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-secondary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {(u.full_name || u.email)?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-border/30 ${roleLabels[u.role]?.color || "text-muted-foreground"}`}>
                          {roleLabels[u.role]?.label || u.role}
                        </span>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminPanel;
