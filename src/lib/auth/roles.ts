/**
 * Enterprise User Roles & Hierarchy
 * 
 * Tier 1 - System Owner: SUPER_ADMIN
 * Tier 2 - Contractor Administration: ADMIN
 * Tier 3 - Project-Level Users: PROJECT_MANAGER, CLIENT
 */

export type UserRole = "super_admin" | "admin" | "pm" | "client";

export enum PrivilegeTier {
  TIER_1_SYSTEM_OWNER = 1,
  TIER_2_CONTRACTOR_ADMIN = 2,
  TIER_3_PROJECT_LEVEL = 3,
}

export interface RoleDefinition {
  id: UserRole;
  title: string;
  tier: PrivilegeTier;
  tierName: string;
  description: string;
  badgeColor: string;
  isProjectScoped: boolean;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    id: "super_admin",
    title: "Super Admin",
    tier: PrivilegeTier.TIER_1_SYSTEM_OWNER,
    tierName: "Tier 1 – System Owner",
    description: "Highest administrative authority with full control over system configuration, global security, all projects, and user governance.",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    isProjectScoped: false,
  },
  admin: {
    id: "admin",
    title: "Admin",
    tier: PrivilegeTier.TIER_2_CONTRACTOR_ADMIN,
    tierName: "Tier 2 – Contractor Administration",
    description: "Operational management authority over all projects, operational users (PMs and Clients), and project delivery modules.",
    badgeColor: "bg-primary/15 text-primary border-primary/30",
    isProjectScoped: false,
  },
  pm: {
    id: "pm",
    title: "Project Manager",
    tier: PrivilegeTier.TIER_3_PROJECT_LEVEL,
    tierName: "Tier 3 – Project-Level Execution",
    description: "Contractor execution authority strictly restricted to assigned projects. Manages tasks, timelines, milestones, and progress updates.",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    isProjectScoped: true,
  },
  client: {
    id: "client",
    title: "Client",
    tier: PrivilegeTier.TIER_3_PROJECT_LEVEL,
    tierName: "Tier 3 – Project-Level Monitoring",
    description: "Customer monitoring account with strictly read-only access to assigned projects, progress tracking, and authorized reports.",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    isProjectScoped: true,
  },
};

/**
 * Normalizes any database or legacy role string into a valid UserRole
 */
export const normalizeRole = (role: string | null | undefined): UserRole => {
  if (!role) return "client";
  const r = role.toLowerCase().trim();
  if (r === "super_admin" || r === "superadmin") return "super_admin";
  if (r === "admin") return "admin";
  if (r === "pm" || r === "project_manager" || r === "engineer") return "pm";
  return "client";
};

export const isSuperAdmin = (role: string | null | undefined): boolean => {
  return normalizeRole(role) === "super_admin";
};

export const isAdmin = (role: string | null | undefined): boolean => {
  return normalizeRole(role) === "admin";
};

export const isAdminOrSuper = (role: string | null | undefined): boolean => {
  const norm = normalizeRole(role);
  return norm === "super_admin" || norm === "admin";
};

export const isProjectManager = (role: string | null | undefined): boolean => {
  return normalizeRole(role) === "pm";
};

export const isClient = (role: string | null | undefined): boolean => {
  return normalizeRole(role) === "client";
};

/**
 * Validates whether an actor role has the authority to manage/provision a target role
 * Rule: Super Admin can manage all roles.
 * Rule: Admin can ONLY manage PM and Client roles (cannot manage Super Admin or Admin).
 * Rule: PM and Client cannot manage any user roles.
 */
export const canActorManageTargetRole = (
  actorRole: UserRole,
  targetRole: UserRole
): boolean => {
  if (actorRole === "super_admin") {
    return true;
  }
  if (actorRole === "admin") {
    // Admin can ONLY manage PM and Client
    return targetRole === "pm" || targetRole === "client";
  }
  return false;
};

export type RoleTierString = "tier_1" | "tier_2" | "tier_3";

/**
 * Returns string tier indicator ("tier_1" | "tier_2" | "tier_3")
 */
export const getRoleTier = (role: string | null | undefined): RoleTierString => {
  const norm = normalizeRole(role);
  if (norm === "super_admin") return "tier_1";
  if (norm === "admin") return "tier_2";
  return "tier_3";
};
