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

  const fetchData = useCallback(async () => {
    try {
      // Fetch project
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        const p = projects[0];
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

        // Fetch tasks for this project
        const { data: dbTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", p.id)
          .order("task_number", { ascending: true });

        if (dbTasks && dbTasks.length > 0) {
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
        }
      }
    } catch (err) {
      console.error("Failed to fetch project data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <ProjectDataContext.Provider value={{ tasks, projectInfo, loading, refresh: fetchData, projectId }}>
      {children}
    </ProjectDataContext.Provider>
  );
};
