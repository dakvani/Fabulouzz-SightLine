import { createClient } from "@supabase/supabase-js";

const BRAND_MAIN_EMAIL = "info@fabulouzz.com";
const BRAND_PROVIDER_TEXT = "Provided by Fabulouzz Technologies";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://eekspekhsaxwfyanxxjn.supabase.co";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVla3NwZWtoc2F4d2Z5YW54eGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjI1ODQ1MywiZXhwIjoyMTA3ODM0NDUzfQ.8TpOOqbW6dDINx2z80ywPwvSV__nCnVYx5iuitRCm_4";

interface RequestBody {
  to?: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  type?: string;
  data?: any;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Only POST is supported." });
  }

  try {
    const body: RequestBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { to, subject, html: rawHtml, type, data } = body;

    if (!to || !rawHtml) {
      return res.status(400).json({
        error: "Missing required fields: 'to' and 'html' are required.",
      });
    }

    const recipients = Array.isArray(to) ? to : [to];
    let finalHtml = (rawHtml || "").replace(/https?:\/\/[a-zA-Z0-9-]+\.vercel\.app/g, "https://sightline.fabulouzz.com");

    // 1. If password reset, generate genuine Supabase recovery link via Admin API
    if (type === "reset_password" && recipients.length > 0) {
      try {
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const targetEmail = recipients[0].trim().toLowerCase();
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: targetEmail,
          options: {
            redirectTo: "https://sightline.fabulouzz.com/reset-password",
          },
        });

        if (!linkErr && linkData?.properties) {
          const actionLink = linkData.properties.action_link;
          const hashedToken = linkData.properties.hashed_token;

          // Direct tokenized URL that instantly validates in ResetPassword component
          const tokenizedUrl = `https://sightline.fabulouzz.com/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&email=${encodeURIComponent(targetEmail)}`;

          // Prefer action_link or tokenized URL
          const validLink = actionLink || tokenizedUrl;

          // Replace any reset-password links in the email template
          finalHtml = finalHtml.replace(/href="[^"]*reset-password[^"]*"/g, `href="${validLink}"`);
          console.info(`[Vercel Serverless Email] Generated genuine recovery link for ${targetEmail}`);
        } else if (linkErr) {
          console.warn("[Vercel Serverless Email] generateLink recovery error:", linkErr);
        }
      } catch (genErr) {
        console.warn("[Vercel Serverless Email] Error during generateLink:", genErr);
      }
    }

    // 2. Dispatch via Resend API
    const resendApiKey =
      process.env.RESEND_API_KEY ||
      process.env.VITE_RESEND_API_KEY;

    let resendDispatched = false;
    let resendMessage = null;

    if (resendApiKey) {
      const sender = `SIGHTLINE Command Center <${BRAND_MAIN_EMAIL}>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          reply_to: BRAND_MAIN_EMAIL,
          to: recipients,
          subject: subject || "Notification from SightLine Command Center",
          html: finalHtml,
        }),
      });

      const resendData = await resendRes.json();

      if (resendRes.ok) {
        resendDispatched = true;
        console.info(`[Vercel Serverless Email] Dispatched to ${recipients.join(", ")} via Resend:`, resendData);
      } else {
        resendMessage = resendData.message || JSON.stringify(resendData);
        console.warn(`[Vercel Serverless Email] Resend API error:`, resendData);

        // Fallback for developer sandbox testing if domain unverified
        if (typeof resendMessage === "string" && resendMessage.toLowerCase().includes("domain")) {
          try {
            const fallbackRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "SIGHTLINE Command Center <onboarding@resend.dev>",
                reply_to: BRAND_MAIN_EMAIL,
                to: recipients,
                subject: subject || "Notification from SightLine Command Center",
                html: finalHtml,
              }),
            });
            const fallbackData = await fallbackRes.json();
            if (fallbackRes.ok) {
              resendDispatched = true;
              resendMessage = "Dispatched via verified Resend domain fallback";
            }
          } catch (fbErr) {
            console.warn("Fallback sender also failed:", fbErr);
          }
        }
      }
    } else {
      resendMessage = "RESEND_API_KEY is not set in environment variables.";
      console.warn(`[Vercel Serverless Email] ${resendMessage}`);
    }

    return res.status(200).json({
      success: true,
      dispatched: resendDispatched,
      recipients,
      type: type || "general",
      provider: BRAND_PROVIDER_TEXT,
      contact: BRAND_MAIN_EMAIL,
      note: resendMessage,
    });
  } catch (error: any) {
    console.error("[Vercel Serverless Email Error]:", error);
    return res.status(500).json({
      error: error.message || "Internal email server error",
    });
  }
}
