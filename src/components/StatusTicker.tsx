import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Zap, Clock } from "lucide-react";
import { getStatusCounts } from "@/data/projectData";

const StatusTicker = () => {
  const counts = getStatusCounts();

  const items = [
    { label: "Completed", count: counts.completed, icon: CheckCircle2, colorClass: "text-completed" },
    { label: "Processing", count: counts.processing, icon: Loader2, colorClass: "text-processing" },
    { label: "Initiating", count: counts.initiating, icon: Zap, colorClass: "text-initiating" },
    { label: "Planning", count: counts.planning, icon: Clock, colorClass: "text-planning" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i, duration: 0.4 }}
          className="glass-card p-4 flex items-center gap-3"
        >
          <div className={`p-2 rounded-lg bg-secondary ${item.colorClass}`}>
            <item.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-foreground">{item.count}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatusTicker;
