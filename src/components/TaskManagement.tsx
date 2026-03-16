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
        onKeyDown={(e) => { if (e.key === "Backspace") { e.preventDefault(); onChange([]); } }}
        className="flex items-center justify-between w-full bg-secondary/50 border border-border rounded-[0.625rem] px-3 py-2.5 text-sm text-foreground hover:bg-secondary/70 transition-colors mt-1.5 min-h-[40px]"
      >
        <span className="truncate text-left flex-1">
          {selected.length === 0
            ? <span className="text-muted-foreground">Select dependencies...</span>
            : (
              <span className="flex flex-wrap gap-1">
                {selected.map(d => (
                  <span key={d} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5 rounded-full border border-primary/20">
                    #{d}
                  </span>
                ))}
              </span>
            )}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full max-h-52 overflow-y-auto rounded-[0.625rem] border border-border bg-popover shadow-xl"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">No other tasks available</div>
            ) : (
              <div className="p-1">
                {filtered.map(t => {
                  const isSelected = selected.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm rounded-lg hover:bg-accent/50 transition-colors ${isSelected ? "bg-accent/30" : ""}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="font-mono text-[11px] text-primary font-semibold shrink-0 w-6">#{t.id}</span>
                      <span className="truncate flex-1 text-[13px]">{t.name}</span>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusBadge[t.status]}`}>{t.status}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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

  const inputClass = "bg-secondary/50 border border-border rounded-[0.625rem] px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all min-h-[40px]";
  const labelClass = "text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block";
  const sectionClass = "p-5 rounded-[0.625rem] border border-primary/20 bg-primary/5 space-y-4";

  const taskListForDeps = tasks.map(t => ({ id: t.id, name: t.name, status: t.status }));

  /* ── Shared form fields for both create & edit ── */
  const renderForm = (
    data: { name: string; status: TaskStatus; startDate?: Date; duration: number; dependencies: number[] },
    setData: (updater: (prev: any) => any) => void,
    dateRange: { startDate: string; endDate: string } | null,
    excludeTask?: number,
  ) => (
    <>
      <div>
        <label className={labelClass}>Task Name</label>
        <input
          value={data.name}
          onChange={e => setData((p: any) => ({ ...p, name: e.target.value }))}
          placeholder="Enter task name..."
          className={`${inputClass} w-full`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={data.status}
            onChange={e => setData((p: any) => ({ ...p, status: e.target.value as TaskStatus }))}
            className={`${inputClass} w-full appearance-none cursor-pointer`}
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
                className="w-full justify-start bg-secondary/50 border-border font-normal text-left hover:bg-secondary/70 rounded-[0.625rem] min-h-[40px] px-3"
              >
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {data.startDate ? formatTimelineDate(data.startDate) : "Pick start date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.startDate}
                onSelect={(date) => setData((p: any) => ({ ...p, startDate: date || undefined }))}
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
            value={data.duration}
            onChange={e => setData((p: any) => ({ ...p, duration: parseInt(e.target.value) || 1 }))}
            className={`${inputClass} w-full`}
          />
        </div>
      </div>

      {dateRange && (
        <div className="rounded-[0.625rem] border border-border/40 bg-background/70 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Assigned from <span className="font-semibold text-foreground">{dateRange.startDate}</span> to <span className="font-semibold text-foreground">{dateRange.endDate}</span>
          </span>
        </div>
      )}

      <div>
        <label className={labelClass}>Dependencies</label>
        <DependencyPicker
          selected={data.dependencies}
          onChange={(deps) => setData((p: any) => ({ ...p, dependencies: deps }))}
          availableTasks={taskListForDeps}
          excludeTaskNumber={excludeTask}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Scope & Schedule Management
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddingNew(!addingNew)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[0.625rem] text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          {addingNew ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {addingNew ? "Cancel" : "Add Task"}
        </motion.button>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {addingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={sectionClass}>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New Task
              </h4>

              {renderForm(
                newTask,
                (updater) => setNewTask(updater),
                newTaskDateRange,
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addTask}
                disabled={saving || !newTask.name.trim() || !newTask.startDate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[0.625rem] text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity"
                style={{ background: "var(--gradient-primary)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? "Adding..." : "Add Task"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
        {tasks.map(task => {
          const taskDateRange = getTaskDateRange(projectStart, task.startDay, task.duration);

          return (
            <div key={task.id}>
              {editingId === task.id && editData ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={sectionClass}
                >
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> Editing Task #{editData.task_number}
                  </h4>

                  {renderForm(
                    editData,
                    (updater) => setEditData((p) => p ? updater(p) : p),
                    getTaskDateRange(projectStart, getStartDayFromDate(projectStart, editData.startDate), editData.duration),
                    editData.task_number,
                  )}

                  <div className="flex gap-2 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[0.625rem] text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Changes
                    </motion.button>
                    <button onClick={cancelEdit} className="px-4 py-2.5 rounded-[0.625rem] text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.005 }}
                  className="flex items-center gap-3 p-3 sm:p-3.5 rounded-[0.625rem] border border-border/30 bg-secondary/10 hover:bg-secondary/20 hover:border-border/50 transition-all group cursor-default"
                >
                  {/* Task number */}
                  <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                    {task.id}
                  </span>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 sm:truncate">{task.name}</p>
                    <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">{taskDateRange.compactLabel}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span>{task.duration}d</span>
                      </span>
                      {task.dependencies && task.dependencies.length > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {task.dependencies.map(d => (
                            <span key={d} className="bg-muted/50 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold">#{d}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border whitespace-nowrap ${statusBadge[task.status]}`}>
                    {task.status}
                  </span>

                  {/* Actions – always visible on mobile */}
                  <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(task)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Edit task"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskManagement;
