import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ProjectTask, type TaskStatus } from "@/data/projectData";
import { GripVertical, Link2, LayoutGrid, Edit3, Plus, Sliders } from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import StatusUpdateModal from "./StatusUpdateModal";

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

interface KanbanBoardProps {
  onOpenDetails?: () => void;
}

const KanbanBoard = ({ onOpenDetails }: KanbanBoardProps) => {
  const { tasks: contextTasks, projectId, refresh, canEditProject } = useProjectData();
  const [taskList, setTaskList] = useState<ProjectTask[]>([...contextTasks]);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<{ id: number; name: string; status: TaskStatus } | null>(null);

  useEffect(() => {
    setTaskList([...contextTasks]);
  }, [contextTasks]);

  const columns: KanbanColumn[] = ["To-Do", "In Progress", "Done"];

  const getColumnTasks = (col: KanbanColumn) =>
    taskList.filter(t => statusToColumn[t.status] === col);

  const handleDragStart = (taskId: number) => setDraggedTask(taskId);

  const handleDrop = async (targetColumn: KanbanColumn) => {
    if (draggedTask === null) return;
    const newStatus: Record<KanbanColumn, TaskStatus> = {
      "To-Do": "Planning",
      "In Progress": "Processing",
      "Done": "Completed",
    };
    const targetStatus = newStatus[targetColumn];
    const taskIdToUpdate = draggedTask;

    // Optimistic UI update
    setTaskList(prev =>
      prev.map(t => (t.id === taskIdToUpdate ? { ...t, status: targetStatus } : t))
    );
    setDraggedTask(null);

    if (projectId) {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ status: targetStatus })
          .eq("project_id", projectId)
          .eq("task_number", taskIdToUpdate);

        if (error) throw error;

        toast({
          title: "Task Status Updated",
          description: `Task #${taskIdToUpdate} moved to ${targetStatus}`,
        });
        await refresh();
      } catch (err: any) {
        toast({
          title: "Update Failed",
          description: err.message,
          variant: "destructive",
        });
        await refresh();
      }
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="glass-card px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5 border-b border-border/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Kanban Board
            </h3>
            {canEditProject && (
              <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline bg-secondary/50 px-2 py-0.5 rounded-full">
                Drag cards between columns to update status in real-time
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-full">
              {taskList.length} total tasks
            </span>
            {onOpenDetails && (
              <button
                onClick={onOpenDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                title="Open Project Details to add or edit tasks"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manage All Project Data</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(col => {
            const colTasks = getColumnTasks(col);
            const colors = columnColors[col];
            return (
              <div
                key={col}
                className={`rounded-2xl border ${colors.border} ${colors.bg} min-h-[220px] sm:min-h-[420px] p-2.5 sm:p-3.5 transition-all ${
                  draggedTask !== null ? "ring-2 ring-primary/20" : ""
                }`}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col)}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <h4 className="text-sm font-bold text-foreground">{col}</h4>
                  <span className="text-xs font-mono font-bold text-muted-foreground ml-auto bg-secondary/70 px-2.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <AnimatePresence>
                    {colTasks.map(task => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable={canEditProject}
                        onDragStart={() => canEditProject && handleDragStart(task.id)}
                        onDragEnd={() => setDraggedTask(null)}
                        className={`glass-card p-3 sm:p-4 ${
                          canEditProject ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                        } transition-all hover:border-primary/40 relative group ${
                          draggedTask === task.id ? "opacity-50 scale-95" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {canEditProject && (
                            <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                #{task.id}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                                    task.status === "Completed"
                                      ? "bg-completed/15 text-completed border-completed/30"
                                      : task.status === "Processing"
                                      ? "bg-processing/15 text-processing border-processing/30 animate-pulse"
                                      : task.status === "Initiating"
                                      ? "bg-initiating/15 text-initiating border-initiating/30"
                                      : "bg-planning/15 text-planning border-planning/30"
                                  }`}
                                >
                                  {task.status}
                                </span>
                                {canEditProject && (
                                  <button
                                    onClick={() =>
                                      setSelectedTaskForEdit({
                                        id: task.id,
                                        name: task.name,
                                        status: task.status,
                                      })
                                    }
                                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Update status note"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm font-medium text-foreground mt-1.5 leading-snug">
                              {task.name}
                            </p>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md font-mono">
                                {task.duration}d duration
                              </span>
                              {task.dependencies && task.dependencies.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Link2 className="w-3 h-3 text-primary" />
                                  <span>{task.dependencies.map(d => `#${d}`).join(", ")}</span>
                                </div>
                              )}
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

      {selectedTaskForEdit && (
        <StatusUpdateModal
          isOpen={!!selectedTaskForEdit}
          onClose={() => setSelectedTaskForEdit(null)}
          taskId={selectedTaskForEdit.id}
          taskName={selectedTaskForEdit.name}
          currentStatus={selectedTaskForEdit.status}
        />
      )}
    </>
  );
};

export default KanbanBoard;
