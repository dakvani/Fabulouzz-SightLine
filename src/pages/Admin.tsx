import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  FolderOpen,
  Users,
  UserPlus,
  Radio,
  Mail,
  Palette,
  Activity,
  Plus,
  Search,
  X,
  ExternalLink,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Trash2,
  Edit3,
  Save,
  Check,
  Copy,
  RefreshCw,
  Clock,
  Calendar,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Layers,
  ArrowLeft,
  KeyRound,
  Lock,
  Loader2,
  Sparkles,
  Database,
  Send,
  User,
  Crown,
  Sliders,
  FileText,
  CheckSquare,
  PlusCircle,
  Eye,
  EyeOff,
  Briefcase as BriefcaseIcon,
  Terminal as TerminalIcon,
  UserX,
  UserCheck,
  Ban,
  ShieldAlert as ShieldAlertIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useBranding } from "@/contexts/BrandingContext";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import CreateProjectModal from "@/components/CreateProjectModal";
import TaskManagement from "@/components/TaskManagement";
import { sendBrandedEmail, getProductionPortalUrl } from "@/lib/emailService";
import ProjectInfoEditor from "@/components/ProjectInfoEditor";
import { resolveUserAuth, checkAccountActiveOrLogout } from "@/lib/auth/session";
import { UserRole, isSuperAdmin, isAdmin, canActorManageTargetRole } from "@/lib/auth/roles";
import { logAuditEvent, fetchAuditLogs, AuditLogEntry } from "@/lib/auth/audit";

type AdminTab =
  | "breakdown"
  | "projects"
  | "users"
  | "system";

interface ProjectRow {
  id: string;
  title: string;
  client_name: string;
  project_ref: string;
  project_manager: string;
  reporting_to: string;
  project_engineer: string;
  location: string;
  company: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface TaskItem {
  id: string;
  project_id: string;
  task_number: number;
  name: string;
  status: "Completed" | "Processing" | "Initiating" | "Planning";
  start_day: number;
  duration: number;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  subscription_tier?: string;
  role?: string;
  status?: string;
  must_change_password?: boolean;
}

const Admin = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { setSelectedProjectId } = useProjectData();
  const { branding, isEnterprise, isPremium, subscriptionTier, refresh: refreshBranding } = useBranding();

  // Authentication & Role
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<AdminTab>("breakdown");

  // Core Data Collections
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [memberships, setMemberships] = useState<{ id: string; project_id: string; user_id: string }[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modals & Forms
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedProjectIdForTasks, setSelectedProjectIdForTasks] = useState<string | null>(null);
  const [searchProjectQuery, setSearchProjectQuery] = useState("");
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "enterprise" | "premium" | "free">("all");
  const [updatingPlanUserId, setUpdatingPlanUserId] = useState<string | null>(null);

  // Edit Project & Access Control Modal State
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [editProjectTab, setEditProjectTab] = useState<"details" | "access" | "data">("details");
  const [editProjectForm, setEditProjectForm] = useState({
    title: "",
    client_name: "",
    project_ref: "",
    project_manager: "",
    reporting_to: "",
    project_engineer: "",
    location: "",
    company: "",
    start_date: "",
    end_date: "",
  });
  const [savingProjectEdit, setSavingProjectEdit] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<"Planning" | "Initiating" | "Processing" | "Completed">("Planning");
  const [newTaskStartDay, setNewTaskStartDay] = useState(0);
  const [newTaskDuration, setNewTaskDuration] = useState(14);
  const [addingTaskToProject, setAddingTaskToProject] = useState(false);
  const [seedingDataForProject, setSeedingDataForProject] = useState(false);

