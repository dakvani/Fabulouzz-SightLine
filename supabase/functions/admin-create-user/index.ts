import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user is admin
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
    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, fullName, role, generatePassword, sendInvite, subscriptionTier } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "email and role are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["admin", "pm", "client"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPassword = generatePassword ? generateRandomPassword() : password;
    if (!finalPassword || finalPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Password is required (min 6 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || "",
        must_change_password: generatePassword || sendInvite ? true : false,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update role from default 'client' to specified role
    if (role !== "client") {
      await adminClient.from("user_roles").update({ role }).eq("user_id", newUser.user.id);
    }

    // Set subscription tier in profiles (defaults to 'enterprise' for admin, or passed tier, or 'free')
    const initialTier = (role === "admin")
      ? "enterprise"
      : (["free", "premium", "enterprise"].includes(subscriptionTier) ? subscriptionTier : "free");

    await adminClient.from("profiles").update({ subscription_tier: initialTier }).eq("id", newUser.user.id);

    // Send invitation email if requested
    let emailSent = false;
    if (sendInvite) {
      try {
        const inviteRes = await fetch(`${supabaseUrl}/functions/v1/send-invitation`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password: finalPassword, fullName, role }),
        });
        const inviteData = await inviteRes.json();
        if (inviteRes.ok && inviteData.success) {
          emailSent = true;
        }
      } catch (e) {
        console.error("Failed to send invitation:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      userId: newUser.user.id,
      emailSent,
      generatedPassword: generatePassword ? finalPassword : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
