import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Eye,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  FileDown,
  BarChart3,
  TrendingUp,
  Building2,
  MapPin,
  User,
  AlertCircle,
  FileText,
  Filter,
  Download,
  LayoutGrid,
  CheckSquare,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Search,
  Check,
  Activity
} from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "next-themes";
import { generateReportPdf } from "@/lib/generateReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/auth/audit";

// Dashboard Telemetry Components
import StatusTicker from "./StatusTicker";
import NotificationTicker from "./NotificationTicker";
import { ProjectHealthCard } from "./ProjectHealthCard";
import ProgressRing from "./ProgressRing";
import MilestoneCountdown from "./MilestoneCountdown";
import { OngoingWorks } from "./OngoingWorks";
import { ProjectInfoCard } from "./ProjectInfoCard";
import WeatherWidget from "./WeatherWidget";
import LiveNotifications from "./LiveNotifications";
import GanttChart from "./GanttChart";
import KanbanBoard from "./KanbanBoard";
import TaskList from "./TaskList";
import EmailSubscription from "./EmailSubscription";
import { getStatusColor, type TaskStatus } from "@/data/projectData";

export type ClientViewTab = "dashboard" | "timeline" | "scopes" | "kanban" | "reports";

interface ClientPortalProps {
  activeView?: "dashboard" | "timeline" | "tasks" | "kanban" | "details" | "pricing" | "scopes" | "reports";
  onViewChange?: (view: any) => void;
}

