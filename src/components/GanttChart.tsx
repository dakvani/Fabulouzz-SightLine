import { getStatusColor, type TaskStatus } from "@/data/projectData";
import { motion } from "framer-motion";
import { useRef, useState, useMemo, useEffect } from "react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCalendarDays, getTaskDateRange, getTimelineEndDate, parseProjectDate } from "@/lib/projectTimeline";

const statusBgMap: Record<string, string> = {
  completed: "bg-completed",
  processing: "bg-processing",
  initiating: "bg-initiating",
  planning: "bg-planning",
};

const statusProgress: Record<TaskStatus, number> = {
  Completed: 100,
  Processing: 50,
  Initiating: 20,
  Planning: 0,
};

const statusColorVar: Record<string, string> = {
  completed: "hsl(var(--completed))",
  processing: "hsl(var(--processing))",
  initiating: "hsl(var(--initiating))",
  planning: "hsl(var(--planning))",
};

const GanttChart = () => {
  const { tasks, projectInfo } = useProjectData();
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const cellWidth = isMobile ? 32 : 44;
  const scopeColWidth = isMobile ? 180 : 440;
  const rowHeight = isMobile ? 36 : 48;
  const headerHeight = isMobile ? 44 : 56;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const projectStart = useMemo(
    () => parseProjectDate(projectInfo.startDate, new Date(2026, 1, 21)),
    [projectInfo.startDate]
  );
  const timelineEndDate = useMemo(
    () => getTimelineEndDate(projectInfo, tasks),
    [projectInfo, tasks]
  );
  const days = useMemo(
    () => getCalendarDays(projectStart, timelineEndDate),
    [projectStart, timelineEndDate]
  );
  const todayOffset = Math.floor((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current && todayOffset > 0) {
      const scrollTo = Math.max(0, todayOffset * cellWidth - scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollLeft = scrollTo;
    }
  }, [todayOffset, cellWidth]);

  const arrows = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const result: { fromX: number; fromY: number; toX: number; toY: number; color: string }[] = [];

    tasks.forEach((task, idx) => {
      if (!task.dependencies) return;
      task.dependencies.forEach(depId => {
        const dep = taskMap.get(depId);
        if (!dep) return;
        const depIdx = tasks.findIndex(t => t.id === depId);
        if (depIdx === -1) return;

        const fromX = (dep.startDay + dep.duration) * cellWidth - 4;
        const fromY = depIdx * rowHeight + rowHeight / 2;
        const toX = task.startDay * cellWidth + 4;
        const toY = idx * rowHeight + rowHeight / 2;
        const colorKey = getStatusColor(task.status);

        result.push({ fromX, fromY, toX, toY, color: statusColorVar[colorKey] || "hsl(var(--muted-foreground))" });
      });
    });
    return result;
  }, [tasks, cellWidth, rowHeight]);

  const svgHeight = tasks.length * rowHeight;
  const svgWidth = days.length * cellWidth;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Project Timeline</h3>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">Assigned schedule • View only</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs flex-wrap">
          {(["Completed", "Processing", "Initiating", "Planning"] as TaskStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm ${statusBgMap[getStatusColor(s)]}`} />
              <span className="text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-auto max-h-[400px] sm:max-h-[600px]" ref={scrollContainerRef}>
        <div className="flex min-w-max">
          {/* Sticky Scope Column */}
          <div
            className="flex-shrink-0 border-r border-border/50 bg-card z-20 sticky left-0"
            style={{ width: scopeColWidth }}
          >
            <div
              className="border-b border-border/50 flex items-center px-3 sm:px-4 bg-card z-30 sticky top-0"
              style={{ height: headerHeight }}
            >
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope of Work</span>
            </div>
            {tasks.map((task) => {
              const taskDateRange = getTaskDateRange(projectStart, task.startDay, task.duration);
              return (
                <div
                  key={task.id}
                  className={`flex items-center px-3 sm:px-4 border-b border-border/30 transition-colors ${hoveredTask === task.id ? "bg-secondary/50" : ""} ${task.status === "Processing" ? "bg-processing/5" : ""}`}
                  style={{ height: rowHeight }}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  <span className="text-[10px] sm:text-xs font-mono text-muted-foreground mr-2 sm:mr-3 w-5 sm:w-6 flex-shrink-0">{task.id}</span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-[10px] sm:text-xs leading-tight block ${task.status === "Processing" ? "text-processing font-medium" : "text-foreground"}`}
                      style={{ wordBreak: "break-word", whiteSpace: "normal" }}
                    >
                      {isMobile ? task.name.slice(0, 30) + (task.name.length > 30 ? "…" : "") : task.name}
                    </span>
                    <span className={`text-[8px] sm:text-[9px] text-muted-foreground font-mono block mt-0.5`}>
                      {isMobile ? taskDateRange.compactLabel : taskDateRange.fullLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline area */}
          <div className="flex-1 relative">
            {/* Day headers */}
            <div className="flex border-b border-border/50 sticky top-0 bg-card z-10" style={{ height: headerHeight }}>
              {days.map((day, i) => {
                const isToday = i === todayOffset;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center border-r border-border/20 relative ${day.isWeekend ? "bg-secondary/30" : ""} ${isToday ? "bg-primary/15" : ""}`}
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    {day.monthLabel && <span className={`text-[7px] sm:text-[9px] font-semibold text-primary uppercase`}>{day.monthLabel}</span>}
                    <span className={`text-[8px] sm:text-[10px] text-muted-foreground`}>{day.dayOfWeek}</span>
                    <span className={`text-[10px] sm:text-xs font-mono ${isToday ? "text-primary font-bold" : "text-foreground"}`}>{day.label}</span>
                    {isToday && (
                      <motion.div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Task bars */}
            {tasks.map((task) => {
              const progress = statusProgress[task.status];
              const barWidth = task.duration * cellWidth - 8;
              const isProcessing = task.status === "Processing";
              const barHeight = rowHeight - (isMobile ? 10 : 14);

              return (
                <div
                  key={task.id}
                  className={`flex items-center relative border-b border-border/20 ${hoveredTask === task.id ? "bg-secondary/30" : ""}`}
                  style={{ height: rowHeight }}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  {days.map((day, i) => {
                    const isToday = i === todayOffset;
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 ${day.isWeekend ? "bg-secondary/20" : ""} ${isToday ? "bg-primary/10" : ""}`}
                        style={{ left: i * cellWidth, width: cellWidth }}
                      />
                    );
                  })}

                  <div
                    className={`absolute rounded-md ${statusBgMap[getStatusColor(task.status)]} ${isProcessing ? "ring-1 ring-processing/50" : ""} overflow-hidden`}
                    style={{
                      left: task.startDay * cellWidth + 4,
                      width: barWidth,
                      height: barHeight,
                    }}
                    title={`${task.name} (${task.status} ${progress}%) — Day ${task.startDay + 1} to ${task.startDay + task.duration}`}
                  >
                    {progress > 0 && progress < 100 && (
                      <div className="absolute inset-y-0 left-0 bg-background/15 rounded-l-md" style={{ width: `${progress}%` }} />
                    )}
                    {isProcessing && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20 overflow-hidden">
                        <div className="h-full bg-background/50 rounded-full animate-[slideBar_2s_ease-in-out_infinite]" style={{ width: "40%" }} />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-between px-1.5 sm:px-2 text-[7px] sm:text-[9px] font-medium text-background/90 pointer-events-none">
                      <span className="truncate">
                        {task.duration >= 3 ? (isMobile ? task.name.split(" ").slice(0, 2).join(" ") : task.name.split(" ").slice(0, 3).join(" ")) : ""}
                      </span>
                      <span className="flex-shrink-0 ml-1 font-bold text-[7px] sm:text-[8px] bg-background/20 rounded px-0.5 sm:px-1">
                        {progress}%
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Today reference line + Dependency arrows */}
            <svg className="absolute pointer-events-none" style={{ top: headerHeight, left: 0, width: svgWidth, height: svgHeight }}>
              {todayOffset >= 0 && todayOffset < days.length && (
                <>
                  <line
                    x1={todayOffset * cellWidth + cellWidth / 2} y1={0}
                    x2={todayOffset * cellWidth + cellWidth / 2} y2={svgHeight}
                    stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 3" opacity="0.6"
                  />
                  <circle cx={todayOffset * cellWidth + cellWidth / 2} cy={0} r="3" fill="hsl(var(--primary))" opacity="0.8">
                    <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </svg>
            {!isMobile && (
              <svg className="absolute pointer-events-none" style={{ top: headerHeight, left: 0, width: svgWidth, height: svgHeight }}>
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--muted-foreground))" opacity="0.5" />
                  </marker>
                </defs>
                {arrows.map((a, i) => {
                  const midX = (a.fromX + a.toX) / 2;
                  return (
                    <path key={i} d={`M ${a.fromX} ${a.fromY} C ${midX} ${a.fromY}, ${midX} ${a.toY}, ${a.toX} ${a.toY}`}
                      fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeOpacity="0.35" markerEnd="url(#arrowhead)" />
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default GanttChart;
