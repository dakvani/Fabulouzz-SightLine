import { motion } from "framer-motion";
import { getCalendarDays, getStatusColor, type TaskStatus } from "@/data/projectData";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useRef, useState } from "react";
import { useProjectData } from "@/contexts/ProjectDataContext";

const statusBgMap: Record<string, string> = {
  completed: "bg-completed",
  processing: "bg-processing",
  initiating: "bg-initiating",
  planning: "bg-planning",
};

const GanttChart = () => {
  const { tasks } = useProjectData();
  const days = getCalendarDays();
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const cellWidth = 44;
  const scopeColWidth = 360;
  const rowHeight = 44;

  const today = new Date(2026, 1, 27);
  const projectStart = new Date(2026, 1, 21);
  const todayOffset = Math.floor((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

      {/* Gantt body with sticky scope column and sticky day headers */}
      <div className="relative overflow-auto max-h-[600px]" ref={scrollContainerRef}>
        <div className="flex min-w-max">
          {/* Sticky Scope Column */}
          <div
            className="flex-shrink-0 border-r border-border/50 bg-card z-20 sticky left-0"
            style={{ width: scopeColWidth }}
          >
            {/* Scope header - sticky top+left */}
            <div
              className="border-b border-border/50 flex items-center px-4 bg-card z-30 sticky top-0"
              style={{ height: 56 }}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope of Work</span>
            </div>
            {/* Scope rows */}
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
            <div className="flex border-b border-border/50 sticky top-0 bg-card z-10" style={{ height: 56 }}>
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center border-r border-border/20 ${day.isWeekend ? "bg-secondary/30" : ""} ${i === todayOffset ? "bg-primary/10" : ""}`}
                  style={{ width: cellWidth, minWidth: cellWidth }}
                >
                  {day.monthLabel && <span className="text-[9px] font-semibold text-primary uppercase">{day.monthLabel}</span>}
                  <span className="text-[10px] text-muted-foreground">{day.dayOfWeek}</span>
                  <span className={`text-xs font-mono ${i === todayOffset ? "text-primary font-bold" : "text-foreground"}`}>{day.label}</span>
                </div>
              ))}
            </div>

            {/* Task bars */}
            {tasks.map((task) => {
              const isActive = task.status === "Processing";
              return (
                <div
                  key={task.id}
                  className={`flex items-center relative border-b border-border/20 ${hoveredTask === task.id ? "bg-secondary/30" : ""}`}
                  style={{ height: rowHeight }}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  {/* Weekend / today column shading */}
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 ${day.isWeekend ? "bg-secondary/20" : ""} ${i === todayOffset ? "border-l-2 border-primary/40" : ""}`}
                      style={{ left: i * cellWidth, width: cellWidth }}
                    />
                  ))}

                  {/* Task bar — only animate active (Processing) tasks */}
                  {isActive ? (
                    <motion.div
                      className={`absolute rounded-md ${statusBgMap[getStatusColor(task.status)]} ring-1 ring-processing/50 overflow-hidden`}
                      style={{
                        left: task.startDay * cellWidth + 4,
                        width: task.duration * cellWidth - 8,
                        height: rowHeight - 14,
                      }}
                      animate={{
                        boxShadow: [
                          "0 0 0px hsl(var(--processing))",
                          "0 0 12px hsl(var(--processing))",
                          "0 0 0px hsl(var(--processing))",
                        ],
                      }}
                      transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
                      title={`${task.name} (${task.status}) — Day ${task.startDay + 1} to ${task.startDay + task.duration}`}
                    >
                      {/* Animated loading bar for Processing */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20 overflow-hidden">
                        <motion.div
                          className="h-full bg-background/50 rounded-full"
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          style={{ width: "40%" }}
                        />
                      </div>
                      {task.duration >= 3 && (
                        <span className="absolute inset-0 flex items-center px-2 text-[9px] font-medium text-background/90 truncate pointer-events-none">
                          {task.name.split(" ").slice(0, 3).join(" ")}
                        </span>
                      )}
                    </motion.div>
                  ) : (
                    <div
                      className={`absolute rounded-md ${statusBgMap[getStatusColor(task.status)]}`}
                      style={{
                        left: task.startDay * cellWidth + 4,
                        width: task.duration * cellWidth - 8,
                        height: rowHeight - 14,
                      }}
                      title={`${task.name} (${task.status}) — Day ${task.startDay + 1} to ${task.startDay + task.duration}`}
                    >
                      {task.duration >= 3 && (
                        <span className="absolute inset-0 flex items-center px-2 text-[9px] font-medium text-background/90 truncate pointer-events-none">
                          {task.name.split(" ").slice(0, 3).join(" ")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Today marker line */}
            <div
              className="absolute bottom-0 w-0.5 bg-primary/60 z-10"
              style={{ left: todayOffset * cellWidth + cellWidth / 2, top: 56 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
