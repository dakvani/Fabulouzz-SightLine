import type { IncomingMessage, ServerResponse } from "http";

const BRAND_MAIN_EMAIL = "info@fabulouzz.com";
const BRAND_PROVIDER_TEXT = "Provided by Fabulouzz Technologies";

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

    // Optional: Resend API Key from Vercel environment variables
    const resendApiKey =
      process.env.RESEND_API_KEY ||
      process.env.VITE_RESEND_API_KEY;

    let resendDispatched = false;
    let resendMessage = null;

    if (resendApiKey) {
      // Primary sender: info@fabulouzz.com
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

        // If domain is not verified for info@fabulouzz.com, attempt fallback to onboarding@resend.dev for developer testing
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
      resendMessage = "RESEND_API_KEY is not set in Vercel environment variables.";
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
