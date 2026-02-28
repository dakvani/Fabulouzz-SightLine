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

    const { subject, tasks, projectInfo, pdfBase64 } = await req.json();
    if (!subject || !tasks) {
      return new Response(
        JSON.stringify({ error: "Missing subject or tasks" }),
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

    // Status color mapping
    const statusColor: Record<string, string> = {
      Completed: "#22c55e",
      Processing: "#3b82f6",
      Initiating: "#fbbf24",
      Planning: "#a8a29e",
    };

    // Calculate progress
    const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
    const progressTotal = tasks.reduce((sum: number, t: any) => sum + (weights[t.status] || 0), 0);
    const progress = Math.round((progressTotal / tasks.length) * 100);

    const counts = {
      completed: tasks.filter((t: any) => t.status === "Completed").length,
      processing: tasks.filter((t: any) => t.status === "Processing").length,
      initiating: tasks.filter((t: any) => t.status === "Initiating").length,
      planning: tasks.filter((t: any) => t.status === "Planning").length,
    };

    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // Build task rows
    const taskRows = tasks.map((t: any) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; font-size: 13px; color: #6b7280; text-align: center; font-weight: 600;">${String(t.id).padStart(2, "0")}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #1f2937;">${t.name}</td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; color: #fff; background: ${statusColor[t.status] || '#9ca3af'};">
            ${t.status}
          </span>
        </td>
        <td style="padding: 10px 12px; font-size: 13px; color: #6b7280; text-align: center;">${t.duration}d</td>
      </tr>
    `).join("");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    const buildHtml = (recipientEmail: string) => {
      const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;

      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: #2fbf2f; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">SIGHTLINE Command Center</h1>
      <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 4px; font-weight: 700;">PROJECT STATUS REPORT</h2>
      <div style="width: 60px; height: 3px; background: #2fbf2f; margin: 12px auto;"></div>
      <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0;">${today}</p>
    </div>

    <!-- Project Info -->
    <div style="background: #ffffff; padding: 24px 32px; border-left: 4px solid #2fbf2f;">
      <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 6px;">${projectInfo?.title || subject}</h3>
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px;">${projectInfo?.client || ""} ${projectInfo?.location ? " • " + projectInfo.location : ""}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; font-size: 12px; color: #9ca3af; width: 130px;">Project Ref</td>
          <td style="padding: 4px 0; font-size: 12px; color: #1f2937; font-weight: 600;">${projectInfo?.projectRef || "—"}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 12px; color: #9ca3af;">Project Manager</td>
          <td style="padding: 4px 0; font-size: 12px; color: #1f2937; font-weight: 600;">${projectInfo?.projectManager || "—"}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 12px; color: #9ca3af;">Project Engineer</td>
          <td style="padding: 4px 0; font-size: 12px; color: #1f2937; font-weight: 600;">${projectInfo?.projectEngineer || "—"}</td>
        </tr>
      </table>
    </div>

    <!-- Summary Cards -->
    <div style="background: #ffffff; padding: 20px 32px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: center; padding: 12px 8px; background: #f8faf8; border-radius: 8px; width: 25%;">
            <div style="font-size: 28px; font-weight: 800; color: #2fbf2f;">${progress}%</div>
            <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Progress</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="text-align: center; padding: 12px 8px; background: #f0fdf4; border-radius: 8px; width: 25%;">
            <div style="font-size: 28px; font-weight: 800; color: #22c55e;">${counts.completed}</div>
            <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Completed</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="text-align: center; padding: 12px 8px; background: #eff6ff; border-radius: 8px; width: 25%;">
            <div style="font-size: 28px; font-weight: 800; color: #3b82f6;">${counts.processing + counts.initiating}</div>
            <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">In Progress</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="text-align: center; padding: 12px 8px; background: #f5f5f4; border-radius: 8px; width: 25%;">
            <div style="font-size: 28px; font-weight: 800; color: #a8a29e;">${counts.planning}</div>
            <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Planning</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Task Table -->
    <div style="background: #ffffff; padding: 24px 32px;">
      <h3 style="color: #2fbf2f; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px; font-weight: 700;">Task Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 10px 12px; font-size: 11px; color: #2fbf2f; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40px;">#</th>
            <th style="padding: 10px 12px; font-size: 11px; color: #2fbf2f; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Task</th>
            <th style="padding: 10px 12px; font-size: 11px; color: #2fbf2f; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 100px;">Status</th>
            <th style="padding: 10px 12px; font-size: 11px; color: #2fbf2f; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 60px;">Days</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;">
      <div style="width: 60px; height: 2px; background: #2fbf2f; margin: 0 auto 12px;"></div>
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px;">Powered by Fabulouzz Technologies • SightLine Command Center</p>
      <p style="color: #4b5563; font-size: 10px; margin: 0 0 8px;">You're receiving this because you subscribed to project updates.</p>
      ${pdfBase64 ? '<p style="color: #9ca3af; font-size: 10px; margin: 0 0 8px;">📎 Full PDF report attached</p>' : ''}
      <a href="${unsubscribeUrl}" style="color: #6b7280; font-size: 10px; text-decoration: underline;">Unsubscribe from updates</a>
    </div>

  </div>
</body>
</html>`;
    };

    // Send individual emails with personalized unsubscribe links
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipientEmail of emails) {
      const resendPayload: any = {
        from: "SIGHTLINE Updates <support@fabulouzz.com>",
        to: [recipientEmail],
        subject: `Project Update: ${subject}`,
        html: buildHtml(recipientEmail),
      };

      if (pdfBase64) {
        resendPayload.attachments = [
          {
            filename: `SightLine_Report_${(projectInfo?.projectRef || "Report").replace(/\s/g, "_")}_${today.replace(/\s/g, "-")}.pdf`,
            content: pdfBase64,
          },
        ];
      }

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resendPayload),
        });

        const resendData = await resendRes.json();

        if (!resendRes.ok) {
          console.error(`Resend error for ${recipientEmail}:`, resendData);
          errors.push(`${recipientEmail}: ${resendData.message}`);
        } else {
          sentCount++;
        }
      } catch (e) {
        errors.push(`${recipientEmail}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Notification sent to ${sentCount} subscriber(s)${errors.length ? `, ${errors.length} failed` : ""}`,
        sent: sentCount,
        errors: errors.length ? errors : undefined,
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
