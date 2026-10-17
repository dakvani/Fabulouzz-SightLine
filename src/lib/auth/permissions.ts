import { UserRole, normalizeRole, isSuperAdmin, isAdmin, isProjectManager, isClient } from "./roles";

/**
 * Enterprise Permission Keys
 */
export type PermissionKey =
  | "system.manage"
  | "security.manage"
  | "security.audit_logs"
  | "security.operational_logs"
  | "users.manage_super_admins"
  | "users.manage_admins"
  | "users.manage_pms"
  | "users.manage_clients"
  | "users.manage_operational"
  | "projects.create"
  | "projects.view_all"
  | "projects.view_assigned"
  | "projects.update"
  | "projects.delete"
  | "projects.assign_users"
  | "tasks.read"
  | "tasks.view_kanban"
  | "tasks.create"
  | "tasks.update"
  | "tasks.delete"
  | "tasks.move_kanban"
  | "scopes.read"
  | "scopes.update"
  | "scopes.update_operational"
  | "milestones.read"
  | "milestones.update"
  | "documents.read_all"
  | "documents.read_client"
  | "documents.upload"
  | "reports.view"
  | "reports.export"
  | "dashboard.view"
  | "notes.internal"
  | "notes.internal_view"
  | "audit.view_system"
  | "audit.view_operational";

/**
 * Baseline Role Permission Matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, Set<PermissionKey>> = {
  super_admin: new Set<PermissionKey>([
    "system.manage",
    "security.manage",
    "security.audit_logs",
    "security.operational_logs",
    "users.manage_super_admins",
    "users.manage_admins",
    "users.manage_pms",
    "users.manage_clients",
    "users.manage_operational",
    "projects.create",
    "projects.view_all",
    "projects.view_assigned",
    "projects.update",
    "projects.delete",
    "projects.assign_users",
    "tasks.read",
    "tasks.view_kanban",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "tasks.move_kanban",
    "scopes.read",
    "scopes.update",
    "scopes.update_operational",
    "milestones.read",
    "milestones.update",
    "documents.read_all",
    "documents.read_client",
    "documents.upload",
    "reports.view",
    "reports.export",
    "dashboard.view",
    "notes.internal",
    "notes.internal_view",
    "audit.view_system",
    "audit.view_operational",
  ]),
  admin: new Set<PermissionKey>([
    "security.operational_logs",
    "users.manage_pms",
    "users.manage_clients",
    "users.manage_operational",
    "projects.create",
    "projects.view_all",
    "projects.view_assigned",
    "projects.update",
    "projects.delete",
    "projects.assign_users",
    "tasks.read",
    "tasks.view_kanban",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "tasks.move_kanban",
    "scopes.read",
    "scopes.update",
    "scopes.update_operational",
    "milestones.read",
    "milestones.update",
    "documents.read_all",
    "documents.read_client",
    "documents.upload",
    "reports.view",
    "reports.export",
    "dashboard.view",
    "notes.internal",
    "notes.internal_view",
    "audit.view_operational",
  ]),
  pm: new Set<PermissionKey>([
    "projects.view_assigned",
    "projects.update", // Operational updates within assigned projects
    "tasks.read",
    "tasks.view_kanban",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "tasks.move_kanban",
    "scopes.read",
    "scopes.update_operational",
    "milestones.read",
    "milestones.update",
    "documents.read_all",
    "documents.read_client",
    "documents.upload",
    "reports.view",
    "reports.export",
    "dashboard.view",
    "notes.internal",
    "notes.internal_view",
  ]),
  client: new Set<PermissionKey>([
    "projects.view_assigned",
    "tasks.read",
    "tasks.view_kanban",
    "scopes.read",
    "milestones.read",
    "documents.read_client",
    "reports.view",
    "reports.export",
    "dashboard.view",
  ]),
};

/**
 * Checks whether a role possesses a specific permission
 */
export const hasPermission = (
  role: string | null | undefined,
  permission: PermissionKey
): boolean => {
  const norm = normalizeRole(role);
  return ROLE_PERMISSIONS[norm]?.has(permission) ?? false;
};

export interface ProjectAccessContext {
  userRole: UserRole;
  userId?: string;
  assignedProjectIds: string[];
  projectId: string;
  action?: "view" | "edit" | "delete" | "export";
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates project-level access control based on user role and assigned projects.
 * Supports both context-object call and positional argument call for maximum flexibility.
 */
export function canAccessProject(context: ProjectAccessContext): AccessResult;
export function canAccessProject(
  userRole: UserRole,
  assignedProjectIds: string[],
  projectId: string,
  action?: "view" | "edit" | "delete" | "export"
): boolean;
export function canAccessProject(
  contextOrRole: ProjectAccessContext | UserRole,
  assignedProjectIds?: string[],
  projectId?: string,
  action?: "view" | "edit" | "delete" | "export"
): AccessResult | boolean {
  if (typeof contextOrRole === "object" && contextOrRole !== null) {
    const ctx = contextOrRole;
    if (!ctx.projectId) {
      return { allowed: false, reason: "Invalid or missing project identifier." };
    }
    if (ctx.userRole === "super_admin" || ctx.userRole === "admin") {
      return { allowed: true };
    }
    const isAssigned = (ctx.assignedProjectIds || []).includes(ctx.projectId);
    if (!isAssigned) {
      return { allowed: false, reason: `Access denied. Not assigned to project ${ctx.projectId}.` };
    }
    if (ctx.userRole === "client" && (ctx.action === "edit" || ctx.action === "delete")) {
      return { allowed: false, reason: "Client accounts are strictly read-only and cannot perform write operations." };
    }
    if (ctx.userRole === "pm" && ctx.action === "delete") {
      return { allowed: false, reason: "Project Managers are not authorized to delete projects." };
    }
    return { allowed: true };
  }

  // Positional parameters call returning boolean
  const role = contextOrRole as UserRole;
  const pId = projectId || "";
  const act = action || "view";

  if (!pId) return false;
  if (role === "super_admin" || role === "admin") {
    return true;
  }
  const isAssigned = (assignedProjectIds || []).includes(pId);
  if (!isAssigned) return false;
  if (role === "client" && (act === "edit" || act === "delete")) return false;
  if (role === "pm" && act === "delete") return false;
  return true;
}

/**
 * Validates whether a user can perform an edit action on a specific project record
 */
export const canEditProjectRecord = (
  userRole: UserRole,
  assignedProjectIds: string[],
  projectId: string,
  permission: PermissionKey
): boolean => {
  if (!hasPermission(userRole, permission)) return false;
  if (userRole === "client") return false;
  if (userRole === "pm" && !assignedProjectIds.includes(projectId)) return false;
  return true;
};

/**
 * Strips contractor-internal fields from client-visible project records
 */
export const sanitizeForClient = <T extends Record<string, any>>(
  record: T,
  userRole: UserRole = "client"
): Partial<T> => {
  if (userRole !== "client") return record;

  const sanitized = { ...record };
  const restrictedKeys = [
    "internal_notes",
    "internal_contractor_notes",
    "profit_margin",
    "contractor_rate",
    "contractor_cost_margin",
    "cost_breakdown",
    "subcontractor_agreements",
  ];

  for (const key of restrictedKeys) {
    delete (sanitized as any)[key];
  }

  return sanitized;
};