  // User Provisioning State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("pm");
  const [newPlan, setNewPlan] = useState<"free" | "premium" | "enterprise">("enterprise");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [forcePwdChange, setForcePwdChange] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  // SuperAdmin Direct Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // System Diagnostics
  const [systemPing, setSystemPing] = useState<number | null>(null);
  const [systemStatus, setSystemStatus] = useState<"healthy" | "checking" | "degraded">("checking");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // 1. Authoritative Authenticate & Verify Role Hierarchy
  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      try {
        setLoadingAuth(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (isMounted) {
            setCurrentUser(null);
            setUserRole(null);
            setIsSuperAdminUser(false);
            setIsAdminUser(false);
            setIsAdmin(false);
            setLoadingAuth(false);
          }
          return;
        }

        const auth = await resolveUserAuth(session.user);
        if (auth && (auth.accountStatus === "deactivated" || auth.status === "deactivated")) {
          await supabase.auth.signOut();
          if (isMounted) {
            setCurrentUser(null);
            setUserRole(null);
            setIsSuperAdminUser(false);
            setIsAdminUser(false);
            setIsAdmin(false);
            setLoadingAuth(false);
          }
          toast({
            title: "Account Deactivated",
            description: "Your account is deactivated. Please contact an administrator.",
            variant: "destructive",
          });
          return;
        }

        if (isMounted) {
          setCurrentUser(session.user);
          setUserRole(auth.userRole);
          setIsSuperAdminUser(auth.isSuperAdmin);
          setIsAdminUser(auth.isAdmin);
          setIsAdmin(auth.isSuperAdmin || auth.isAdmin);
        }

        if (auth.isSuperAdmin || auth.isAdmin) {
          supabase
            .from("profiles")
            .update({ subscription_tier: "enterprise" })
            .eq("id", session.user.id)
            .then();
        }
      } catch (err) {
        console.warn("Auth verification warning:", err);
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setLoadingAuth(false);
        }
      }
    };

    // Safety timeout: never hang indefinitely on verifying spinner
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoadingAuth(false);
      }
    }, 2500);

    verifyAccess();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setCurrentUser(null);
        setUserRole(null);
        setIsSuperAdminUser(false);
        setIsAdminUser(false);
        setIsAdmin(false);
      } else {
        const auth = await resolveUserAuth(session.user);
        if (auth && (auth.accountStatus === "deactivated" || auth.status === "deactivated")) {
          await supabase.auth.signOut();
          setCurrentUser(null);
          setUserRole(null);
          setIsSuperAdminUser(false);
          setIsAdminUser(false);
          setIsAdmin(false);
          toast({
            title: "Account Deactivated",
            description: "Your account is deactivated. Please contact an administrator.",
            variant: "destructive",
          });
        } else {
          setCurrentUser(session.user);
          setUserRole(auth.userRole);
          setIsSuperAdminUser(auth.isSuperAdmin);
          setIsAdminUser(auth.isAdmin);
          setIsAdmin(auth.isSuperAdmin || auth.isAdmin);
        }
      }
      setLoadingAuth(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Force-sync Admin Enterprise Tier to Database & Refresh Branding
  const handleVerifyAdminEnterprise = async () => {
    if (!currentUser?.id) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_tier: "enterprise" })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshBranding();
      await loadAllData();

      toast({
        title: "Enterprise SuperAdmin Active",
        description: "Your administrator account has full Enterprise privileges and all premium options unlocked.",
      });

      await logAuditEvent({
        action: "security.policy_change",
        target_resource: `profile:${currentUser.id}`,
        details: { syncedPlan: "enterprise" }
      });
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    }
  };

  // 2. Load Enterprise Data
  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    const start = performance.now();
    try {
      const [
        projRes,
        taskRes,
        profRes,
        rolesRes,
        membRes,
        subsRes,
        notifRes,
        fetchedLogs,
      ] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").order("task_number", { ascending: true }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("project_members").select("*"),
        supabase.from("email_subscribers").select("*").order("subscribed_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
        fetchAuditLogs(100),
      ]);

      setProjects(projRes.data || []);
      setTasks((taskRes.data as TaskItem[]) || []);
      setProfiles(profRes.data || []);
      setUserRoles(rolesRes.data || []);
      setMemberships(membRes.data || []);
      setSubscribers(subsRes.data || []);
      setNotifications(notifRes.data || []);
      setAuditLogs(fetchedLogs || []);

      const elapsed = Math.round(performance.now() - start);
      setSystemPing(elapsed);
      setSystemStatus("healthy");
    } catch (err) {
      console.error("Error loading enterprise data:", err);
      setSystemStatus("degraded");
      toast({
        title: "Connection Error",
        description: "Failed to sync enterprise database state.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin, loadAllData]);

  // Generate random secure password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    let pass = "";
    const rand = new Uint8Array(12);
    crypto.getRandomValues(rand);
    for (let i = 0; i < 12; i++) {
      pass += chars[rand[i] % chars.length];
    }
    setGeneratedPassword(pass);
    return pass;
  };

  useEffect(() => {
    if (showProvisionModal && !generatedPassword) {
      generatePassword();
    }
  }, [showProvisionModal, generatedPassword]);

  // Handle Provisioning User
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast({ title: "Email required", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setProvisioning(true);
    const assignedPlan = newRole === "admin" ? "enterprise" : newPlan;
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newEmail.trim().toLowerCase(),
          password: generatedPassword,
          fullName: newFullName.trim(),
          role: newRole,
          subscriptionTier: assignedPlan,
          generatePassword: false,
          sendInvite: sendInviteEmail,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Failed to provision user.");
      }

      toast({
        title: "User Provisioned Successfully",
        description: `Created account for ${newEmail} as ${newRole.toUpperCase()} on ${assignedPlan.toUpperCase()} plan.`,
      });

      // Dispatch branded email notification (Invitation or Welcome)
      if (sendInviteEmail) {
        sendBrandedEmail({
          type: "invite",
          to: newEmail.trim().toLowerCase(),
          branding: {
            companyName: branding?.company_name || "SightLine Command Center",
            logoUrl: branding?.logo_url || null,
            primaryColor: branding?.accent_color || "#4f46e5",
          },
          data: {
            fullName: newFullName.trim(),
            role: newRole,
            tempPassword: generatedPassword,
            invitedBy: currentUser?.email,
            loginUrl: `${getProductionPortalUrl()}/onboarding?email=${encodeURIComponent(newEmail.trim())}&role=${newRole}&name=${encodeURIComponent(newFullName.trim())}`,
          },
        });
      } else {
        sendBrandedEmail({
          type: "welcome",
          to: newEmail.trim().toLowerCase(),
          branding: {
            companyName: branding?.company_name || "SightLine Command Center",
            logoUrl: branding?.logo_url || null,
            primaryColor: branding?.accent_color || "#4f46e5",
          },
          data: {
            fullName: newFullName.trim(),
            role: newRole,
            planTier: assignedPlan,
            loginUrl: `${getProductionPortalUrl()}/welcome?email=${encodeURIComponent(newEmail.trim())}&role=${newRole}`,
          },
        });
      }

      // Add to local audit log
      setAuditLogs(prev => [
        {
          id: Math.random().toString(),
          action: "User Provisioned",
          details: `${newEmail} assigned role ${newRole.toUpperCase()} on ${assignedPlan.toUpperCase()} tier`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      // Reset form
      setNewEmail("");
      setNewFullName("");
      setNewPlan("enterprise");
      setGeneratedPassword("");
      setShowProvisionModal(false);
      loadAllData();
    } catch (err: any) {
      toast({
        title: "Provisioning Failed",
        description: err.message || "Failed to create user account.",
        variant: "destructive",
      });
    } finally {
      setProvisioning(false);
    }
  };

  // Change Subscription Plan
  const handleChangePlan = async (userId: string, targetTier: "free" | "premium" | "enterprise", userEmail: string) => {
    setUpdatingPlanUserId(userId);
    try {
      // 1. Edge function with service-role privileges
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "update_plan",
          userId,
          newTier: targetTier,
        },
      });

      // 2. Direct fallback/synchronization to profiles table
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ subscription_tier: targetTier })
        .eq("id", userId);

      if (error && dbErr) {
        throw new Error(error.message || dbErr.message || "Could not update plan tier.");
      }

      // Optimistic state update
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, subscription_tier: targetTier } : p));

      if (userId === currentUser?.id) {
        await refreshBranding();
      }

      toast({
        title: "Subscription Plan Updated",
        description: `${userEmail} has been assigned to the ${targetTier.toUpperCase()} tier.`,
      });

      // Dispatch branded plan change email
      sendBrandedEmail({
        type: "plan_change",
        to: userEmail,
        branding: {
          companyName: branding?.company_name || "SightLine Command Center",
          logoUrl: branding?.logo_url || null,
          primaryColor: branding?.accent_color || "#4f46e5",
        },
        data: {
          fullName: profiles.find(p => p.id === userId)?.full_name || userEmail.split("@")[0],
          planTier: targetTier,
          assignedBy: currentUser?.email,
        },
      });

      setAuditLogs(prev => [
        {
          id: Math.random().toString(),
          action: "Plan Tier Updated",
          details: `${userEmail} assigned ${targetTier.toUpperCase()} plan`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      loadAllData();
    } catch (err: any) {
      toast({ title: "Failed to Update Plan", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingPlanUserId(null);
    }
  };

  // Change Role
  const handleChangeRole = async (userId: string, targetRole: string, currentRole: string) => {
    // Permission checks
    if (!isSuperAdminUser && (targetRole === "admin" || targetRole === "super_admin")) {
      toast({
        title: "Permission Denied",
        description: "Admins cannot elevate accounts to Admin or Super Admin.",
        variant: "destructive",
      });
      return;
    }

    if (!isSuperAdminUser && (currentRole === "admin" || currentRole === "super_admin")) {
      toast({
        title: "Permission Denied",
        description: "Admins cannot modify Admin or Super Admin accounts.",
        variant: "destructive",
      });
      return;
    }

    // Protect last active super admin
    if (currentRole === "super_admin" && targetRole !== "super_admin") {
      const superAdmins = userRoles.filter(r => r.role === "super_admin");
      if (superAdmins.length <= 1) {
        toast({
          title: "Protection Policy",
          description: "Cannot demote the last remaining Super Administrator account.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "update_role",
          userId,
          newRole: targetRole,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Could not update user role.");
      }

      if (targetRole === "admin" || targetRole === "super_admin") {
        await supabase.from("profiles").update({ subscription_tier: "enterprise" }).eq("id", userId);
      }

      toast({ title: "Role Updated", description: `User role changed to ${targetRole}.` });
      loadAllData();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    }
  };

  // Toggle User Status (Deactivate / Activate)
  const handleToggleUserStatus = async (userId: string, currentStatus: string, email: string, role: string) => {
    const newStatus = currentStatus === "inactive" ? "active" : "inactive";

    if (!isSuperAdminUser && (role === "admin" || role === "super_admin")) {
      toast({
        title: "Permission Denied",
        description: "Admins cannot deactivate Admin or Super Admin accounts.",
        variant: "destructive",
      });
      return;
    }

    if (role === "super_admin" && newStatus === "inactive") {
      const superAdmins = userRoles.filter(r => r.role === "super_admin");
      if (superAdmins.length <= 1) {
        toast({
          title: "Protection Policy",
          description: "Cannot deactivate the last remaining Super Administrator account.",
          variant: "destructive",
        });
        return;
      }
    }

    if (newStatus === "inactive" && !confirm(`Are you sure you want to deactivate user ${email}? Their active session will be invalidated and all access revoked.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "update_status",
          userId,
          newStatus,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Could not update account status.");
      }

      toast({
        title: newStatus === "active" ? "User Reactivated" : "User Deactivated",
        description: `${email} is now ${newStatus}.`,
      });
      loadAllData();
    } catch (err: any) {
      toast({ title: "Status Change Failed", description: err.message, variant: "destructive" });
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string, email: string, role: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "Operation Blocked", description: "You cannot delete your own account.", variant: "destructive" });
      return;
    }

    if (!isSuperAdminUser && (role === "admin" || role === "super_admin")) {
      toast({
        title: "Permission Denied",
        description: "Admins cannot delete Admin or Super Admin accounts.",
        variant: "destructive",
      });
      return;
    }

    if (role === "super_admin") {
      const superAdmins = userRoles.filter(r => r.role === "super_admin");
      if (superAdmins.length <= 1) {
        toast({
          title: "Protection Policy",
          description: "Cannot delete the last remaining Super Administrator account.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!confirm(`Are you sure you want to permanently delete user ${email}? This action cannot be undone.`)) return;

    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "delete_user",
          userId,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Could not delete user.");
      }

      toast({ title: "User Deleted", description: `${email} has been removed.` });
      loadAllData();
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  // Switch to Project in Super Admin Mode
  const launchProjectInSuperAdmin = (projectId: string) => {
    setSelectedProjectId(projectId);
    toast({
      title: "Super Admin Mode Active",
      description: "Opening Project Command Center with full management permissions.",
    });
    navigate("/");
  };

  // Open Project Management in Portal Settings
  const openProjectInPortal = (projectId: string, tab: string = "info") => {
    setSelectedProjectId(projectId);
    toast({
      title: "Opening Project Portal",
      description: "Managing project settings, team, and scope in project portal.",
    });
    navigate(`/?view=details&tab=${tab}`);
  };

  // Open Edit Project & Access Control Modal
  const handleOpenEditProject = (project: ProjectRow) => {
    setEditingProject(project);
    setEditProjectForm({
      title: project.title || "",
      client_name: project.client_name || "",
      project_ref: project.project_ref || "",
      project_manager: project.project_manager || "",
      reporting_to: project.reporting_to || "",
      project_engineer: project.project_engineer || "",
      location: project.location || "",
      company: project.company || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
    });
    setEditProjectTab("details");
    setShowEditProjectModal(true);
  };

  // Save Project Changes
  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSavingProjectEdit(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: editProjectForm.title,
          client_name: editProjectForm.client_name,
          project_ref: editProjectForm.project_ref,
          project_manager: editProjectForm.project_manager,
          reporting_to: editProjectForm.reporting_to,
          project_engineer: editProjectForm.project_engineer,
          location: editProjectForm.location,
          company: editProjectForm.company,
          start_date: editProjectForm.start_date,
          end_date: editProjectForm.end_date,
        })
        .eq("id", editingProject.id);

      if (error) throw error;

      toast({
        title: "Project Information Saved",
        description: `Updated project metadata for "${editProjectForm.title}".`,
      });

      setAuditLogs(prev => [
        {
          id: Math.random().toString(),
          action: "Project Edited",
          details: `Updated details for ${editProjectForm.title}`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      loadAllData();
      setShowEditProjectModal(false);
    } catch (err: any) {
      toast({ title: "Failed to Update Project", description: err.message, variant: "destructive" });
    } finally {
      setSavingProjectEdit(false);
    }
  };

  // Toggle Project Member Access Control
  const handleToggleProjectAccess = async (userId: string, isCurrentlyAssigned: boolean) => {
    if (!editingProject) return;
    try {
      const targetUser = profiles.find(p => p.id === userId);
      const userEmail = targetUser?.email;
      const userName = targetUser?.full_name || userEmail?.split("@")[0] || "User";

      if (isCurrentlyAssigned) {
        const { error } = await supabase
          .from("project_members")
          .delete()
          .eq("project_id", editingProject.id)
          .eq("user_id", userId);
        if (error) throw error;
        toast({ title: "Access Revoked", description: "User removed from project access list." });

        await logAuditEvent({
          action: "user.revoke_project",
          target_resource: `project:${editingProject.id}`,
          details: { target_user_id: userId, user_email: userEmail, project_title: editingProject.title }
        });

        if (userEmail) {
          sendBrandedEmail({
            type: "project_unassignment",
            to: userEmail,
            branding: {
              companyName: branding?.company_name || "SightLine Command Center",
              logoUrl: branding?.logo_url || null,
              primaryColor: branding?.accent_color || "#4f46e5",
            },
            data: {
              fullName: userName,
              projectName: editingProject.title,
              projectRef: editingProject.project_ref,
              unassignedBy: currentUser?.email,
            },
          });
        }
      } else {
        const targetRoleRow = userRoles.find(r => r.user_id === userId);
        const assignedRole = targetRoleRow?.role === "pm" ? "project_manager" : "client";

        const { error } = await supabase
          .from("project_members")
          .insert({
            project_id: editingProject.id,
            user_id: userId,
            assigned_role: assignedRole,
            assigned_by: currentUser?.id,
            assigned_at: new Date().toISOString(),
            assignment_status: "active"
          });
        if (error) throw error;
        toast({ title: "Access Granted", description: `User assigned to project as ${assignedRole.toUpperCase()}.` });

        await logAuditEvent({
          action: "user.assign_project",
          target_resource: `project:${editingProject.id}`,
          details: { target_user_id: userId, user_email: userEmail, project_title: editingProject.title, assigned_role: assignedRole }
        });

        if (userEmail) {
          sendBrandedEmail({
            type: "project_assignment",
            to: userEmail,
            branding: {
              companyName: branding?.company_name || "SightLine Command Center",
              logoUrl: branding?.logo_url || null,
              primaryColor: branding?.accent_color || "#4f46e5",
            },
            data: {
              fullName: userName,
              projectName: editingProject.title,
              projectRef: editingProject.project_ref,
              clientName: editingProject.client_name,
              assignedBy: currentUser?.email,
              loginUrl: `${getProductionPortalUrl()}/?project=${editingProject.id}&view=details&tab=info`,
            },
          });
        }
      }
      loadAllData();
    } catch (err: any) {
      toast({ title: "Access Update Failed", description: err.message, variant: "destructive" });
    }
  };

  // Assign Standard Engineering Milestone Data to Project
  const handleAssignStandardDataToProject = async (projectId: string) => {
    setSeedingDataForProject(true);
    try {
      const standardMilestones: Array<{
        project_id: string;
        task_number: number;
        name: string;
        status: "Completed" | "Processing" | "Initiating" | "Planning";
        start_day: number;
        duration: number;
      }> = [
          { project_id: projectId, task_number: 1, name: "Site Engineering Survey & Schematic Layout Design", status: "Completed", start_day: 0, duration: 5 },
          { project_id: projectId, task_number: 2, name: "Material Procurement & Field Consignment Staging", status: "Completed", start_day: 5, duration: 5 },
          { project_id: projectId, task_number: 3, name: "Structured Cabling, Trunking & Conduit Installation", status: "Processing", start_day: 10, duration: 10 },
          { project_id: projectId, task_number: 4, name: "Security Control Room Setup & Equipment Rack Dressing", status: "Initiating", start_day: 18, duration: 6 },
          { project_id: projectId, task_number: 5, name: "NVR Storage Server Installation & VMS Configuration", status: "Planning", start_day: 22, duration: 5 },
          { project_id: projectId, task_number: 6, name: "Camera Calibration, Link Testing & System Handover", status: "Planning", start_day: 26, duration: 4 },
        ];

      const { error } = await supabase.from("tasks").insert(standardMilestones);
      if (error) throw error;

      toast({
        title: "Engineering Data Assigned",
        description: "6 standard EPC milestone tasks assigned to this project.",
      });

      setAuditLogs(prev => [
        {
          id: Math.random().toString(),
          action: "Data Assigned",
          details: `Standard EPC milestone package assigned to project`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      loadAllData();
    } catch (err: any) {
      toast({ title: "Failed to Assign Data", description: err.message, variant: "destructive" });
    } finally {
      setSeedingDataForProject(false);
    }
  };

  // Add Single Task to Project
  const handleAddTaskToProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !newTaskName.trim()) return;
    setAddingTaskToProject(true);
    try {
      const projectTasks = tasks.filter(t => t.project_id === editingProject.id);
      const nextNumber = projectTasks.length > 0
        ? Math.max(...projectTasks.map(t => t.task_number)) + 1
        : 1;

      const { error } = await supabase.from("tasks").insert({
        project_id: editingProject.id,
        task_number: nextNumber,
        name: newTaskName.trim(),
        status: newTaskStatus,
        start_day: Number(newTaskStartDay) || 0,
        duration: Number(newTaskDuration) || 7,
      });

      if (error) throw error;

      toast({ title: "Task Assigned", description: `Task #${nextNumber} assigned to ${editingProject.title}.` });
      setNewTaskName("");
      setNewTaskStatus("Planning");
      loadAllData();
    } catch (err: any) {
      toast({ title: "Failed to Add Task", description: err.message, variant: "destructive" });
    } finally {
      setAddingTaskToProject(false);
    }
  };

  // Delete Task from Project
  const handleDeleteTaskFromProject = async (taskId: string, taskName: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      toast({ title: "Task Removed", description: `"${taskName}" deleted.` });
      loadAllData();
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  // Seed Demo Project if Database is empty
  const handleSeedDemoProject = async () => {
    setLoadingData(true);
    try {
      const { data: newProj, error: projErr } = await supabase
        .from("projects")
        .insert({
          title: "King Abdullah Economic City — Industrial Complex Phase IV",
          client_name: "Emaar Industrial City Co.",
          project_ref: "KAEC-IND-2026",
          project_manager: "Eng. Tariq Al-Mansoor",
          reporting_to: "Executive Projects Directorate",
          project_engineer: "Sarah Jenkins, PMP",
          location: "KAEC Industrial Valley, Saudi Arabia",
          company: "Fabulouzz Engineering Solutions",
          start_date: "2026-03-01",
          end_date: "2026-11-30",
        })
        .select()
        .single();

      if (projErr) throw projErr;

      const sampleTasks: Array<{
        project_id: string;
        task_number: number;
        name: string;
        status: "Completed" | "Processing" | "Initiating" | "Planning";
        start_day: number;
        duration: number;
      }> = [
          { project_id: newProj.id, task_number: 1, name: "Site Engineering Survey & Schematic Layout Design", status: "Completed", start_day: 0, duration: 5 },
          { project_id: newProj.id, task_number: 2, name: "Material Procurement & Field Consignment Staging", status: "Completed", start_day: 5, duration: 5 },
          { project_id: newProj.id, task_number: 3, name: "Structured Cabling, Trunking & Conduit Installation", status: "Processing", start_day: 10, duration: 10 },
          { project_id: newProj.id, task_number: 4, name: "Security Control Room Setup & Equipment Rack Dressing", status: "Initiating", start_day: 18, duration: 6 },
          { project_id: newProj.id, task_number: 5, name: "NVR Storage Server Installation & VMS Configuration", status: "Planning", start_day: 22, duration: 5 },
          { project_id: newProj.id, task_number: 6, name: "Camera Calibration, Link Testing & System Handover", status: "Planning", start_day: 26, duration: 4 },
        ];

      await supabase.from("tasks").insert(sampleTasks);

      toast({
        title: "Enterprise Demo Project Seeded!",
        description: "Created KAEC Phase IV with full timeline and milestones.",
      });

      loadAllData();
    } catch (err: any) {
      toast({ title: "Seeding Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  // Compute Portfolio Breakdown Metrics
  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "Completed").length;
    const processingTasks = tasks.filter(t => t.status === "Processing").length;
    const initiatingTasks = tasks.filter(t => t.status === "Initiating").length;
    const planningTasks = tasks.filter(t => t.status === "Planning").length;

    const weightedScore = (completedTasks * 1) + (processingTasks * 0.5) + (initiatingTasks * 0.2);
    const overallCompletion = totalTasks > 0 ? Math.round((weightedScore / totalTasks) * 100) : 0;

    const totalTeamMembers = profiles.length;
    const totalSubscribers = subscribers.filter(s => s.is_active).length;

    // Per-project progress map
    const projectBreakdowns = projects.map(p => {
      const pTasks = tasks.filter(t => t.project_id === p.id);
      const count = pTasks.length;
      const comp = pTasks.filter(t => t.status === "Completed").length;
      const proc = pTasks.filter(t => t.status === "Processing").length;
      const init = pTasks.filter(t => t.status === "Initiating").length;
      const plan = pTasks.filter(t => t.status === "Planning").length;

      const pScore = (comp * 1) + (proc * 0.5) + (init * 0.2);
      const percent = count > 0 ? Math.round((pScore / count) * 100) : 0;

      // Member count
      const memberCount = memberships.filter(m => m.project_id === p.id).length;

      return {
        ...p,
        taskCount: count,
        completed: comp,
        processing: proc,
        initiating: init,
        planning: plan,
        percent,
        memberCount,
      };
    });

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      processingTasks,
      initiatingTasks,
      planningTasks,
      overallCompletion,
      totalTeamMembers,
      totalSubscribers,
      projectBreakdowns,
    };
  }, [projects, tasks, profiles, memberships, subscribers]);

  // Filtered Project List
  const filteredProjects = useMemo(() => {
    if (!searchProjectQuery.trim()) return metrics.projectBreakdowns;
    const q = searchProjectQuery.toLowerCase();
    return metrics.projectBreakdowns.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.project_ref.toLowerCase().includes(q) ||
        p.project_manager.toLowerCase().includes(q)
    );
  }, [metrics.projectBreakdowns, searchProjectQuery]);

  // User Plan Distribution Counts
  const planCounts = useMemo(() => {
    let enterprise = 0, premium = 0, free = 0;
    profiles.forEach(p => {
      const roleRow = userRoles.find(r => r.user_id === p.id);
      const isAdm = roleRow?.role === "admin" || p.id === currentUser?.id;
      const tier = isAdm ? "enterprise" : (p.subscription_tier || "free");
      if (tier === "enterprise") enterprise++;
      else if (tier === "premium") premium++;
      else free++;
    });
    return { enterprise, premium, free, total: profiles.length };
  }, [profiles, userRoles, currentUser?.id]);

  // Filtered User List with Plan Tier
  const filteredUsers = useMemo(() => {
    const list = profiles.map(p => {
      const roleRow = userRoles.find(r => r.user_id === p.id);
      const assignedCount = memberships.filter(m => m.user_id === p.id).length;
      const role = roleRow?.role || "client";
      const isAdm = role === "admin" || p.id === currentUser?.id;
      const planTier: "free" | "premium" | "enterprise" = isAdm
        ? "enterprise"
        : ((p.subscription_tier as any) || "free");

      return {
        ...p,
        role,
        planTier,
        assignedCount,
      };
    });

    return list.filter(u => {
      if (planFilter !== "all" && u.planTier !== planFilter) {
        return false;
      }
      if (!searchUserQuery.trim()) return true;
      const q = searchUserQuery.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        u.planTier.toLowerCase().includes(q)
      );
    });
  }, [profiles, userRoles, memberships, searchUserQuery, planFilter, currentUser?.id]);

  // Administrator Direct Login Handler
  const handleAdminDirectLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      toast({
        title: "Credentials required",
        description: "Please enter your administrative email and password.",
        variant: "destructive",
      });
      return;
    }
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      if (error) throw error;

      const auth = await resolveUserAuth(data.user);
      if (auth && (auth.accountStatus === "deactivated" || auth.status === "deactivated")) {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated. Please contact an administrator.");
      }

      if (!auth.isSuperAdmin && !auth.isAdmin) {
        await supabase.auth.signOut();
        toast({
          title: "Access Restricted",
          description: "Authenticated successfully, but this account is not assigned Administrator privileges.",
          variant: "destructive",
        });
        return;
      }

      setCurrentUser(data.user);
      setUserRole(auth.userRole);
      setIsSuperAdminUser(auth.isSuperAdmin);
      setIsAdminUser(auth.isAdmin);
      setIsAdmin(true);

      await logAuditEvent({
        action: "auth.login",
        target_resource: `user:${data.user.id}`,
        details: { email: data.user.email, role: auth.userRole }
      });

      toast({
        title: auth.isSuperAdmin ? "Super Admin Authorized" : "Contractor Admin Authorized",
        description: `Welcome back, ${data.user.email}`
      });
      loadAllData();
    } catch (err: any) {
      toast({
        title: "Authorization Failed",
        description: err.message || "Invalid credentials. Please verify your email and password.",
        variant: "destructive",
      });
    } finally {
      setLoggingIn(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // Render: Loading Auth
  // ──────────────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <motion.div
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Verifying Enterprise Credentials...
        </span>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // Render: Unauthorized (Non-Admin or Unauthenticated)
  // ──────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="max-w-md w-full glass-card p-6 sm:p-8 rounded-2xl border border-border/40 relative shadow-2xl overflow-hidden"
        >
          {/* Top Logo & Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
              alt="Fabulouzz SightLine"
              className="h-10 w-auto mb-3 cursor-pointer"
              onClick={() => navigate("/")}
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase mb-2">
              <Shield className="w-3.5 h-3.5" />
              Enterprise Command Deck
            </div>
            <h2 className="text-xl font-bold text-foreground">Super Administrator Sign-In</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Privileged access portal for fleet oversight, user provisioning, and company branding.
            </p>
          </div>

          {currentUser ? (
            /* Logged in but not admin */
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center mx-auto mb-2">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-destructive">Restricted Account</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Signed in as <strong className="text-foreground">{currentUser.email}</strong>, which lacks Super Administrator credentials.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                    setIsAdmin(false);
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground transition-all"
                >
                  Sign Out & Enter Admin Credentials
                </button>
              </div>
            </div>
          ) : (
            /* Direct SuperAdmin Sign-In Form */
            <form onSubmit={handleAdminDirectLogin} className="space-y-3.5 mb-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Administrator Email
                  </label>
                  <button
                    type="button"
                    onClick={() => setLoginEmail("support@fabulouzz.com")}
                    className="text-[10px] text-primary hover:underline font-mono"
                  >
                    Quick-fill
                  </button>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="support@fabulouzz.com"
                    required
                    className="w-full bg-secondary/30 border border-border/40 focus:border-primary rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-secondary/30 border border-border/40 focus:border-primary rounded-xl pl-9 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Authorize & Enter Command Deck</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Return to Portal */}
          <div className="pt-3 border-t border-border/30 flex flex-col gap-2">

            <button
              onClick={() => navigate("/")}
              className="w-full py-2 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border/30 hover:border-border/60 flex items-center justify-center gap-2 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Project Portal</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // Render: Full Enterprise Admin Suite
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* ═══════ TOP COMMAND RIBBON ═══════ */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left Brand & Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
              alt="Fabulouzz SightLine"
              className="h-8 w-auto cursor-pointer"
              onClick={() => navigate("/")}
            />
            <div className="hidden sm:flex flex-col border-l border-border/30 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wider text-primary" style={{ fontFamily: "'Neuropol X Free', sans-serif" }}>
                  SIGHTLINE
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Enterprise Suite
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">
                Super Admin Command Center
              </span>
            </div>
          </div>

          {/* Quick Project Switcher Dropdown */}
          <div className="hidden lg:flex items-center gap-2 bg-secondary/50 border border-border/30 rounded-xl px-3 py-1.5 text-xs">
            <BriefcaseIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground font-medium">Quick Launch:</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) launchProjectInSuperAdmin(e.target.value);
              }}
              className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="" disabled>Select Project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-card text-foreground">
                  {p.title} ({p.project_ref || "No Ref"})
                </option>
              ))}
            </select>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* System Status Ping */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 border border-border/30 text-[11px] text-muted-foreground" title="Database latency">
              <span className={`w-2 h-2 rounded-full ${systemStatus === "healthy" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="font-mono">{systemPing ? `${systemPing}ms` : "Syncing"}</span>
            </div>

            {/* Client Portal Link */}
            <motion.button
              onClick={() => navigate("/")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              title="Switch to Client/Project View"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Project Portal</span>
            </motion.button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 rounded-xl border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Refresh Data */}
            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="w-8 h-8 rounded-xl border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin text-primary" : ""}`} />
            </button>

            {/* Role Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${
              isSuperAdminUser
                ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                : "bg-primary/15 border-primary/30 text-primary"
            }`}>
              <Shield className="w-3 h-3" />
              <span>{isSuperAdminUser ? "SUPER ADMIN (Tier 1)" : "ADMIN (Tier 2)"}</span>
            </div>

            {/* Sign Out */}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setCurrentUser(null);
                setUserRole(null);
                setIsSuperAdminUser(false);
                setIsAdminUser(false);
                setIsAdmin(false);
                navigate("/");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive border border-border/30 hover:border-destructive/30 transition-all"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════ ENTERPRISE SUB-NAV TABS ═══════ */}
      <div className="bg-card/50 border-b border-border/30 overflow-x-auto no-scrollbar">
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 flex items-center gap-1 sm:gap-2 h-12">
          {[
            { id: "breakdown", label: "Portfolio Breakdown", icon: BarChart3 },
            { id: "projects", label: `Projects (${projects.length})`, icon: FolderOpen },
            { id: "users", label: `Team & Users (${profiles.length})`, icon: Users },
            ...(isSuperAdminUser ? [{ id: "system", label: "System & Security", icon: Activity }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${active
                  ? "text-primary bg-primary/10 border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {active && (
                  <motion.div
                    layoutId="activeAdminTabIndicator"
                    className="absolute -bottom-[1px] left-2 right-2 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════ MAIN CONTENT AREA ═══════ */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {/* ═══════════════════════════════════════════════════════════
            TAB 1: PORTFOLIO BREAKDOWN (EXECUTIVE METRICS)
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "breakdown" && (
          <div className="space-y-6">
            {/* Enterprise SuperAdmin Status Banner */}
            <div className="glass-card p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                  <Crown className="w-6 h-6 fill-amber-500/20" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Super Administrator — Enterprise Tier Active
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      All Premium Options Unlocked
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your account ({currentUser?.email}) has full unconstrained access: custom white-label branding, PDF report generation, multi-project access control, and user plan assignment.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleVerifyAdminEnterprise}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all flex items-center gap-1.5"
                  title="Verify and force-sync enterprise tier in Supabase profile"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Enterprise Status</span>
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  <Users className="w-4 h-4" />
                  <span>Assign User Plans</span>
                </button>
              </div>
            </div>

            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="glass-card p-4 rounded-2xl border border-border/30">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Total Projects
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {metrics.totalProjects}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="text-primary font-semibold">Active Fleet</span> across sites
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-border/30">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Fleet Progress
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {metrics.overallCompletion}%
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Weighted milestone velocity
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-border/30">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Total Tasks
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {metrics.totalTasks}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 text-emerald-500 font-medium">
                  {metrics.completedTasks} completed
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-border/30">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  In Progress
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-blue-500">
                  {metrics.processingTasks + metrics.initiatingTasks}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {metrics.planningTasks} in planning
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-border/30">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Enterprise Team
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {metrics.totalTeamMembers}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Admins, PMs, Engineers
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-border/30">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Subscribers
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {metrics.totalSubscribers}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 text-primary">
                  Live stakeholder feeds
                </div>
              </div>
            </div>

            {/* PORTFOLIO BREAKDOWN CARDS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Project Fleet Breakdown</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed status, task distribution, and direct command center access for every installation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {projects.length === 0 && (
                  <button
                    onClick={handleSeedDemoProject}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Seed Demo Project
                  </button>
                )}
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 flex items-center gap-1.5"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>
            </div>

            {/* PROJECTS GRID WITH BREAKDOWNS */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl border border-border/30">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">No Projects Created Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Get started by provisioning your first engineering project or seeding sample data.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleSeedDemoProject}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                  >
                    Seed Sample Project
                  </button>
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    Create Custom Project
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((p) => {
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-5 rounded-2xl border border-border/30 flex flex-col justify-between hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all"
                    >
                      <div>
                        {/* Top Reference & Actions */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary/80 border border-border/30 text-muted-foreground font-semibold">
                            {p.project_ref || "PRJ-SIGHTLINE"}
                          </span>
                          <span className="text-xs font-bold text-primary font-mono">
                            {p.percent}% Done
                          </span>
                        </div>

                        {/* Title & Client */}
                        <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 mb-1">
                          {p.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                          <User className="w-3 h-3 text-primary/70" />
                          <span>{p.client_name || "Enterprise Client"}</span>
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full bg-secondary/60 h-2 rounded-full overflow-hidden mb-4">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${p.percent}%`,
                              background: p.percent === 100 ? "hsl(var(--completed))" : "var(--gradient-primary)",
                            }}
                          />
                        </div>

                        {/* Task Status Breakdown Pills */}
                        <div className="grid grid-cols-4 gap-1.5 text-center mb-4">
                          <div className="bg-completed/10 border border-completed/20 py-1 px-1 rounded-lg">
                            <span className="text-[10px] text-completed block font-bold">{p.completed}</span>
                            <span className="text-[9px] text-muted-foreground">Done</span>
                          </div>
                          <div className="bg-processing/10 border border-processing/20 py-1 px-1 rounded-lg">
                            <span className="text-[10px] text-processing block font-bold">{p.processing}</span>
                            <span className="text-[9px] text-muted-foreground">Active</span>
                          </div>
                          <div className="bg-initiating/10 border border-initiating/20 py-1 px-1 rounded-lg">
                            <span className="text-[10px] text-initiating block font-bold">{p.initiating}</span>
                            <span className="text-[9px] text-muted-foreground">Init</span>
                          </div>
                          <div className="bg-planning/10 border border-planning/20 py-1 px-1 rounded-lg">
                            <span className="text-[10px] text-planning block font-bold">{p.planning}</span>
                            <span className="text-[9px] text-muted-foreground">Plan</span>
                          </div>
                        </div>

                        {/* Metadata Footer */}
                        <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border/20 pt-3">
                          {p.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-primary/60 flex-shrink-0" />
                              <span className="truncate">{p.location}</span>
                            </div>
                          )}
                          {p.project_manager && (
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3 h-3 text-primary/60 flex-shrink-0" />
                              <span className="truncate">PM: {p.project_manager}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[10px] pt-1">
                            <span>{p.memberCount} Team Members</span>
                            <span>{p.taskCount} Total Tasks</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Launcher & Management */}
                      <div className="pt-4 mt-2 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openProjectInPortal(p.id)}
                          className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground hover:text-primary border border-border/40 flex items-center justify-center gap-1.5 transition-colors"
                          title="Manage project details, scope, team, branding & subscribers in Project Portal"
                        >
                          <Sliders className="w-3.5 h-3.5 text-primary" />
                          <span>Portal Settings</span>
                        </button>
                        <button
                          onClick={() => launchProjectInSuperAdmin(p.id)}
                          className="py-2.5 px-3 rounded-xl text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 group transition-all"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          <span>Command Center</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: PROJECTS FLEET MANAGEMENT
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Projects Fleet & Milestones</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create, configure, edit metadata, and manage task milestones across your engineering projects.
                </p>
              </div>
              <button
                onClick={() => setShowCreateProject(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 flex items-center gap-1.5 self-start sm:self-auto"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects by title, client, ref, or location..."
                value={searchProjectQuery}
                onChange={(e) => setSearchProjectQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-card border border-border/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchProjectQuery && (
                <button
                  onClick={() => setSearchProjectQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Project Table */}
            <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 border-b border-border/30 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">Project Ref</th>
                      <th className="py-3 px-4">Title & Client</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">PM / Lead</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {p.project_ref || "PRJ"}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-foreground truncate">{p.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{p.client_name || "—"}</div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {p.location || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {p.project_manager || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary/60 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${p.percent}%`, background: "var(--gradient-primary)" }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-semibold">{p.percent}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openProjectInPortal(p.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-secondary/80 text-foreground hover:bg-secondary hover:text-primary font-semibold border border-border/40 text-xs flex items-center gap-1.5 transition-colors"
                              title="Open Project Portal Settings (Details, Contacts, Scope, Team, Branding, Subscribers)"
                            >
                              <Sliders className="w-3.5 h-3.5 text-primary" />
                              <span>Manage in Portal</span>
                            </button>
                            <button
                              onClick={() => launchProjectInSuperAdmin(p.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-semibold border border-primary/20 text-xs flex items-center gap-1.5"
                              title="Open Project Command Deck"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Command Deck</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Permanently delete project "${p.title}"?`)) {
                                  await supabase.from("projects").delete().eq("id", p.id);
                                  toast({ title: "Project Deleted" });
                                  loadAllData();
                                }
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete Project"
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 3: ENTERPRISE USER MANAGEMENT (SEPARATED FROM PUBLIC)
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Enterprise User & Access Directory</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Internal team provisioning, role-based security policies, and user credentials.
                </p>
              </div>

              <button
                onClick={() => setShowProvisionModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 flex items-center gap-1.5 self-start sm:self-auto"
                style={{ background: "var(--gradient-primary)" }}
              >
                <UserPlus className="w-4 h-4" />
                Provision User
              </button>
            </div>

            {/* Plan Tier Filters & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Plan Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/30 overflow-x-auto text-xs">
                <button
                  onClick={() => setPlanFilter("all")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${planFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  All Users ({planCounts.total})
                </button>
                <button
                  onClick={() => setPlanFilter("enterprise")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${planFilter === "enterprise"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-amber-500"
                    }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Enterprise ({planCounts.enterprise})</span>
                </button>
                <button
                  onClick={() => setPlanFilter("premium")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${planFilter === "premium"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-indigo-500"
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Premium ({planCounts.premium})</span>
                </button>
                <button
                  onClick={() => setPlanFilter("free")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${planFilter === "free"
                    ? "bg-muted text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Free ({planCounts.free})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-xs sm:w-64">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-card border border-border/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchUserQuery && (
                  <button
                    onClick={() => setSearchUserQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 border-b border-border/30 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">System Role</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Subscription Plan</th>
                      <th className="py-3 px-4">Projects Assigned</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Role & Account Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const isSuperAdminTarget = u.role === "super_admin";
                      const isAdminTarget = u.role === "admin";
                      const isLastSuperAdmin = isSuperAdminTarget && profiles.filter(p => userRoles.some(r => r.user_id === p.id && r.role === "super_admin")).length <= 1;

                      // Admin restriction: Admin cannot manage Super Admin or Admin
                      const canManageThisUser = isSuperAdminUser ? (!isLastSuperAdmin && !isSelf) : (!isSuperAdminTarget && !isAdminTarget && !isSelf);

                      return (
                        <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                                {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                  <span>{u.full_name || "Unnamed Team Member"}</span>
                                  {isSelf && (
                                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-mono">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                u.role === "super_admin"
                                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                  : u.role === "admin"
                                    ? "bg-destructive/10 text-destructive border-destructive/20"
                                    : u.role === "pm"
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-secondary text-muted-foreground border-border/30"
                              }`}
                            >
                              {u.role === "super_admin" ? "Super Admin" : u.role === "admin" ? "Admin" : u.role === "pm" ? "Project Manager" : "Client"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              u.status === "inactive"
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            }`}>
                              {u.status === "inactive" ? "Deactivated" : "Active"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {u.role === "super_admin" || u.role === "admin" || isSelf ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Enterprise</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={u.planTier}
                                    disabled={updatingPlanUserId === u.id || !canManageThisUser}
                                    onChange={(e) => handleChangePlan(u.id, e.target.value as any, u.email)}
                                    className={`bg-card border text-[11px] font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 cursor-pointer transition-colors ${u.planTier === "enterprise"
                                      ? "border-amber-500/40 text-amber-500 bg-amber-500/5 focus:ring-amber-500/30"
                                      : u.planTier === "premium"
                                        ? "border-indigo-500/40 text-indigo-500 bg-indigo-500/5 focus:ring-indigo-500/30"
                                        : "border-border/40 text-muted-foreground focus:ring-primary/30"
                                      }`}
                                  >
                                    <option value="free">Free Tier ($0)</option>
                                    <option value="premium">Premium Plan ($29/mo)</option>
                                    <option value="enterprise">Enterprise Plan ($99/mo)</option>
                                  </select>
                                  {updatingPlanUserId === u.id && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {u.assignedCount} project{u.assignedCount !== 1 ? "s" : ""}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isSelf ? (
                              <span className="text-[11px] text-muted-foreground italic">Protected (You)</span>
                            ) : isLastSuperAdmin ? (
                              <span className="text-[11px] text-amber-500 font-medium italic">Protected (Last Owner)</span>
                            ) : !isSuperAdminUser && (isSuperAdminTarget || isAdminTarget) ? (
                              <span className="text-[11px] text-muted-foreground italic">Restricted (Admin Account)</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleChangeRole(u.id, e.target.value, u.role)}
                                  className="bg-card border border-border/40 text-[11px] rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                                >
                                  <option value="client">Client</option>
                                  <option value="pm">Project Manager</option>
                                  {isSuperAdminUser && (
                                    <>
                                      <option value="admin">Admin</option>
                                      <option value="super_admin">Super Admin</option>
                                    </>
                                  )}
                                </select>

                                {/* Toggle Status Button */}
                                <button
                                  onClick={() => handleToggleUserStatus(u.id, u.status || "active", u.email, u.role)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.status === "inactive"
                                      ? "text-emerald-500 hover:bg-emerald-500/10"
                                      : "text-amber-500 hover:bg-amber-500/10"
                                  }`}
                                  title={u.status === "inactive" ? "Reactivate User" : "Deactivate User"}
                                >
                                  {u.status === "inactive" ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email, u.role)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 4: SYSTEM TELEMETRY, POLICIES & AUDIT LOGS
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "system" && (
          !isSuperAdminUser ? (
            <div className="glass-card p-8 rounded-2xl border border-destructive/30 text-center max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Access Restricted: Super Administrator Only</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                The Main System Administration & Security Controls Panel is restricted to <strong>Tier 1 — System Owner (SUPER_ADMIN)</strong>.
                Contractor Administrators (Tier 2) operate projects, scopes, tasks, and project-level assignments.
              </p>
              <button
                onClick={() => setActiveTab("breakdown")}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-all"
              >
                Return to Portfolio Breakdown
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">System Security, Telemetry & Audit Logs</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tier 1 Main System Administration: Global security policies, RLS enforcement, and enterprise audit trail.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const logs = await fetchAuditLogs(100);
                      setAuditLogs(logs);
                      toast({ title: "Audit Trail Synchronized", description: `Loaded ${logs.length} latest security events.` });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border/40 text-xs font-semibold hover:border-primary/40 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Audit Trail</span>
                  </button>
                </div>
              </div>

              {/* System Diagnostics & Policy Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-border/30">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Database Connectivity</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-foreground">Postgres Online</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1.5">
                    Latency: {systemPing ? `${systemPing}ms` : "Syncing"}
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-border/30">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Authorization Model</span>
                  <div className="flex items-center gap-2 mt-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-foreground">Postgres RLS Enforced</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1.5">
                    Projects, Tasks, Members Isolated
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-border/30">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Owner Protection</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-foreground">Last SuperAdmin Protected</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1.5">
                    Postgres Trigger Active
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-border/30">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Authentication Standard</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Enterprise MFA & JWT</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1.5">
                    Session Duration: 8h Max
                  </div>
                </div>
              </div>

              {/* Comprehensive Audit Log Table */}
              <div className="glass-card p-5 rounded-2xl border border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Security & Operational Audit Log</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-semibold">
                      {auditLogs.length} Events Recorded
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">Immutable Security Trail</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/20">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/40 border-b border-border/30 text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor / Email</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Target Resource</th>
                        <th className="py-2.5 px-3">Details</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 font-mono text-[11px]">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-muted-foreground font-sans">
                            No security audit records logged yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.slice(0, 50).map((log) => {
                          const isSecurityAction = log.action.startsWith("auth.") || log.action.startsWith("security.");
                          const isUserAction = log.action.startsWith("user.");
                          return (
                            <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-foreground font-sans font-medium">
                                {log.actor_email || log.actor_id || "System"}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-secondary text-foreground">
                                  {log.actor_role || "system"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  isSecurityAction
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : isUserAction
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground truncate max-w-[180px]">
                                {log.target_resource || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[240px]" title={JSON.stringify(log.details)}>
                                {log.details ? JSON.stringify(log.details) : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  log.status === "denied"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-emerald-500/15 text-emerald-500"
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* ═══════ PROVISION USER MODAL ═══════ */}
      <AnimatePresence>
        {showProvisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 rounded-2xl border border-border/40 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <span>Provision Enterprise User</span>
                </h3>
                <button onClick={() => setShowProvisionModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleProvisionUser} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Tariq Al-Mansoor"
                    className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Enterprise Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="pm">Project Manager (Tier 3 — Operational Project CRUD)</option>
                    <option value="client">Client (Tier 3 — Read-Only Monitoring Portal)</option>
                    {isSuperAdminUser && (
                      <>
                        <option value="admin">Contractor Administrator (Tier 2 — All Projects & Management)</option>
                        <option value="super_admin">Super Administrator (Tier 1 — System Owner)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Subscription Plan</label>
                  <select
                    value={(newRole === "admin" || newRole === "super_admin") ? "enterprise" : newPlan}
                    disabled={newRole === "admin" || newRole === "super_admin"}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="enterprise">Enterprise Plan ($99/mo - All Features)</option>
                    <option value="premium">Premium Plan ($29/mo - Reports & Custom Theme)</option>
                    <option value="free">Free Plan ($0 - Standard View)</option>
                  </select>
                  {(newRole === "admin" || newRole === "super_admin") ? (
                    <span className="text-[10px] text-amber-500 mt-1 block">Administrators are automatically provisioned with the Enterprise Plan.</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground mt-1 block">Determines access to custom reports, branding, and export capabilities.</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-muted-foreground">Generated Password</label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={generatedPassword}
                      className="flex-1 bg-card border border-border/40 rounded-xl px-3 py-2 font-mono text-xs text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword);
                        setCopiedPwd(true);
                        setTimeout(() => setCopiedPwd(false), 2000);
                      }}
                      className="p-2 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      title="Copy to clipboard"
                    >
                      {copiedPwd ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium border border-border/40 text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisioning}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 flex items-center gap-1.5"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {provisioning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Provisioning</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ EDIT PROJECT, ACCESS CONTROL & DATA ASSIGNMENT MODAL ═══════ */}
      <AnimatePresence>
        {showEditProjectModal && editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-2xl border border-border/40 max-w-2xl w-full shadow-2xl relative my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border/30 bg-secondary/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">Project Command & Access Control</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                    {editingProject.title} ({editingProject.project_ref || "PRJ"})
                  </p>
                </div>
                <button
                  onClick={() => setShowEditProjectModal(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-Tab Navigation Bar */}
              <div className="flex items-center gap-2 p-2.5 bg-secondary/20 border-b border-border/30 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setEditProjectTab("details")}
                  className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${editProjectTab === "details"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Project Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditProjectTab("access")}
                  className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${editProjectTab === "access"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Access-Controlled Users</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditProjectTab("data")}
                  className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${editProjectTab === "data"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Assign Milestone Data</span>
                </button>
              </div>

              {/* Modal Body Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {/* ──── SUB-TAB 1: PROJECT DETAILS ──── */}
                {editProjectTab === "details" && (
                  <form onSubmit={handleSaveProjectEdit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Project Title</label>
                        <input
                          type="text"
                          required
                          value={editProjectForm.title}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, title: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Client / Owner</label>
                        <input
                          type="text"
                          value={editProjectForm.client_name}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, client_name: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Project Reference Code</label>
                        <input
                          type="text"
                          value={editProjectForm.project_ref}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, project_ref: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Project Location</label>
                        <input
                          type="text"
                          value={editProjectForm.location}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, location: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Executing Company</label>
                        <input
                          type="text"
                          value={editProjectForm.company}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, company: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Project Manager (PM)</label>
                        <input
                          type="text"
                          value={editProjectForm.project_manager}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, project_manager: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Project Engineer</label>
                        <input
                          type="text"
                          value={editProjectForm.project_engineer}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, project_engineer: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editProjectForm.start_date}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, start_date: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">End Date</label>
                        <input
                          type="date"
                          value={editProjectForm.end_date}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, end_date: e.target.value })}
                          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/30 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditProjectModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-medium border border-border/40 text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingProjectEdit}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 flex items-center gap-1.5"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {savingProjectEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Project Information</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ──── SUB-TAB 2: ACCESS-CONTROLLED USERS ──── */}
                {editProjectTab === "access" && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <span className="font-semibold text-foreground">Role-Based Access Control: </span>
                        <span className="text-muted-foreground">
                          Super Admins and assigned Project Managers have full edit permissions. Assigned Client stakeholders receive read-only dashboard access.
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {profiles.map((u) => {
                        const isAssigned = memberships.some(
                          (m) => m.project_id === editingProject.id && m.user_id === u.id
                        );
                        const roleRow = userRoles.find((r) => r.user_id === u.id);
                        const role = roleRow?.role || "client";
                        const isAdm = role === "admin" || u.id === currentUser?.id;

                        return (
                          <div
                            key={u.id}
                            className="p-3 rounded-xl bg-card border border-border/40 flex items-center justify-between gap-3 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-secondary text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-border/40">
                                {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                                  <span>{u.full_name || "Enterprise Member"}</span>
                                  {isAdm && (
                                    <span className="text-[9px] bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isAdm ? (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold">
                                  Full SuperAdmin Access
                                </span>
                              ) : isAssigned ? (
                                <>
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${role === "pm"
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                      }`}
                                  >
                                    {role === "pm" ? "Can Edit Project" : "Read-Only Stakeholder"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleProjectAccess(u.id, true)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors"
                                  >
                                    Revoke
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleProjectAccess(u.id, false)}
                                  className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Grant Access</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ──── SUB-TAB 3: ASSIGN DATA & MILESTONES ──── */}
                {editProjectTab === "data" && (
                  <div className="space-y-5">
                    {/* Standard Milestone Package Seeder */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span>Assign Standard Milestone Package</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Seeds 6 industry-standard engineering milestone tasks (Survey & Design, Materials, Cabling, Rack Assembly, Server & VMS, Commissioning).
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={seedingDataForProject}
                        onClick={() => handleAssignStandardDataToProject(editingProject.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-sm shadow-primary/20"
                      >
                        {seedingDataForProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                        <span>Assign Milestone Package</span>
                      </button>
                    </div>

                    {/* Add Custom Task Form */}
                    <div className="p-4 rounded-xl bg-card border border-border/40 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <PlusCircle className="w-4 h-4 text-primary" />
                        <span>Add Custom Project Milestone</span>
                      </div>
                      <form onSubmit={handleAddTaskToProject} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Milestone / task name..."
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                            className="w-full bg-secondary/50 border border-border/40 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <select
                            value={newTaskStatus}
                            onChange={(e) => setNewTaskStatus(e.target.value as any)}
                            className="w-full bg-secondary/50 border border-border/40 rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="Planning">Planning</option>
                            <option value="Initiating">Initiating</option>
                            <option value="Processing">Processing</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <button
                            type="submit"
                            disabled={addingTaskToProject}
                            className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-1"
                          >
                            {addingTaskToProject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            <span>Add Task</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Currently Assigned Tasks Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground">Currently Assigned Milestones</span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {tasks.filter((t) => t.project_id === editingProject.id).length} Milestones
                        </span>
                      </div>

                      {tasks.filter((t) => t.project_id === editingProject.id).length === 0 ? (
                        <div className="text-center py-8 rounded-xl border border-dashed border-border/40 p-4">
                          <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No milestones assigned to this project yet.</p>
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Click "Assign EPC Package" above to populate standard tasks.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {tasks
                            .filter((t) => t.project_id === editingProject.id)
                            .map((t) => (
                              <div
                                key={t.id}
                                className="p-2.5 rounded-xl bg-secondary/30 border border-border/30 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[10px] text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-card">
                                    #{t.task_number}
                                  </span>
                                  <span className="font-medium text-foreground truncate">{t.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.status === "Completed"
                                      ? "bg-completed/10 text-completed border border-completed/20"
                                      : t.status === "Processing"
                                        ? "bg-processing/10 text-processing border border-processing/20"
                                        : t.status === "Initiating"
                                          ? "bg-initiating/10 text-initiating border border-initiating/20"
                                          : "bg-planning/10 text-planning border border-planning/20"
                                      }`}
                                  >
                                    {t.status}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTaskFromProject(t.id, t.name)}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    title="Delete task"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ CREATE PROJECT MODAL ═══════ */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={() => {
          setShowCreateProject(false);
          loadAllData();
        }}
      />
    </div>
  );
};

// Simple Fallback Icons for missing types
const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);

const UserCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
);

const TerminalIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></svg>
);

export default Admin;
