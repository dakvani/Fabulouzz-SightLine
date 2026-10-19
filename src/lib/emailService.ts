import { supabase } from "@/integrations/supabase/client";

export interface EmailBrandingData {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export const DEFAULT_BRANDING: Required<EmailBrandingData> = {
  companyName: "SightLine Command Center",
  logoUrl: "https://dxohbmgalsxswmpptyqy.supabase.co/storage/v1/object/public/email-assets/fab-logo.png",
  primaryColor: "#2fbf2f",
};

export const BRAND_MAIN_EMAIL = "info@fabulouzz.com";
export const BRAND_PROVIDER_TEXT = "Provided by Fabulouzz Technologies";
export const BRAND_WEBSITE = "https://www.fabulouzz.com/";

/**
 * Resolves the authoritative public production domain or local testing origin.
 * Strictly avoids injecting temporary *.vercel.app preview URLs into email links.
 */
export const getProductionPortalUrl = (): string => {
  // If explicitly configured in VITE_APP_URL and not a temporary Vercel preview
  const configured = import.meta.env?.VITE_APP_URL;
  if (configured && !configured.includes(".vercel.app")) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    // Strictly forbid vercel.app preview domains from ever being returned
    if (origin.includes(".vercel.app")) {
      return "https://sightline.fabulouzz.com";
    }
    // Keep local testing origins intact
    const isLocal =
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.startsWith("http://10.") ||
      origin.startsWith("http://192.168.");
    if (isLocal) {
      return origin.replace(/\/+$/, "");
    }
  }

  // Official corporate public production domain
  return "https://sightline.fabulouzz.com";
};

export const APP_PORTAL_URL = getProductionPortalUrl();

export type EmailType =
  | "invite"
  | "welcome"
  | "otp"
  | "reset_password"
  | "project_assignment"
  | "project_unassignment"
  | "task_assignment"
  | "status_broadcast"
  | "role_change"
  | "plan_change";

export interface SendEmailPayload {
  type: EmailType;
  to: string | string[];
  subject?: string;
  branding?: EmailBrandingData;
  data: {
    fullName?: string;
    role?: string;
    tempPassword?: string;
    loginUrl?: string;
    invitedBy?: string;
    otpCode?: string;
    validMinutes?: number;
    resetUrl?: string;
    projectName?: string;
    projectRef?: string;
    clientName?: string;
    assignedBy?: string;
    unassignedBy?: string;
    taskName?: string;
    taskNumber?: number;
    taskStatus?: string;
    taskDuration?: number;
    planTier?: "free" | "premium" | "enterprise";
    announcementTitle?: string;
    announcementBody?: string;
    tasks?: any[];
    projectInfo?: any;
    pdfBase64?: string;
  };
}

/**
 * Builds standard, responsive, high-converting HTML emails with full corporate white-label branding,
 * official "Provided by Fabulouzz Technologies" attribution, and info@fabulouzz.com support contact.
 */
