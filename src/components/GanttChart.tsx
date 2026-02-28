import { getCalendarDays, getStatusColor, type TaskStatus } from "@/data/projectData";
import { motion } from "framer-motion";
import { useRef, useState, useMemo } from "react";
import { useProjectData } from "@/contexts/ProjectDataContext";

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
  const { tasks } = useProjectData();
  const days = getCalendarDays();
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const cellWidth = 44;
  const scopeColWidth = 360;
  const rowHeight = 44;
  const headerHeight = 56;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const projectStart = new Date(2026, 1, 21);
  const todayOffset = Math.floor((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Build dependency arrows
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
  }, [tasks]);

  const svgHeight = tasks.length * rowHeight;
  const svgWidth = days.length * cellWidth;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Project Timeline</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Assigned schedule • View only</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {(["Completed", "Processing", "Initiating", "Planning"] as TaskStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${statusBgMap[getStatusColor(s)]}`} />
              <span className="text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-auto max-h-[600px]" ref={scrollContainerRef}>
        <div className="flex min-w-max">
          {/* Sticky Scope Column */}
          <div
            className="flex-shrink-0 border-r border-border/50 bg-card z-20 sticky left-0"
            style={{ width: scopeColWidth }}
          >
            <div
              className="border-b border-border/50 flex items-center px-4 bg-card z-30 sticky top-0"
              style={{ height: headerHeight }}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope of Work</span>
            </div>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center px-4 border-b border-border/30 transition-colors ${hoveredTask === task.id ? "bg-secondary/50" : ""} ${task.status === "Processing" ? "bg-processing/5" : ""}`}
                style={{ height: rowHeight }}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                <span className="text-xs font-mono text-muted-foreground mr-3 w-6 flex-shrink-0">{task.id}</span>
                <span
                  className={`text-xs leading-tight ${task.status === "Processing" ? "text-processing font-medium" : "text-foreground"}`}
                  style={{ wordBreak: "break-word", whiteSpace: "normal" }}
                >
                  {task.name}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline area */}
          <div className="flex-1 relative">
            {/* Day headers - sticky top */}
            <div className="flex border-b border-border/50 sticky top-0 bg-card z-10" style={{ height: headerHeight }}>
              {days.map((day, i) => {
                const isToday = i === todayOffset;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center border-r border-border/20 relative ${day.isWeekend ? "bg-secondary/30" : ""} ${isToday ? "bg-primary/15" : ""}`}
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    {day.monthLabel && <span className="text-[9px] font-semibold text-primary uppercase">{day.monthLabel}</span>}
                    <span className="text-[10px] text-muted-foreground">{day.dayOfWeek}</span>
                    <span className={`text-xs font-mono ${isToday ? "text-primary font-bold" : "text-foreground"}`}>{day.label}</span>
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

              return (
                <div
                  key={task.id}
                  className={`flex items-center relative border-b border-border/20 ${hoveredTask === task.id ? "bg-secondary/30" : ""}`}
                  style={{ height: rowHeight }}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  {/* Weekend / today column shading */}
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

                  {/* Task bar — static, no vibrating animation */}
                  <div
                    className={`absolute rounded-md ${statusBgMap[getStatusColor(task.status)]} ${isProcessing ? "ring-1 ring-processing/50" : ""} overflow-hidden`}
                    style={{
                      left: task.startDay * cellWidth + 4,
                      width: barWidth,
                      height: rowHeight - 14,
                    }}
                    title={`${task.name} (${task.status} ${progress}%) — Day ${task.startDay + 1} to ${task.startDay + task.duration}`}
                  >
                    {/* Progress fill overlay */}
                    {progress > 0 && progress < 100 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-background/15 rounded-l-md"
                        style={{ width: `${progress}%` }}
                      />
                    )}

                    {/* Loading bar for processing (CSS animation, not vibrating) */}
                    {isProcessing && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20 overflow-hidden">
                        <div
                          className="h-full bg-background/50 rounded-full animate-[slideBar_2s_ease-in-out_infinite]"
                          style={{ width: "40%" }}
                        />
                      </div>
                    )}

                    {/* Label + percentage */}
                    <span className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-medium text-background/90 pointer-events-none">
                      <span className="truncate">
                        {task.duration >= 3 ? task.name.split(" ").slice(0, 3).join(" ") : ""}
                      </span>
                      <span className="flex-shrink-0 ml-1 font-bold text-[8px] bg-background/20 rounded px-1">
                        {progress}%
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Today reference line + Dependency arrows SVG overlay */}
            <svg
              className="absolute pointer-events-none"
              style={{ top: headerHeight, left: 0, width: svgWidth, height: svgHeight }}
            >
              {/* Today vertical reference line */}
              {todayOffset >= 0 && todayOffset < days.length && (
                <>
                  <line
                    x1={todayOffset * cellWidth + cellWidth / 2}
                    y1={0}
                    x2={todayOffset * cellWidth + cellWidth / 2}
                    y2={svgHeight}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    opacity="0.6"
                  />
                  <circle
                    cx={todayOffset * cellWidth + cellWidth / 2}
                    cy={0}
                    r="3"
                    fill="hsl(var(--primary))"
                    opacity="0.8"
                  >
                    <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </svg>
            <svg
              className="absolute pointer-events-none"
              style={{ top: headerHeight, left: 0, width: svgWidth, height: svgHeight }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--muted-foreground))" opacity="0.5" />
                </marker>
              </defs>
              {arrows.map((a, i) => {
                const midX = (a.fromX + a.toX) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${a.fromX} ${a.fromY} C ${midX} ${a.fromY}, ${midX} ${a.toY}, ${a.toX} ${a.toY}`}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    strokeOpacity="0.35"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
            </svg>

          </div>
        </div>
      </div>

      {/* CSS animation for loading bar */}
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
