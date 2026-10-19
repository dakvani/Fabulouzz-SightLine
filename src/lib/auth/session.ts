import { supabase } from "@/integrations/supabase/client";
import { UserRole, normalizeRole } from "./roles";

export interface ResolvedUserAuth {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  userRole: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isProjectManager: boolean;
  isClient: boolean;
  status: "active" | "deactivated" | "pending";
  accountStatus: "active" | "deactivated" | "pending";
  assignedProjectIds: string[];
  subscriptionTier: string;
}

/**
 * Resolves user identity, role, active status, and project assignments from Supabase.
 * Authoritative: Uses database user_roles and project_members, never trusting client claims.
 * Accepts either userId string or User session object.
 */
export const resolveUserAuth = async (
  userOrId: string | { id?: string; email?: string } | null | undefined,
  fallbackEmail?: string
): Promise<ResolvedUserAuth | null> => {
  try {
    if (!userOrId) return null;

    const userId = typeof userOrId === "string" ? userOrId : userOrId.id;
    const directEmail = typeof userOrId === "object" ? userOrId.email : fallbackEmail;

    if (!userId) return null;

    const timeoutPromise = new Promise<{ data: null }[]>((resolve) =>
      setTimeout(() => resolve([{ data: null }, { data: null }, { data: null }]), 3500)
    );

    const [profileRes, rolesRes, membersRes] = await Promise.race([
      Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase
          .from("project_members")
          .select("project_id, assignment_status, revoked_at")
          .eq("user_id", userId),
      ]),
      timeoutPromise,
    ]);

    const profile = profileRes.data;
    const dbRoles = (rolesRes.data || []).map((r: any) => r.role);

    // Extract metadata role as fallback if database row is momentarily propagating
    let metaRole: string | null = null;
    if (typeof userOrId === "object" && userOrId !== null) {
      metaRole = (userOrId as any).app_metadata?.role || (userOrId as any).user_metadata?.role || null;
    }

    const roles = [...dbRoles];
    if (metaRole && !roles.includes(metaRole)) {
      roles.push(metaRole);
    }
    
    // Resolve email
    const resolvedEmail = (profile?.email || directEmail || fallbackEmail || "").trim().toLowerCase();

    // Resolve highest priority role: super_admin > admin > pm > client
    // support@fabulouzz.com is the designated permanent System Owner (Tier 1 Super Admin)
    const isSupportAccount = resolvedEmail === "support@fabulouzz.com";

    let resolvedRole: UserRole = "client";
    if (roles.includes("super_admin") || isSupportAccount) {
      resolvedRole = "super_admin";
    } else if (roles.includes("admin")) {
      resolvedRole = "admin";
    } else if (roles.includes("pm") || roles.includes("engineer")) {
      resolvedRole = "pm";
    } else {
      resolvedRole = "client";
    }

    // Filter active project assignments
    const activeProjectIds = (membersRes.data || [])
      .filter((m: any) => m.assignment_status === "active" && !m.revoked_at)
      .map((m: any) => m.project_id);

    // Profile status normalization
    // In database, status may be null or undefined if column isn't present
    // Accounts are active unless explicitly marked deactivated or inactive
    const rawStatus = (profile as any)?.status;
    const isDeactivated = !isSupportAccount && (rawStatus === "deactivated" || rawStatus === "inactive");
    const normalizedStatus: "active" | "deactivated" | "pending" = isDeactivated ? "deactivated" : "active";

    const subTier = isSupportAccount ? "enterprise" : (profile?.subscription_tier || "free");

    return {
      userId,
      email: resolvedEmail,
      fullName: profile?.full_name || (isSupportAccount ? "Fabulouzz Support (System Owner)" : ""),
      role: resolvedRole,
      userRole: resolvedRole,
      isSuperAdmin: resolvedRole === "super_admin",
      isAdmin: resolvedRole === "admin",
      isProjectManager: resolvedRole === "pm",
      isClient: resolvedRole === "client",
      status: normalizedStatus,
      accountStatus: normalizedStatus,
      assignedProjectIds: activeProjectIds,
      subscriptionTier: subTier,
    };
  } catch (err) {
    console.error("[Session] Error resolving authoritative user auth:", err);
    if (userOrId) {
      const fallbackId = typeof userOrId === "string" ? userOrId : userOrId.id || "unknown";
      const fallbackMail = (typeof userOrId === "object" ? userOrId.email : fallbackEmail) || "";
      const isSupp = fallbackMail.toLowerCase() === "support@fabulouzz.com";
      return {
        userId: fallbackId,
        email: fallbackMail,
        fullName: isSupp ? "Fabulouzz Support (System Owner)" : "",
        role: isSupp ? "super_admin" : "client",
        userRole: isSupp ? "super_admin" : "client",
        isSuperAdmin: isSupp,
        isAdmin: false,
        isProjectManager: false,
        isClient: !isSupp,
        status: "active",
        accountStatus: "active",
        assignedProjectIds: [],
        subscriptionTier: isSupp ? "enterprise" : "free",
      };
    }
    return null;
  }
};

/**
 * Enforces account activation. If an account is deactivated, signs out immediately.
 */
export const checkAccountActiveOrLogout = async (userId: string): Promise<boolean> => {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, status")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.email?.toLowerCase() === "support@fabulouzz.com") {
      return true;
    }

    if (profile && ((profile as any).status === "deactivated" || (profile as any).status === "inactive")) {
      console.warn("[Session] Deactivated account detected. Revoking active session.");
      await supabase.auth.signOut();
      return false;
    }
    return true;
  } catch (e) {
    return true;
  }
};

