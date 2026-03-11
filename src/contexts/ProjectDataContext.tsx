import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tasks as staticTasks, projectInfo as staticProjectInfo, type ProjectTask, type TaskStatus, type ProjectInfo } from "@/data/projectData";

interface ProjectDataContextType {
  tasks: ProjectTask[];
  projectInfo: ProjectInfo;
  loading: boolean;
  refresh: () => Promise<void>;
  projectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedProjectId: string | null;
}

const ProjectDataContext = createContext<ProjectDataContextType>({
  tasks: staticTasks,
  projectInfo: staticProjectInfo,
  loading: false,
  refresh: async () => {},
  projectId: null,
  setSelectedProjectId: () => {},
  selectedProjectId: null,
});

export const useProjectData = () => useContext(ProjectDataContext);

export const ProjectDataProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<ProjectTask[]>(staticTasks);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(staticProjectInfo);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
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
    if (!selectedProjectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", selectedProjectId)
        .single();

      if (project) {
        applyProject(project);

        const { data: dbTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", project.id)
          .order("task_number", { ascending: true });

        if (dbTasks && dbTasks.length > 0) {
          applyTasks(dbTasks);
        } else {
          setTasks([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch project data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, applyProject, applyTasks]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchData();
    } else {
      // Reset when no project selected
      setProjectId(null);
      setTasks([]);
      setProjectInfo(staticProjectInfo);
      setLoading(false);
    }
  }, [selectedProjectId, fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel("project-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
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
            if ((payload.new as any).id === projectId) {
              applyProject(payload.new);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, applyProject, applyTasks]);

  return (
    <ProjectDataContext.Provider value={{ tasks, projectInfo, loading, refresh: fetchData, projectId, setSelectedProjectId, selectedProjectId }}>
      {children}
    </ProjectDataContext.Provider>
  );
};
