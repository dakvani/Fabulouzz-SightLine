import { motion } from "framer-motion";
import { tasks, getCalendarDays, getStatusColor, type TaskStatus } from "@/data/projectData";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";

const statusBgMap: Record<string, string> = {
  completed: "bg-completed",
  processing: "bg-processing",
  initiating: "bg-initiating",
  planning: "bg-planning",
};

const GanttChart = () => {
  const days = getCalendarDays();
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const cellWidth = 44;

  // today offset
  const today = new Date(2026, 1, 27);
  const projectStart = new Date(2026, 1, 21);
  const todayOffset = Math.floor((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Project Timeline</h3>
        <div className="flex items-center gap-4 text-xs">
          {(["Completed", "Processing", "Initiating", "Planning"] as TaskStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${statusBgMap[getStatusColor(s)]}`} />
              <span className="text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>
      <ScrollArea className="w-full">
        <div className="flex min-w-max">
          {/* Task Names Column */}
          <div className="w-72 flex-shrink-0 border-r border-border/50 bg-card/50">
            <div className="h-14 border-b border-border/50 flex items-center px-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope of Work</span>
            </div>
            {tasks.map((task, i) => (
              <div
                key={task.id}
                className={`h-10 flex items-center px-4 border-b border-border/30 transition-colors ${
                  hoveredTask === task.id ? "bg-secondary/50" : ""
                }`}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                <span className="text-xs font-mono text-muted-foreground mr-2 w-5 flex-shrink-0">{task.id}</span>
                <span className="text-xs text-foreground truncate">{task.name}</span>
              </div>
            ))}
          </div>

          {/* Timeline Grid */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex h-14 border-b border-border/50">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center border-r border-border/20 ${
                    day.isWeekend ? "bg-secondary/30" : ""
                  } ${i === todayOffset ? "bg-primary/10" : ""}`}
                  style={{ width: cellWidth, minWidth: cellWidth }}
                >
                  {day.monthLabel && (
                    <span className="text-[9px] font-semibold text-primary uppercase">{day.monthLabel}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{day.dayOfWeek}</span>
                  <span className={`text-xs font-mono ${i === todayOffset ? "text-primary font-bold" : "text-foreground"}`}>
                    {day.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars */}
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`h-10 flex items-center relative border-b border-border/20 ${
                  hoveredTask === task.id ? "bg-secondary/30" : ""
                }`}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                {/* Weekend shading */}
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 ${day.isWeekend ? "bg-secondary/20" : ""} ${
                      i === todayOffset ? "border-l-2 border-primary/40" : ""
                    }`}
                    style={{ left: i * cellWidth, width: cellWidth }}
                  />
                ))}

                {/* Gantt bar */}
                <motion.div
                  className={`gantt-bar absolute h-6 ${statusBgMap[getStatusColor(task.status)]}`}
                  style={{
                    left: task.startDay * cellWidth + 4,
                    width: task.duration * cellWidth - 8,
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + task.id * 0.04, duration: 0.4, ease: "easeOut" }}
                  title={`${task.name} (${task.status})`}
                >
                  {task.duration >= 3 && (
                    <span className="absolute inset-0 flex items-center px-2 text-[9px] font-medium text-background/90 truncate">
                      {task.name.split(" ").slice(0, 3).join(" ")}
                    </span>
                  )}
                </motion.div>
              </div>
            ))}

            {/* Today line */}
            <div
              className="absolute top-14 bottom-0 w-0.5 bg-primary/60 z-10"
              style={{ left: 288 + todayOffset * cellWidth + cellWidth / 2 }}
            />
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </motion.div>
  );
};

export default GanttChart;
