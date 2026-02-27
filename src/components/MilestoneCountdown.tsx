import { motion } from "framer-motion";
import { Target, Calendar } from "lucide-react";
import { tasks } from "@/data/projectData";

const MilestoneCountdown = () => {
  const today = new Date(2026, 1, 27);
  const projectStart = new Date(2026, 1, 21);

  const milestones = [
    { task: tasks[7], label: "Server Installation" },
    { task: tasks[9], label: "PTZ Activation" },
    { task: tasks[15], label: "Testing & Commissioning" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-4 h-full flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Milestones</h3>
      </div>
      <div className="space-y-1 flex-1 flex flex-col justify-around">
        {milestones.map((m, i) => {
          const milestoneDate = new Date(projectStart);
          milestoneDate.setDate(milestoneDate.getDate() + m.task.startDay);
          const daysUntil = Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isPast = daysUntil < 0;

          return (
            <motion.div
              key={m.task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-xs text-foreground">{m.label}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                isPast ? "bg-[hsl(var(--completed)/0.1)] text-[hsl(var(--completed))]" :
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
