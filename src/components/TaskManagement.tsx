import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, Edit3, X, CalendarDays, Clock, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useProjectData } from "@/contexts/ProjectDataContext";
import type { TaskStatus } from "@/data/projectData";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatTimelineDate,
  getStartDayFromDate,
  getTaskDateRange,
  parseProjectDate,
  startOfDay,
} from "@/lib/projectTimeline";

const statusOptions: TaskStatus[] = ["Planning", "Initiating", "Processing", "Completed"];

const statusBadge: Record<TaskStatus, string> = {
  Completed: "bg-completed/15 text-completed border-completed/30",
  Processing: "bg-processing/15 text-processing border-processing/30",
  Initiating: "bg-initiating/15 text-initiating border-initiating/30",
  Planning: "bg-planning/15 text-planning border-planning/30",
};

interface EditingTask {
  task_number: number;
  name: string;
  status: TaskStatus;
  startDate: Date;
  duration: number;
  dependencies: number[];
}

interface NewTaskForm {
  name: string;
  status: TaskStatus;
  startDate?: Date;
  duration: number;
  dependencies: number[];
}

const TaskManagement = () => {
  const { tasks, projectId, projectInfo, refresh } = useProjectData();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditingTask | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskForm>({
    name: "",
    status: "Planning",
    startDate: undefined,
    duration: 1,
    dependencies: [],
  });
  const [saving, setSaving] = useState(false);

  const projectStart = useMemo(
    () => parseProjectDate(projectInfo.startDate),
    [projectInfo.startDate]
  );

  const newTaskDateRange = useMemo(() => {
    if (!newTask.startDate) return null;
    return getTaskDateRange(
      projectStart,
      getStartDayFromDate(projectStart, newTask.startDate),
      newTask.duration
    );
  }, [newTask.startDate, newTask.duration, projectStart]);

  const startEdit = (task: typeof tasks[0]) => {
    setEditingId(task.id);
    setEditData({
      task_number: task.id,
      name: task.name,
      status: task.status,
      start_day: task.startDay,
      duration: task.duration,
      dependencies: task.dependencies || [],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async () => {
    if (!editData || !projectId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          name: editData.name,
          status: editData.status,
          start_day: editData.start_day,
          duration: editData.duration,
          dependencies: editData.dependencies,
        })
        .eq("project_id", projectId)
        .eq("task_number", editData.task_number);

      if (error) throw error;
      toast({ title: "Task updated", description: `Task #${editData.task_number} saved` });
      cancelEdit();
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteTask = async (taskNumber: number) => {
    if (!projectId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", projectId)
        .eq("task_number", taskNumber);

      if (error) throw error;
      toast({ title: "Task deleted", description: `Task #${taskNumber} removed` });
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const addTask = async () => {
    if (!projectId || !newTask.name.trim()) return;
    if (!newTask.startDate) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const nextNumber = Math.max(...tasks.map(t => t.id), 0) + 1;
    const startDay = getStartDayFromDate(projectStart, newTask.startDate);

    try {
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        task_number: nextNumber,
        name: newTask.name,
        status: newTask.status,
        start_day: startDay,
        duration: newTask.duration,
        dependencies: newTask.dependencies,
      });

      if (error) throw error;
      toast({ title: "Task added", description: `Task #${nextNumber} created` });
      setAddingNew(false);
      setNewTask({ name: "", status: "Planning", startDate: undefined, duration: 1, dependencies: [] });
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const inputClass = "bg-secondary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
  const labelClass = "text-[10px] text-muted-foreground uppercase tracking-wider font-medium";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Scope & Schedule Management
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddingNew(!addingNew)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          {addingNew ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {addingNew ? "Cancel" : "Add Task"}
        </motion.button>
      </div>

      <AnimatePresence>
        {addingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
              <div>
                <label className={labelClass}>Task Name</label>
                <input
                  value={newTask.name}
                  onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                  placeholder="Enter task name..."
                  className={`${inputClass} w-full mt-1`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={newTask.status}
                    onChange={e => setNewTask(p => ({ ...p, status: e.target.value as TaskStatus }))}
                    className={`${inputClass} w-full mt-1`}
                  >
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-start bg-secondary/50 border-border/50 font-normal text-left hover:bg-secondary/70"
                      >
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">
                          {newTask.startDate ? formatTimelineDate(newTask.startDate) : "Pick start date"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTask.startDate}
                        onSelect={(date) => setNewTask(p => ({ ...p, startDate: date || undefined }))}
                        disabled={(date) => startOfDay(date) < projectStart}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className={labelClass}>How Many Days</label>
                  <input
                    type="number"
                    min={1}
                    value={newTask.duration}
                    onChange={e => setNewTask(p => ({ ...p, duration: parseInt(e.target.value) || 1 }))}
                    className={`${inputClass} w-full mt-1`}
                  />
                </div>
              </div>

              {newTaskDateRange && (
                <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  Assigned from <span className="font-medium text-foreground">{newTaskDateRange.startDate}</span> to <span className="font-medium text-foreground">{newTaskDateRange.endDate}</span>
                </div>
              )}

              <div>
                <label className={labelClass}>Dependencies (comma-separated task #s)</label>
                <input
                  value={newTask.dependencies.join(",")}
                  onChange={e => setNewTask(p => ({ ...p, dependencies: e.target.value.split(",").map(Number).filter(n => !isNaN(n) && n > 0) }))}
                  placeholder="e.g. 1,2,3"
                  className={`${inputClass} w-full mt-1`}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addTask}
                disabled={saving || !newTask.name.trim() || !newTask.startDate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? "Adding..." : "Add Task"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {tasks.map(task => {
          const taskDateRange = getTaskDateRange(projectStart, task.startDay, task.duration);

          return (
            <div key={task.id}>
              {editingId === task.id && editData ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2"
                >
                  <input
                    value={editData.name}
                    onChange={e => setEditData(p => p ? { ...p, name: e.target.value } : p)}
                    className={`${inputClass} w-full text-xs`}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={editData.status}
                      onChange={e => setEditData(p => p ? { ...p, status: e.target.value as TaskStatus } : p)}
                      className={`${inputClass} text-xs`}
                    >
                      {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={editData.start_day}
                      onChange={e => setEditData(p => p ? { ...p, start_day: parseInt(e.target.value) || 0 } : p)}
                      placeholder="Start Day"
                      className={`${inputClass} text-xs`}
                    />
                    <input
                      type="number"
                      min={1}
                      value={editData.duration}
                      onChange={e => setEditData(p => p ? { ...p, duration: parseInt(e.target.value) || 1 } : p)}
                      placeholder="Duration"
                      className={`${inputClass} text-xs`}
                    />
                  </div>
                  <div>
                    <input
                      value={editData.dependencies.join(",")}
                      onChange={e => setEditData(p => p ? { ...p, dependencies: e.target.value.split(",").map(Number).filter(n => !isNaN(n) && n > 0) } : p)}
                      placeholder="Dependencies: 1,2,3"
                      className={`${inputClass} text-xs w-full`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </motion.button>
                    <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors group">
                  <span className="text-[10px] font-mono text-primary w-5 flex-shrink-0">#{task.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{task.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {taskDateRange.compactLabel} • {task.duration}d
                      </span>
                      {task.dependencies && task.dependencies.length > 0 && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Link2 className="w-2.5 h-2.5" /> {task.dependencies.map(d => `#${d}`).join(",")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${statusBadge[task.status]}`}>
                    {task.status}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(task)}
                      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskManagement;
