import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Shield, X, Users, Loader2, LayoutList, Send, Mail, Shuffle, Copy, Check, RefreshCw, Trash2, MailX, MailCheck, FolderOpen, Plus, Minus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import TaskManagement from "./TaskManagement";
import ProjectInfoEditor from "./ProjectInfoEditor";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useTheme } from "next-themes";
import { generateReportPdf } from "@/lib/generateReportPdf";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "text-destructive" },
  pm: { label: "PM / Engineer", color: "text-primary" },
  client: { label: "Client", color: "text-initiating" },
};

const AdminPanel = ({ isOpen, onClose }: AdminPanelProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "pm" | "client">("client");
  const [generatePassword, setGeneratePassword] = useState(true);
  const [sendInvite, setSendInvite] = useState(true);
  const [generatedPwd, setGeneratedPwd] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [resendingFor, setResendingFor] = useState<string | null>(null);
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "tasks" | "subscribers" | "members">("tasks");
  const [sendingNotification, setSendingNotification] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [newSubEmail, setNewSubEmail] = useState("");
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const { tasks, projectInfo } = useProjectData();

  // Project Members tab state
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedMemberProject, setSelectedMemberProject] = useState<string>("");
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchSubscriberCount();
      fetchSubscribers();
      fetchAllProjects();
    }
  }, [isOpen]);

  const fetchAllProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, title, project_ref")
      .order("created_at", { ascending: false });
    setAllProjects(data || []);
    if (data && data.length > 0 && !selectedMemberProject) {
      setSelectedMemberProject(data[0].id);
    }
  };

  const fetchProjectMembers = async (projectId: string) => {
    if (!projectId) return;
    setLoadingMembers(true);
    const { data: members } = await supabase
      .from("project_members")
      .select("id, user_id")
      .eq("project_id", projectId);

    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const memberUserIds = (members || []).map(m => m.user_id);
    const enriched = (members || []).map(m => {
      const profile = (profiles || []).find(p => p.id === m.user_id);
      const roleRow = (roles || []).find(r => r.user_id === m.user_id);
      return {
        membershipId: m.id,
        userId: m.user_id,
        email: profile?.email || "—",
        fullName: profile?.full_name || "—",
        role: roleRow?.role || "client",
      };
    });

    setProjectMembers(enriched);
    setAllUsers(
      (profiles || [])
        .filter(p => !memberUserIds.includes(p.id))
        .map(p => ({
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: (roles || []).find(r => r.user_id === p.id)?.role || "client",
        }))
    );
    setLoadingMembers(false);
  };

  useEffect(() => {
    if (selectedMemberProject) fetchProjectMembers(selectedMemberProject);
  }, [selectedMemberProject]);

  const addMemberToProject = async (userId: string) => {
    setAddingMember(true);
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: selectedMemberProject, user_id: userId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member added" });
      fetchProjectMembers(selectedMemberProject);
    }
    setAddingMember(false);
  };

  const removeMemberFromProject = async (membershipId: string) => {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", membershipId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      fetchProjectMembers(selectedMemberProject);
    }
  };

  const fetchSubscriberCount = async () => {
    const { count } = await supabase
      .from("email_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    setSubscriberCount(count || 0);
  };

  const fetchSubscribers = async () => {
    setLoadingSubscribers(true);
    const { data } = await supabase
      .from("email_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    setSubscribers(data || []);
    setLoadingSubscribers(false);
  };

  const toggleSubscriberStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("email_subscribers")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: currentStatus ? "Subscriber deactivated" : "Subscriber reactivated" });
      fetchSubscribers();
      fetchSubscriberCount();
    }
  };

  const deleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from subscribers?`)) return;
    const { error } = await supabase.from("email_subscribers").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Subscriber removed", description: email });
      fetchSubscribers();
      fetchSubscriberCount();
    }
  };

  const { theme } = useTheme();

  const sendNotificationToSubscribers = async () => {
    setSendingNotification(true);
    try {
      const isDark = theme === "dark";
      const { base64: pdfBase64 } = await generateReportPdf({ tasks, projectInfo, isDark });

      const { data, error } = await supabase.functions.invoke("send-subscriber-notification", {
        body: {
          subject: `${projectInfo.title} — Timeline Update`,
          tasks: tasks.map(t => ({ id: t.id, name: t.name, status: t.status, duration: t.duration, startDay: t.startDay })),
          projectInfo,
          pdfBase64,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Notifications sent",
        description: data?.message || `Sent to ${data?.sent} subscriber(s)`,
      });
    } catch (err: any) {
      toast({ title: "Error sending notifications", description: err.message, variant: "destructive" });
    }
    setSendingNotification(false);
  };

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
    setGeneratedPwd(null);
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email, password: generatePassword ? undefined : password, fullName, role, generatePassword, sendInvite },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      const desc = sendInvite
        ? `${email} added as ${roleLabels[role].label} — invitation email sent`
        : `${email} added as ${roleLabels[role].label}`;
      toast({ title: "User created", description: desc });

      if (res.data?.generatedPassword && !sendInvite) {
        setGeneratedPwd(res.data.generatedPassword);
      } else {
        setEmail(""); setPassword(""); setFullName(""); setRole("client");
      }
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleResendInvite = async (user: any) => {
    setResendingFor(user.id);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invitation", {
        body: { userId: user.id, email: user.email, fullName: user.full_name, role: user.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Invitation resent", description: `New credentials sent to ${user.email}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setResendingFor(null);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setEditingRoleFor(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "update_role", userId, newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Role updated", description: `User role changed to ${roleLabels[newRole]?.label || newRole}` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setEditingRoleFor(null);
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    setDeletingUser(user.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete_user", userId: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User deleted", description: `${user.email} has been removed` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeletingUser(null);
  };

  const copyPassword = () => {
    if (generatedPwd) {
      navigator.clipboard.writeText(generatedPwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          <div className="flex gap-1 mb-5 p-1 bg-secondary/30 rounded-lg border border-border/30 overflow-x-auto">
            {[
              { key: "tasks", label: "Scope & Schedule", icon: LayoutList },
              { key: "users", label: "Users", icon: Users },
              { key: "members", label: "Project Members", icon: FolderOpen },
              { key: "subscribers", label: "Subscribers", icon: Mail },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  if (tab.key === "subscribers") fetchSubscribers();
                  if (tab.key === "members") fetchAllProjects();
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "tasks" && (
            <div className="space-y-5">
              <ProjectInfoEditor />
              <TaskManagement />
              
              <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email Notifications
                  </h3>
                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send the current timeline status to all subscribed emails.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={sendNotificationToSubscribers}
                  disabled={sendingNotification || subscriberCount === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {sendingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingNotification ? "Sending..." : "Send Update Notification"}
                </motion.button>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
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
                  {!generatePassword && (
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6}
                      className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  )}
                  <select value={role} onChange={e => setRole(e.target.value as any)}
                    className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="admin">Admin</option>
                    <option value="pm">PM / Engineer</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      <Shuffle className="w-3.5 h-3.5" /> Generate random password
                    </label>
                    <Switch checked={generatePassword} onCheckedChange={setGeneratePassword} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Send invitation email with credentials
                    </label>
                    <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
                  </div>
                </div>

                {generatedPwd && !sendInvite && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-xs text-muted-foreground">Generated:</span>
                    <code className="text-sm font-mono text-foreground flex-1">{generatedPwd}</code>
                    <button type="button" onClick={copyPassword} className="p-1 rounded hover:bg-secondary/50 text-muted-foreground">
                      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {loading ? "Creating..." : sendInvite ? "Create & Send Invite" : "Create User"}
                </motion.button>
              </form>

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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResendInvite(u)}
                            disabled={resendingFor === u.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                            title="Resend invitation with new password"
                          >
                            {resendingFor === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Resend
                          </button>
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            disabled={editingRoleFor === u.id}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-border/30 bg-secondary/30 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 ${roleLabels[u.role]?.color || "text-muted-foreground"}`}
                          >
                            <option value="admin">Admin</option>
                            <option value="pm">PM / Engineer</option>
                            <option value="client">Client</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingUser === u.id}
                            className="p-1 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            title="Delete user"
                          >
                            {deletingUser === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Members Tab */}
          {activeTab === "members" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  Manage Project Access
                </h3>

                {/* Project selector */}
                <select
                  value={selectedMemberProject}
                  onChange={e => setSelectedMemberProject(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.project_ref ? `(${p.project_ref})` : ""}
                    </option>
                  ))}
                </select>

                {/* Current members */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Current Members ({projectMembers.length})
                  </p>
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : projectMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border/40 rounded-lg">
                      No members assigned to this project yet
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {projectMembers.map(m => (
                        <div key={m.membershipId} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-card">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                              {(m.fullName || m.email)?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{m.fullName || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${roleLabels[m.role]?.color || "text-muted-foreground"} bg-secondary/50`}>
                              {roleLabels[m.role]?.label || m.role}
                            </span>
                            <button
                              onClick={() => removeMemberFromProject(m.membershipId)}
                              className="p-1 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Remove from project"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available users to add */}
                {allUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      Add Members
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {allUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-border/30 hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                              {(u.fullName || u.email)?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{u.fullName || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => addMemberToProject(u.id)}
                            disabled={addingMember}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "subscribers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Subscription List
                </h3>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {subscribers.filter(s => s.is_active).length} active / {subscribers.length} total
                </span>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newSubEmail.trim()) return;
                  setAddingSubscriber(true);
                  const { error } = await supabase
                    .from("email_subscribers")
                    .insert({ email: newSubEmail.trim().toLowerCase() });
                  setAddingSubscriber(false);
                  if (error) {
                    toast({ title: "Error", description: error.message.includes("duplicate") ? "This email is already subscribed" : error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Subscriber added", description: newSubEmail.trim() });
                    setNewSubEmail("");
                    fetchSubscribers();
                    fetchSubscriberCount();
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  value={newSubEmail}
                  onChange={e => setNewSubEmail(e.target.value)}
                  placeholder="Add email to subscriber list"
                  required
                  className="flex-1 bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <motion.button
                  type="submit"
                  disabled={addingSubscriber}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {addingSubscriber ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Add
                </motion.button>
              </form>

              {loadingSubscribers ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : subscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No subscribers yet</p>
              ) : (
                <div className="space-y-2">
                  {subscribers.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-secondary/10">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${sub.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {sub.email[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{sub.email}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Subscribed {new Date(sub.subscribed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSubscriberStatus(sub.id, sub.is_active)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                            sub.is_active
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          title={sub.is_active ? "Deactivate" : "Reactivate"}
                        >
                          {sub.is_active ? <MailCheck className="w-3 h-3" /> : <MailX className="w-3 h-3" />}
                          {sub.is_active ? "Active" : "Inactive"}
                        </button>
                        <button
                          onClick={() => deleteSubscriber(sub.id, sub.email)}
                          className="p-1 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove subscriber"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminPanel;
