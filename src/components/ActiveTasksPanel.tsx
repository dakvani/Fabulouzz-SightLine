import { motion } from "framer-motion";
import { Loader2, Zap, ArrowRight } from "lucide-react";
import { tasks } from "@/data/projectData";

const ActiveTasksPanel = () => {
  const activeTasks = tasks.filter(t => t.status === "Processing" || t.status === "Initiating");

  if (activeTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card overflow-hidden relative"
    >
      {/* Animated glow border */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ border: "1px solid hsl(90, 65%, 50%, 0.2)" }}
        animate={{ 
          boxShadow: [
            "0 0 20px -5px hsl(90, 65%, 50%, 0.1)",
            "0 0 40px -5px hsl(90, 65%, 50%, 0.25)",
            "0 0 20px -5px hsl(90, 65%, 50%, 0.1)"
          ] 
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="p-4 border-b border-border/50 flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-4 h-4 text-processing" />
        </motion.div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Currently Active
        </h3>
        <motion.div
          className="ml-auto flex items-center gap-1 text-[10px] font-mono text-primary"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-processing" />
          LIVE
        </motion.div>
      </div>

      <div className="divide-y divide-border/20">
        {activeTasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            className="px-5 py-4 flex items-center gap-4 group hover:bg-primary/5 transition-colors"
          >
            <motion.div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                task.status === "Processing" 
                  ? "bg-processing/15 text-processing" 
                  : "bg-initiating/15 text-initiating"
              }`}
              animate={task.status === "Processing" ? { 
                boxShadow: [
                  "0 0 0px hsl(200, 70%, 50%, 0)",
                  "0 0 12px hsl(200, 70%, 50%, 0.3)",
                  "0 0 0px hsl(200, 70%, 50%, 0)"
                ] 
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {task.status === "Processing" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-muted-foreground">Task #{task.id}</span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">{task.duration} days</span>
              </div>
            </div>

            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
              task.status === "Processing"
                ? "bg-processing/15 text-processing border border-processing/30"
                : "bg-initiating/15 text-initiating border border-initiating/30"
            }`}>
              {task.status}
            </span>

            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ActiveTasksPanel;
