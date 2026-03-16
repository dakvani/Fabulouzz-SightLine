import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getStatusColor, type TaskStatus } from "@/data/projectData";
import { ChevronRight, Link2, Activity, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectData } from "@/contexts/ProjectDataContext";
import StatusUpdateModal from "./StatusUpdateModal";

const statusBadgeClasses: Record<string, string> = {
  completed: "bg-completed/15 text-completed border-completed/30",
  processing: "bg-processing/15 text-processing border-processing/30",
  initiating: "bg-initiating/15 text-initiating border-initiating/30",
  planning: "bg-planning/15 text-planning border-planning/30",
};

const TaskList = () => {
  const { tasks } = useProjectData();
  const [selectedTask, setSelectedTask] = useState<{ id: number; name: string; status: TaskStatus } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).single()
          .then(({ data }) => setUserRole(data?.role || null));
      }
    });
  }, []);

  const canUpdate = userRole === "admin" || userRole === "pm" || userRole === "engineer";

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card overflow-hidden">
        <div className="px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5 border-b border-border/50 flex items-center gap-2 sm:gap-3">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">All Tasks</h3>
          <span className="ml-auto text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{tasks.length} total</span>
        </div>
        <div className="divide-y divide-border/30">
          {tasks.map((task, i) => {
            const isProcessing = task.status === "Processing";
            return (
              <motion.div key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.03 }}
                className={`px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 flex items-center gap-2 sm:gap-3 transition-colors cursor-pointer group relative ${isProcessing ? "bg-processing/5 hover:bg-processing/10" : "hover:bg-secondary/30"}`}>
                {isProcessing && (
                  <motion.div className="absolute left-0 top-0 bottom-0 w-1 bg-processing rounded-r" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                )}
                <span className="text-xs font-mono text-muted-foreground w-6 flex-shrink-0">{String(task.id).padStart(2, "0")}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs sm:text-sm truncate ${isProcessing ? "text-foreground font-medium" : "text-foreground"}`}>{task.name}</p>
                    {isProcessing && (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <Activity className="w-3.5 h-3.5 text-processing flex-shrink-0" />
                      </motion.div>
                    )}
                  </div>
                  {task.dependencies && task.dependencies.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Link2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Depends on: {task.dependencies.map(d => `#${d}`).join(", ")}</span>
                    </div>
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border whitespace-nowrap ${statusBadgeClasses[getStatusColor(task.status)]} ${isProcessing ? "animate-pulse" : ""}`}>
                  {task.status}
                </span>
                {canUpdate && (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedTask({ id: task.id, name: task.name, status: task.status })}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                    <Edit3 className="w-3.5 h-3.5" />
                  </motion.button>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      {selectedTask && (
        <StatusUpdateModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id} taskName={selectedTask.name} currentStatus={selectedTask.status} />
      )}
    </>
  );
};

export default TaskList;
