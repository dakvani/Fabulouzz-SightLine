import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Save,
  Edit3,
  X,
  CalendarDays,
  Clock,
  Link2,
  Loader2,
  ChevronDown,
  Check,
  FileText,
  Table as TableIcon,
  Layers,
  Sparkles,
  Mail,
  UserCheck,
} from "lucide-react";
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
import { sendBrandedEmail, getProductionPortalUrl } from "@/lib/emailService";

const statusOptions: TaskStatus[] = ["Planning", "Initiating", "Processing", "Completed"];

const statusBadge: Record<TaskStatus, string> = {
  Completed: "bg-completed/15 text-completed border-completed/30",
  Processing: "bg-processing/15 text-processing border-processing/30",
  Initiating: "bg-initiating/15 text-initiating border-initiating/30",
  Planning: "bg-planning/15 text-planning border-planning/30",
};

interface EditingTask {
  task_number: number;
  name: string; // Scope of the work
  description: string; // Detailed description
  status: TaskStatus;
  startDate: Date;
  duration: number;
  dependencies: number[];
  assigneeEmail?: string;
  assigneeName?: string;
  notifyAssignee?: boolean;
}

interface NewTaskForm {
  name: string; // Scope of the work
  description: string; // Detailed description
  status: TaskStatus;
  startDate?: Date;
  duration: number;
  dependencies: number[];
  assigneeEmail?: string;
  assigneeName?: string;
  notifyAssignee?: boolean;
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

