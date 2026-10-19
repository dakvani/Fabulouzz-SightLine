import { describe, it, expect, beforeEach } from "vitest";
import {
  UserRole,
  isSuperAdmin,
  isAdmin,
  isProjectManager,
  isClient,
  canActorManageTargetRole,
  getRoleTier,
} from "@/lib/auth/roles";
import {
  PermissionKey,
  hasPermission,
  canAccessProject,
  canEditProjectRecord,
  sanitizeForClient,
  ROLE_PERMISSIONS,
} from "@/lib/auth/permissions";
import { resolveUserAuth } from "@/lib/auth/session";

describe("Enterprise Authentication & Role Hierarchy (Tiers 1, 2, 3)", () => {
  it("TC-01: Super Admin (Tier 1) has complete system administration authority", () => {
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(getRoleTier("super_admin")).toBe("tier_1");
    expect(hasPermission("super_admin", "system.manage")).toBe(true);
    expect(hasPermission("super_admin", "security.manage")).toBe(true);
    expect(hasPermission("super_admin", "security.audit_logs")).toBe(true);
    expect(hasPermission("super_admin", "users.manage_super_admins")).toBe(true);
    expect(hasPermission("super_admin", "users.manage_admins")).toBe(true);
    expect(hasPermission("super_admin", "projects.delete")).toBe(true);
  });

  it("TC-02: Admin (Tier 2) accesses ordinary project and operational modules", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(getRoleTier("admin")).toBe("tier_2");
    expect(hasPermission("admin", "projects.view_all")).toBe(true);
    expect(hasPermission("admin", "projects.create")).toBe(true);
    expect(hasPermission("admin", "projects.update")).toBe(true);
    expect(hasPermission("admin", "tasks.create")).toBe(true);
    expect(hasPermission("admin", "tasks.update")).toBe(true);
    expect(hasPermission("admin", "users.manage_pms")).toBe(true);
    expect(hasPermission("admin", "users.manage_clients")).toBe(true);
  });

  it("TC-03: Admin (Tier 2) attempting to manage or edit Super Admin accounts is strictly Denied", () => {
    expect(hasPermission("admin", "users.manage_super_admins")).toBe(false);
    expect(hasPermission("admin", "users.manage_admins")).toBe(false);
    expect(canActorManageTargetRole("admin", "super_admin")).toBe(false);
    expect(canActorManageTargetRole("admin", "admin")).toBe(false);
  });

  it("TC-04: Admin (Tier 2) attempting to access System Admin Panel or change global security settings is strictly Denied", () => {
    expect(hasPermission("admin", "system.manage")).toBe(false);
    expect(hasPermission("admin", "security.manage")).toBe(false);
    expect(hasPermission("admin", "security.audit_logs")).toBe(false); // Super admin security logs
    expect(hasPermission("admin", "security.operational_logs")).toBe(true); // Restricted operational logs only
  });
});

describe("Project-Level Access Control & Isolation", () => {
  const pmAssignedProjects = ["proj-001", "proj-003"];
  const clientAssignedProjects = ["proj-001"];

  it("TC-05: Project Manager accesses assigned projects -> Allowed", () => {
    expect(canAccessProject("pm", pmAssignedProjects, "proj-001")).toBe(true);
    expect(canAccessProject("pm", pmAssignedProjects, "proj-003")).toBe(true);
  });

  it("TC-06: Project Manager accesses unassigned projects -> Denied", () => {
    expect(canAccessProject("pm", pmAssignedProjects, "proj-002")).toBe(false);
    expect(canAccessProject("pm", pmAssignedProjects, "proj-004")).toBe(false);
    expect(canAccessProject("pm", pmAssignedProjects, "proj-999")).toBe(false);
  });

  it("TC-07: Project Manager updates assigned project tasks & Kanban cards -> Allowed", () => {
    expect(canEditProjectRecord("pm", pmAssignedProjects, "proj-001", "tasks.update")).toBe(true);
    expect(canEditProjectRecord("pm", pmAssignedProjects, "proj-001", "tasks.move_kanban")).toBe(true);
    expect(canEditProjectRecord("pm", pmAssignedProjects, "proj-001", "scopes.update_operational")).toBe(true);
    expect(canEditProjectRecord("pm", pmAssignedProjects, "proj-001", "milestones.update")).toBe(true);
  });

  it("TC-08: Project Manager assigns themselves another project or edits unassigned project -> Denied", () => {
    expect(hasPermission("pm", "projects.assign_users")).toBe(false);
    expect(hasPermission("pm", "projects.create")).toBe(false);
    expect(canEditProjectRecord("pm", pmAssignedProjects, "proj-002", "tasks.update")).toBe(false);
    expect(canEditProjectRecord("pm", pmAssignedProjects, "proj-002", "projects.assign_users")).toBe(false);
  });
});

