import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ProjectTask, type TaskStatus } from "@/data/projectData";
import { GripVertical, Link2, LayoutGrid } from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { supabase } from "@/integrations/supabase/client";

type KanbanColumn = "To-Do" | "In Progress" | "Done";

const statusToColumn: Record<TaskStatus, KanbanColumn> = {
  Planning: "To-Do",
  Initiating: "In Progress",
  Processing: "In Progress",
  Completed: "Done",
};

const columnColors: Record<KanbanColumn, { bg: string; border: string; dot: string }> = {
  "To-Do": { bg: "bg-planning/5", border: "border-planning/30", dot: "bg-planning" },
  "In Progress": { bg: "bg-processing/5", border: "border-processing/30", dot: "bg-processing" },
  "Done": { bg: "bg-completed/5", border: "border-completed/30", dot: "bg-completed" },
};

const KanbanBoard = () => {
  const { tasks: contextTasks } = useProjectData();
  const [taskList, setTaskList] = useState<ProjectTask[]>([...contextTasks]);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).single();
        setIsAdmin(data?.role === "admin" || data?.role === "pm" || data?.role === "engineer");
      }
    };
    checkRole();
  }, []);

  const columns: KanbanColumn[] = ["To-Do", "In Progress", "Done"];

  const getColumnTasks = (col: KanbanColumn) =>
    taskList.filter(t => statusToColumn[t.status] === col);

  const handleDragStart = (taskId: number) => setDraggedTask(taskId);

  const handleDrop = (targetColumn: KanbanColumn) => {
    if (draggedTask === null) return;
    const newStatus: Record<KanbanColumn, TaskStatus> = { "To-Do": "Planning", "In Progress": "Processing", "Done": "Completed" };
    setTaskList(prev => prev.map(t => t.id === draggedTask ? { ...t, status: newStatus[targetColumn] } : t));
    setDraggedTask(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="glass-card px-5 py-4 sm:px-6 sm:py-5 border-b border-border/50 flex items-center gap-3">
        <LayoutGrid className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kanban Board</h3>
        {isAdmin && <span className="text-[10px] text-muted-foreground ml-2">Drag tasks to update status</span>}
        <span className="ml-auto text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{taskList.length} total</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => {
          const colTasks = getColumnTasks(col);
          const colors = columnColors[col];
          return (
            <div key={col} className={`rounded-xl border ${colors.border} ${colors.bg} min-h-[400px] p-3 transition-all ${draggedTask !== null ? "ring-2 ring-primary/20" : ""}`}
              onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col)}>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                <h4 className="text-sm font-semibold text-foreground">{col}</h4>
                <span className="text-xs font-mono text-muted-foreground ml-auto bg-secondary/50 px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {colTasks.map(task => (
                    <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      draggable={isAdmin} onDragStart={() => isAdmin && handleDragStart(task.id)} onDragEnd={() => setDraggedTask(null)}
                      className={`glass-card p-3 sm:p-4 ${isAdmin ? "cursor-grab active:cursor-grabbing" : "cursor-default"} transition-all hover:border-primary/30 ${draggedTask === task.id ? "opacity-50 scale-95" : ""}`}>
                      <div className="flex items-start gap-2">
                        {isAdmin && <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-primary">#{task.id}</span>
                            <span className={`text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-full border ${
                              task.status === "Completed" ? "bg-completed/15 text-completed border-completed/30" :
                              task.status === "Processing" ? "bg-processing/15 text-processing border-processing/30 animate-pulse" :
                              task.status === "Initiating" ? "bg-initiating/15 text-initiating border-initiating/30" :
                              "bg-planning/15 text-planning border-planning/30"
                            }`}>{task.status}</span>
                          </div>
                          <p className="text-xs text-foreground mt-1 leading-relaxed">{task.name}</p>
                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Link2 className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{task.dependencies.map(d => `#${d}`).join(", ")}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                            <span>{task.duration}d duration</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default KanbanBoard;
