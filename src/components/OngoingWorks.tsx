import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Zap,
  Clock,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  PlayCircle,
  Calendar,
  Layers,
} from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { parseProjectDate, getTaskDateRange, formatTimelineDate } from "@/lib/projectTimeline";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OngoingWorksProps {
  onOpenDetails?: () => void;
  onOpenTimeline?: () => void;
}

export const OngoingWorks = ({
  onOpenDetails,
  onOpenTimeline,
}: OngoingWorksProps) => {
  const { tasks, projectInfo } = useProjectData();
  const projectStart = useMemo(
    () => parseProjectDate(projectInfo.startDate, new Date()),
    [projectInfo.startDate]
  );

  // Filter tasks currently in active flight (Processing first, then Initiating)
  const activeTasks = useMemo(() => {
    const processing = tasks.filter((t) => t.status === "Processing");
    const initiating = tasks.filter((t) => t.status === "Initiating");
    return [...processing, ...initiating];
  }, [tasks]);

  // If none are currently active, pick the next queued scopes from Planning
  const displayTasks = useMemo(() => {
    if (activeTasks.length > 0) {
      return activeTasks.slice(0, 3);
    }
    const planning = tasks.filter((t) => t.status === "Planning");
    return planning.slice(0, 2);
  }, [activeTasks, tasks]);

  const hasActiveExecution = activeTasks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="glass-card p-4 rounded-2xl h-full flex flex-col justify-between overflow-hidden relative border border-border/40 shadow-sm"
    >
      {/* Background ambient pulse for active works */}
      {hasActiveExecution && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-processing/5 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          {/* Constantly rotating / loading live execution icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              hasActiveExecution
                ? "bg-processing/15 text-processing shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Loader2 className="w-4 h-4" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ongoing Works
              </h3>
              <span
                className={`flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  hasActiveExecution
                    ? "bg-processing/10 text-processing border-processing/30"
                    : "bg-secondary text-muted-foreground border-border/40"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasActiveExecution ? "bg-processing animate-pulse" : "bg-muted-foreground/60"
                  }`}
                />
                {hasActiveExecution ? `${activeTasks.length} RUNNING` : "STANDBY"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 font-mono">
              {hasActiveExecution
                ? "Live Scopes in Active Execution"
                : "Next Scheduled Scopes in Queue"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTimeline && (
            <button
              onClick={onOpenTimeline}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
              title="View master Gantt timeline"
            >
              <span>Timeline</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Ongoing Scopes List */}
      <div className="space-y-2 my-2.5 flex-1 flex flex-col justify-center">
        {displayTasks.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border/40 text-center text-xs text-muted-foreground font-mono flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-completed" />
            <span>All project scopes have been successfully completed.</span>
          </div>
        ) : (
          <TooltipProvider delayDuration={150}>
            {displayTasks.map((task) => {
              const dateRange = getTaskDateRange(
                projectStart,
                task.startDay || 0,
                task.duration || 1
              );
              const isProcessing = task.status === "Processing";
              const isInitiating = task.status === "Initiating";

              return (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isProcessing
                      ? "bg-processing/10 border-processing/35 shadow-sm"
                      : isInitiating
                      ? "bg-initiating/10 border-initiating/30"
                      : "bg-secondary/30 border-border/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {/* Rotating loading spinner for in-flight task */}
                      <div className="mt-0.5 shrink-0">
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 text-processing animate-spin" />
                        ) : isInitiating ? (
                          <Zap className="w-4 h-4 text-initiating animate-pulse" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-mono font-bold text-muted-foreground">
                            #{String(task.id).padStart(2, "0")}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h4 className="text-xs font-semibold text-foreground truncate cursor-help">
                                {task.name}
                              </h4>
                            </TooltipTrigger>
                            {task.description && (
                              <TooltipContent
                                side="top"
                                className="max-w-xs text-xs p-2.5 bg-card/95 border border-border shadow-xl backdrop-blur-md"
                              >
                                <p className="font-bold text-primary mb-1">{task.name}</p>
                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                  {task.description}
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>

                        {task.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        isProcessing
                          ? "bg-processing/20 text-processing border border-processing/30"
                          : isInitiating
                          ? "bg-initiating/20 text-initiating border border-initiating/30"
                          : "bg-secondary text-muted-foreground border border-border/40"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  {/* Micro Progress Track & Timeframe */}
                  <div className="pt-1 border-t border-border/20 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground/70" />
                      <span>{dateRange.startDate}</span>
                    </span>
                    <span className="font-bold text-foreground">
                      {task.duration}d duration
                    </span>
                    <span className="text-primary font-semibold">
                      {isProcessing ? "Actively Running" : isInitiating ? "Mobilizing" : "Scheduled"}
                    </span>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        )}
      </div>

      {/* Footer Status summary */}
      <div className="flex items-center justify-between pt-2 border-t border-border/20 text-[10px]">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-processing" />
          <span>
            {hasActiveExecution
              ? `Site Operations: ${activeTasks.length} Live Scope${activeTasks.length > 1 ? "s" : ""} Processing`
              : "Site Operations: Standby (All Active Scopes Cleared)"}
          </span>
        </span>
        {onOpenDetails && (
          <button
            onClick={onOpenDetails}
            className="text-primary hover:underline font-semibold"
          >
            Manage Scopes
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default OngoingWorks;
