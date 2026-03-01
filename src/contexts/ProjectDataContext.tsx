import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tasks as staticTasks, projectInfo as staticProjectInfo, type ProjectTask, type TaskStatus, type ProjectInfo } from "@/data/projectData";

interface ProjectDataContextType {
  tasks: ProjectTask[];
  projectInfo: ProjectInfo;
  loading: boolean;
  refresh: () => Promise<void>;
  projectId: string | null;
}

const ProjectDataContext = createContext<ProjectDataContextType>({
  tasks: staticTasks,
  projectInfo: staticProjectInfo,
  loading: false,
  refresh: async () => {},
  projectId: null,
});

export const useProjectData = () => useContext(ProjectDataContext);

export const ProjectDataProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<ProjectTask[]>(staticTasks);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(staticProjectInfo);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyProject = useCallback((p: any) => {
    setProjectId(p.id);
    setProjectInfo({
      title: p.title,
      client: p.client_name,
      projectRef: p.project_ref,
      projectManager: p.project_manager,
      reportingTo: p.reporting_to,
      projectEngineer: p.project_engineer,
      location: p.location,
      company: p.company,
      startDate: p.start_date,
      endDate: p.end_date,
    });
  }, []);

  const applyTasks = useCallback((dbTasks: any[]) => {
    setTasks(
      dbTasks.map(t => ({
        id: t.task_number,
        name: t.name,
        status: t.status as TaskStatus,
        startDay: t.start_day,
        duration: t.duration,
        dependencies: t.dependencies || [],
      }))
    );
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        const p = projects[0];
        applyProject(p);

        const { data: dbTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", p.id)
          .order("task_number", { ascending: true });

        if (dbTasks && dbTasks.length > 0) {
          applyTasks(dbTasks);
        }
      }
    } catch (err) {
      console.error("Failed to fetch project data:", err);
    } finally {
      setLoading(false);
    }
  }, [applyProject, applyTasks]);

  useEffect(() => {
    // Wait for auth to be ready before fetching
    const init = async () => {
      await supabase.auth.getSession();
      fetchData();
    };
    init();

    // Re-fetch when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchData();
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("project-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          // Re-fetch all tasks on any change
          if (projectId) {
            supabase
              .from("tasks")
              .select("*")
              .eq("project_id", projectId)
              .order("task_number", { ascending: true })
              .then(({ data }) => {
                if (data && data.length > 0) applyTasks(data);
              });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
            applyProject(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, applyProject, applyTasks]);

  return (
    <ProjectDataContext.Provider value={{ tasks, projectInfo, loading, refresh: fetchData, projectId }}>
      {children}
    </ProjectDataContext.Provider>
  );
};