export const ClientPortal = ({ activeView, onViewChange }: ClientPortalProps = {}) => {
  const { projectInfo, tasks, projectId, refresh, loading } = useProjectData();
  const { branding, isPremium } = useBranding();
  const { theme } = useTheme();

  // Normalize external activeView to internal tab
  const getNormalizedTab = (view?: string): ClientViewTab => {
    if (!view || view === "dashboard") return "dashboard";
    if (view === "timeline") return "timeline";
    if (view === "tasks" || view === "scopes" || view === "details") return "scopes";
    if (view === "kanban") return "kanban";
    if (view === "reports") return "reports";
    return "dashboard";
  };

  const [localTab, setLocalTab] = useState<ClientViewTab>(getNormalizedTab(activeView));
  const [selectedReportType, setSelectedReportType] = useState<string>("overall");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Scopes tab search and filter
  const [scopeSearch, setScopeSearch] = useState("");
  const [scopeStatusFilter, setScopeStatusFilter] = useState<string>("All");

  // Keep in sync with parent activeView if provided
  useEffect(() => {
    if (activeView) {
      setLocalTab(getNormalizedTab(activeView));
    }
  }, [activeView]);

  const activeTab = activeView ? getNormalizedTab(activeView) : localTab;

  const handleTabChange = (tab: ClientViewTab) => {
    setLocalTab(tab);
    if (onViewChange) {
      const mapped = tab === "scopes" ? "tasks" : tab;
      onViewChange(mapped);
    }
  };

  // Compute metrics from tasks (weighted progress matching admin dashboard)
  const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Completed").length;
    const processing = tasks.filter((t) => t.status === "Processing").length;
    const initiating = tasks.filter((t) => t.status === "Initiating").length;
    const planning = tasks.filter((t) => t.status === "Planning").length;

    const weightedScore = total > 0
      ? tasks.reduce((sum, t) => sum + (weights[t.status] || 0), 0) / total
      : 0;
    const completionPercent = Math.round(weightedScore * 100);
    const totalDays = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);

    return {
      total,
      completed,
      processing,
      initiating,
      planning,
      completionPercent,
      totalDays,
    };
  }, [tasks]);

  const progress = metrics.completionPercent;

  // Filtered scopes for Scopes / Tasks view
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !scopeSearch.trim() ||
        t.name.toLowerCase().includes(scopeSearch.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(scopeSearch.toLowerCase())) ||
        String(t.id).includes(scopeSearch);

      const matchesStatus =
        scopeStatusFilter === "All" ||
        (scopeStatusFilter === "Active" ? t.status === "Processing" || t.status === "Initiating" : t.status === scopeStatusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [tasks, scopeSearch, scopeStatusFilter]);

  // Export PDF Report with Audit Logging
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const isDark = theme === "dark";
      const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("project_id", projectId || "")
        .order("created_at", { ascending: false })
        .limit(50);

      const { doc } = await generateReportPdf({
        tasks,
        projectInfo,
        isDark,
        notifications: notifications || [],
        branding: isPremium && branding ? {
          company_name: branding.company_name,
          logo_url: branding.logo_url,
          accent_color: branding.accent_color,
          tagline: branding.tagline,
          website_url: branding.website_url,
        } : null,
      });

      doc.save(`SightLine_Client_Report_${projectInfo.projectRef || "PROJECT"}_${today.replace(/\s/g, "-")}.pdf`);

      await logAuditEvent({
        action: "report.export_pdf",
        resourceType: "project",
        resourceId: projectId,
        details: { reportType: selectedReportType, format: "PDF" },
      });

      toast({
        title: "Client Report Exported",
        description: "Official project status report has been generated and downloaded.",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Failed to generate report document.",
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  // Export CSV Data with Audit Logging
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const headers = ["Task #", "Scope of Work", "Status", "Duration (Days)", "Start Day Offset", "Dependencies"];
      const rows = tasks.map((t) => [
        t.id,
        `"${(t.name || "").replace(/"/g, '""')}"`,
        t.status,
        t.duration,
        t.startDay,
        `"${(t.dependencies || []).join(", ")}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [
        `# SightLine Client Project Status Export: ${projectInfo.title} (${projectInfo.projectRef})`,
        `# Generated: ${new Date().toISOString()}`,
        headers.join(","),
        ...rows.map((e) => e.join(",")),
      ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SightLine_Data_${projectInfo.projectRef || "REF"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await logAuditEvent({
        action: "report.export_csv",
        resourceType: "project",
        resourceId: projectId,
        details: { format: "CSV", recordCount: tasks.length },
      });

      toast({
        title: "CSV Dataset Exported",
        description: `${tasks.length} task records downloaded.`,
      });
    } catch (err: any) {
      toast({
        title: "CSV Export Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-12 w-full">
      {/* ── Client Portal Executive Header Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card glow-border p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 flex items-center gap-1.5 shadow-sm">
                <Eye className="w-3 h-3 text-primary" />
                Dedicated Client Monitoring Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-secondary/80 text-muted-foreground border border-border/40">
                REF: {projectInfo.projectRef || "PRO-5579R6"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-secondary/60 text-muted-foreground border border-border/40 flex items-center gap-1">
                <Shield className="w-3 h-3 text-primary" />
                Read-Only Supervisory Clearance
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {projectInfo.title || "Project Command Center"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
              <span>Client: <strong className="text-foreground">{projectInfo.client || "Client Organization"}</strong></span>
              <span>•</span>
              <span>Contractor: <strong className="text-foreground">{projectInfo.company || "Fabulouzz Technologies"}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {projectInfo.location || "Location"}</span>
              {projectInfo.startDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {projectInfo.startDate} → {projectInfo.endDate || "Ongoing"}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Download formal executive PDF report"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{exportingPdf ? "Generating..." : "Download PDF Report"}</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border/40 bg-secondary/40 hover:bg-secondary/70 text-foreground transition-all disabled:opacity-50 cursor-pointer"
              title="Export complete task telemetry in CSV format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingCsv ? "Exporting..." : "Export CSV"}</span>
            </button>
          </div>
        </div>

        {/* Portal Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-5 pt-3.5 border-t border-border/30 overflow-x-auto pb-1">
          {[
            { id: "dashboard" as const, label: "Executive Dashboard", icon: BarChart3 },
            { id: "timeline" as const, label: "Timeline & Schedule", icon: Calendar },
            { id: "scopes" as const, label: "Scope & Deliverables", icon: CheckSquare },
            { id: "kanban" as const, label: "Kanban Pipeline", icon: LayoutGrid },
            { id: "reports" as const, label: "Executive Reports", icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === "dashboard" && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-primary-foreground font-mono ml-0.5">
                  Timeline in Dash
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── TAB 1: EXECUTIVE DASHBOARD (SAME AS ADMIN DASHBOARD + TIMELINE IN DASH) ── */}
      {activeTab === "dashboard" && (
        <motion.div
          key="client-dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 sm:space-y-4 md:space-y-5"
        >
          {/* Top Real-Time Status & Notification Tickers */}
          <div className="space-y-2 sm:space-y-3">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <StatusTicker />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <NotificationTicker />
            </motion.div>
          </div>

          {/* 3-Column Command Grid (Exact parity with admin dashboard) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-5 items-stretch">
            {/* Column 1: Left Stack (md:col-span-3) - Top: Health & KPI, Bottom: Overall Progress Ring */}
            <div className="md:col-span-3 flex flex-col gap-3 sm:gap-4 h-full">
              <ProjectHealthCard />
              <motion.div
                className="glass-card p-3 sm:p-3.5 flex flex-col items-center justify-between flex-1 min-h-0 overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18 }}
              >
                {/* Top Header for Overall Progress */}
                <div className="w-full flex items-center justify-between pb-1 border-b border-border/20 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Overall Progress
                  </span>
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {progress}%
                  </span>
                </div>

                {/* Dead-centered Status Circle */}
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full my-auto py-1.5">
                  <ProgressRing progress={progress} size={92} strokeWidth={8} />
                </div>

                {/* Bottom Metric Counts - Strictly Contained Inside Box */}
                <div className="grid grid-cols-3 gap-1.5 w-full pt-1.5 border-t border-border/30 text-center shrink-0">
                  <div className="py-1 px-1.5 rounded-lg bg-secondary/40">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground block leading-tight">Done</span>
                    <span className="text-xs font-mono font-bold text-emerald-500 leading-tight">
                      {metrics.completed}
                    </span>
                  </div>
                  <div className="py-1 px-1.5 rounded-lg bg-secondary/40">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground block leading-tight">Active</span>
                    <span className="text-xs font-mono font-bold text-amber-500 leading-tight">
                      {metrics.processing + metrics.initiating}
                    </span>
                  </div>
                  <div className="py-1 px-1.5 rounded-lg bg-secondary/40">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground block leading-tight">Queue</span>
                    <span className="text-xs font-mono font-bold text-muted-foreground leading-tight">
                      {metrics.planning}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Column 2: Center Stack (md:col-span-5) - Top: Key Milestones, Bottom: Ongoing Works */}
            <div className="md:col-span-5 flex flex-col gap-3 sm:gap-4 h-full">
              <motion.div
                className="flex-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* MilestoneCountdown in pure read-only mode (onManageTimeline omitted to prevent admin edit buttons) */}
                <MilestoneCountdown />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
              >
                <OngoingWorks
                  onOpenDetails={() => handleTabChange("scopes")}
                  onOpenTimeline={() => {
                    const el = document.getElementById("client-embedded-timeline");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth" });
                    } else {
                      handleTabChange("timeline");
                    }
                  }}
                />
              </motion.div>
            </div>

            {/* Column 3: Right Stack (md:col-span-4) - Top: Weather Widget, Bottom: Project Info Card */}
            <div className="md:col-span-4 flex flex-col gap-3 sm:gap-4 h-full">
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                <WeatherWidget />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 flex flex-col h-full min-h-0"
              >
                <ProjectInfoCard
                  onEditDetails={() => handleTabChange("scopes")}
                />
              </motion.div>
            </div>
          </div>

          {/* Real-time Field Updates Feed */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <LiveNotifications />
          </motion.div>

          {/* ── EMBEDDED MASTER GANTT TIMELINE (TIMELINE IN DASH) ── */}
          <motion.div
            id="client-embedded-timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Master Project Timeline & Milestone Execution (In-Dashboard)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2.5 py-0.5 rounded-full border border-border/30">
                  {tasks.length} Scopes Scheduled • Read-Only Telemetry
                </span>
                <button
                  onClick={() => handleTabChange("timeline")}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Full View
                </button>
              </div>
            </div>

            <GanttChart onManageTimeline={() => handleTabChange("scopes")} />
          </motion.div>

          {/* ── APPROVED SCOPE OF WORK & DELIVERABLES REGISTER (SUMMARY IN DASH) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass-card p-4 sm:p-5 rounded-2xl border border-border/40 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Approved Scope of Work & Deliverables Register
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified register of project milestones, specification stages, and completion certificates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {metrics.total} Deliverables
                </span>
                <button
                  onClick={() => handleTabChange("scopes")}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer ml-1"
                >
                  View All & Filter →
                </button>
              </div>
            </div>

            <div className="divide-y divide-border/20">
              {tasks.slice(0, 6).map((t) => (
                <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded flex-shrink-0">
                      #{String(t.id).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{t.name}</h4>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-mono">
                        <span>Duration: <strong className="text-foreground">{t.duration} days</strong></span>
                        <span>•</span>
                        <span>Start Day: Offset +{t.startDay}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                        t.status === "Completed"
                          ? "bg-completed/15 text-completed border-completed/30"
                          : t.status === "Processing"
                          ? "bg-processing/15 text-processing border-processing/30"
                          : t.status === "Initiating"
                          ? "bg-initiating/15 text-initiating border-initiating/30"
                          : "bg-planning/15 text-planning border-planning/30"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Official Client Notice Banner */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/30 flex items-start gap-3">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">Official Client Assurance:</strong> All data presented in this monitoring portal is synchronized in real time with field updates submitted by authorized project engineers and verified by the Contractor Administration. This portal operates under strict read-only observation protocols.
              </div>
            </div>
          </motion.div>

          {/* Email Subscription Component */}
          <EmailSubscription />
        </motion.div>
      )}

      {/* ── TAB 2: DEDICATED TIMELINE & SCHEDULE VIEW ── */}
      {activeTab === "timeline" && (
        <motion.div
          key="client-timeline"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 glass-card p-5 rounded-2xl border border-border/40 space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Master Project Schedule Telemetry
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full-scale Gantt view showing planned delivery sequences, critical path offsets, and verified completion states across all approved work packages.
              </p>
              <div className="flex items-center gap-4 pt-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Total Duration</span>
                  <strong className="text-foreground text-sm">{metrics.totalDays} Days</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Project Start</span>
                  <strong className="text-foreground text-sm">{projectInfo.startDate || "TBD"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Target Completion</span>
                  <strong className="text-foreground text-sm">{projectInfo.endDate || "Ongoing"}</strong>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-border/40 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Milestones Status</span>
              <div className="grid grid-cols-2 gap-2 my-2">
                <div className="p-2.5 rounded-xl bg-completed/10 border border-completed/20">
                  <span className="text-[10px] uppercase font-bold text-completed block">Delivered</span>
                  <span className="text-xl font-bold font-mono text-completed">{metrics.completed}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-processing/10 border border-processing/20">
                  <span className="text-[10px] uppercase font-bold text-processing block">In Progress</span>
                  <span className="text-xl font-bold font-mono text-processing">{metrics.processing + metrics.initiating}</span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {metrics.planning} future scopes in schedule queue
              </span>
            </div>
          </div>

          <GanttChart onManageTimeline={() => handleTabChange("scopes")} />
        </motion.div>
      )}

      {/* ── TAB 3: APPROVED SCOPES & DELIVERABLES REGISTER ── */}
      {activeTab === "scopes" && (
        <motion.div
          key="client-scopes"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Search & Filter Bar */}
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/40 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  Approved Scope of Work & Deliverables Register
                </h3>
                <p className="text-xs text-muted-foreground">
                  Comprehensive register of verified specifications and execution progress.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 self-start md:self-auto font-mono">
                {filteredTasks.length} of {tasks.length} Scopes Shown
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-border/30">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={scopeSearch}
                  onChange={(e) => setScopeSearch(e.target.value)}
                  placeholder="Search scopes by name, description, or ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-secondary/40 border border-border/40 focus:border-primary/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["All", "Completed", "Active", "Planning"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScopeStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      scopeStatusFilter === s
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List of Tasks */}
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/40 divide-y divide-border/20">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No deliverables match your search criteria.
              </div>
            ) : (
              filteredTasks.map((t) => (
                <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/15 transition-colors px-2 rounded-xl">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded flex-shrink-0">
                      #{String(t.id).padStart(2, "0")}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-mono flex-wrap">
                        <span>Duration: <strong className="text-foreground">{t.duration} days</strong></span>
                        <span>•</span>
                        <span>Starts: Day Offset +{t.startDay}</span>
                        {t.dependencies && t.dependencies.length > 0 && (
                          <>
                            <span>•</span>
                            <span>Depends on: {t.dependencies.map((d) => `#${d}`).join(", ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                        t.status === "Completed"
                          ? "bg-completed/15 text-completed border-completed/30"
                          : t.status === "Processing"
                          ? "bg-processing/15 text-processing border-processing/30"
                          : t.status === "Initiating"
                          ? "bg-initiating/15 text-initiating border-initiating/30"
                          : "bg-planning/15 text-planning border-planning/30"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* ── TAB 4: READ-ONLY KANBAN PROGRESS ── */}
      {activeTab === "kanban" && (
        <motion.div
          key="client-kanban"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between shadow-sm">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong className="text-primary font-semibold">Read-Only Kanban Progress Telemetry:</strong> Column positions reflect live, verified field completion. Card moving and scope alteration are strictly restricted to contractor operations.
              </span>
            </span>
          </div>
          <KanbanBoard />
        </motion.div>
      )}

      {/* ── TAB 5: EXECUTIVE REPORTS & DATA EXPORTS ── */}
      {activeTab === "reports" && (
        <motion.div
          key="client-reports"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 sm:p-6 rounded-2xl border border-border/40 space-y-6"
        >
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Generate Official Project Progress Reports</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select authorized reporting period and export in official executive format with complete branding and telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: "overall", title: "Overall Status Report", desc: "Complete executive summary of project scope, timelines, and progress metrics." },
              { id: "daily", title: "Daily Progress Digest", desc: "24-hour snapshot of active site deliverables, completed tasks, and milestones." },
              { id: "weekly", title: "Weekly Progress Review", desc: "Seven-day cumulative telemetry, schedule deviations, and forecast completion." },
              { id: "scope", title: "Scope Completion Report", desc: "Detailed breakdown of all approved scopes of work and delivery certificates." },
            ].map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedReportType(r.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedReportType === r.id
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border/40 bg-secondary/30 hover:border-border/70"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className={`w-2 h-2 rounded-full ${selectedReportType === r.id ? "bg-primary" : "bg-transparent"}`} />
                </div>
                <h4 className="text-xs font-bold text-foreground">{r.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{r.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Export Selected Executive Report</h4>
              <p className="text-[11px] text-muted-foreground">PDF formatted for executive review, stakeholder presentation, and printing.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>{exportingPdf ? "Generating PDF..." : "Export Official PDF"}</span>
              </button>
              <button
                onClick={handleExportCsv}
                disabled={exportingCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border/40 bg-card hover:bg-secondary/60 text-foreground transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{exportingCsv ? "Exporting CSV..." : "Export CSV Data"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ClientPortal;