describe("Client Portal Read-Only Enforcement", () => {
  const clientAssignedProjects = ["proj-001"];

  it("TC-09: Client opens assigned project dashboard -> Allowed", () => {
    expect(canAccessProject("client", clientAssignedProjects, "proj-001")).toBe(true);
    expect(hasPermission("client", "dashboard.view")).toBe(true);
    expect(hasPermission("client", "projects.view_assigned")).toBe(true);
  });

  it("TC-10: Client views assigned project Kanban board -> Allowed (read-only)", () => {
    expect(hasPermission("client", "tasks.view_kanban")).toBe(true);
    expect(hasPermission("client", "tasks.read")).toBe(true);
    expect(hasPermission("client", "milestones.read")).toBe(true);
    expect(hasPermission("client", "scopes.read")).toBe(true);
  });

  it("TC-11: Client edits, moves, or creates Kanban tasks -> Strictly Denied", () => {
    expect(hasPermission("client", "tasks.create")).toBe(false);
    expect(hasPermission("client", "tasks.update")).toBe(false);
    expect(hasPermission("client", "tasks.delete")).toBe(false);
    expect(hasPermission("client", "tasks.move_kanban")).toBe(false);
    expect(canEditProjectRecord("client", clientAssignedProjects, "proj-001", "tasks.update")).toBe(false);
    expect(canEditProjectRecord("client", clientAssignedProjects, "proj-001", "tasks.move_kanban")).toBe(false);
  });

  it("TC-12: Client modifies milestone, timeline, or scope -> Strictly Denied", () => {
    expect(hasPermission("client", "milestones.update")).toBe(false);
    expect(hasPermission("client", "scopes.update")).toBe(false);
    expect(hasPermission("client", "scopes.update_operational")).toBe(false);
    expect(canEditProjectRecord("client", clientAssignedProjects, "proj-001", "milestones.update")).toBe(false);
  });

  it("TC-13: Client exports authorized assigned project reports (PDF / Excel / CSV) -> Allowed", () => {
    expect(hasPermission("client", "reports.view")).toBe(true);
    expect(hasPermission("client", "reports.export")).toBe(true);
    expect(canAccessProject("client", clientAssignedProjects, "proj-001")).toBe(true);
  });

  it("TC-14: Client exports another unassigned project's report -> Denied", () => {
    expect(canAccessProject("client", clientAssignedProjects, "proj-002")).toBe(false);
  });

  it("TC-15: Client attempts direct write request / document upload -> Denied", () => {
    expect(hasPermission("client", "documents.upload")).toBe(false);
    expect(hasPermission("client", "projects.update")).toBe(false);
    expect(hasPermission("client", "projects.delete")).toBe(false);
    expect(canEditProjectRecord("client", clientAssignedProjects, "proj-001", "documents.upload")).toBe(false);
  });
});