  const filtered = availableTasks.filter((t) => t.id !== excludeTaskNumber);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((d) => d !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Backspace") {
            e.preventDefault();
            onChange([]);
          }
        }}
        className="flex items-center justify-between w-full bg-secondary/50 border border-border rounded-[0.625rem] px-3 py-2.5 text-sm text-foreground hover:bg-secondary/70 transition-colors mt-1.5 min-h-[40px]"
      >
        <span className="truncate text-left flex-1">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Select dependencies...</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {selected.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5 rounded-full border border-primary/20"
                >
                  #{d}
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
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
                {filtered.map((t) => {
                  const isSelected = selected.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-accent/50 transition-colors ${
                        isSelected ? "bg-accent/30" : ""
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="font-mono text-[11px] text-primary font-semibold shrink-0 w-6">#{t.id}</span>
                      <span className="truncate flex-1 text-[13px]">{t.name}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                          statusBadge[t.status]
                        }`}
                      >
                        {t.status}
                      </span>
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

export const TaskManagement = () => {
  const { tasks, projectId, projectInfo, refresh } = useProjectData();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditingTask | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [activeTableView, setActiveTableView] = useState<"scope_desc" | "schedule" | "both">("both");
  const [newTask, setNewTask] = useState<NewTaskForm>({
    name: "",
    description: "",
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
      description: task.description || "",
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

      // Save fallback to localStorage
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("sightline_task_descriptions");
          const map = stored ? JSON.parse(stored) : {};
          map[editData.task_number] = editData.description;
          localStorage.setItem("sightline_task_descriptions", JSON.stringify(map));
        } catch {
          // Ignore local storage error
        }
      }

      // Update in Supabase
      const { error } = await supabase
        .from("tasks")
        .update({
          name: editData.name,
          description: editData.description,
          status: editData.status,
          start_day: startDay,
          duration: editData.duration,
          dependencies: editData.dependencies,
        })
        .eq("project_id", projectId)
        .eq("task_number", editData.task_number);

      if (error) {
        // If DB column not migrated yet, update name/status anyway
        console.warn("Supabase update error (possibly pending description column migration):", error);
        await supabase
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
      }

      toast({ title: "Scope updated", description: `Scope #${editData.task_number} saved successfully.` });

      // Dispatch Task Assignment email notification if assignee email specified
      if (editData.assigneeEmail && editData.notifyAssignee !== false) {
        sendBrandedEmail({
          type: "task_assignment",
          to: editData.assigneeEmail.trim(),
          data: {
            fullName: editData.assigneeName || editData.assigneeEmail.split("@")[0],
            projectName: projectInfo.title,
            projectRef: projectInfo.projectRef,
            taskNumber: editData.task_number,
            taskName: editData.name,
            taskStatus: editData.status,
            taskDuration: editData.duration,
            assignedBy: projectInfo.projectManager || "SightLine PM",
            loginUrl: `${getProductionPortalUrl()}/?project=${projectId}&view=tasks`,
          },
        }).then(res => {
          if (res.success) {
            toast({
              title: "Assignee Notified",
              description: `Task assignment notice dispatched to ${editData.assigneeEmail}.`,
            });
          }
        }).catch(() => {});
      }

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
      toast({ title: "Scope deleted", description: `Scope item #${taskNumber} removed.` });
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const addTask = async () => {
    if (!projectId || !newTask.name.trim()) {
      toast({ title: "Scope title is required", description: "Please enter Scope of the work.", variant: "destructive" });
      return;
    }
    if (!newTask.startDate) {
      toast({ title: "Start date is required", description: "Please pick a start date for this scope.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const nextNumber = Math.max(...tasks.map((t) => t.id), 0) + 1;
    const startDay = getStartDayFromDate(projectStart, newTask.startDate);

    try {
      // Save fallback to localStorage
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("sightline_task_descriptions");
          const map = stored ? JSON.parse(stored) : {};
          map[nextNumber] = newTask.description;
          localStorage.setItem("sightline_task_descriptions", JSON.stringify(map));
        } catch {
          // Ignore local storage error
        }
      }

      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        task_number: nextNumber,
        name: newTask.name,
        description: newTask.description,
        status: newTask.status,
        start_day: startDay,
        duration: newTask.duration,
        dependencies: newTask.dependencies,
      });

      if (error) {
        console.warn("Retrying task insert without description if column pending:", error);
        await supabase.from("tasks").insert({
          project_id: projectId,
          task_number: nextNumber,
          name: newTask.name,
          status: newTask.status,
          start_day: startDay,
          duration: newTask.duration,
          dependencies: newTask.dependencies,
        });
      }

      toast({ title: "Scope added", description: `Scope item #${nextNumber} created successfully.` });

      // Dispatch Task Assignment email notification if assignee email specified
      if (newTask.assigneeEmail && newTask.notifyAssignee !== false) {
        sendBrandedEmail({
          type: "task_assignment",
          to: newTask.assigneeEmail.trim(),
          data: {
            fullName: newTask.assigneeName || newTask.assigneeEmail.split("@")[0],
            projectName: projectInfo.title,
            projectRef: projectInfo.projectRef,
            taskNumber: nextNumber,
            taskName: newTask.name,
            taskStatus: newTask.status,
            taskDuration: newTask.duration,
            assignedBy: projectInfo.projectManager || "SightLine PM",
            loginUrl: `${getProductionPortalUrl()}/?project=${projectId}&view=tasks`,
          },
        }).then(res => {
          if (res.success) {
            toast({
              title: "Assignee Notified",
              description: `Task assignment notice dispatched to ${newTask.assigneeEmail}.`,
            });
          }
        }).catch(() => {});
      }

      setAddingNew(false);
      setNewTask({
        name: "",
        description: "",
        status: "Planning",
        startDate: undefined,
        duration: 1,
        dependencies: [],
      });
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const inputClass =
    "bg-secondary/50 border border-border rounded-[0.625rem] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all min-h-[40px]";
  const labelClass = "text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block";
  const sectionClass = "p-5 rounded-[0.625rem] border border-primary/20 bg-primary/5 space-y-4";

  const taskListForDeps = tasks.map((t) => ({ id: t.id, name: t.name, status: t.status }));

  /* ── Form for adding and editing scopes ── */
  const renderForm = (
    data: {
      name: string;
      description?: string;
      status: TaskStatus;
      startDate?: Date;
      duration: number;
      dependencies: number[];
    },
    setData: (updater: (prev: any) => any) => void,
    dateRange: { startDate: string; endDate: string } | null,
    excludeTask?: number
  ) => (
    <div className="space-y-4">
      {/* Scope of Work (Short title) */}
      <div>
        <label className={labelClass}>
          Scope of the work <span className="text-primary font-bold">(Short word / Title)</span>
        </label>
        <input
          value={data.name}
          onChange={(e) => setData((p: any) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Design & Site Plan, Server Unit Installation..."
          className={`${inputClass} w-full font-medium`}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          This concise title is displayed on the dashboard timeline for clean alignment.
        </p>
      </div>

      {/* Description (Detailed specifications) */}
      <div>
        <label className={labelClass}>
          Description <span className="text-primary font-bold">(Detailed Specifications & Scope Breakdown)</span>
        </label>
        <textarea
          rows={2}
          value={data.description || ""}
          onChange={(e) => setData((p: any) => ({ ...p, description: e.target.value }))}
          placeholder="Enter detailed technical specifications, bill of materials, engineering tasks, and contractor deliverables..."
          className={`${inputClass} w-full min-h-[64px] resize-y leading-relaxed text-xs`}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Included in full in publication-grade PDF reports and detailed deliverable specifications.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={data.status}
            onChange={(e) => setData((p: any) => ({ ...p, status: e.target.value as TaskStatus }))}
            className={`${inputClass} w-full appearance-none cursor-pointer`}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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
          <label className={labelClass}>Duration (Days)</label>
          <input
            type="number"
            min={1}
            value={data.duration}
            onChange={(e) => setData((p: any) => ({ ...p, duration: parseInt(e.target.value) || 1 }))}
            className={`${inputClass} w-full font-mono font-semibold`}
          />
        </div>
      </div>

      {dateRange && (
        <div className="rounded-[0.625rem] border border-border/40 bg-background/70 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Calculated range: <span className="font-semibold text-foreground">{dateRange.startDate}</span> to{" "}
            <span className="font-semibold text-foreground">{dateRange.endDate}</span> ({data.duration} days)
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

      {/* Assignee & Email Notification */}
      <div className="rounded-[0.625rem] border border-border/50 bg-secondary/30 p-3.5 space-y-3 mt-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Task Assignee & Field Notification</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
              Assignee Full Name
            </label>
            <input
              value={(data as any).assigneeName || ""}
              onChange={(e) => setData((p: any) => ({ ...p, assigneeName: e.target.value }))}
              placeholder="e.g. Lead Engineer..."
              className={`${inputClass} w-full text-xs`}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
              Assignee Email
            </label>
            <input
              type="email"
              value={(data as any).assigneeEmail || ""}
              onChange={(e) => setData((p: any) => ({ ...p, assigneeEmail: e.target.value }))}
              placeholder="engineer@fabulouzz.com"
              className={`${inputClass} w-full text-xs font-mono`}
            />
          </div>
        </div>
        {(data as any).assigneeEmail && (
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={(data as any).notifyAssignee !== false}
              onChange={(e) => setData((p: any) => ({ ...p, notifyAssignee: e.target.checked }))}
              className="rounded border-border text-primary focus:ring-primary/40 h-4 w-4"
            />
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Dispatch branded task assignment notice from <strong className="text-foreground">info@fabulouzz.com</strong> with direct portal deep-link
            </span>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header and Control Deck */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Project Scope & Deliverable Management
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure short Scope of the Work for timeline alignment and comprehensive Descriptions for PDF reports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Table View Switcher */}
          <div className="flex items-center bg-secondary/60 border border-border/60 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTableView("both")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTableView === "both"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dual Tables View
            </button>
            <button
              onClick={() => setActiveTableView("scope_desc")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTableView === "scope_desc"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Scope & Description
            </button>
            <button
              onClick={() => setActiveTableView("schedule")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTableView === "schedule"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Schedule Matrix
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setAddingNew(!addingNew)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-colors shadow-sm"
          >
            {addingNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {addingNew ? "Close Form" : "Add New Scope"}
          </motion.button>
        </div>
      </div>

      {/* Add New Scope Form */}
      <AnimatePresence>
        {addingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={sectionClass}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Add Deliverable Scope
                </h4>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Item #{Math.max(...tasks.map((t) => t.id), 0) + 1}
                </span>
              </div>

              {renderForm(newTask, (updater) => setNewTask(updater), newTaskDateRange)}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addTask}
                  disabled={saving || !newTask.name.trim() || !newTask.startDate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground disabled:opacity-50 transition-opacity shadow-md"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? "Saving Scope..." : "Save Deliverable Scope"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Edit Form Drawer */}
      <AnimatePresence>
        {editingId !== null && editData && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-5 rounded-xl border border-primary/30 bg-primary/10 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between pb-2 border-b border-primary/20">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Editing Scope Item #{editData.task_number}
              </h4>
              <button
                onClick={cancelEdit}
                className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderForm(
              editData,
              (updater) => setEditData((p) => (p ? updater(p) : p)),
              getTaskDateRange(
                projectStart,
                getStartDayFromDate(projectStart, editData.startDate),
                editData.duration
              ),
              editData.task_number
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-primary-foreground disabled:opacity-50 shadow-md"
                style={{ background: "var(--gradient-primary)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════
          TABLE 1: SCOPE OF THE WORK & DETAILED DESCRIPTIONS
          ════════════════════════════════════════════════════════════════ */}
      {(activeTableView === "both" || activeTableView === "scope_desc") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Table 1: Scope of Work & Deliverable Descriptions
              </h4>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {tasks.length} Scope Item(s)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/60 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="py-3 px-3.5 font-bold w-12 text-center">#</th>
                  <th className="py-3 px-4 font-bold min-w-[200px] w-1/4">Scope of the Work</th>
                  <th className="py-3 px-4 font-bold min-w-[300px]">Description</th>
                  <th className="py-3 px-3 font-bold w-28 text-center">Status</th>
                  <th className="py-3 px-3 font-bold w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-secondary/20 transition-colors ${
                      editingId === task.id ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-center text-primary">
                      #{String(task.id).padStart(2, "0")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground block text-sm leading-snug">
                        {task.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {task.description || (
                          <span className="italic text-muted-foreground/60">
                            No detailed description entered. Click edit to add specifications.
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border whitespace-nowrap ${
                          statusBadge[task.status]
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(task)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit Scope and Description"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete Scope"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TABLE 2: SCHEDULE & EXECUTION TIMELINE MATRIX
          ════════════════════════════════════════════════════════════════ */}
      {(activeTableView === "both" || activeTableView === "schedule") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Table 2: Execution Schedule & Durations
              </h4>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Master Project Start: {projectInfo.startDate}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/60 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="py-3 px-3.5 font-bold w-12 text-center">#</th>
                  <th className="py-3 px-4 font-bold min-w-[200px]">Scope of the Work</th>
                  <th className="py-3 px-4 font-bold min-w-[160px]">Planned Dates</th>
                  <th className="py-3 px-3 font-bold w-28 text-center">Duration</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">Dependencies</th>
                  <th className="py-3 px-3 font-bold w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {tasks.map((task) => {
                  const range = getTaskDateRange(projectStart, task.startDay, task.duration);
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-secondary/20 transition-colors ${
                        editingId === task.id ? "bg-primary/5 border-l-2 border-primary" : ""
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-center text-primary">
                        #{String(task.id).padStart(2, "0")}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground block text-sm leading-snug">
                          {task.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-medium text-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {range.compactLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-secondary text-foreground border border-border/60">
                          {task.duration} {task.duration === 1 ? "day" : "days"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {task.dependencies && task.dependencies.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {task.dependencies.map((d) => (
                              <span
                                key={d}
                                className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border border-primary/20"
                              >
                                #{d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(task)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit Schedule & Scope"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete Scope"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;
