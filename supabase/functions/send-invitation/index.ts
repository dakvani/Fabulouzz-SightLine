import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

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

    const { email, password, fullName, role, loginUrl } = await req.json();
    const portalUrl = loginUrl || ((Deno.env.get("APP_URL") || "https://sightline.fabulouzz.com").replace(/\/+$/, "") + "/");

    const roleLabel: Record<string, string> = {
      admin: "Admin",
      pm: "PM / Engineer",
      client: "Client",
    };

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td style="text-align:left;vertical-align:middle;width:110px;">
          <img src="https://dxohbmgalsxswmpptyqy.supabase.co/storage/v1/object/public/email-assets/fab-logo.png" alt="Fabulouzz" style="width:110px;height:auto;" />
        </td>
        <td style="text-align:center;vertical-align:middle;">
          <h1 style="color: #2fbf2f; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">SIGHTLINE Command Center</h1>
          <h2 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 700;">You're Invited</h2>
        </td>
        <td style="width:110px;"></td>
      </tr></table>
    </div>

    <div style="background: #ffffff; padding: 32px;">
      <p style="color: #1f2937; font-size: 15px; margin: 0 0 8px;">Hi${fullName ? " " + fullName : ""},</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        You've been invited to join <strong>SightLine Command Center</strong> as <strong>${roleLabel[role] || role}</strong>. 
        Use the credentials below for your initial login.
      </p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 12px; color: #9ca3af; width: 100px;">Email</td>
            <td style="padding: 6px 0; font-size: 14px; color: #1f2937; font-weight: 600;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 12px; color: #9ca3af;">Password</td>
            <td style="padding: 6px 0; font-size: 14px; color: #1f2937; font-weight: 600; font-family: monospace; letter-spacing: 1px;">${password}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 12px; color: #9ca3af;">Role</td>
            <td style="padding: 6px 0; font-size: 14px; color: #1f2937; font-weight: 600;">${roleLabel[role] || role}</td>
          </tr>
        </table>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 0 0 24px;">
        <p style="color: #92400e; font-size: 12px; margin: 0; font-weight: 600;">⚠️ Important</p>
        <p style="color: #92400e; font-size: 12px; margin: 4px 0 0; line-height: 1.5;">
          You will be asked to change your password on your first login. Please choose a strong, unique password.
        </p>
      </div>

      <a href="${portalUrl}" 
         style="display: block; text-align: center; background: linear-gradient(135deg, #2fbf2f, #22a722); color: #fff; padding: 14px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
        Login to SightLine →
      </a>
    </div>

    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 6px; font-weight: 600;">Provided by Fabulouzz Technologies • SightLine Command Center</p>
      <p style="color: #6b7280; font-size: 11px; margin: 0;">Official Communications & Support: <a href="mailto:info@fabulouzz.com" style="color: #2fbf2f; text-decoration: none; font-weight: 600;">info@fabulouzz.com</a></p>
    </div>
  </div>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SIGHTLINE Command Center <info@fabulouzz.com>",
        reply_to: "info@fabulouzz.com",
        to: [email],
        subject: "You're Invited to SightLine Command Center",
        html,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      throw new Error(resendData.message || "Failed to send invitation email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
