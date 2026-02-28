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
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const action = url.searchParams.get("action") || "unsubscribe";

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isResubscribe = action === "resubscribe";

    const { error } = await adminClient
      .from("email_subscribers")
      .update({ is_active: isResubscribe })
      .eq("email", email);

    if (error) throw error;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const toggleUrl = isResubscribe
      ? `${SUPABASE_URL}/functions/v1/unsubscribe?email=${encodeURIComponent(email)}&action=unsubscribe`
      : `${SUPABASE_URL}/functions/v1/unsubscribe?email=${encodeURIComponent(email)}&action=resubscribe`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${isResubscribe ? "Re-subscribed" : "Unsubscribed"}</title></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
<div style="background:#fff;border-radius:16px;padding:48px;text-align:center;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<div style="width:60px;height:60px;background:${isResubscribe ? "#eff6ff" : "#f0fdf4"};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
<span style="font-size:28px;">${isResubscribe ? "🔔" : "✓"}</span>
</div>
<h1 style="color:#1f2937;font-size:20px;margin:0 0 8px;">${isResubscribe ? "Re-subscribed!" : "Unsubscribed"}</h1>
<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">${isResubscribe
  ? "You've been re-added to SIGHTLINE project update emails. You'll receive future notifications."
  : "You've been removed from SIGHTLINE project update emails."}</p>
<a href="${toggleUrl}" style="display:inline-block;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;color:#fff;background:${isResubscribe ? "#ef4444" : "#2fbf2f"};">${isResubscribe ? "Unsubscribe again" : "Re-subscribe"}</a>
<p style="color:#9ca3af;font-size:11px;margin:16px 0 0;">Powered by Fabulouzz Technologies • SightLine</p>
</div>
</body></html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
