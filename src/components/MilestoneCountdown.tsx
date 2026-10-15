import { motion } from "framer-motion";
import { Target, Calendar, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";

interface MilestoneCountdownProps {
  onManageTimeline?: () => void;
}

const MilestoneCountdown = ({ onManageTimeline }: MilestoneCountdownProps) => {
  const { tasks, projectInfo } = useProjectData();
  const today = new Date();
  
  // Use the project's actual start date
  const projectStart = projectInfo.startDate ? new Date(projectInfo.startDate) : new Date();

  // Dynamically create milestones from tasks (pick evenly spaced tasks)
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-card h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Milestones</h3>
          </div>
          {onManageTimeline && (
            <button
              onClick={onManageTimeline}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Configure Tasks
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground">No tasks available</p>
        </div>
      </motion.div>
    );
  }

  // Pick up to 6 milestone tasks spread across the task list
  const milestoneCount = Math.min(6, totalTasks);
  const milestones = [];
  for (let i = 0; i < milestoneCount; i++) {
    const idx = Math.round((i / (milestoneCount - 1 || 1)) * (totalTasks - 1));
    milestones.push(tasks[idx]);
  }
  // Remove duplicates
  const uniqueMilestones = [...new Map(milestones.map(m => [m.id, m])).values()];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="glass-card h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Milestones</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">{uniqueMilestones.length} phases</span>
          {onManageTimeline && (
            <button
              onClick={onManageTimeline}
              className="text-[10px] font-semibold text-primary hover:underline ml-1"
              title="Edit milestone dates in project details"
            >
              Manage
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 divide-y divide-border/20">
        {uniqueMilestones.map((task, i) => {
          const milestoneDate = new Date(projectStart);
          milestoneDate.setDate(milestoneDate.getDate() + task.startDay);
          const daysUntil = Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isPast = task.status === "Completed" || daysUntil < 0;
          const isToday = daysUntil === 0;
          const isNear = daysUntil > 0 && daysUntil <= 3;

          return (
            <motion.div key={task.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }}
              className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/20 transition-colors group">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast ? "bg-[hsl(var(--completed)/0.15)]" : isNear ? "bg-destructive/15" : "bg-secondary/50"}`}>
                {isPast ? <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--completed))]" /> : <Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{task.name}</p>
                <p className="text-[9px] text-muted-foreground font-mono">{milestoneDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isPast ? "bg-[hsl(var(--completed)/0.1)] text-[hsl(var(--completed))]" : isToday ? "bg-primary/20 text-primary" : isNear ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {isPast ? "Done" : isToday ? "Today" : `${daysUntil}d`}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MilestoneCountdown;
