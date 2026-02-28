import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, changes } = await req.json();
    if (!subject || !changes) {
      return new Response(
        JSON.stringify({ error: "Missing subject or changes" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch active subscribers using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscribers, error: subError } = await adminClient
      .from("email_subscribers")
      .select("email")
      .eq("is_active", true);

    if (subError) throw subError;
    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscribers", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emails = subscribers.map((s: { email: string }) => s.email);

    // Build HTML email body
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 32px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px 32px;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">SIGHTLINE Project Update</h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 4px 0 0;">Timeline has been updated</p>
    </div>
    <div style="padding: 24px 32px;">
      <h2 style="font-size: 16px; color: #1a1a2e; margin: 0 0 16px;">${subject}</h2>
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; border-left: 4px solid #6366f1;">
        ${changes}
      </div>
      <p style="color: #71717a; font-size: 12px; margin-top: 24px;">
        You're receiving this because you subscribed to project updates.
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend (batch to all subscribers)
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SIGHTLINE Updates <onboarding@resend.dev>",
        to: emails,
        subject: `Project Update: ${subject}`,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error(resendData.message || "Failed to send emails");
    }

    return new Response(
      JSON.stringify({
        message: `Notification sent to ${emails.length} subscriber(s)`,
        sent: emails.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