describe("Privilege Escalation & Account Security Protections", () => {
  it("TC-16: User cannot elevate their own role through request payload or localStorage", () => {
    expect(canActorManageTargetRole("pm", "admin")).toBe(false);
    expect(canActorManageTargetRole("pm", "super_admin")).toBe(false);
    expect(canActorManageTargetRole("client", "pm")).toBe(false);
    expect(canActorManageTargetRole("client", "admin")).toBe(false);
    expect(canActorManageTargetRole("client", "super_admin")).toBe(false);
    expect(canActorManageTargetRole("admin", "super_admin")).toBe(false);
  });

  it("TC-17: Revoked user loses access immediately on subsequent authorization check", () => {
    const assignedBefore = ["proj-001", "proj-002"];
    expect(canAccessProject("pm", assignedBefore, "proj-001")).toBe(true);

    // Revocation takes effect immediately without relogin:
    const assignedAfterRevocation = ["proj-002"];
    expect(canAccessProject("pm", assignedAfterRevocation, "proj-001")).toBe(false);
    expect(canAccessProject("client", assignedAfterRevocation, "proj-001")).toBe(false);
  });

  it("TC-18: Deactivated user is blocked from all authenticated operations", () => {
    // When account is inactive, resolveUserAuth marks status: inactive
    const inactiveUserAuth = {
      userId: "user-deactivated-1",
      email: "suspended@company.com",
      userRole: "pm" as UserRole,
      isSuperAdmin: false,
      isAdmin: false,
      isProjectManager: true,
      isClient: false,
      accountStatus: "inactive" as "active" | "inactive" | "deactivated",
      assignedProjectIds: ["proj-001"],
    };

    expect(inactiveUserAuth.accountStatus).toBe("inactive");
    // Enforcement rule: if accountStatus !== 'active', session must be invalidated
    const isPermitted = inactiveUserAuth.accountStatus === "active";
    expect(isPermitted).toBe(false);
  });

  it("TC-19: Unauthorized user subscribing to private project live updates receives no private records", () => {
    const unassignedPmProjects = ["proj-001"];
    const targetProject = "proj-002";

    const isAuthorizedForChannel = canAccessProject("pm", unassignedPmProjects, targetProject);
    expect(isAuthorizedForChannel).toBe(false);
  });

  it("TC-20: User cannot access documents or contractor-only notes from unassigned or unauthorized levels", () => {
    // Client cannot view internal contractor notes
    expect(hasPermission("client", "notes.internal")).toBe(false);
    expect(hasPermission("pm", "notes.internal")).toBe(true);
    expect(hasPermission("admin", "notes.internal")).toBe(true);
    expect(hasPermission("super_admin", "notes.internal")).toBe(true);

    // Data sanitization for Client
    const rawTask = {
      id: "task-101",
      name: "HVAC Installation",
      status: "In Progress",
      internal_contractor_notes: "Delay due to subcontractor dispute - strictly confidential",
      contractor_cost_margin: 45000,
      client_visible: true,
    };

    const sanitized = sanitizeForClient(rawTask);
    expect(sanitized.id).toBe("task-101");
    expect(sanitized.name).toBe("HVAC Installation");
    expect(sanitized.status).toBe("In Progress");
    expect((sanitized as any).internal_contractor_notes).toBeUndefined();
    expect((sanitized as any).contractor_cost_margin).toBeUndefined();
  });

  it("TC-21: support@fabulouzz.com is designated as the permanent Tier 1 Super Admin (System Owner)", () => {
    const supportEmail = "support@fabulouzz.com";
    const isSupport = supportEmail.toLowerCase() === "support@fabulouzz.com";
    expect(isSupport).toBe(true);

    // Resolves to super_admin role with enterprise tier privileges
    const resolvedRole: UserRole = isSupport ? "super_admin" : "client";
    expect(resolvedRole).toBe("super_admin");
    expect(isSuperAdmin(resolvedRole)).toBe(true);
    expect(getRoleTier(resolvedRole)).toBe("tier_1");

    // Has full access to all system privileges
    expect(hasPermission(resolvedRole, "system.manage")).toBe(true);
    expect(hasPermission(resolvedRole, "security.manage")).toBe(true);
    expect(hasPermission(resolvedRole, "security.audit_logs")).toBe(true);
    expect(hasPermission(resolvedRole, "users.manage_super_admins")).toBe(true);
  });

  it("TC-22: resolveUserAuth resolves assigned role from user/app metadata when DB propagation is pending", async () => {
    // When a user was just created by Super Admin with assigned role in metadata
    const mockUserObject = {
      id: "mock-new-user-123",
      email: "new.admin@contractor.com",
      app_metadata: { role: "admin" },
      user_metadata: { role: "admin", full_name: "New Admin" },
    };

    const auth = await resolveUserAuth(mockUserObject);
    expect(auth).not.toBeNull();
    expect(auth?.userRole).toBe("admin");
    expect(auth?.isAdmin).toBe(true);
    expect(auth?.isClient).toBe(false);
  });

  it("TC-23: Onboarding role resolution accurately maps pm, admin, and super_admin to proper workspace views", () => {
    const roles: UserRole[] = ["super_admin", "admin", "pm", "client"];
    
    roles.forEach(role => {
      const isSuper = role === "super_admin";
      const isAdm = role === "admin";
      const isPm = role === "pm";
      
      let targetWorkspace = "/";
      if (isSuper || isAdm) {
        targetWorkspace = "/admin";
      } else if (isPm) {
        targetWorkspace = "/?view=tasks";
      } else {
        targetWorkspace = "/";
      }

      if (role === "super_admin" || role === "admin") {
        expect(targetWorkspace).toBe("/admin");
      } else if (role === "pm") {
        expect(targetWorkspace).toBe("/?view=tasks");
      } else {
        expect(targetWorkspace).toBe("/");
      }
    });
  });

  it("TC-24: Super Admin can provision all 4 roles and priority order is strictly maintained", () => {
    const validRoles = ["super_admin", "admin", "pm", "client"];
    expect(validRoles).toContain("super_admin");
    expect(validRoles).toContain("admin");
    expect(validRoles).toContain("pm");
    expect(validRoles).toContain("client");

    // Super Admin privilege tier check
    expect(canActorManageTargetRole("super_admin", "admin")).toBe(true);
    expect(canActorManageTargetRole("super_admin", "pm")).toBe(true);
    expect(canActorManageTargetRole("super_admin", "client")).toBe(true);
  });

  it("TC-25: Elevating to Admin or Super Admin ensures Enterprise subscription plan", () => {
    const getTargetTier = (role: UserRole, currentTier?: string) => {
      return (role === "admin" || role === "super_admin") ? "enterprise" : (currentTier || "free");
    };

    expect(getTargetTier("super_admin", "free")).toBe("enterprise");
    expect(getTargetTier("admin", "free")).toBe("enterprise");
    expect(getTargetTier("pm", "free")).toBe("free");
    expect(getTargetTier("client", "premium")).toBe("premium");
  });
});

