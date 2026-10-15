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
  canEditProject: boolean;
  userRole: "admin" | "pm" | "client" | null;
  updateProjectContacts: (contacts: {
    clientContactPerson?: string;
    clientContactPhone?: string;
    contractorContactPerson?: string;
    contractorContactPhone?: string;
  }) => void;
}

const ProjectDataContext = createContext<ProjectDataContextType>({
  tasks: staticTasks,
  projectInfo: staticProjectInfo,
  loading: false,
  refresh: async () => {},
  projectId: null,
  setSelectedProjectId: () => {},
  selectedProjectId: null,
  canEditProject: false,
  userRole: null,
  updateProjectContacts: () => {},
});

export const useProjectData = () => useContext(ProjectDataContext);

export const ProjectDataProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<ProjectTask[]>(staticTasks);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(staticProjectInfo);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [canEditProject, setCanEditProject] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "pm" | "client" | null>(null);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sightline_selected_project_id");
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const setSelectedProjectId = useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("sightline_selected_project_id", id);
      } else {
        localStorage.removeItem("sightline_selected_project_id");
      }
    }
  }, []);

  const updateProjectContacts = useCallback(
    (contacts: {
      clientContactPerson?: string;
      clientContactPhone?: string;
      contractorContactPerson?: string;
      contractorContactPhone?: string;
    }) => {
      setProjectInfo((prev) => {
        const updated = {
          ...prev,
          clientContactPerson: contacts.clientContactPerson ?? prev.clientContactPerson,
          clientContactPhone: contacts.clientContactPhone ?? prev.clientContactPhone,
          contractorContactPerson: contacts.contractorContactPerson ?? prev.contractorContactPerson,
          contractorContactPhone: contacts.contractorContactPhone ?? prev.contractorContactPhone,
        };
        const currentId = projectId || selectedProjectId;
        if (currentId && typeof window !== "undefined") {
          localStorage.setItem(
            `sightline_project_contacts_${currentId}`,
            JSON.stringify({
              clientContactPerson: updated.clientContactPerson,
              clientContactPhone: updated.clientContactPhone,
              contractorContactPerson: updated.contractorContactPerson,
              contractorContactPhone: updated.contractorContactPhone,
            })
          );
        }
        return updated;
      });
    },
    [projectId, selectedProjectId]
  );

  const applyProject = useCallback((p: any) => {
    setProjectId(p.id);
    let contacts: any = {};
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`sightline_project_contacts_${p.id}`);
        if (saved) contacts = JSON.parse(saved);
      } catch (e) {}
    }

    const clientContactPerson = contacts.clientContactPerson || p.client_contact_person || p.reporting_to || "Mohammed Burhan";
    const clientContactPhone = contacts.clientContactPhone || p.client_contact_phone || "+966 50 123 4567";
    const contractorContactPerson = contacts.contractorContactPerson || p.contractor_contact_person || p.project_manager || "Riyaz Siraj";
    const contractorContactPhone = contacts.contractorContactPhone || p.contractor_contact_phone || "+966 54 987 6543";

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
      clientContactPerson,
      clientContactPhone,
      contractorContactPerson,
      contractorContactPhone,
    });
  }, []);

  const applyTasks = useCallback((dbTasks: any[]) => {
    const localDescMap: Record<number, string> = {};
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sightline_task_descriptions");
        if (stored) Object.assign(localDescMap, JSON.parse(stored));
      } catch (e) {}
    }

    setTasks(
      dbTasks.map(t => {
        const staticFallback = staticTasks.find(st => st.id === t.task_number)?.description || "";
        const desc = t.description || localDescMap[t.task_number] || staticFallback;
        return {
          id: t.task_number,
          name: t.name,
          description: desc,
          status: t.status as TaskStatus,
          startDay: t.start_day,
          duration: t.duration,
          dependencies: t.dependencies || [],
        };
      })
    );
  }, []);

const withTimeout = <T,>(promise: Promise<T> | PromiseLike<T>, ms = 6000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timed out")), ms)
    ),
  ]);
};

  const fetchData = useCallback(async () => {
    if (!selectedProjectId) {
      setLoading(false);
      setCanEditProject(false);
      setUserRole(null);
      return;
    }

    try {
      setLoading(true);
      const [projectRes, sessionRes] = await withTimeout(
        Promise.all([
          supabase
            .from("projects")
            .select("*")
            .eq("id", selectedProjectId)
            .maybeSingle(),
          supabase.auth.getSession(),
        ]),
        6000
      );

      const project = projectRes?.data;
      const user = sessionRes?.data?.session?.user;

      if (project) {
        applyProject(project);

        const tasksResult = (await withTimeout(
          supabase
            .from("tasks")
            .select("*")
            .eq("project_id", project.id)
            .order("task_number", { ascending: true }),
          6000
        ).catch(() => ({ data: null }))) as any;

        const dbTasks = tasksResult?.data;
        if (dbTasks && dbTasks.length > 0) {
          applyTasks(dbTasks);
        } else {
          setTasks([]);
        }

        // Verify access control for project editing
        if (user) {
          const [roleRes, memberRes] = await withTimeout(
            Promise.all([
              supabase.from("user_roles").select("role").eq("user_id", user.id),
              supabase
                .from("project_members")
                .select("id")
                .eq("project_id", project.id)
                .eq("user_id", user.id)
                .maybeSingle(),
            ]),
            6000
          ).catch(() => [{ data: [] }, { data: null }] as any);

          const roles = (roleRes?.data || []).map((r: any) => r.role);
          const isAdmin = roles.includes("admin");
          const isPm = roles.includes("pm");
          const isMember = !!memberRes?.data;
          const isCreator = project.created_by === user.id;

          const determinedRole = isAdmin ? "admin" : isPm ? "pm" : "client";
          setUserRole(determinedRole);

          // Super Admin can edit all projects; PM, Creator, or assigned Member has edit permissions
          const hasEditPermission = isAdmin || isPm || isMember || isCreator;
          setCanEditProject(hasEditPermission);
        } else {
          setCanEditProject(false);
          setUserRole(null);
        }
      } else {
        // Project ID was invalid, not found, or deleted
        setSelectedProjectId(null);
        setCanEditProject(false);
        setUserRole(null);
      }
    } catch (err) {
      console.warn("Failed or delayed fetching project data from Supabase:", err);
      setCanEditProject(false);
      // Ensure we don't wipe out existing tasks/projectInfo on transient network timeout
      setProjectInfo((prev) => (prev.title ? prev : staticProjectInfo));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, applyProject, applyTasks, setSelectedProjectId]);

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
    <ProjectDataContext.Provider value={{
      tasks,
      projectInfo,
      loading,
      refresh: fetchData,
      projectId,
      setSelectedProjectId,
      selectedProjectId,
      canEditProject,
      userRole,
      updateProjectContacts,
    }}>
      {children}
    </ProjectDataContext.Provider>
  );
};
