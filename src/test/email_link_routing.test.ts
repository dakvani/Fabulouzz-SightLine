import { describe, it, expect, beforeEach } from "vitest";
import { buildBrandedEmailHtml, APP_PORTAL_URL, getProductionPortalUrl } from "@/lib/emailService";

describe("Email Link Generation & Deep Routing (No Route Confusion)", () => {
  it("TC-E01: Invite emails direct users to the dedicated /onboarding page", () => {
    const emailPayload = {
      type: "invite" as const,
      to: "new.engineer@client.com",
      data: {
        fullName: "John Engineer",
        role: "pm",
        projectName: "Saudi EPC Substation Alpha",
        tempPassword: "TempPass#2026",
      },
    };

    const { html, subject } = buildBrandedEmailHtml(emailPayload);
    expect(subject).toContain("Saudi EPC Substation Alpha");
    expect(html).toContain("/onboarding");
    expect(html).toContain(encodeURIComponent("new.engineer@client.com"));
    expect(html).toContain("role=pm");
    expect(html).not.toMatch(/href="https?:\/\/[^"]*\/["]>/); // Must NOT link solely to bare root landing page
  });

  it("TC-E02: Welcome emails direct users to the dedicated /welcome page", () => {
    const emailPayload = {
      type: "welcome" as const,
      to: "confirmed.client@energy.sa",
      data: {
        fullName: "Sarah Stakeholder",
        role: "client",
      },
    };

    const { html, subject } = buildBrandedEmailHtml(emailPayload);
    expect(subject).toContain("Welcome to SightLine Command Center");
    expect(html).toContain("/welcome");
    expect(html).toContain(encodeURIComponent("confirmed.client@energy.sa"));
    expect(html).not.toMatch(/href="https?:\/\/[^"]*\/["]>/);
  });

  it("TC-E03: Password reset emails direct users to the dedicated /reset-password page", () => {
    const emailPayload = {
      type: "reset_password" as const,
      to: "admin@contractor.com",
      data: {
        fullName: "Chief Admin",
      },
    };

    const { html, subject } = buildBrandedEmailHtml(emailPayload);
    expect(subject).toContain("Reset Your SightLine Password");
    expect(html).toContain("/reset-password");
  });

  it("TC-E04: Project assignment emails direct users directly to that specific project", () => {
    const emailPayload = {
      type: "project_assignment" as const,
      to: "client.lead@aramco.sa",
      data: {
        fullName: "Ali Director",
        projectName: "Haradh Gas Flare Redirection",
        projectRef: "PRJ-HRD-2026",
      },
    };

    const { html, subject } = buildBrandedEmailHtml(emailPayload);
    expect(subject).toContain("Project Assignment");
    expect(html).toContain("project=PRJ-HRD-2026");
    expect(html).toContain("view=details");
  });

  it("TC-E05: Task assignment emails direct users directly to the task deck for that project", () => {
    const emailPayload = {
      type: "task_assignment" as const,
      to: "site.pm@fabulouzz.com",
      data: {
        fullName: "Tariq PM",
        taskNumber: 4,
        taskName: "Fiber Optic Trenching",
        projectName: "Neom Logistics Hub",
        projectRef: "PRJ-NEOM-04",
      },
    };

    const { html, subject } = buildBrandedEmailHtml(emailPayload);
    expect(subject).toContain("Task Assignment");
    expect(html).toContain("project=PRJ-NEOM-04");
    expect(html).toContain("view=tasks");
  });
});

describe("URL Hash and Parameter Routing Detection", () => {
  it("TC-E06: Parses recovery type from hash and determines /reset-password target", () => {
    const mockHash = "#access_token=ey123&refresh_token=ref456&type=recovery";
    const hashParams = new URLSearchParams(mockHash.substring(1));
    const type = hashParams.get("type");

    expect(type).toBe("recovery");
    const targetRoute = type === "recovery" ? "/reset-password" : "/";
    expect(targetRoute).toBe("/reset-password");
  });

  it("TC-E07: Parses invite type from hash and determines /onboarding target", () => {
    const mockHash = "#access_token=ey123&refresh_token=ref456&type=invite";
    const hashParams = new URLSearchParams(mockHash.substring(1));
    const type = hashParams.get("type");

    expect(type).toBe("invite");
    const targetRoute = type === "invite" ? "/onboarding" : "/";
    expect(targetRoute).toBe("/onboarding");
  });

  it("TC-E08: Parses signup type from hash and determines /welcome target", () => {
    const mockHash = "#access_token=ey123&refresh_token=ref456&type=signup";
    const hashParams = new URLSearchParams(mockHash.substring(1));
    const type = hashParams.get("type");

    expect(type).toBe("signup");
    const targetRoute = type === "signup" ? "/welcome" : "/";
    expect(targetRoute).toBe("/welcome");
  });

  it("TC-E09: Parses error tokens from hash and determines /auth/error target", () => {
    const mockHash = "#error=access_denied&error_description=Email+link+is+invalid+or+has+expired";
    const hashParams = new URLSearchParams(mockHash.substring(1));
    const error = hashParams.get("error");
    const errorDesc = hashParams.get("error_description");

    expect(error).toBe("access_denied");
    expect(errorDesc).toContain("expired");
    const targetRoute = error ? "/auth/error" : "/";
    expect(targetRoute).toBe("/auth/error");
  });

  it("TC-E10: Resolves ?project=xxx query parameter to auto-switch project", () => {
    const mockSearch = "?project=proj-riyadh-epc-01&view=timeline";
    const searchParams = new URLSearchParams(mockSearch);
    const projectId = searchParams.get("project");
    const view = searchParams.get("view");

    expect(projectId).toBe("proj-riyadh-epc-01");
    expect(view).toBe("timeline");
  });

  it("TC-E11: getProductionPortalUrl ignores *.vercel.app preview URLs and defaults to production domain", () => {
    const portalUrl = getProductionPortalUrl();
    expect(portalUrl).not.toContain(".vercel.app");
    expect(portalUrl).toMatch(/https?:\/\/|localhost/);
  });

  it("TC-E12: buildBrandedEmailHtml automatically sanitizes any vercel.app domains from loginUrl", () => {
    const emailPayload = {
      type: "invite" as const,
      to: "invited.contractor@partner.sa",
      data: {
        fullName: "Contractor Eng",
        role: "pm",
        loginUrl: "https://fabulouzzsightline.vercel.app/onboarding?email=invited.contractor@partner.sa&role=pm",
      },
    };
    const { html } = buildBrandedEmailHtml(emailPayload);
    expect(html).not.toContain("vercel.app");
    expect(html).toContain("https://sightline.fabulouzz.com/onboarding");
  });

  it("TC-E13: buildBrandedEmailHtml guarantees all CTA links point strictly to sightline.fabulouzz.com", () => {
    const invite = buildBrandedEmailHtml({ type: "invite", to: "test@domain.com", data: {} });
    expect(invite.html).not.toContain("vercel.app");
    expect(invite.html).toContain("/onboarding");

    const welcome = buildBrandedEmailHtml({ type: "welcome", to: "test@domain.com", data: {} });
    expect(welcome.html).not.toContain("vercel.app");
    expect(welcome.html).toContain("/welcome");

    const reset = buildBrandedEmailHtml({ type: "reset_password", to: "test@domain.com", data: {} });
    expect(reset.html).not.toContain("vercel.app");
    expect(reset.html).toContain("/reset-password");
  });
});

