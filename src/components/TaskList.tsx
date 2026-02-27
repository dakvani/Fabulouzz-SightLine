import { motion } from "framer-motion";
import { tasks, getStatusColor, type TaskStatus } from "@/data/projectData";
import { ChevronRight, Link2 } from "lucide-react";

const statusBadgeClasses: Record<string, string> = {
  completed: "bg-completed/15 text-completed border-completed/30",
  processing: "bg-processing/15 text-processing border-processing/30",
  initiating: "bg-initiating/15 text-initiating border-initiating/30",
  planning: "bg-planning/15 text-planning border-planning/30",
};

const TaskList = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-4 border-b border-border/50">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">All Tasks</h3>
      </div>
      <div className="divide-y divide-border/30">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.03 }}
            className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors cursor-pointer group"
          >
            <span className="text-xs font-mono text-muted-foreground w-6 flex-shrink-0">
              {String(task.id).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{task.name}</p>
              {task.dependencies && task.dependencies.length > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Link2 className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Depends on: {task.dependencies.map(d => `#${d}`).join(", ")}
                  </span>
                </div>
              )}
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${
              statusBadgeClasses[getStatusColor(task.status)]
            }`}>
              {task.status}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default TaskList;
