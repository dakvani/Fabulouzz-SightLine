import { motion } from "framer-motion";
import { Target, Calendar, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { tasks } from "@/data/projectData";

const MilestoneCountdown = () => {
  const today = new Date(2026, 1, 27);
  const projectStart = new Date(2026, 1, 21);

  const milestones = [
    { task: tasks[3], label: "Cable Laying Complete" },
    { task: tasks[7], label: "Server Installation" },
    { task: tasks[9], label: "PTZ Camera Activation" },
    { task: tasks[12], label: "NVR Integration" },
    { task: tasks[15], label: "Testing & Commissioning" },
    { task: tasks[18], label: "Final Handover" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card h-full flex flex-col overflow-hidden"
    >
      <div className="p-4 border-b border-border/30 flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Milestones</h3>
        <span className="ml-auto text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">{milestones.length} phases</span>
      </div>
      <div className="flex-1 divide-y divide-border/20">
        {milestones.map((m, i) => {
          const milestoneDate = new Date(projectStart);
          milestoneDate.setDate(milestoneDate.getDate() + m.task.startDay);
          const daysUntil = Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isPast = daysUntil < 0;
          const isToday = daysUntil === 0;
          const isNear = daysUntil > 0 && daysUntil <= 3;

          return (
            <motion.div
              key={m.task.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.06 }}
              className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/20 transition-colors group"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isPast ? "bg-[hsl(var(--completed)/0.15)]" :
                isNear ? "bg-destructive/15" :
                "bg-secondary/50"
              }`}>
                {isPast ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--completed))]" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{m.label}</p>
                <p className="text-[9px] text-muted-foreground font-mono">
                  {milestoneDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                isPast ? "bg-[hsl(var(--completed)/0.1)] text-[hsl(var(--completed))]" :
                isToday ? "bg-primary/20 text-primary" :
                isNear ? "bg-destructive/10 text-destructive" :
                "bg-primary/10 text-primary"
              }`}>
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