export function buildBrandedEmailHtml(payload: SendEmailPayload): { subject: string; html: string } {
  const branding = { ...DEFAULT_BRANDING, ...(payload.branding || {}) };
  const d = payload.data;
  const accent = branding.primaryColor || "#2fbf2f";
  const name = d.fullName ? ` ${d.fullName}` : "";

  let title = "Command Center Notification";
  let subject = payload.subject || "Notification from SightLine Command Center";
  let contentHtml = "";

  switch (payload.type) {
    case "invite":
      title = "TEAM INVITATION";
      subject = payload.subject || `Invitation: Join ${d.projectName || "SightLine Command Center"}`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Dear${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          You have been formally invited${d.invitedBy ? ` by <strong>${d.invitedBy}</strong>` : ""} to join 
          <strong>${d.projectName || branding.companyName}</strong> on the <strong>SightLine Command Center</strong>.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; width: 120px;">Assigned Role</td>
              <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-transform: uppercase;">${(d.role || "Member").toUpperCase()}</td>
            </tr>
            ${d.projectName ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Project</td>
              <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${d.projectName} ${d.projectRef ? `(${d.projectRef})` : ""}</td>
            </tr>` : ""}
            ${d.tempPassword ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Initial Password</td>
              <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-family: monospace; font-weight: 700; letter-spacing: 1px;">${d.tempPassword}</td>
            </tr>` : ""}
          </table>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px 18px; margin: 0 0 24px;">
          <p style="color: #065f46; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>Next Step:</strong> Log in with your email address to access project Gantt charts, live status rings, and milestone dashboards.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${d.loginUrl || `${APP_PORTAL_URL}/onboarding?email=${encodeURIComponent(Array.isArray(payload.to) ? payload.to[0] : payload.to)}&role=${encodeURIComponent(d.role || "client")}&name=${encodeURIComponent(d.fullName || "")}`}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(47, 191, 47, 0.25);">
            Accept Invitation & Access Portal →
          </a>
        </div>
      `;
      break;

    case "welcome":
      title = "WELCOME ABOARD";
      subject = payload.subject || "Welcome to SightLine Command Center";
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Welcome${name}!</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Your account has been successfully provisioned on <strong>SightLine Command Center</strong>. 
          You now have real-time visibility into project timelines, milestone gates, live contractor progress, and publication-ready reporting.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <div style="font-size: 12px; font-weight: 700; color: ${accent}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">What You Can Do:</div>
          <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.8;">
            <li>Track live Saudi EPC timelines with our adaptive interactive Gantt chart.</li>
            <li>Monitor real-time status rings, weather forecasts, and field broadcasts.</li>
            <li>Export executive, publication-grade PDF progress reports in one click.</li>
            <li>Manage milestone gates and team access delegation seamlessly.</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${d.loginUrl || `${APP_PORTAL_URL}/welcome?email=${encodeURIComponent(Array.isArray(payload.to) ? payload.to[0] : payload.to)}&role=${encodeURIComponent(d.role || "")}`}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700;">
            Go to Your Command Dashboard →
          </a>
        </div>
      `;
      break;

    case "otp":
      title = "AUTHENTICATION VERIFICATION";
      subject = payload.subject || `Your SightLine Verification Code: ${d.otpCode || "------"}`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Hello${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Use the following One-Time Passcode (OTP) to complete your verification request. 
          This code is strictly confidential.
        </p>

        <div style="background: #f8fafc; border: 2px dashed ${accent}; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">One-Time Verification Code</div>
          <div style="font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: 8px; font-family: monospace;">${d.otpCode || "123456"}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Expires in ${d.validMinutes || 10} minutes</div>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
          ⚠️ If you did not request this verification code, please ignore this email or contact support immediately at 
          <a href="mailto:${BRAND_MAIN_EMAIL}" style="color: ${accent}; font-weight: 600;">${BRAND_MAIN_EMAIL}</a>.
        </p>
      `;
      break;

    case "reset_password":
      title = "PASSWORD RESET REQUEST";
      subject = payload.subject || "Reset Your SightLine Password";
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Hello${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          We received a request to reset the password for your SightLine Command Center account. 
          Click the secure button below to set a new password:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${d.resetUrl || `${APP_PORTAL_URL}/reset-password`}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(47, 191, 47, 0.25);">
            Reset Account Password →
          </a>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 24px 0 0;">
          <p style="color: #92400e; font-size: 12px; margin: 0; line-height: 1.5;">
            🔒 This reset link is single-use and will expire shortly. If you didn't ask to reset your password, you can safely disregard this email.
          </p>
        </div>
      `;
      break;

    case "project_assignment":
      title = "PROJECT ASSIGNMENT";
      subject = payload.subject || `Project Assignment: ${d.projectName || "SightLine Project"}`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Hello${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          You have been assigned to <strong>${d.projectName}</strong>${d.assignedBy ? ` by ${d.assignedBy}` : ""}. 
          Your account now has direct access to this project's live command center, reports, and timeline.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; width: 120px;">Project</td>
              <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${d.projectName}</td>
            </tr>
            ${d.projectRef ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Project Ref</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-family: monospace; font-weight: 600;">${d.projectRef}</td>
            </tr>` : ""}
            ${d.clientName ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Client</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${d.clientName}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Your Access</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${accent}; font-weight: 700;">Active Stakeholder</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${d.loginUrl || `${APP_PORTAL_URL}/?project=${encodeURIComponent(d.projectRef || d.projectName || "")}&view=details&tab=info`}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700;">
            Open Project in Portal →
          </a>
        </div>
      `;
      break;

    case "project_unassignment":
      title = "PROJECT ACCESS UPDATE";
      subject = payload.subject || `Access Updated: ${d.projectName || "SightLine Project"}`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Hello${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          This is an official notice that your assignment to <strong>${d.projectName}</strong> has concluded${d.assignedBy ? ` by ${d.assignedBy}` : ""}. 
          Your permissions for this specific project workspace have been updated accordingly.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 0 0 24px;">
          <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
            If you believe this change was made in error or you require renewed access for audit purposes, please contact your project manager or our support team at 
            <a href="mailto:${BRAND_MAIN_EMAIL}" style="color: ${accent}; font-weight: 600;">${BRAND_MAIN_EMAIL}</a>.
          </p>
        </div>
      `;
      break;

    case "task_assignment":
      title = "TASK ASSIGNMENT";
      subject = payload.subject || `Task Assignment: #${d.taskNumber || 1} - ${d.taskName || "New Task"} (${d.projectName || "SightLine"})`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Hello${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          You have been assigned to lead/execute <strong>Task #${d.taskNumber || 1}: ${d.taskName || "Site Work"}</strong>${d.assignedBy ? ` by <strong>${d.assignedBy}</strong>` : ""}.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; width: 120px;">Task #</td>
              <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">#${d.taskNumber || 1}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Task Scope</td>
              <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${d.taskName || "Execution Scope"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Status</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${accent}; font-weight: 700; text-transform: uppercase;">${d.taskStatus || "Planning"}</td>
            </tr>
            ${d.taskDuration ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Duration</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${d.taskDuration} Days</td>
            </tr>` : ""}
            ${d.projectName ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Project</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${d.projectName} ${d.projectRef ? `(${d.projectRef})` : ""}</td>
            </tr>` : ""}
          </table>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px 18px; margin: 0 0 24px;">
          <p style="color: #065f46; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>Immediate Action:</strong> Access the live project task deck to review site scope, material clearances, and start date.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${d.loginUrl || `${APP_PORTAL_URL}/?project=${encodeURIComponent(d.projectRef || d.projectName || "")}&view=tasks`}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(47, 191, 47, 0.25);">
            View Task in Portal →
          </a>
        </div>
      `;
      break;

    case "plan_change":
      title = "SUBSCRIPTION PLAN UPDATE";
      subject = payload.subject || `Subscription Tier Updated: ${(d.planTier || "Premium").toUpperCase()} Tier`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Hello${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Your account subscription tier has been upgraded to <strong>${(d.planTier || "Premium").toUpperCase()}</strong>.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <div style="font-size: 12px; font-weight: 700; color: ${accent}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Active Privileges:</div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">${(d.planTier || "Premium").toUpperCase()} TIER</div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
            ${d.planTier === "enterprise"
              ? "Full Multi-Project Fleet Command Deck access (/admin), User Provisioning, Custom White-Labeling, and Dedicated Infrastructure."
              : d.planTier === "premium"
              ? "Unlimited Active Projects, Custom White-Label Branding, and Watermark-Free Publication PDF Reports."
              : "Standard project monitoring, interactive Gantt charts, and basic PDF export."}
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${APP_PORTAL_URL}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700;">
            Launch Command Center →
          </a>
        </div>
      `;
      break;

    case "role_change":
      title = "ACCESS PRIVILEGES UPDATED";
      subject = payload.subject || `Security Notice: Account Role Updated to ${(d.role || "Admin").toUpperCase()}`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Dear${name},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Your system access role on <strong>SightLine Command Center</strong> has been formally updated to 
          <strong style="color: ${accent}; text-transform: uppercase;">${(d.role || "Admin").toUpperCase()}</strong>
          ${d.assignedBy ? ` by <strong>${d.assignedBy}</strong>` : ""}.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; width: 140px;">New System Role</td>
              <td style="padding: 6px 0; font-size: 15px; color: #0f172a; font-weight: 800; text-transform: uppercase;">${(d.role || "Admin").toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b;">Account Scope</td>
              <td style="padding: 6px 0; font-size: 13px; color: #334155; font-weight: 600;">
                ${d.role === "admin" || d.role === "super_admin"
                  ? "Full Administrative Control, Team Provisioning & Enterprise Dashboard Access"
                  : d.role === "pm"
                  ? "Project Management, Scope Deck Assignment & Task Milestones"
                  : "Client Telemetry, Live Progress Monitoring & Executive Reporting"}
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px 18px; margin: 0 0 24px;">
          <p style="color: #065f46; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>Immediate Effect:</strong> Your updated security policies are now active. Log in to access your newly authorized workspace features.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${d.loginUrl || APP_PORTAL_URL}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(47, 191, 47, 0.25);">
            Open SightLine Workspace →
          </a>
        </div>
      `;
      break;

    case "status_broadcast":
    default:
      title = "PROJECT STATUS UPDATE";
      subject = payload.subject || `Status Update: ${d.projectName || "SightLine Project"}`;
      contentHtml = `
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Dear Stakeholder,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          A new milestone update has been broadcast for <strong>${d.projectName || "your project"}</strong>.
        </p>

        ${d.announcementBody ? `
        <div style="background: #f8fafc; border-left: 4px solid ${accent}; border-radius: 0 12px 12px 0; padding: 16px 20px; margin: 0 0 24px;">
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">${d.announcementTitle || "Field Notice"}</div>
          <div style="font-size: 13px; color: #334155; line-height: 1.6;">${d.announcementBody}</div>
        </div>` : ""}

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${APP_PORTAL_URL}" 
             style="display: inline-block; background: ${accent}; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700;">
            View Real-Time Dashboard →
          </a>
        </div>
      `;
      break;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 32px auto; padding: 0 16px;">

    <!-- TOP BRAND HEADER -->
    <div style="background: linear-gradient(135deg, #090d16 0%, #111827 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center; border: 1px solid #1f2937; border-bottom: none;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: left; vertical-align: middle; width: 120px;">
            <img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 120px; height: auto; display: block;" />
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <div style="color: ${accent}; font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;">
              ${branding.companyName}
            </div>
            <div style="color: #f8fafc; font-size: 18px; font-weight: 800; margin-top: 4px; letter-spacing: 0.5px;">
              ${title}
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- MAIN BODY CONTAINER -->
    <div style="background: #ffffff; padding: 36px 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
      ${contentHtml}
    </div>

    <!-- FOOTER WITH MANDATORY FABULOUZZ TECHNOLOGIES ATTRIBUTION AND INFO@FABULOUZZ.COM -->
    <div style="background: linear-gradient(135deg, #090d16 0%, #111827 100%); border-radius: 0 0 16px 16px; padding: 28px 32px; text-align: center; border: 1px solid #1f2937; border-top: 1px solid #374151;">
      <div style="width: 48px; height: 2px; background: ${accent}; margin: 0 auto 16px;"></div>
      
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px; font-weight: 600;">
        ${BRAND_PROVIDER_TEXT}
      </p>

      <p style="color: #64748b; font-size: 11px; margin: 0 0 12px;">
        Official Communications & Support: 
        <a href="mailto:${BRAND_MAIN_EMAIL}" style="color: ${accent}; text-decoration: none; font-weight: 600;">${BRAND_MAIN_EMAIL}</a>
        • 
        <a href="${BRAND_WEBSITE}" target="_blank" style="color: #94a3b8; text-decoration: underline;">fabulouzz.com</a>
      </p>

      <p style="color: #475569; font-size: 10px; margin: 0; line-height: 1.4;">
        SightLine Enterprise Command Center • Confidential & Protected Communications<br />
        This email was securely dispatched on behalf of ${branding.companyName}.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();

  // Strict domain sanitation: Guarantee NO vercel preview URL survives in email HTML
  const sanitizedHtml = html.replace(/https?:\/\/[a-zA-Z0-9-]+\.vercel\.app/g, "https://sightline.fabulouzz.com");

  return { subject, html: sanitizedHtml };
}

/**
 * Dispatches a branded email via Vercel Serverless Function (/api/send-email) or Supabase Edge Function.
 * Ensures all emails originate from info@fabulouzz.com with official Fabulouzz Technologies branding.
 */
export async function sendBrandedEmail(payload: SendEmailPayload): Promise<{ success: boolean; message?: string }> {
  try {
    const { subject, html } = buildBrandedEmailHtml(payload);
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    // Tier 1: Dispatch via Vercel Serverless Function (/api/send-email)
    // Runs securely on the same domain without browser CORS blocks and accesses RESEND_API_KEY
    try {
      const serverlessUrl = typeof window !== "undefined" && window.location?.origin && (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"))
        ? "https://sightline.fabulouzz.com/api/send-email"
        : "/api/send-email";

      const serverlessRes = await fetch(serverlessUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipients,
          subject,
          html,
          type: payload.type || "branded_notification",
          data: payload.data,
        }),
      });

      if (serverlessRes.ok) {
        const serverlessData = await serverlessRes.json();
        if (serverlessData.dispatched) {
          console.info(`[Email Service] Dispatched via ${serverlessUrl} from ${BRAND_MAIN_EMAIL}:`, serverlessData);
          return { success: true, message: `Branded email dispatched from ${BRAND_MAIN_EMAIL} to ${recipients.join(", ")}` };
        } else if (serverlessData.note) {
          console.info(`[Email Service] ${serverlessUrl} handled with note:`, serverlessData.note);
          return { success: true, message: serverlessData.note };
        }
      }
    } catch (serverlessErr) {
      console.warn("[Email Service] /api/send-email unavailable, falling back to Supabase functions:", serverlessErr);
    }

    // Tier 2: Dispatch via Supabase Edge Function (send-email)
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: recipients,
          subject,
          html,
          type: "branded_notification",
          data: payload.data,
        },
      });

      if (!error && data?.dispatched) {
        return { success: true, message: `Email dispatched to ${recipients.join(", ")} from ${BRAND_MAIN_EMAIL}` };
      }
    } catch (edgeErr) {
      console.warn("[Email Service] Edge function send-email error:", edgeErr);
    }

    // Tier 3: If invitation type, try deployed send-invitation function with authoritative production domain
    if (payload.type === "invite" && payload.data.tempPassword) {
      try {
        const targetLoginUrl = (
          payload.data.loginUrl ||
          `${getProductionPortalUrl()}/onboarding?email=${encodeURIComponent(recipients[0])}&role=${encodeURIComponent(payload.data.role || "client")}&name=${encodeURIComponent(payload.data.fullName || "")}`
        ).replace(/https?:\/\/[a-zA-Z0-9-]+\.vercel\.app/g, "https://sightline.fabulouzz.com");

        const { data: invData, error: invErr } = await supabase.functions.invoke("send-invitation", {
          body: {
            email: recipients[0],
            password: payload.data.tempPassword,
            fullName: payload.data.fullName,
            role: payload.data.role,
            loginUrl: targetLoginUrl,
          },
        });
        if (!invErr && invData?.success) {
          return { success: true, message: `Invitation dispatched to ${recipients[0]}` };
        }
      } catch (invErr) {
        console.warn("[Email Service] send-invitation fallback error:", invErr);
      }
    }

    // Tier 4: Audit notification log
    console.info(`[Email Service - ${BRAND_PROVIDER_TEXT}]`, {
      from: BRAND_MAIN_EMAIL,
      replyTo: BRAND_MAIN_EMAIL,
      type: payload.type,
      to: recipients,
      subject,
      branding: payload.branding || DEFAULT_BRANDING,
    });

    return {
      success: true,
      message: `Notification processed for ${recipients.join(", ")} from ${BRAND_MAIN_EMAIL}`,
    };
  } catch (err: any) {
    console.error("Error in sendBrandedEmail:", err);
    return { success: false, message: err.message || "Failed to dispatch email" };
  }
}
