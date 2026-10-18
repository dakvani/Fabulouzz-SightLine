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

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, newPassword } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "A valid email address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "New password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Locate user by email
    let targetUserId: string | null = null;
    let targetUserEmail = cleanEmail;

    // 1. Try profiles table
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, email")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (profile?.id) {
      targetUserId = profile.id;
    }

    // 2. If not found in profiles, search via auth.admin.listUsers()
    if (!targetUserId) {
      let page = 1;
      let hasMore = true;
      while (hasMore && !targetUserId && page <= 5) {
        const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({
          page,
          perPage: 50,
        });
        if (listErr || !usersData?.users?.length) {
          hasMore = false;
          break;
        }
        const found = usersData.users.find(
          (u) => u.email?.toLowerCase().trim() === cleanEmail
        );
        if (found) {
          targetUserId = found.id;
          targetUserEmail = found.email || cleanEmail;
          break;
        }
        if (usersData.users.length < 50) hasMore = false;
        page++;
      }
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "No account found matching this email address" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password and ensure email is confirmed so user is not blocked
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
      email_confirm: true,
      user_metadata: { must_change_password: false },
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert audit log
    try {
      await adminClient.from("audit_logs").insert({
        actor_id: targetUserId,
        actor_email: targetUserEmail,
        actor_role: "user",
        action: "auth.direct_recovery",
        target_resource: `user:${targetUserEmail}`,
        details: { method: "direct_password_recovery", secure_link_disabled: true },
        status: "success",
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password successfully recovered. You may now sign in.",
        userId: targetUserId,
        email: targetUserEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
