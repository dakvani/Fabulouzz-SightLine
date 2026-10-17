import { useState, useMemo } from "react";
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
  Info
} from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "next-themes";
import { generateReportPdf } from "@/lib/generateReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/auth/audit";
import ProgressRing from "./ProgressRing";
import KanbanBoard from "./KanbanBoard";
import GanttChart from "./GanttChart";
import WeatherWidget from "./WeatherWidget";

type ClientViewTab = "overview" | "scopes" | "kanban" | "timeline" | "reports";

export const ClientPortal = () => {
  const { projectInfo, tasks, projectId, refresh, loading } = useProjectData();
  const { branding, isPremium } = useBranding();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<ClientViewTab>("overview");
  const [selectedReportType, setSelectedReportType] = useState<string>("overall");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Compute metrics from tasks
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const processing = tasks.filter(t => t.status === "Processing").length;
    const initiating = tasks.filter(t => t.status === "Initiating").length;
    const planning = tasks.filter(t => t.status === "Planning").length;

    const weightedScore = total > 0
      ? (completed * 1 + processing * 0.5 + initiating * 0.2) / total
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
      const rows = tasks.map(t => [
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
        ...rows.map(e => e.join(",")),
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
    <div className="space-y-6 pb-12">
      {/* ── Client Portal Header Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card glow-border p-4 sm:p-6 rounded-2xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Dedicated Client Monitoring Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-secondary/80 text-muted-foreground border border-border/40">
                REF: {projectInfo.projectRef || "PRO-5579R6"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {projectInfo.title || "Project Command Center"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>Client: <strong className="text-foreground">{projectInfo.client || "Client Organization"}</strong></span>
              <span>•</span>
              <span>Contractor: <strong className="text-foreground">{projectInfo.company || "Fabulouzz Technologies"}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" /> {projectInfo.location || "Location"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all shadow-sm disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{exportingPdf ? "Exporting..." : "Download PDF Report"}</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border/40 bg-secondary/40 hover:bg-secondary/70 text-foreground transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingCsv ? "Exporting..." : "Export CSV"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-6 pt-4 border-t border-border/30 overflow-x-auto pb-1">
          {[
            { id: "overview" as const, label: "Project Overview", icon: BarChart3 },
            { id: "scopes" as const, label: "Scope & Deliverables", icon: CheckSquare },
            { id: "kanban" as const, label: "Kanban Progress", icon: LayoutGrid },
            { id: "timeline" as const, label: "Timeline & Milestones", icon: Calendar },
            { id: "reports" as const, label: "Executive Reports", icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 rounded-xl border border-border/40"
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground block mb-1">
                Completion Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {metrics.completionPercent}%
                </span>
                <span className="text-xs text-completed font-semibold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Live
                </span>
              </div>
              <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{ width: `${metrics.completionPercent}%` }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-4 rounded-xl border border-border/40"
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground block mb-1">
                Total Scopes / Tasks
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {metrics.total}
                </span>
                <span className="text-xs text-muted-foreground">approved</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {metrics.completed} finished • {metrics.processing} active
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-4 rounded-xl border border-border/40"
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground block mb-1">
                Planned Completion
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {projectInfo.endDate || "TBD"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" /> Starts {projectInfo.startDate}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-4 rounded-xl border border-border/40"
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground block mb-1">
                Supervision Contacts
              </span>
              <p className="text-xs font-semibold text-foreground truncate">
                PM: {projectInfo.contractorContactPerson || projectInfo.projectManager || "Riyaz Siraj"}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">
                {projectInfo.contractorContactPhone || "+966 54 987 6543"}
              </p>
              <p className="text-[11px] text-primary/80 mt-1 truncate">
                Client Lead: {projectInfo.clientContactPerson || projectInfo.reportingTo}
              </p>
            </motion.div>
          </div>

          {/* Progress Ring & Weather Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-border/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Execution Stage Breakdown
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {metrics.completed} of {metrics.total} Deliverables Handed Over
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-completed/10 border border-completed/20">
                  <span className="text-[10px] uppercase font-bold text-completed block">Completed</span>
                  <span className="text-2xl font-bold font-mono text-completed">{metrics.completed}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">100% verified</span>
                </div>

                <div className="p-3 rounded-xl bg-processing/10 border border-processing/20">
                  <span className="text-[10px] uppercase font-bold text-processing block">In Progress</span>
                  <span className="text-2xl font-bold font-mono text-processing">{metrics.processing}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Active site ops</span>
                </div>

                <div className="p-3 rounded-xl bg-initiating/10 border border-initiating/20">
                  <span className="text-[10px] uppercase font-bold text-initiating block">Initiating</span>
                  <span className="text-2xl font-bold font-mono text-initiating">{metrics.initiating}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Staging / Prep</span>
                </div>

                <div className="p-3 rounded-xl bg-planning/10 border border-planning/20">
                  <span className="text-[10px] uppercase font-bold text-planning block">Planning</span>
                  <span className="text-2xl font-bold font-mono text-planning">{metrics.planning}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Scheduled ahead</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border/30 flex items-start gap-3">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Official Client Notice:</strong> All data presented in this portal is synchronized in real time with field updates submitted by authorized project engineers and verified by the Contractor Administration.
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <WeatherWidget location={projectInfo.location} />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SCOPES & DELIVERABLES ── */}
      {activeTab === "scopes" && (
        <div className="glass-card p-5 rounded-2xl border border-border/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
            <div>
              <h3 className="text-base font-bold text-foreground">Approved Scope of Work & Deliverables</h3>
              <p className="text-xs text-muted-foreground">Comprehensive register of verified specifications and execution progress.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 self-start sm:self-auto">
              {metrics.total} Deliverable Items
            </span>
          </div>

          <div className="divide-y divide-border/20">
            {tasks.map(t => (
              <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded flex-shrink-0">
                    #{t.id}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span>Duration: <strong className="text-foreground">{t.duration} days</strong></span>
                      <span>•</span>
                      <span>Starts: Day {t.startDay}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
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
        </div>
      )}

      {/* ── TAB 3: READ-ONLY KANBAN MONITORING ── */}
      {activeTab === "kanban" && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <strong>Read-Only Kanban Progress Viewer:</strong> Card positions reflect verified site execution status. Dragging and editing are restricted to contractor operations.
            </span>
          </div>
          <KanbanBoard />
        </div>
      )}

      {/* ── TAB 4: TIMELINE & MILESTONES ── */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-border/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Project Timeline & Execution Schedule</h3>
                <p className="text-xs text-muted-foreground">Gantt-style representation of planned milestones and progress stages.</p>
              </div>
            </div>
            <GanttChart />
          </div>
        </div>
      )}

      {/* ── TAB 5: REPORTS & EXPORTS ── */}
      {activeTab === "reports" && (
        <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Generate Project Progress Reports</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select authorized reporting period and export in official client format.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: "overall", title: "Overall Status Report", desc: "Complete executive summary of project scope, timelines, and progress metrics." },
              { id: "daily", title: "Daily Progress Digest", desc: "24-hour snapshot of active site deliverables, completed tasks, and milestones." },
              { id: "weekly", title: "Weekly Progress Review", desc: "Seven-day cumulative telemetry, schedule deviations, and forecast completion." },
              { id: "scope", title: "Scope Completion Report", desc: "Detailed breakdown of all approved scopes of work and delivery certificates." },
            ].map(r => (
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
              <h4 className="text-xs font-bold text-foreground">Export Selected Report</h4>
              <p className="text-[11px] text-muted-foreground">PDF formatted for executive review and printing with company branding.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>{exportingPdf ? "Generating PDF..." : "Export Official PDF"}</span>
              </button>
              <button
                onClick={handleExportCsv}
                disabled={exportingCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border/40 bg-card hover:bg-secondary/60 text-foreground transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{exportingCsv ? "Exporting CSV..." : "Export CSV Data"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
