import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Zap, Clock } from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";

const StatusTicker = () => {
  const { tasks } = useProjectData();
  
  const counts = {
    completed: tasks.filter(t => t.status === "Completed").length,
    processing: tasks.filter(t => t.status === "Processing").length,
    initiating: tasks.filter(t => t.status === "Initiating").length,
    planning: tasks.filter(t => t.status === "Planning").length,
  };

  const items = [
    { label: "Done", count: counts.completed, icon: CheckCircle2, color: "var(--completed)" },
    { label: "Active", count: counts.processing, icon: Loader2, color: "var(--processing)" },
    { label: "Init", count: counts.initiating, icon: Zap, color: "var(--initiating)" },
    { label: "Plan", count: counts.planning, icon: Clock, color: "var(--planning)" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * i, duration: 0.4 }}
          className="glass-card p-3 flex flex-col items-center text-center gap-1 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 opacity-[0.06]"
            style={{ background: `radial-gradient(circle at 50% 100%, hsl(${item.color}), transparent 70%)` }}
          />
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center mb-0.5"
            style={{ background: `hsl(${item.color} / 0.15)`, color: `hsl(${item.color})` }}
          >
            <item.icon className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground leading-none">{item.count}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatusTicker;
