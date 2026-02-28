import { motion } from "framer-motion";
import { Loader2, Zap, ArrowRight, Activity } from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";

const ActiveTasksPanel = () => {
  const { tasks } = useProjectData();
  const activeTasks = tasks.filter(t => t.status === "Processing" || t.status === "Initiating");

  if (activeTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card overflow-hidden relative"
    >
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ border: "1px solid hsl(var(--processing) / 0.2)" }}
        animate={{ boxShadow: ["0 0 15px -5px hsl(var(--processing) / 0.05)", "0 0 30px -5px hsl(var(--processing) / 0.15)", "0 0 15px -5px hsl(var(--processing) / 0.05)"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="p-4 sm:p-5 border-b border-border/50 flex items-center gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-5 h-5 text-processing" />
        </motion.div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Currently Active</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{activeTasks.length} tasks in progress</p>
        </div>
        <motion.div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-full"
          animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
          <motion.span className="w-1.5 h-1.5 rounded-full bg-processing" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          LIVE
        </motion.div>
      </div>

      <div className="divide-y divide-border/20">
        {activeTasks.map((task, i) => {
          const isProcessing = task.status === "Processing";
          return (
            <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.06 }}
              className="px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 group hover:bg-primary/5 transition-colors relative overflow-hidden">
              {isProcessing && (
                <motion.div className="absolute left-0 top-0 bottom-0 w-0.5 bg-processing" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
              )}
              <motion.div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isProcessing ? "bg-processing/15 text-processing" : "bg-initiating/15 text-initiating"}`}
                animate={isProcessing ? { boxShadow: ["0 0 0px hsl(var(--processing) / 0)", "0 0 16px hsl(var(--processing) / 0.25)", "0 0 0px hsl(var(--processing) / 0)"] } : {}}
                transition={{ duration: 2, repeat: Infinity }}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{task.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Task #{task.id}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground">{task.duration} days</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-secondary/50 overflow-hidden max-w-[200px]">
                  <motion.div className={`h-full rounded-full ${isProcessing ? "bg-processing" : "bg-initiating"}`}
                    initial={{ width: "0%" }} animate={{ width: isProcessing ? "60%" : "20%" }} transition={{ duration: 1, delay: 0.5 + i * 0.1 }} />
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex-shrink-0 ${isProcessing ? "bg-processing/15 text-processing border border-processing/30" : "bg-initiating/15 text-initiating border border-initiating/30"}`}>
                {task.status}
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:block" />
            </motion.div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-border/30 flex items-center gap-2">
        <Activity className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Last activity: just now</span>
        <div className="ml-auto flex gap-1 items-end">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1 rounded-full bg-processing/40" style={{ height: `${6 + i * 3}px` }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ActiveTasksPanel;
