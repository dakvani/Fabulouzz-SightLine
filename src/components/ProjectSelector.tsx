import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Plus, MapPin, Calendar, User, Loader2, LogOut, Sun, Moon, Users } from "lucide-react";
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

const ProjectSelector = ({ onSelectProject, userId }: ProjectSelectorProps) => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchProjects = async () => {
    setLoading(true);

    // Check role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = roleData?.role;
    const admin = role === "admin";
    const isPm = role === "pm";
    setIsAdmin(admin);

    if (admin || isPm) {
      // Admins and PMs see all projects
      const { data } = await supabase
        .from("projects")
        .select("id, title, client_name, location, start_date, end_date, project_manager, company, project_ref")
        .order("created_at", { ascending: false });
      setProjects(data || []);
    } else {
      // Clients see only their assigned projects
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
        setProjects(data || []);
      } else {
        setProjects([]);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {mounted && (
              <img
                src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
                alt="Fabulouzz"
                className="h-5 w-auto"
              />
            )}
            <div className="hidden sm:flex flex-col border-l border-border/30 pl-2.5">
              <span
                className="text-sm font-bold tracking-wide text-primary"
                style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
              >
                SIGHTLINE
              </span>
              <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                Command Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-border/20 text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </motion.button>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border/20 text-muted-foreground hover:text-foreground hover:border-destructive/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Your Projects</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select a project to view its dashboard
              </p>
            </div>
            {isAdmin && (
              <motion.button
                onClick={() => setShowCreate(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Plus className="w-4 h-4" />
                New Project
              </motion.button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FolderOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Projects Found</h3>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Create your first project to get started."
                : "You haven't been assigned to any projects yet. Contact your admin."}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <motion.button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="text-left p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  {project.project_ref && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                      {project.project_ref}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {project.title}
                </h3>
                {project.client_name && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <User className="w-3 h-3" /> {project.client_name}
                  </p>
                )}

                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                  {project.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </div>
                  )}
                  {project.start_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{project.start_date} → {project.end_date || "TBD"}</span>
                    </div>
                  )}
                  {project.project_manager && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 shrink-0" />
                      <span className="truncate">PM: {project.project_manager}</span>
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-muted-foreground py-6 border-t border-border/30">
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
