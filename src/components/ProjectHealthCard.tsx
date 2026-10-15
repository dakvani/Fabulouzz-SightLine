import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { parseProjectDate } from "@/lib/projectTimeline";

export const ProjectHealthCard = () => {
  const { tasks, projectInfo } = useProjectData();

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Completed").length;
    const processing = tasks.filter((t) => t.status === "Processing").length;
    const initiating = tasks.filter((t) => t.status === "Initiating").length;

    // Timeline calculation
    const start = parseProjectDate(projectInfo.startDate, new Date());
    const end = parseProjectDate(projectInfo.endDate, new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const elapsed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Health Score calculation (0 - 100)
    let healthScore = 98;
    if (remaining < 0) healthScore = 65;
    else if (remaining <= 7 && total - completed > 2) healthScore = 78;
    else if (processing > 0 || completed > 0) healthScore = 96;

    const velocity = total > 0 ? ((completed + processing * 0.5) / Math.max(1, total)) * 100 : 0;

    return {
      total,
      completed,
      processing,
      initiating,
      totalDays,
      elapsed: Math.min(elapsed, totalDays),
      remaining,
      healthScore,
      velocity: Math.round(velocity),
      status: remaining < 0 ? "Critical Overdue" : remaining <= 14 ? "Tight Buffer" : "Optimal Pace",
      statusColor: remaining < 0 ? "text-destructive" : remaining <= 14 ? "text-amber-500" : "text-emerald-500",
      dotBg: remaining < 0 ? "bg-destructive" : remaining <= 14 ? "bg-amber-500" : "bg-emerald-500",
    };
  }, [tasks, projectInfo]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="glass-card p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden relative shrink-0"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Project Health & KPI
            </h3>
            <span className="text-[9px] text-muted-foreground/80 font-mono">
              Live Readiness Score
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/60 border border-border/40">
          <div className={`w-1.5 h-1.5 rounded-full ${metrics.dotBg} animate-pulse`} />
          <span className={`text-[10px] font-bold ${metrics.statusColor}`}>
            {metrics.healthScore}%
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics: Line by Line Layout */}
      <div className="space-y-1.5 my-2">
        {/* Line 1: Schedule Status */}
        <div className="px-2.5 py-1.5 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground block leading-tight">
                Schedule Status
              </span>
              <span className={`text-[11px] font-bold ${metrics.statusColor} block truncate leading-tight`}>
                {metrics.status}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
              {metrics.remaining >= 0 ? `${metrics.remaining}d remaining` : `${Math.abs(metrics.remaining)}d overdue`}
            </span>
          </div>
        </div>

        {/* Line 2: Active Scope & Deliverables */}
        <div className="px-2.5 py-1.5 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground block leading-tight">
                Active Deliverables
              </span>
              <span className="text-[11px] font-bold text-foreground block truncate leading-tight">
                {metrics.processing} Active • {metrics.completed} Done
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] font-mono text-muted-foreground">
              of {metrics.total} total deliverables
            </span>
          </div>
        </div>

        {/* Line 3: Milestone Gate SLA */}
        <div className="px-2.5 py-1.5 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground block leading-tight">
                Milestone Gate
              </span>
              <span className="text-[11px] font-bold text-emerald-500 block truncate leading-tight">
                On Track • 0 Blockers
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] font-mono text-muted-foreground">
              Day {metrics.elapsed} of {metrics.totalDays}
            </span>
          </div>
        </div>

        {/* Line 4: Operational Velocity & Bar */}
        <div className="px-2.5 py-1.5 rounded-xl bg-secondary/30 border border-border/30 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <TrendingUp className="w-3 h-3" />
              </div>
              <div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground block leading-tight">
                  Operational Velocity
                </span>
                <span className="text-[10px] font-semibold text-foreground leading-tight">
                  Sprint Delivery Rate
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-primary text-[10px] bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
              {metrics.velocity}%
            </span>
          </div>
          <div className="w-full h-1 bg-secondary/70 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${metrics.velocity}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "var(--gradient-primary)" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectHealthCard;
