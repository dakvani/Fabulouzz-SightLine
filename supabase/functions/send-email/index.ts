import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_MAIN_EMAIL = "info@fabulouzz.com";
const BRAND_PROVIDER_TEXT = "Provided by Fabulouzz Technologies";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const { to, subject, html: rawHtml, text, type, data } = await req.json();

    if (!to || (!rawHtml && !text)) {
      return new Response(JSON.stringify({ error: "Missing recipient (to) or email content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = Array.isArray(to) ? to : [to];
    let finalHtml = rawHtml;

    // If type is reset_password and service role key is available, generate secure recovery link
    if (type === "reset_password" && SUPABASE_URL && SERVICE_ROLE_KEY && recipients.length > 0) {
      try {
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: recipients[0],
          options: {
            redirectTo: data?.resetUrl || `${Deno.env.get("APP_URL") || "https://sightline.fabulouzz.com"}/reset-password`,
          },
        });

        if (!linkErr && linkData?.properties?.action_link) {
          const actionLink = linkData.properties.action_link;
          // Inject secure action link into reset button
          finalHtml = finalHtml.replace(/href="[^"]*reset-password[^"]*"/g, `href="${actionLink}"`);
        }
      } catch (e) {
        console.warn("Could not generate recovery link via service role:", e);
      }
    }

    // If type is invite and service role key is available, generate secure invite link
    if (type === "invite" && SUPABASE_URL && SERVICE_ROLE_KEY && recipients.length > 0) {
      try {
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "invite",
          email: recipients[0],
          options: {
            redirectTo: data?.loginUrl || `${Deno.env.get("APP_URL") || "https://sightline.fabulouzz.com"}/onboarding`,
          },
        });

        if (!linkErr && linkData?.properties?.action_link) {
          const actionLink = linkData.properties.action_link;
          // Inject secure action link into onboarding button
          finalHtml = finalHtml.replace(/href="[^"]*onboarding[^"]*"/g, `href="${actionLink}"`);
        }
      } catch (e) {
        console.warn("Could not generate invite link via service role:", e);
      }
    }

    // Dispatch via Resend from info@fabulouzz.com
    let resendDispatched = false;
    let resendMessage = null;

    if (RESEND_API_KEY) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `SIGHTLINE Command Center <${BRAND_MAIN_EMAIL}>`,
          reply_to: BRAND_MAIN_EMAIL,
          to: recipients,
          subject: subject || "Notification from SightLine Command Center",
          html: finalHtml,
        }),
      });

      const resendData = await resendRes.json();
      if (resendRes.ok) {
        resendDispatched = true;
      } else {
        resendMessage = resendData.message || JSON.stringify(resendData);
        console.warn("Resend API returned warning:", resendMessage);
      }
    } else {
      console.info(`[${BRAND_PROVIDER_TEXT}] Simulated email sent to ${recipients.join(", ")} (${type || "general"}) from ${BRAND_MAIN_EMAIL}`);
    }

    return new Response(JSON.stringify({
      success: true,
      dispatched: resendDispatched,
      recipientsCount: recipients.length,
      provider: BRAND_PROVIDER_TEXT,
      contact: BRAND_MAIN_EMAIL,
      resendNote: resendMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
