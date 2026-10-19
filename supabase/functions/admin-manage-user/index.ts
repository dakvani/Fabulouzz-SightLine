import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await anonClient.from("user_roles").select("role").eq("user_id", caller.id).single();
    const callerRole = roleData?.role;
    if (!callerRole || (callerRole !== "admin" && callerRole !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Administrator privileges required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, userId, newRole, newTier, newStatus } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch target user's current role & profile
    const { data: targetRoleData } = await adminClient.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    const targetRole = targetRoleData?.role || "client";

    const { data: targetProfile } = await adminClient.from("profiles").select("email, status").eq("id", userId).maybeSingle();
    const targetEmail = targetProfile?.email || userId;

    // Prevent actor from modifying their own role or deleting themselves
    if (userId === caller.id && action !== "update_plan") {
      return new Response(JSON.stringify({ error: "Cannot delete, deactivate, or change role on your own account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role Hierarchy & Privilege Escalation Checks:
    // If caller is Admin:
    // - Cannot modify or delete Super Admin
    // - Cannot modify or delete another Admin
    // - Cannot promote anyone to Admin or Super Admin
    if (callerRole === "admin") {
      if (targetRole === "super_admin" || targetRole === "admin") {
        return new Response(JSON.stringify({ error: "Admins do not have permission to modify Super Admin or Admin accounts." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (action === "update_role" && (newRole === "admin" || newRole === "super_admin")) {
        return new Response(JSON.stringify({ error: "Admins cannot elevate accounts to Admin or Super Admin." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Protect last active Super Admin
    if (targetRole === "super_admin" && (action === "delete_user" || (action === "update_role" && newRole !== "super_admin") || (action === "update_status" && newStatus === "inactive"))) {
      const { data: superAdmins } = await adminClient.from("user_roles").select("user_id").eq("role", "super_admin");
      if ((superAdmins || []).length <= 1) {
        return new Response(JSON.stringify({ error: "Protection Policy: Cannot delete, demote, or deactivate the last remaining Super Administrator." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "update_role") {
      const validRoles = callerRole === "super_admin" ? ["super_admin", "admin", "pm", "client"] : ["pm", "client"];
      if (!validRoles.includes(newRole)) {
        return new Response(JSON.stringify({ error: `Invalid role specified: ${newRole}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Authoritative DB role update: Cleanly remove any other role rows for this user and insert newRole
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      const { error: insertErr } = await adminClient.from("user_roles").insert({ user_id: userId, role: newRole });
      if (insertErr) throw insertErr;

      // 2. Synchronize to auth.users app_metadata and user_metadata for IMMEDIATE token claims update
      try {
        await adminClient.auth.admin.updateUserById(userId, {
          app_metadata: { role: newRole },
          user_metadata: { role: newRole },
        });
      } catch (metaErr) {
        console.warn("Could not sync auth metadata:", metaErr);
      }

      // 3. If elevated to admin or super_admin, update profile to enterprise subscription
      if (newRole === "admin" || newRole === "super_admin") {
        await adminClient.from("profiles").update({ subscription_tier: "enterprise" }).eq("id", userId);
      }

      // 4. Record audit log
      await adminClient.from("audit_logs").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: callerRole,
        action: "user.role_change",
        target_resource: `user:${targetEmail}`,
        details: { previousRole: targetRole, newRole },
        status: "success",
      });

      return new Response(JSON.stringify({ success: true, newRole }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_status") {
      const validStatuses = ["active", "inactive"];
      if (!validStatuses.includes(newStatus)) {
        return new Response(JSON.stringify({ error: "Invalid status" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.from("profiles").update({ status: newStatus }).eq("id", userId);
      if (error) throw error;

      // Invalidate active session if deactivating
      if (newStatus === "inactive") {
        try {
          await adminClient.auth.admin.signOut(userId);
        } catch (_) {
          // ignore if user not currently in active session
        }
      }

      await adminClient.from("audit_logs").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: callerRole,
        action: "user.status_change",
        target_resource: `user:${targetEmail}`,
        details: { previousStatus: targetProfile?.status, newStatus },
        status: "success",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_plan") {
      const validTiers = ["free", "premium", "enterprise"];
      if (!validTiers.includes(newTier)) {
        return new Response(JSON.stringify({ error: "Invalid subscription tier" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.from("profiles").update({ subscription_tier: newTier }).eq("id", userId);
      if (error) throw error;

      await adminClient.from("audit_logs").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: callerRole,
        action: "user.plan_change",
        target_resource: `user:${targetEmail}`,
        details: { newTier },
        status: "success",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;

      await adminClient.from("audit_logs").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: callerRole,
        action: "user.delete",
        target_resource: `user:${targetEmail}`,
        details: { deletedRole: targetRole },
        status: "success",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
