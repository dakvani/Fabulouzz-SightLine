import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, MapPin, Calendar, User, LogOut, Sun, Moon, Users, Search, X, BarChart3, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import CreateProjectModal from "./CreateProjectModal";

interface ProjectSelectorProps {
  onSelectProject: (projectId: string) => void;
  userId: string;
}

interface ProjectRow {
  id: string;
  title: string;
  client_name: string;
  location: string;
  start_date: string;
  end_date: string;
  project_manager: string;
  company: string;
  project_ref: string;
}

interface TaskProgress {
  total: number;
  completed: number;
  processing: number;
  initiating: number;
  planning: number;
  percent: number;
}

const ProjectSelector = ({ onSelectProject, userId }: ProjectSelectorProps) => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [taskProgress, setTaskProgress] = useState<Record<string, TaskProgress>>({});
  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchProjects = async () => {
    setLoading(true);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = roleData?.role;
    const admin = role === "admin";
    const isPm = role === "pm";
    setIsAdmin(admin);

    let projectList: ProjectRow[] = [];

    if (admin || isPm) {
      const { data } = await supabase
        .from("projects")
        .select("id, title, client_name, location, start_date, end_date, project_manager, company, project_ref")
        .order("created_at", { ascending: false });
      projectList = data || [];
    } else {
      const { data: memberships } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", userId);

      if (memberships && memberships.length > 0) {
        const projectIds = memberships.map((m) => m.project_id);
        const { data } = await supabase
          .from("projects")
          .select("id, title, client_name, location, start_date, end_date, project_manager, company, project_ref")
          .in("id", projectIds)
          .order("created_at", { ascending: false });
        projectList = data || [];
      }
    }

    setProjects(projectList);

    // Fetch task progress for all projects
    if (projectList.length > 0) {
      const { data: allTasks } = await supabase
        .from("tasks")
        .select("project_id, status")
        .in("project_id", projectList.map(p => p.id));

      if (allTasks) {
        const progressMap: Record<string, TaskProgress> = {};
        for (const project of projectList) {
          const pTasks = allTasks.filter(t => t.project_id === project.id);
          const total = pTasks.length;
          const completed = pTasks.filter(t => t.status === "Completed").length;
          const processing = pTasks.filter(t => t.status === "Processing").length;
          const initiating = pTasks.filter(t => t.status === "Initiating").length;
          const planning = pTasks.filter(t => t.status === "Planning").length;
          const weighted = total > 0
            ? Math.round(((completed * 1 + processing * 0.5 + initiating * 0.2) / total) * 100)
            : 0;
          progressMap[project.id] = { total, completed, processing, initiating, planning, percent: weighted };
        }
        setTaskProgress(progressMap);
      }

      // Fetch subscriber counts per project (admin only)
      if (admin) {
        const { data: allSubs } = await supabase
          .from("email_subscribers")
          .select("project_id")
          .in("project_id", projectList.map(p => p.id))
          .eq("is_active", true);

        if (allSubs) {
          const subMap: Record<string, number> = {};
          for (const s of allSubs) {
            if (s.project_id) {
              subMap[s.project_id] = (subMap[s.project_id] || 0) + 1;
            }
          }
          setSubscriberCounts(subMap);
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.client_name.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.project_manager.toLowerCase().includes(q) ||
      p.project_ref.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const getProgressColor = (percent: number) => {
    if (percent >= 75) return "hsl(var(--completed))";
    if (percent >= 40) return "hsl(var(--processing))";
    if (percent > 0) return "hsl(var(--initiating))";
    return "hsl(var(--muted-foreground))";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mounted && (
              <img
                src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
                alt="Fabulouzz"
                className="h-6 w-auto"
              />
            )}
            <div className="hidden sm:flex flex-col border-l border-border/30 pl-3">
              <span
                className="text-sm font-bold tracking-wide text-primary"
                style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
              >
                SIGHTLINE
              </span>
              <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                Command Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border/30 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Projects
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {projects.length} project{projects.length !== 1 ? "s" : ""} • Select one to open its dashboard
              </p>
            </div>
            {isAdmin && (
              <motion.button
                onClick={() => setShowCreate(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Plus className="w-4 h-4" />
                New Project
              </motion.button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, client, location, or reference..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border/40 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <motion.div
              className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <FolderOpen className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1.5">
              {searchQuery ? "No Matching Projects" : "No Projects Found"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No projects match "${searchQuery}". Try a different search.`
                : isAdmin
                  ? "Create your first project to get started."
                  : "You haven't been assigned to any projects yet. Contact your admin."}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, i) => {
                const progress = taskProgress[project.id];
                return (
                  <motion.button
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="text-left p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group relative overflow-hidden"
                    layout
                  >
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/[0.03] to-transparent" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        {project.project_ref && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-lg border border-border/20">
                            {project.project_ref}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-foreground text-[15px] leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
                        {project.title}
                      </h3>
                      {project.client_name && (
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-primary/60" /> {project.client_name}
                        </p>
                      )}

                      {/* Progress Bar */}
                      {progress && progress.total > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              {progress.percent}% Complete
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {progress.completed}/{progress.total} tasks
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress.percent}%` }}
                              transition={{ duration: 0.8, delay: i * 0.04 + 0.2, ease: "easeOut" }}
                              style={{ backgroundColor: getProgressColor(progress.percent) }}
                            />
                          </div>
                          {/* Mini status dots */}
                          <div className="flex items-center gap-2 mt-1.5">
                            {progress.completed > 0 && (
                              <span className="text-[9px] text-completed flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-completed inline-block" />
                                {progress.completed}
                              </span>
                            )}
                            {progress.processing > 0 && (
                              <span className="text-[9px] text-processing flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-processing inline-block" />
                                {progress.processing}
                              </span>
                            )}
                            {progress.initiating > 0 && (
                              <span className="text-[9px] text-initiating flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-initiating inline-block" />
                                {progress.initiating}
                              </span>
                            )}
                            {progress.planning > 0 && (
                              <span className="text-[9px] text-planning flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-planning inline-block" />
                                {progress.planning}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5 text-[11px] text-muted-foreground">
                        {project.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 shrink-0 text-primary/50" />
                            <span className="truncate">{project.location}</span>
                          </div>
                        )}
                        {project.start_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 shrink-0 text-primary/50" />
                            <span>{project.start_date} → {project.end_date || "TBD"}</span>
                          </div>
                        )}
                        {project.project_manager && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 shrink-0 text-primary/50" />
                            <span className="truncate">PM: {project.project_manager}</span>
                          </div>
                        )}
                        {isAdmin && subscriberCounts[project.id] > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 shrink-0 text-primary/50" />
                            <span>{subscriberCounts[project.id]} subscriber{subscriberCounts[project.id] !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-muted-foreground py-8 border-t border-border/20">
        Powered by <span className="text-primary font-semibold">Fabulouzz Technologies</span> • SightLine Command Center
      </div>

      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchProjects}
      />
    </div>
  );
};

export default ProjectSelector;
