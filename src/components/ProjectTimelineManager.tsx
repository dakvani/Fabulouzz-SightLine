import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Save,
  Loader2,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  CalendarDays,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { parseProjectDate, getTaskDateRange, formatTimelineDate } from "@/lib/projectTimeline";
import GanttChart from "./GanttChart";

export const ProjectTimelineManager = () => {
  const { projectInfo, projectId, tasks, canEditProject, refresh } = useProjectData();

  // Project Master Dates
  const [startDate, setStartDate] = useState(projectInfo.startDate || "");
  const [endDate, setEndDate] = useState(projectInfo.endDate || "");
  const [savingProjectDates, setSavingProjectDates] = useState(false);

  // Sync when projectInfo changes
  useEffect(() => {
    setStartDate(projectInfo.startDate || "");
    setEndDate(projectInfo.endDate || "");
  }, [projectInfo.startDate, projectInfo.endDate]);

  // Task Durations local state (mapped by task id)
  const [taskDurations, setTaskDurations] = useState<Record<number, { duration: number; startDay: number }>>({});
  const [savingTaskId, setSavingTaskId] = useState<number | null>(null);
  const [savingAllTasks, setSavingAllTasks] = useState(false);

  useEffect(() => {
    const map: Record<number, { duration: number; startDay: number }> = {};
    tasks.forEach((t) => {
      map[t.id] = { duration: t.duration || 1, startDay: t.startDay || 0 };
    });
    setTaskDurations(map);
  }, [tasks]);

  // Derived Project Duration Calculations
  const startObj = useMemo(() => parseProjectDate(startDate, new Date()), [startDate]);
  const endObj = useMemo(() => parseProjectDate(endDate, new Date()), [endDate]);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diffTime = endObj.getTime() - startObj.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [startObj, endObj, startDate, endDate]);

  const totalWeeks = useMemo(() => (totalDays / 7).toFixed(1), [totalDays]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const daysElapsed = useMemo(() => {
    if (!startDate) return 0;
    const elapsed = Math.ceil((today.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(elapsed, totalDays));
  }, [startObj, today, totalDays, startDate]);

  const daysRemaining = useMemo(() => {
    if (!endDate) return 0;
    const remaining = Math.ceil((endObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return remaining;
  }, [endObj, today, endDate]);

  const timeProgressPercent = useMemo(() => {
    if (totalDays <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
  }, [daysElapsed, totalDays]);

  // Quick adjust duration by adding/subtracting days to endDate
  const handleAdjustDuration = (daysDelta: number) => {
    const currentEnd = parseProjectDate(endDate, new Date());
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + daysDelta);

    const formatted = newEnd.toISOString().split("T")[0];
    setEndDate(formatted);
  };

  // Set total duration directly in days
  const handleSetTotalDays = (targetDays: number) => {
    if (targetDays < 1) return;
    const baseStart = parseProjectDate(startDate, new Date());
    const newEnd = new Date(baseStart);
    newEnd.setDate(newEnd.getDate() + targetDays - 1);

    const formatted = newEnd.toISOString().split("T")[0];
    setEndDate(formatted);
  };

  // Save project master dates to Supabase
  const handleSaveMasterDates = async () => {
    if (!projectId || !canEditProject) return;
    setSavingProjectDates(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          start_date: startDate,
          end_date: endDate,
        })
        .eq("id", projectId);

      if (error) throw error;
      toast({
        title: "Timeline Updated",
        description: `Project duration saved: ${startDate} to ${endDate} (${totalDays} days).`,
      });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Failed to Update Timeline",
        description: err.message || "Could not save project dates.",
        variant: "destructive",
      });
    } finally {
      setSavingProjectDates(false);
    }
  };

  // Adjust specific task duration
  const handleTaskDurationDelta = (taskId: number, delta: number) => {
    setTaskDurations((prev) => {
      const current = prev[taskId] || { duration: 1, startDay: 0 };
      const nextDuration = Math.max(1, current.duration + delta);
      return {
        ...prev,
        [taskId]: { ...current, duration: nextDuration },
      };
    });
  };

  // Save single task duration
  const handleSaveTaskDuration = async (taskId: number) => {
    const item = taskDurations[taskId];
    if (!item || !projectId || !canEditProject) return;
    setSavingTaskId(taskId);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          duration: item.duration,
          start_day: item.startDay,
        })
        .eq("project_id", projectId)
        .eq("task_number", taskId);

      if (error) throw error;
      toast({
        title: "Task Duration Updated",
        description: `Task #${taskId} duration updated to ${item.duration} day(s).`,
      });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingTaskId(null);
    }
  };

  // Save all modified task durations
  const handleSaveAllTasks = async () => {
    if (!projectId || !canEditProject) return;
    setSavingAllTasks(true);
    try {
      for (const t of tasks) {
        const item = taskDurations[t.id];
        if (item && (item.duration !== t.duration || item.startDay !== t.startDay)) {
          await supabase
            .from("tasks")
            .update({
              duration: item.duration,
              start_day: item.startDay,
            })
            .eq("project_id", projectId)
            .eq("task_number", t.id);
        }
      }
      toast({
        title: "All Task Durations Saved",
        description: "Task schedule and timeline duration successfully updated.",
      });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingAllTasks(false);
    }
  };

  const isMasterDatesDirty =
    startDate !== (projectInfo.startDate || "") || endDate !== (projectInfo.endDate || "");

  const hasTaskChanges = tasks.some((t) => {
    const local = taskDurations[t.id];
    return local && (local.duration !== t.duration || local.startDay !== t.startDay);
  });

  return (
    <div className="space-y-6">
      {/* SECTION 1: MASTER TIMELINE & DURATION CONTROLS */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border/40 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/30">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Master Timeline & Project Duration
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control the overall project duration seen on the dashboard countdown, timeline header, and report schedules.
            </p>
          </div>

          {canEditProject && isMasterDatesDirty && (
            <motion.button
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveMasterDates}
              disabled={savingProjectDates}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md self-start sm:self-auto"
              style={{ background: "var(--gradient-primary)" }}
            >
              {savingProjectDates ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Master Timeline</span>
            </motion.button>
          )}
        </div>

        {/* Live Duration Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Duration
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-primary">{totalDays}</span>
              <span className="text-xs font-semibold text-foreground">Days</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">({totalWeeks} weeks)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Time Elapsed
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">{daysElapsed}</span>
              <span className="text-xs font-semibold text-muted-foreground">/ {totalDays}d</span>
            </div>
            <span className="text-[10px] text-primary font-semibold">{timeProgressPercent}% of timeline</span>
          </div>

          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Days Remaining
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-xl sm:text-2xl font-bold font-mono ${
                  daysRemaining < 0
                    ? "text-destructive"
                    : daysRemaining <= 7
                    ? "text-amber-500"
                    : "text-emerald-500"
                }`}
              >
                {daysRemaining}
              </span>
              <span className="text-xs font-semibold text-foreground">Days</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {daysRemaining >= 0 ? "Until Handover" : "Overdue"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Schedule Status
            </span>
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  daysRemaining < 0
                    ? "bg-destructive animate-pulse"
                    : daysRemaining <= 14
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              <span className="text-xs font-bold text-foreground">
                {daysRemaining < 0 ? "Schedule Overrun" : daysRemaining <= 14 ? "Critical Buffer" : "On Track"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Target: {endDate ? formatTimelineDate(endObj) : "Not Set"}
            </span>
          </div>
        </div>

        {/* Timeline Range Inputs & Quick Duration Adjusters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
          {/* Start & End Date Inputs */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Project Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!canEditProject}
                className="bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-full"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Project End Date (Handover)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!canEditProject}
                className="bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-full"
              />
            </div>
          </div>

          {/* Quick Duration Adjuster Tools */}
          <div className="md:col-span-7 space-y-3 p-4 rounded-xl bg-secondary/20 border border-border/30">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              Quick Duration Adjusters
            </span>
            <p className="text-[11px] text-muted-foreground">
              Directly extend or shrink the project schedule. The end date automatically recalculates based on your start date.
            </p>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1">
                Extend:
              </span>
              {[
                { label: "+7 Days", days: 7 },
                { label: "+14 Days", days: 14 },
                { label: "+30 Days", days: 30 },
                { label: "+60 Days", days: 60 },
                { label: "+90 Days", days: 90 },
                { label: "-7 Days", days: -7 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => handleAdjustDuration(btn.days)}
                  disabled={!canEditProject}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border/50 bg-secondary/50 text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Set Exact Days:
              </span>
              <div className="flex items-center gap-1.5">
                {[30, 60, 90, 120, 180, 240].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSetTotalDays(d)}
                    disabled={!canEditProject}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold border transition-colors ${
                      totalDays === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TASK-BY-TASK SCHEDULE & DURATION MANAGER */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Task Schedule & Individual Durations ({tasks.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit the duration in days for each milestone task. Start and end dates are computed automatically.
            </p>
          </div>

          {canEditProject && hasTaskChanges && (
            <motion.button
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveAllTasks}
              disabled={savingAllTasks}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md self-start sm:self-auto"
              style={{ background: "var(--gradient-primary)" }}
            >
              {savingAllTasks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save All Task Durations</span>
            </motion.button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tasks found in this project. Use the Tasks tab to add scope items.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="py-3 px-3 font-semibold w-12">#</th>
                  <th className="py-3 px-3 font-semibold min-w-[200px]">Scope of Work</th>
                  <th className="py-3 px-3 font-semibold w-24">Status</th>
                  <th className="py-3 px-3 font-semibold w-28">Start Offset</th>
                  <th className="py-3 px-3 font-semibold w-36">Duration (Days)</th>
                  <th className="py-3 px-3 font-semibold min-w-[140px]">Date Range</th>
                  <th className="py-3 px-3 font-semibold w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {tasks.map((task) => {
                  const local = taskDurations[task.id] || { duration: task.duration || 1, startDay: task.startDay || 0 };
                  const isDirty = local.duration !== task.duration || local.startDay !== task.startDay;
                  const range = getTaskDateRange(startObj, local.startDay, local.duration);

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-secondary/20 transition-colors ${
                        isDirty ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-muted-foreground">
                        #{task.task_number || task.id}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="font-medium text-foreground block truncate max-w-xs sm:max-w-md"
                          title={task.description ? `${task.name}\n\nDescription: ${task.description}` : task.name}
                        >
                          {task.name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            task.status === "Completed"
                              ? "bg-completed/15 text-completed border-completed/30"
                              : task.status === "Processing"
                              ? "bg-processing/15 text-processing border-processing/30"
                              : task.status === "Initiating"
                              ? "bg-initiating/15 text-initiating border-initiating/30"
                              : "bg-planning/15 text-planning border-planning/30"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={local.startDay}
                            disabled={!canEditProject}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setTaskDurations((p) => ({
                                ...p,
                                [task.id]: { ...p[task.id], startDay: val },
                              }));
                            }}
                            className="w-14 bg-secondary/50 border border-border/60 rounded-md px-2 py-1 text-xs font-mono text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-[10px] text-muted-foreground font-mono">d</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTaskDurationDelta(task.id, -1)}
                            disabled={!canEditProject || local.duration <= 1}
                            className="w-6 h-6 rounded border border-border/50 bg-secondary/40 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={local.duration}
                            disabled={!canEditProject}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setTaskDurations((p) => ({
                                ...p,
                                [task.id]: { ...p[task.id], duration: val },
                              }));
                            }}
                            className="w-14 bg-secondary/50 border border-border/60 rounded-md px-2 py-1 text-xs font-mono text-center font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleTaskDurationDelta(task.id, 1)}
                            disabled={!canEditProject}
                            className="w-6 h-6 rounded border border-border/50 bg-secondary/40 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-muted-foreground font-mono">days</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {range.compactLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {canEditProject && isDirty && (
                          <button
                            type="button"
                            onClick={() => handleSaveTaskDuration(task.id)}
                            disabled={savingTaskId === task.id}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all text-xs font-semibold"
                            title="Save task duration"
                          >
                            {savingTaskId === task.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: LIVE GANTT SCHEDULE VISUALIZER */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Live Dashboard Timeline Preview
          </h3>
          <span className="text-[10px] text-muted-foreground">
            Synchronized with SightLine Gantt engine
          </span>
        </div>
        <GanttChart />
      </div>
    </div>
  );
};

export default ProjectTimelineManager;
