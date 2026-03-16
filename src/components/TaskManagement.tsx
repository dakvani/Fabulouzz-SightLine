import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, Edit3, X, CalendarDays, Clock, Link2, Loader2, ChevronDown, Check } from "lucide-react";
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

const statusDot: Record<TaskStatus, string> = {
  Completed: "bg-completed",
  Processing: "bg-processing",
  Initiating: "bg-initiating",
  Planning: "bg-planning",
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

/* ── Dependency multi-select dropdown ── */
interface DependencyPickerProps {
  selected: number[];
  onChange: (deps: number[]) => void;
  availableTasks: { id: number; name: string; status: TaskStatus }[];
  excludeTaskNumber?: number;
}

const DependencyPicker = ({ selected, onChange, availableTasks, excludeTaskNumber }: DependencyPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = availableTasks.filter(t => t.id !== excludeTaskNumber);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(d => d !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full bg-secondary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-sm text-foreground hover:bg-secondary/70 transition-colors mt-1"
      >
        <span className="truncate text-left">
          {selected.length === 0
            ? <span className="text-muted-foreground">Select dependencies...</span>
            : selected.map(d => `#${d}`).join(", ")}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No other tasks available</div>
          ) : (
            filtered.map(t => {
              const isSelected = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors ${isSelected ? "bg-accent/30" : ""}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className="font-mono text-[10px] text-primary shrink-0">#{t.id}</span>
                  <span className="truncate flex-1">{t.name}</span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[t.status]}`} />
                  <span className="text-[10px] text-muted-foreground shrink-0">{t.status}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

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
    const taskStart = new Date(projectStart);
    taskStart.setDate(taskStart.getDate() + task.startDay);
    setEditData({
      task_number: task.id,
      name: task.name,
      status: task.status,
      startDate: taskStart,
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
      const startDay = getStartDayFromDate(projectStart, editData.startDate);
      const { error } = await supabase
        .from("tasks")
        .update({
          name: editData.name,
          status: editData.status,
          start_day: startDay,
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

  const taskListForDeps = tasks.map(t => ({ id: t.id, name: t.name, status: t.status }));

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
                <label className={labelClass}>Dependencies</label>
                <DependencyPicker
                  selected={newTask.dependencies}
                  onChange={(deps) => setNewTask(p => ({ ...p, dependencies: deps }))}
                  availableTasks={taskListForDeps}
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
                  className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                >
                  <div>
                    <label className={labelClass}>Task Name</label>
                    <input
                      value={editData.name}
                      onChange={e => setEditData(p => p ? { ...p, name: e.target.value } : p)}
                      className={`${inputClass} w-full mt-1`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>Status</label>
                      <select
                        value={editData.status}
                        onChange={e => setEditData(p => p ? { ...p, status: e.target.value as TaskStatus } : p)}
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
                              {formatTimelineDate(editData.startDate)}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editData.startDate}
                            onSelect={(date) => setEditData(p => p ? { ...p, startDate: date || p.startDate } : p)}
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
                        value={editData.duration}
                        onChange={e => setEditData(p => p ? { ...p, duration: parseInt(e.target.value) || 1 } : p)}
                        className={`${inputClass} w-full mt-1`}
                      />
                    </div>
                  </div>

                  {(() => {
                    const editDateRange = getTaskDateRange(projectStart, getStartDayFromDate(projectStart, editData.startDate), editData.duration);
                    return (
                      <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                        Assigned from <span className="font-medium text-foreground">{editDateRange.startDate}</span> to <span className="font-medium text-foreground">{editDateRange.endDate}</span>
                      </div>
                    );
                  })()}

                  <div>
                    <label className={labelClass}>Dependencies</label>
                    <DependencyPicker
                      selected={editData.dependencies}
                      onChange={(deps) => setEditData(p => p ? { ...p, dependencies: deps } : p)}
                      availableTasks={taskListForDeps}
                      excludeTaskNumber={editData.task_number}
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
                          <Link2 className="w-2.5 h-2.5" /> {task.dependencies.map(d => `#${d}`).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${statusBadge[task.status]}`}>
                    {task.status}
                  </span>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
