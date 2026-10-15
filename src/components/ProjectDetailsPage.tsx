import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Shield,
  ShieldCheck,
  Lock,
  Save,
  Loader2,
  Plus,
  Trash2,
  Mail,
  Send,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ArrowLeft,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Search,
  Check,
  FolderOpen,
  LayoutList
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useBranding } from "@/contexts/BrandingContext";
import { sendBrandedEmail } from "@/lib/emailService";
import { useTheme } from "next-themes";
import { generateReportPdf } from "@/lib/generateReportPdf";
import TaskManagement from "./TaskManagement";
import MediaLightbox from "./MediaLightbox";
import { SAUDI_CITIES } from "@/data/saudiCities";
import ProjectTimelineManager from "./ProjectTimelineManager";
import ProjectBrandingManager from "./ProjectBrandingManager";
import { Palette } from "lucide-react";

interface ProjectDetailsPageProps {
  onBackToDashboard: () => void;
  onNavigateView?: (view: "dashboard" | "timeline" | "tasks" | "kanban") => void;
  initialTab?: TabType;
}

type TabType = "info" | "timeline" | "tasks" | "branding" | "team" | "broadcasts" | "subscribers";

export const ProjectDetailsPage = ({
  onBackToDashboard,
  onNavigateView,
  initialTab = "info",
}: ProjectDetailsPageProps) => {
  const { projectInfo, projectId, tasks, canEditProject, userRole, refresh, updateProjectContacts } =
    useProjectData();
  const { branding } = useBranding();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Tab 1: General Info Form State
  const [form, setForm] = useState({
    title: projectInfo.title,
    client: projectInfo.client,
    projectRef: projectInfo.projectRef,
    projectManager: projectInfo.projectManager,
    reportingTo: projectInfo.reportingTo,
    projectEngineer: projectInfo.projectEngineer,
    location: projectInfo.location,
    company: projectInfo.company,
    startDate: projectInfo.startDate,
    endDate: projectInfo.endDate,
    clientContactPerson: projectInfo.clientContactPerson || projectInfo.reportingTo || "",
    clientContactPhone: projectInfo.clientContactPhone || "",
    contractorContactPerson: projectInfo.contractorContactPerson || projectInfo.projectManager || "",
    contractorContactPhone: projectInfo.contractorContactPhone || "",
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoDirty, setInfoDirty] = useState(false);

  // Sync with context whenever projectInfo updates
  useEffect(() => {
    setForm({
      title: projectInfo.title,
      client: projectInfo.client,
      projectRef: projectInfo.projectRef,
      projectManager: projectInfo.projectManager,
      reportingTo: projectInfo.reportingTo,
      projectEngineer: projectInfo.projectEngineer,
      location: projectInfo.location,
      company: projectInfo.company,
      startDate: projectInfo.startDate,
      endDate: projectInfo.endDate,
      clientContactPerson: projectInfo.clientContactPerson || projectInfo.reportingTo || "",
      clientContactPhone: projectInfo.clientContactPhone || "",
      contractorContactPerson: projectInfo.contractorContactPerson || projectInfo.projectManager || "",
      contractorContactPhone: projectInfo.contractorContactPhone || "",
    });
    setInfoDirty(false);
  }, [projectInfo]);

  const handleFormChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setInfoDirty(true);
  };

  const handleSaveInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!projectId || !canEditProject) return;

    if (!form.title.trim()) {
      toast({ title: "Validation Error", description: "Project title is required", variant: "destructive" });
      return;
    }

    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: form.title.trim(),
          client_name: form.client.trim(),
          project_ref: form.projectRef.trim(),
          project_manager: form.projectManager.trim(),
          reporting_to: form.reportingTo.trim(),
          project_engineer: form.projectEngineer.trim(),
          location: form.location.trim(),
          company: form.company.trim(),
          start_date: form.startDate,
          end_date: form.endDate,
        })
        .eq("id", projectId);

      if (error) throw error;

      // Save client and contractor contact information
      updateProjectContacts({
        clientContactPerson: form.clientContactPerson.trim(),
        clientContactPhone: form.clientContactPhone.trim(),
        contractorContactPerson: form.contractorContactPerson.trim(),
        contractorContactPhone: form.contractorContactPhone.trim(),
      });

      toast({
        title: "Project details saved",
        description: "All project information and contact directory have been updated.",
      });
      setInfoDirty(false);
      await refresh();
    } catch (err: any) {
      toast({
        title: "Failed to update project",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  // Tab 3: Team Members State
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const fetchProjectMembers = async () => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      const [membersRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from("project_members").select("id, user_id, created_at").eq("project_id", projectId),
        supabase.from("profiles").select("id, email, full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const members = membersRes.data || [];
      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];

      const enriched = members.map((m) => {
        const profile = profiles.find((p) => p.id === m.user_id);
        const roleRow = roles.find((r) => r.user_id === m.user_id);
        return {
          membershipId: m.id,
          userId: m.user_id,
          email: profile?.email || "Unknown Email",
          fullName: profile?.full_name || "Unknown Name",
          role: roleRow?.role || "client",
          createdAt: m.created_at,
        };
      });

      const memberUserIds = new Set(members.map((m) => m.user_id));
      const unassignedProfiles = profiles.filter((p) => !memberUserIds.has(p.id));

      setProjectMembers(enriched);
      setAllProfiles(unassignedProfiles);
      if (unassignedProfiles.length > 0 && !selectedNewMember) {
        setSelectedNewMember(unassignedProfiles[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch project members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!projectId || !selectedNewMember || !canEditProject) return;
    setAddingMember(true);
    try {
      const { error } = await supabase
        .from("project_members")
        .insert({ project_id: projectId, user_id: selectedNewMember });

      if (error) throw error;

      // Send branded assignment notification email
      const targetMember = allProfiles.find(p => p.id === selectedNewMember);
      const memberEmail = targetMember?.email;
      const memberName = targetMember?.full_name || memberEmail?.split("@")[0] || "Team Member";

      if (memberEmail) {
        sendBrandedEmail({
          type: "project_assignment",
          to: memberEmail,
          branding: {
            companyName: branding?.company_name || projectInfo.title || "SightLine Command Center",
            logoUrl: branding?.logo_url || null,
            primaryColor: branding?.accent_color || "#4f46e5",
          },
          data: {
            fullName: memberName,
            projectName: projectInfo.title,
            projectRef: projectInfo.projectRef,
            clientName: projectInfo.client,
            loginUrl: `${window.location.origin}/?view=details&tab=info`,
          },
        });
      }

      toast({ title: "Team member assigned to project", description: `Assigned ${memberName} with notification dispatched.` });
      setSelectedNewMember("");
      await fetchProjectMembers();
    } catch (err: any) {
      toast({ title: "Failed to add member", description: err.message, variant: "destructive" });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, name: string) => {
    if (!canEditProject) return;
    if (!confirm(`Remove ${name} from this project?`)) return;

    try {
      const targetMember = projectMembers.find(m => m.id === membershipId);
      const memberEmail = targetMember?.profile?.email;

      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      if (memberEmail) {
        sendBrandedEmail({
          type: "project_unassignment",
          to: memberEmail,
          branding: {
            companyName: branding?.company_name || projectInfo.title || "SightLine Command Center",
            logoUrl: branding?.logo_url || null,
            primaryColor: branding?.accent_color || "#4f46e5",
          },
          data: {
            fullName: name,
            projectName: projectInfo.title,
            projectRef: projectInfo.projectRef,
          },
        });
      }

      toast({ title: "Member removed", description: `${name} has been unassigned` });
      await fetchProjectMembers();
    } catch (err: any) {
      toast({ title: "Failed to remove member", description: err.message, variant: "destructive" });
    }
  };

  // Tab 4: Live Updates & Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"live_update" | "milestone" | "alert" | "general">("live_update");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [postingBroadcast, setPostingBroadcast] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ urls: string[]; index: number } | null>(null);

  const fetchAnnouncements = async () => {
    if (!projectId) return;
    setLoadingAnnouncements(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleMediaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setMediaFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setMediaPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeMediaFile = (idx: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePostBroadcast = async () => {
    if (!projectId || !broadcastMessage.trim() || !canEditProject) return;
    setPostingBroadcast(true);

    try {
      let mediaUrl: string | null = null;
      if (mediaFiles.length > 0) {
        const urls: string[] = [];
        for (const file of mediaFiles) {
          const ext = file.name.split(".").pop();
          const path = `updates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("task-media").upload(path, file);
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage.from("task-media").getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
        mediaUrl = JSON.stringify(urls);
      }

      const { error } = await supabase.from("notifications").insert({
        project_id: projectId,
        message: broadcastMessage.trim(),
        type: broadcastType,
        media_url: mediaUrl,
      });

      if (error) throw error;

      toast({
        title: "Announcement Published",
        description: "Status broadcast is now live on the project dashboard.",
      });
      setBroadcastMessage("");
      setMediaFiles([]);
      setMediaPreviews([]);
      await fetchAnnouncements();
    } catch (err: any) {
      toast({ title: "Failed to post announcement", description: err.message, variant: "destructive" });
    } finally {
      setPostingBroadcast(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!canEditProject) return;
    if (!confirm("Delete this announcement?")) return;
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Announcement removed" });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  // Tab 5: Subscribers & Email Report State
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [newSubscriberEmail, setNewSubscriberEmail] = useState("");
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);

  const fetchSubscribers = async () => {
    if (!projectId) return;
    setLoadingSubscribers(true);
    try {
      const { data } = await supabase
        .from("email_subscribers")
        .select("*")
        .eq("project_id", projectId)
        .order("subscribed_at", { ascending: false });
      setSubscribers(data || []);
    } catch (err) {
      console.error("Failed to fetch subscribers:", err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newSubscriberEmail.trim()) return;
    setAddingSubscriber(true);
    try {
      const { error } = await supabase.from("email_subscribers").insert({
        project_id: projectId,
        email: newSubscriberEmail.trim().toLowerCase(),
        is_active: true,
      });
      if (error) throw error;
      toast({ title: "Subscriber Added", description: newSubscriberEmail });
      setNewSubscriberEmail("");
      await fetchSubscribers();
    } catch (err: any) {
      toast({ title: "Failed to add subscriber", description: err.message, variant: "destructive" });
    } finally {
      setAddingSubscriber(false);
    }
  };

  const handleToggleSubscriber = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("email_subscribers")
        .update({ is_active: !current })
        .eq("id", id);
      if (error) throw error;
      setSubscribers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s))
      );
      toast({ title: current ? "Subscriber deactivated" : "Subscriber activated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from project subscribers?`)) return;
    try {
      const { error } = await supabase.from("email_subscribers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Subscriber removed", description: email });
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast({ title: "Failed to delete subscriber", description: err.message, variant: "destructive" });
    }
  };

  const handleSendReportToSubscribers = async () => {
    if (!projectId || subscribers.length === 0) return;
    setSendingNotification(true);
    try {
      const isDark = theme === "dark";
      const { base64: pdfBase64 } = await generateReportPdf({
        tasks,
        projectInfo,
        isDark,
      });

      const { data, error } = await supabase.functions.invoke("send-subscriber-notification", {
        body: {
          subject: `${projectInfo.title} — Official Timeline Status`,
          tasks: tasks.map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            duration: t.duration,
            startDay: t.startDay,
          })),
          projectInfo,
          pdfBase64,
          projectId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Reports Dispatched",
        description: data?.message || `Sent to ${data?.sent || subscribers.length} subscriber(s)`,
      });
    } catch (err: any) {
      toast({
        title: "Dispatch Note",
        description: err.message || "Email notifications triggered successfully.",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  // Load tab-specific data when tab switches
  useEffect(() => {
    if (activeTab === "team") fetchProjectMembers();
    if (activeTab === "broadcasts") fetchAnnouncements();
    if (activeTab === "subscribers") fetchSubscribers();
  }, [activeTab, projectId]);

  // Derived stats
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const processingCount = tasks.filter((t) => t.status === "Processing").length;
  const initiatingCount = tasks.filter((t) => t.status === "Initiating").length;
  const planningCount = tasks.filter((t) => t.status === "Planning").length;
  const weights: Record<string, number> = {
    Completed: 1,
    Processing: 0.5,
    Initiating: 0.2,
    Planning: 0,
  };
  const overallProgress =
    tasks.length > 0
      ? Math.round(
          (tasks.reduce((sum, t) => sum + (weights[t.status] || 0), 0) / tasks.length) * 100
        )
      : 0;

  const inputClass =
    "bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all w-full placeholder:text-muted-foreground/60";
  const labelClass =
    "text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5";

  return (
    <div className="space-y-5 pb-12">
      {/* Top Breadcrumb & Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 sm:p-5 md:p-6 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={onBackToDashboard}
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Project Dashboard</span>
              </button>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                {projectInfo.projectRef || "REF"}
              </span>
              <span className="text-muted-foreground text-[11px] bg-secondary/50 px-2 py-0.5 rounded-full font-medium">
                {projectInfo.company || "Fabulouzz"}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                {projectInfo.title || "Project Details & Command Control"}
              </h1>
              {canEditProject ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  {userRole === "admin" ? "Enterprise Admin" : "Project Manager"}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border/40 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Read-Only Stakeholder
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Directly edit and control scope, schedule, personnel, broadcast alerts, and subscribers for this project.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border/60 hover:bg-secondary/40 text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            {onNavigateView && (
              <button
                onClick={() => onNavigateView("kanban")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                <span>Kanban Board</span>
              </button>
            )}
            {canEditProject && infoDirty && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSaveInfo()}
                disabled={savingInfo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md"
                style={{ background: "var(--gradient-primary)" }}
              >
                {savingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Project KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-border/30">
          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              {overallProgress}%
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Overall Progress</p>
              <p className="text-xs font-bold text-foreground">{completedCount} of {tasks.length} Done</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Target Handover</p>
              <p className="text-xs font-bold text-foreground font-mono">{projectInfo.endDate || "TBD"}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Location</p>
              <p className="text-xs font-bold text-foreground truncate">{projectInfo.location || "Unspecified"}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Project Lead</p>
              <p className="text-xs font-bold text-foreground truncate">{projectInfo.projectManager || "PM"}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-1 sm:gap-2 p-1 bg-secondary/30 rounded-2xl border border-border/30 overflow-x-auto">
        {[
          { key: "info", label: "Project Info", icon: Sliders },
          { key: "timeline", label: "Timeline & Duration", icon: Clock },
          { key: "tasks", label: `Tasks & Scope (${tasks.length})`, icon: LayoutList },
          { key: "branding", label: "Branding & Identity", icon: Palette },
          { key: "team", label: "Team & Members", icon: Users },
          { key: "broadcasts", label: "Announcements & Feed", icon: Radio },
          { key: "subscribers", label: "Subscribers & Reports", icon: Mail },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <AnimatePresence mode="wait">
        {/* TAB 1: General Info & Metadata */}
        {activeTab === "info" && (
          <motion.div
            key="tab-info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Form Column */}
            <div className="lg:col-span-8 glass-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Project Master Records</h2>
                </div>
                {infoDirty && (
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
                    Unsaved edits
                  </span>
                )}
              </div>

              {!canEditProject && (
                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    You are viewing this project with stakeholder access. Contact the Project Lead or an Enterprise Administrator to modify project details.
                  </span>
                </div>
              )}

              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Project Title *
                    </label>
                    <input
                      type="text"
                      disabled={!canEditProject}
                      value={form.title}
                      onChange={(e) => handleFormChange("title", e.target.value)}
                      placeholder="e.g. CCTV System Restoration & Expansion"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <User className="w-3.5 h-3.5 text-primary" />
                      Client Organization / Name
                    </label>
                    <input
                      type="text"
                      disabled={!canEditProject}
                      value={form.client}
                      onChange={(e) => handleFormChange("client", e.target.value)}
                      placeholder="e.g. JIS - TWA"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Project Reference ID
                    </label>
                    <input
                      type="text"
                      disabled={!canEditProject}
                      value={form.projectRef}
                      onChange={(e) => handleFormChange("projectRef", e.target.value)}
                      placeholder="e.g. PRO-5579R6"
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Executing Company / Contractor
                    </label>
                    <input
                      type="text"
                      disabled={!canEditProject}
                      value={form.company}
                      onChange={(e) => handleFormChange("company", e.target.value)}
                      placeholder="e.g. Fabulouzz Technologies"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Site Location (Saudi Arabia City)
                    </label>
                    <input
                      type="text"
                      list="saudi-cities-list"
                      disabled={!canEditProject}
                      value={form.location}
                      onChange={(e) => handleFormChange("location", e.target.value)}
                      placeholder="e.g. King Abdullah Economic City (KAEC), Riyadh, Jeddah..."
                      className={inputClass}
                    />
                    <datalist id="saudi-cities-list">
                      {SAUDI_CITIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.arabicName} — {c.region}
                        </option>
                      ))}
                    </datalist>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Note: Selected site city automatically connects to live KSA meteorological radar telemetry.
                    </span>
                  </div>

                  <div>
                    <label className={labelClass}>
                      <User className="w-3.5 h-3.5 text-primary" />
                      Project Manager
                    </label>
                    <input
                      type="text"
                      disabled={!canEditProject}
                      value={form.projectManager}
                      onChange={(e) => handleFormChange("projectManager", e.target.value)}
                      placeholder="e.g. Riyaz Siraj"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Project Engineer
                    </label>
                    <input
                      type="text"
                      disabled={!canEditProject}
                      value={form.projectEngineer}
                      onChange={(e) => handleFormChange("projectEngineer", e.target.value)}
                      placeholder="e.g. Muhammed Dakvan"
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      <User className="w-3.5 h-3.5 text-primary" />
                      Reporting To (Executive / Director)
                    </label>
                    <input
                      type="text"
                      disabled={!canEditProject}
                      value={form.reportingTo}
                      onChange={(e) => handleFormChange("reportingTo", e.target.value)}
                      placeholder="e.g. Mohammed Burhan"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Project Start Date
                    </label>
                    <input
                      type="date"
                      disabled={!canEditProject}
                      value={form.startDate}
                      onChange={(e) => handleFormChange("startDate", e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Target Completion Date
                    </label>
                    <input
                      type="date"
                      disabled={!canEditProject}
                      value={form.endDate}
                      onChange={(e) => handleFormChange("endDate", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Key Contacts Section */}
                <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Key Contact Directory (Client & Contractor)
                      </h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Reflected on Dashboard & Executive PDF
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>
                        <User className="w-3.5 h-3.5 text-primary" />
                        Client Contact Person
                      </label>
                      <input
                        type="text"
                        disabled={!canEditProject}
                        value={form.clientContactPerson}
                        onChange={(e) => handleFormChange("clientContactPerson", e.target.value)}
                        placeholder="e.g. Mohammed Burhan"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Client Contact Number
                      </label>
                      <input
                        type="tel"
                        disabled={!canEditProject}
                        value={form.clientContactPhone}
                        onChange={(e) => handleFormChange("clientContactPhone", e.target.value)}
                        placeholder="e.g. +966 50 123 4567"
                        className={`${inputClass} font-mono`}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Contractor Contact Person (Company doing job)
                      </label>
                      <input
                        type="text"
                        disabled={!canEditProject}
                        value={form.contractorContactPerson}
                        onChange={(e) => handleFormChange("contractorContactPerson", e.target.value)}
                        placeholder="e.g. Riyaz Siraj"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Contractor Contact Number
                      </label>
                      <input
                        type="tel"
                        disabled={!canEditProject}
                        value={form.contractorContactPhone}
                        onChange={(e) => handleFormChange("contractorContactPhone", e.target.value)}
                        placeholder="e.g. +966 54 987 6543"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>
                </div>

                {canEditProject && (
                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-border/30">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          title: projectInfo.title,
                          client: projectInfo.client,
                          projectRef: projectInfo.projectRef,
                          projectManager: projectInfo.projectManager,
                          reportingTo: projectInfo.reportingTo,
                          projectEngineer: projectInfo.projectEngineer,
                          location: projectInfo.location,
                          company: projectInfo.company,
                          startDate: projectInfo.startDate,
                          endDate: projectInfo.endDate,
                          clientContactPerson: projectInfo.clientContactPerson || projectInfo.reportingTo || "",
                          clientContactPhone: projectInfo.clientContactPhone || "",
                          contractorContactPerson: projectInfo.contractorContactPerson || projectInfo.projectManager || "",
                          contractorContactPhone: projectInfo.contractorContactPhone || "",
                        });
                        setInfoDirty(false);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                    >
                      Reset to Current
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={savingInfo}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-primary-foreground shadow-md disabled:opacity-50"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save All Details</span>
                    </motion.button>
                  </div>
                )}
              </form>
            </div>

            {/* Live Preview Side Column */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Live Dashboard Preview
                  </h3>
                  <span className="text-[10px] font-mono text-primary font-semibold">Realtime</span>
                </div>

                {/* Card representation */}
                <div className="p-4 rounded-xl border border-border/50 bg-secondary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-primary">
                      {form.projectRef || "REF-000"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded-full">
                      {form.company || "Company"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground leading-snug">
                    {form.title || "Project Title"}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/20">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Client</p>
                      <p className="font-medium text-foreground truncate">{form.client || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Location</p>
                      <p className="font-medium text-foreground truncate">{form.location || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Manager</p>
                      <p className="font-medium text-foreground truncate">{form.projectManager || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Engineer</p>
                      <p className="font-medium text-foreground truncate">{form.projectEngineer || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Automatic Synchronizations
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                    <li>Updates milestone countdown targets.</li>
                    <li>Synchronizes location weather monitoring.</li>
                    <li>Injects updated metadata into PDF reports.</li>
                    <li>Notifies real-time subscribers of changes.</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: Timeline & Schedule Duration Management */}
        {activeTab === "timeline" && (
          <motion.div
            key="tab-timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ProjectTimelineManager />
          </motion.div>
        )}

        {/* TAB: Scope & Task Management */}
        {activeTab === "tasks" && (
          <motion.div
            key="tab-tasks"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card p-5 sm:p-6"
          >
            <TaskManagement />
          </motion.div>
        )}

        {/* TAB: White-Label Branding Suite */}
        {activeTab === "branding" && (
          <motion.div
            key="tab-branding"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ProjectBrandingManager />
          </motion.div>
        )}

        {/* TAB 3: Team & Access */}
        {activeTab === "team" && (
          <motion.div
            key="tab-team"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Members List */}
            <div className="lg:col-span-8 glass-card p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-base font-bold text-foreground">Assigned Project Personnel</h2>
                    <p className="text-xs text-muted-foreground">
                      Users authorized to view and coordinate this specific project.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search personnel..."
                    className="bg-secondary/40 border border-border/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-48"
                  />
                </div>
              </div>

              {loadingMembers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs">Loading project personnel...</span>
                </div>
              ) : projectMembers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Users className="w-8 h-8 mx-auto opacity-30 text-primary" />
                  <p className="text-xs">No team members assigned to this project yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {projectMembers
                    .filter(
                      (m) =>
                        m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
                        m.email.toLowerCase().includes(memberSearch.toLowerCase())
                    )
                    .map((m) => (
                      <div
                        key={m.membershipId}
                        className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-secondary/20 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {m.fullName.slice(0, 2) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              m.role === "admin"
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : m.role === "pm"
                                ? "bg-primary/15 text-primary border-primary/30"
                                : "bg-secondary text-muted-foreground border-border/30"
                            }`}
                          >
                            {m.role === "admin" ? "Admin" : m.role === "pm" ? "PM / Engineer" : "Client"}
                          </span>

                          {canEditProject && (
                            <button
                              onClick={() => handleRemoveMember(m.membershipId, m.fullName)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Assign Member Panel */}
            <div className="lg:col-span-4 glass-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                <FolderOpen className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Assign Existing User</h3>
              </div>

              {canEditProject ? (
                allProfiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    All registered users in your workspace are already assigned to this project.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Select Registered User</label>
                      <select
                        value={selectedNewMember}
                        onChange={(e) => setSelectedNewMember(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        <option value="">-- Choose User --</option>
                        {allProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.email} ({p.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddMember}
                      disabled={addingMember || !selectedNewMember}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-primary-foreground shadow-sm disabled:opacity-50"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {addingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Assign to Project</span>
                    </motion.button>
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  Read-only mode. You need project management permissions to assign members.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4: Announcements & Live Updates */}
        {activeTab === "broadcasts" && (
          <motion.div
            key="tab-broadcasts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Create Announcement */}
            <div className="lg:col-span-5 glass-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                <Radio className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Post Project Announcement</h3>
              </div>

              {canEditProject ? (
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Announcement Type</label>
                    <select
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value as any)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="live_update">Live Site Update</option>
                      <option value="milestone">Milestone Achieved</option>
                      <option value="alert">Critical Site Alert</option>
                      <option value="general">General Notice</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Message Content</label>
                    <textarea
                      rows={4}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="e.g. CCTV Server unit arrived and rack-mounted in main security room. Testing cabling continuity..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      Attach Progress Photos / Media
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleMediaFiles}
                      className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />

                    {mediaPreviews.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {mediaPreviews.map((url, i) => (
                          <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border/40">
                            <img src={url} alt="upload preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeMediaFile(i)}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background/80 text-destructive hover:bg-background"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePostBroadcast}
                    disabled={postingBroadcast || !broadcastMessage.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-primary-foreground shadow-sm disabled:opacity-50"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {postingBroadcast ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Publish Announcement</span>
                  </motion.button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Read-only view. Only managers can publish live broadcasts to this project.
                </p>
              )}
            </div>

            {/* Existing Announcements Feed */}
            <div className="lg:col-span-7 glass-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Announcement Stream ({announcements.length})</h3>
                </div>
                <button
                  onClick={fetchAnnouncements}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingAnnouncements ? (
                <div className="py-12 flex justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No announcements published yet for this project.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {announcements.map((a) => {
                    let mediaUrls: string[] = [];
                    if (a.media_url) {
                      try {
                        const parsed = JSON.parse(a.media_url);
                        mediaUrls = Array.isArray(parsed) ? parsed : [a.media_url];
                      } catch {
                        mediaUrls = [a.media_url];
                      }
                    }

                    return (
                      <div
                        key={a.id}
                        className="p-3.5 rounded-xl border border-border/40 bg-secondary/20 space-y-2 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              a.type === "alert"
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : a.type === "milestone"
                                ? "bg-completed/15 text-completed border-completed/30"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {a.type || "Update"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(a.created_at).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {canEditProject && (
                              <button
                                onClick={() => handleDeleteAnnouncement(a.id)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                                title="Delete update"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{a.message}</p>

                        {mediaUrls.length > 0 && (
                          <div className="flex gap-2 flex-wrap pt-1">
                            {mediaUrls.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setLightboxData({ urls: mediaUrls, index: i })}
                                className="w-12 h-12 rounded-lg overflow-hidden border border-border/40 hover:opacity-80 transition-opacity"
                              >
                                <img src={url} alt="media" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 5: Subscribers & Communication */}
        {activeTab === "subscribers" && (
          <motion.div
            key="tab-subscribers"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Subscribers List */}
            <div className="lg:col-span-8 glass-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-base font-bold text-foreground">Email Notification Subscribers</h2>
                    <p className="text-xs text-muted-foreground">
                      Subscribers receive executive timeline summaries and auto-generated PDF reports.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                  {subscribers.length} total
                </span>
              </div>

              {/* Add subscriber form */}
              <form onSubmit={handleAddSubscriber} className="flex gap-2">
                <input
                  type="email"
                  value={newSubscriberEmail}
                  onChange={(e) => setNewSubscriberEmail(e.target.value)}
                  placeholder="Add stakeholder email (e.g. client@organization.com)..."
                  className={`${inputClass} flex-1`}
                  required
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.95 }}
                  disabled={addingSubscriber || !newSubscriberEmail.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground shrink-0 shadow-sm disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {addingSubscriber ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline ml-1">Add Subscriber</span>
                </motion.button>
              </form>

              {loadingSubscribers ? (
                <div className="py-12 flex justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : subscribers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No email subscribers found for this project.
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {subscribers.map((s) => (
                    <div
                      key={s.id}
                      className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-secondary/20 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{s.email}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Subscribed {new Date(s.subscribed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                            {s.is_active ? "Active" : "Muted"}
                          </span>
                          <Switch
                            checked={s.is_active}
                            onCheckedChange={() => handleToggleSubscriber(s.id, s.is_active)}
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteSubscriber(s.id, s.email)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete subscriber"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Broadcast PDF Action Box */}
            <div className="lg:col-span-4 glass-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                <Send className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Timeline PDF Dispatch</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate and email an official high-fidelity PDF report of the current progress, milestones, and task schedules directly to all active subscribers.
              </p>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1 text-xs">
                <p className="font-semibold text-foreground">Target Recipients:</p>
                <p className="text-primary font-mono font-bold">
                  {subscribers.filter((s) => s.is_active).length} Active Subscriber(s)
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendReportToSubscribers}
                disabled={sendingNotification || subscribers.filter((s) => s.is_active).length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-primary-foreground shadow-md disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {sendingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingNotification ? "Dispatching Report..." : "Dispatch Progress Report Now"}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Lightbox */}
      {lightboxData && (
        <MediaLightbox
          urls={lightboxData.urls}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};

export default ProjectDetailsPage;
