import { motion } from "framer-motion";
import { Target, Calendar } from "lucide-react";
import { tasks } from "@/data/projectData";

const MilestoneCountdown = () => {
  const today = new Date(2026, 1, 27); // Current date context: Feb 27, 2026
  const projectStart = new Date(2026, 1, 21);

  const milestones = [
    { task: tasks[7], label: "Server Installation" },
    { task: tasks[9], label: "PTZ Activation" },
    { task: tasks[15], label: "Testing & Commissioning" },
    { task: tasks[18], label: "Project Handover" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Key Milestones</h3>
      </div>
      <div className="space-y-3">
        {milestones.map((m, i) => {
          const milestoneDate = new Date(projectStart);
          milestoneDate.setDate(milestoneDate.getDate() + m.task.startDay);
          const daysUntil = Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isPast = daysUntil < 0;

          return (
            <motion.div
              key={m.task.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">{m.label}</span>
              </div>
              <span className={`text-xs font-mono font-semibold px-2 py-1 rounded ${
                isPast ? "bg-completed/10 text-completed" :
                daysUntil <= 3 ? "bg-destructive/10 text-destructive" :
                "bg-primary/10 text-primary"
              }`}>
                {isPast ? "Done" : `${daysUntil}d`}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MilestoneCountdown;
