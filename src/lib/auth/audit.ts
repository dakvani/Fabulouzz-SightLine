import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  id: string;
  actor_id?: string | null;
  actor_email?: string;
  actor_role?: string;
  action: string;
  resource_type?: string;
  resource_id?: string | null;
  target_resource?: string;
  details?: any;
  ip_address?: string | null;
  status?: string;
  time?: string;
  created_at: string;
}

export interface LogAuditParams {
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  target_resource?: string;
  details?: Record<string, any>;
  actorEmail?: string;
  actorId?: string | null;
}

/**
 * Persists an enterprise audit log record to Supabase
 */
export const logAuditEvent = async ({
  action,
  resourceType,
  resourceId = null,
  target_resource,
  details = {},
  actorEmail,
  actorId,
}: LogAuditParams): Promise<void> => {
  try {
    let resolvedEmail = actorEmail;
    let resolvedId = actorId;

    if (!resolvedEmail || !resolvedId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;
      if (currentUser) {
        resolvedEmail = resolvedEmail || currentUser.email || "unknown@sightline.io";
        resolvedId = resolvedId || currentUser.id;
      } else {
        resolvedEmail = resolvedEmail || "system@sightline.io";
      }
    }

    const payload = {
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
      actor_email: resolvedEmail,
      actor_id: resolvedId,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_logs").insert(payload as any);
    if (error) {
      console.warn("[AuditLog] Failed to persist remote audit log entry:", error.message);
      // Fallback: Store locally in session log buffer
      appendLocalAuditBuffer(payload);
    }
  } catch (err) {
    console.warn("[AuditLog] Error logging audit event:", err);
  }
};

const LOCAL_AUDIT_KEY = "sightline_local_audit_buffer";

const appendLocalAuditBuffer = (entry: any) => {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || "[]");
    const updated = [
      { ...entry, id: `local-${Date.now()}` },
      ...existing.slice(0, 99),
    ];
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(updated));
  } catch (e) {
    // Ignore storage quota errors
  }
};

/**
 * Fetches audit logs from Supabase with fallback to local buffer
 */
export const fetchAuditLogs = async (options?: number | {
  limit?: number;
  operationalOnly?: boolean;
}): Promise<AuditLogEntry[]> => {
  const limit = typeof options === "number" ? options : (options?.limit ?? 50);
  const operationalOnly = typeof options === "object" ? options?.operationalOnly : false;

  try {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (operationalOnly) {
      query = query.neq("resource_type", "security");
    }

    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) {
      return data as AuditLogEntry[];
    }
  } catch (err) {
    console.warn("[AuditLog] Querying remote audit logs failed, reading local buffer:", err);
  }

  // Fallback to local storage buffer
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || "[]");
      if (operationalOnly) {
        return local.filter((l: any) => l.resource_type !== "security").slice(0, limit);
      }
      return local.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  return [];
};
