import { type ProjectTask, type ProjectInfo } from "@/data/projectData";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import {
  getCalendarDays,
  getTaskDateRange,
  getTimelineEndDate,
  parseProjectDate,
  formatTimelineDate,
} from "@/lib/projectTimeline";

const loadImageAsBase64 = (src: string, maxDim = 0, asJpeg = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (maxDim > 0 && (w > maxDim || h > maxDim)) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, w, h);
      resolve(asJpeg ? canvas.toDataURL("image/jpeg", 0.75) : canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
};

interface NotificationData {
  id: string;
  message: string;
  type: string;
  media_url: string | null;
  created_at: string;
}

export interface BrandingData {
  company_name: string;
  logo_url: string | null;
  accent_color: string;
  tagline: string;
  website_url: string;
}

export interface ReportOptions {
  tasks: ProjectTask[];
  projectInfo: ProjectInfo;
  isDark?: boolean;
  notifications?: NotificationData[];
  branding?: BrandingData | null;
}

/**
 * Publication-Grade Executive Project Intelligence Report Generator
 * Independent Corporate Styling (Pure White background, Deep Emerald & Charcoal contrast)
 * Unified Universal Header & Footer stamped across ALL pages (Portrait & Landscape).
 */
export async function generateReportPdf({
  tasks,
  projectInfo,
  notifications = [],
  branding = null,
}: ReportOptions): Promise<{ doc: any; base64: string }> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  // Initialize A4 document
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;

  /* ═══════════════════════════════════════════════════════════════════
   *  EXECUTIVE CORPORATE COLOR SYSTEM (INDEPENDENT PRINT DESIGN)
   * ═══════════════════════════════════════════════════════════════════ */
  const cWhite: [number, number, number] = [255, 255, 255];
  const cAccent: [number, number, number] = [6, 95, 70]; // Deep Forest Emerald
  const cAccentLight: [number, number, number] = [236, 253, 245]; // Emerald Tint
  const cTextPrimary: [number, number, number] = [15, 23, 42]; // Charcoal #0F172A
  const cTextSecondary: [number, number, number] = [71, 85, 105]; // Slate #475569
  const cTextMuted: [number, number, number] = [100, 116, 139]; // Muted Slate #64748B
  const cBorder: [number, number, number] = [226, 232, 240]; // Slate Border #E2E8F0
  const cBorderDark: [number, number, number] = [203, 213, 225]; // Slate Border #CBD5E1
  const cCardBg: [number, number, number] = [248, 250, 252]; // Soft Slate Fill #F8FAFC
  const cAltRow: [number, number, number] = [250, 250, 252]; // Table Stripe
  const cWeekendBg: [number, number, number] = [241, 245, 249]; // Weekend Tint #F1F5F9

  // Status Badge Colors (Consistent Corporate Palette)
  const statusColors: Record<string, [number, number, number]> = {
    Completed: [16, 185, 129], // Emerald #10B981
    Processing: [14, 165, 233], // Ocean Blue #0EA5E9
    Initiating: [245, 158, 11], // Amber #F59E0B
    Planning: [148, 163, 184], // Slate #94A3B8
  };

  /* ═══════════════════════════════════════════════════════════════════
   *  DERIVED METRICS & DATE CALCULATIONS
   * ═══════════════════════════════════════════════════════════════════ */
  const projectStart = parseProjectDate(projectInfo.startDate);
  const timelineEnd = getTimelineEndDate(projectInfo, tasks);
  const calendarDays = getCalendarDays(projectStart, timelineEnd);

  const counts = {
    completed: tasks.filter((t) => t.status === "Completed").length,
    processing: tasks.filter((t) => t.status === "Processing").length,
    initiating: tasks.filter((t) => t.status === "Initiating").length,
    planning: tasks.filter((t) => t.status === "Planning").length,
    total: tasks.length,
  };

  const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
  const progress =
    counts.total > 0
      ? Math.round((tasks.reduce((s, t) => s + (weights[t.status] || 0), 0) / counts.total) * 100)
      : 0;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const now = new Date();
  const todayIndex = calendarDays.findIndex(
    (d) =>
      d.date.getFullYear() === now.getFullYear() &&
      d.date.getMonth() === now.getMonth() &&
      d.date.getDate() === now.getDate()
  );

  /* ═══════════════════════════════════════════════════════════════════
   *  BRAND ASSETS & MEDIA PRE-FETCH
   * ═══════════════════════════════════════════════════════════════════ */
  let logoData: string | null = null;
  if (branding?.logo_url) {
    try {
      logoData = await loadImageAsBase64(branding.logo_url);
    } catch {
      /* fallback */
    }
  }
  if (!logoData) {
    try {
      logoData = await loadImageAsBase64(fabulouzzLogoLight);
    } catch {
      /* fallback to text */
    }
  }

  const hasCustomBranding = Boolean(branding?.company_name);
  const brandLabel = hasCustomBranding
    ? branding!.company_name.toUpperCase()
    : "FABULOUZZ TECHNOLOGIES";
  const subLabel = hasCustomBranding
    ? branding!.tagline || "Project Intelligence Center"
    : "SIGHTLINE ENTERPRISE COMMAND";

  const videoExts = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".ogg"];
  const isVideoUrl = (url: string) => videoExts.some((ext) => url.toLowerCase().split("?")[0].endsWith(ext));

  const mediaCache: Record<string, string> = {};
  for (const n of notifications) {
    if (!n.media_url) continue;
    let urls: string[] = [];
    try {
      const p = JSON.parse(n.media_url);
      if (Array.isArray(p)) urls = p;
    } catch {
      urls = [n.media_url];
    }
    for (const url of urls) {
      if (isVideoUrl(url)) continue;
      try {
        mediaCache[url] = await loadImageAsBase64(url, 300, true);
      } catch {
        /* skip broken image */
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  DRAWING HELPER FUNCTIONS
   * ═══════════════════════════════════════════════════════════════════ */
  const drawSectionHeader = (d: any, title: string, yPos: number, pWidth: number, tag = "") => {
    d.setFillColor(...cAccent);
    d.roundedRect(margin, yPos, 3, 5, 0.5, 0.5, "F");
    d.setTextColor(...cTextPrimary);
    d.setFontSize(8.5);
    d.setFont("helvetica", "bold");
    d.text(title, margin + 5, yPos + 4);

    if (tag) {
      d.setTextColor(...cTextMuted);
      d.setFontSize(6.5);
      d.setFont("helvetica", "normal");
      d.text(tag, pWidth - margin, yPos + 4, { align: "right" });
    }

    d.setDrawColor(...cBorder);
    d.setLineWidth(0.25);
    d.line(margin, yPos + 7, pWidth - margin, yPos + 7);
  };

  /* ═══════════════════════════════════════════════════════════════════
   *  PAGE 1: EXECUTIVE BRIEF & COMPLETE STAKEHOLDER DIRECTORY
   * ═══════════════════════════════════════════════════════════════════ */
  const p1Width = doc.internal.pageSize.getWidth();
  const p1Height = doc.internal.pageSize.getHeight();
  const p1UsableW = p1Width - margin * 2;

  // Clean background fill
  doc.setFillColor(...cWhite);
  doc.rect(0, 0, p1Width, p1Height, "F");

  let p1Y = 24; // Start below universal header

  // 1. HERO PROJECT BANNER CARD
  const heroCardH = 27;
  doc.setFillColor(...cCardBg);
  doc.roundedRect(margin, p1Y, p1UsableW, heroCardH, 2.5, 2.5, "F");
  doc.setDrawColor(...cBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, p1Y, p1UsableW, heroCardH, 2.5, 2.5, "S");

  // Emerald left accent bar
  doc.setFillColor(...cAccent);
  doc.roundedRect(margin, p1Y, 2.5, heroCardH, 1, 1, "F");

  // Ref Badge Pill
  doc.setFillColor(...cAccent);
  doc.roundedRect(margin + 6, p1Y + 3.5, 26, 4.2, 1.2, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text(projectInfo.projectRef || "PRJ-SIGHTLINE", margin + 19, p1Y + 6.6, { align: "center" });

  // Status Badge Pill
  doc.setFillColor(...cAccentLight);
  doc.roundedRect(margin + 34, p1Y + 3.5, 24, 4.2, 1.2, 1.2, "F");
  doc.setDrawColor(...cAccent);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin + 34, p1Y + 3.5, 24, 4.2, 1.2, 1.2, "S");
  doc.setTextColor(...cAccent);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("ACTIVE EXECUTION", margin + 46, p1Y + 6.5, { align: "center" });

  // Project Title
  doc.setTextColor(...cTextPrimary);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(projectInfo.title, p1UsableW - 14);
  doc.text(titleLines[0] || projectInfo.title, margin + 6, p1Y + 14);

  // Metadata Subtitle
  doc.setTextColor(...cTextSecondary);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Site: ${projectInfo.location || "Saudi Arabia"}  •  Contractor: ${projectInfo.company || "Fabulouzz Technologies"}  •  Duration: ${projectInfo.startDate} → ${projectInfo.endDate}`,
    margin + 6,
    p1Y + 21
  );

  p1Y += heroCardH + 5;

  // 2. 4 EXECUTIVE KPI SUMMARY CARDS
  const cardGap = 4;
  const kpiCardW = (p1UsableW - cardGap * 3) / 4;
  const kpiCardH = 22;

  const kpiItems = [
    {
      title: "OVERALL PROGRESS",
      value: `${progress}%`,
      subtitle: "Milestone-weighted",
      accent: cAccent,
    },
    {
      title: "DELIVERABLES",
      value: `${counts.completed}/${counts.total}`,
      subtitle: `${counts.processing + counts.initiating} Active in Flight`,
      accent: statusColors.Completed,
    },
    {
      title: "CALENDAR SCHEDULE",
      value: `${calendarDays.length} Days`,
      subtitle: `${counts.planning} Queued / Plan`,
      accent: statusColors.Processing,
    },
    {
      title: "EXECUTION HEALTH",
      value: "ON TRACK",
      subtitle: "Zero Critical Gate Blockers",
      accent: cAccent,
    },
  ];

  kpiItems.forEach((kpi, idx) => {
    const kx = margin + idx * (kpiCardW + cardGap);
    doc.setFillColor(...cCardBg);
    doc.roundedRect(kx, p1Y, kpiCardW, kpiCardH, 2, 2, "F");
    doc.setDrawColor(...cBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(kx, p1Y, kpiCardW, kpiCardH, 2, 2, "S");

    // Top color strip
    doc.setFillColor(...kpi.accent);
    doc.roundedRect(kx, p1Y, kpiCardW, 1.8, 1, 1, "F");

    // Title
    doc.setTextColor(...cTextSecondary);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.title, kx + 4, p1Y + 6.5);

    // Value
    doc.setTextColor(...kpi.accent);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, kx + 4, p1Y + 14);

    // Subtitle
    doc.setTextColor(...cTextMuted);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.subtitle, kx + 4, p1Y + 19);
  });

  p1Y += kpiCardH + 6;

  // 3. DELIVERABLE STATUS DISTRIBUTION BAR
  drawSectionHeader(doc, "DELIVERABLE WORK DISTRIBUTION", p1Y, p1Width, `${counts.total} Work Packages`);
  p1Y += 10;

  const barH = 5.5;
  doc.setFillColor(...cWeekendBg);
  doc.roundedRect(margin, p1Y, p1UsableW, barH, 1.5, 1.5, "F");

  const segments = [
    { count: counts.completed, color: statusColors.Completed, label: "Completed" },
    { count: counts.processing, color: statusColors.Processing, label: "Processing" },
    { count: counts.initiating, color: statusColors.Initiating, label: "Initiating" },
    { count: counts.planning, color: statusColors.Planning, label: "Planning" },
  ];

  let segX = margin;
  segments.forEach((seg, si) => {
    const w = counts.total > 0 ? (seg.count / counts.total) * p1UsableW : 0;
    if (w > 0) {
      doc.setFillColor(...seg.color);
      if (si === 0) doc.roundedRect(segX, p1Y, w, barH, 1.5, 1.5, "F");
      else if (si === segments.length - 1) doc.roundedRect(segX, p1Y, w, barH, 1.5, 1.5, "F");
      else doc.rect(segX, p1Y, w, barH, "F");

      if (w > 12) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.text(`${seg.count}`, segX + w / 2, p1Y + 3.8, { align: "center" });
      }
      segX += w;
    }
  });

  // Legend Row
  const legY = p1Y + barH + 4;
  let legX = margin;
  segments.forEach((seg) => {
    doc.setFillColor(...seg.color);
    doc.roundedRect(legX, legY - 2.2, 4, 3, 0.8, 0.8, "F");
    doc.setTextColor(...cTextSecondary);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    const pct = counts.total > 0 ? Math.round((seg.count / counts.total) * 100) : 0;
    doc.text(`${seg.label}: ${seg.count} (${pct}%)`, legX + 5.5, legY);
    legX += 45;
  });

  p1Y += barH + 9;

  // 4. COMPREHENSIVE STAKEHOLDER & CONTACT DIRECTORY (2 COLUMNS)
  drawSectionHeader(doc, "PROJECT GOVERNANCE & STAKEHOLDER DIRECTORY", p1Y, p1Width, "Authorized Contacts");
  p1Y += 10;

  const dirCardH = 60;
  doc.setFillColor(...cCardBg);
  doc.roundedRect(margin, p1Y, p1UsableW, dirCardH, 2.5, 2.5, "F");
  doc.setDrawColor(...cBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, p1Y, p1UsableW, dirCardH, 2.5, 2.5, "S");

  // Vertical dividing line
  const midX = margin + p1UsableW / 2;
  doc.setDrawColor(...cBorder);
  doc.setLineWidth(0.25);
  doc.line(midX, p1Y + 3, midX, p1Y + dirCardH - 3);

  // Left Column Header: Client Stakeholders
  doc.setFillColor(...cAccent);
  doc.rect(margin + 5, p1Y + 4, 2, 4, "F");
  doc.setTextColor(...cAccent);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT & PROJECT OWNER DIRECTORY", margin + 9, p1Y + 7.5);

  const clientDirItems = [
    ["Client Entity", projectInfo.client || "Owner / Principal"],
    ["Authorized Contact", projectInfo.clientContactPerson || projectInfo.reportingTo || "Client Representative"],
    ["Direct Phone / WhatsApp", projectInfo.clientContactPhone || "Direct Line on Record"],
    ["Executive Reporting Authority", projectInfo.reportingTo || "Project Steering Board"],
    ["Project Reference Number", projectInfo.projectRef || "SL-PRJ-001"],
  ];

  clientDirItems.forEach((item, idx) => {
    const iy = p1Y + 14 + idx * 9;
    doc.setTextColor(...cTextMuted);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(item[0], margin + 6, iy);
    doc.setTextColor(...cTextPrimary);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(item[1], margin + 6, iy + 4);
  });

  // Right Column Header: Executing Contractor & Engineering
  doc.setFillColor(...cAccent);
  doc.rect(midX + 5, p1Y + 4, 2, 4, "F");
  doc.setTextColor(...cAccent);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTING CONTRACTOR & ENGINEERING TEAM", midX + 9, p1Y + 7.5);

  const contractorDirItems = [
    ["Executing Contractor", projectInfo.company || "Fabulouzz Technologies"],
    ["Authorized Contractor Contact", projectInfo.contractorContactPerson || projectInfo.projectManager || "Site Representative"],
    ["Direct Phone / WhatsApp", projectInfo.contractorContactPhone || "Direct Line on Record"],
    ["General Project Manager", projectInfo.projectManager || "PM in Charge"],
    ["Lead Project Engineer", projectInfo.projectEngineer || "Lead Project Engineer"],
  ];

  contractorDirItems.forEach((item, idx) => {
    const iy = p1Y + 14 + idx * 9;
    doc.setTextColor(...cTextMuted);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(item[0], midX + 6, iy);
    doc.setTextColor(...cTextPrimary);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(item[1], midX + 6, iy + 4);
  });

  p1Y += dirCardH + 6;

  // 5. EXECUTIVE AUDIT & COMPLIANCE SUMMARY NOTE
  const briefCardH = 34;
  doc.setFillColor(...cCardBg);
  doc.roundedRect(margin, p1Y, p1UsableW, briefCardH, 2.5, 2.5, "F");
  doc.setDrawColor(...cBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, p1Y, p1UsableW, briefCardH, 2.5, 2.5, "S");

  doc.setTextColor(...cAccent);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE COMPLIANCE & ENGINEERING VERIFICATION AUDIT", margin + 6, p1Y + 6);

  doc.setTextColor(...cTextSecondary);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  const briefText =
    `This official project intelligence digest confirms that project activities for "${projectInfo.title}" ` +
    `remain in accordance with contractual milestones, site engineering specifications, and quality benchmarks. ` +
    `Total planned timeline spans ${calendarDays.length} calendar days with ${counts.completed} deliverables verified complete and ` +
    `${counts.processing + counts.initiating} deliverables in active progress. Field safety, site inspections, and live telemetry updates ` +
    `are monitored in real-time under executive governance.`;
  const briefLines = doc.splitTextToSize(briefText, p1UsableW - 12);
  doc.text(briefLines, margin + 6, p1Y + 12);

  // Bottom stamp note
  doc.setTextColor(...cTextMuted);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(
    `AUDIT REF: SL-AUDIT-${new Date().getFullYear()}-${projectInfo.projectRef || "PRJ"}  •  STATUS: VERIFIED  •  OFFICIAL PROJECT TELEMETRY`,
    margin + 6,
    p1Y + 29
  );

  /* ═══════════════════════════════════════════════════════════════════
   *  PAGE 2: DELIVERABLES WORK BREAKDOWN STRUCTURE & PHASE GATES
   * ═══════════════════════════════════════════════════════════════════ */
  doc.addPage();
  const p2Width = doc.internal.pageSize.getWidth();
  const p2Height = doc.internal.pageSize.getHeight();
  const p2UsableW = p2Width - margin * 2;

  doc.setFillColor(...cWhite);
  doc.rect(0, 0, p2Width, p2Height, "F");

  let p2Y = 24;

  // Section 1: Deliverables WBS Table
  drawSectionHeader(doc, "DELIVERABLE WORK BREAKDOWN STRUCTURE (WBS)", p2Y, p2Width, `${tasks.length} Deliverable Items`);
  p2Y += 9;

  // Compute table data
  const tableData = tasks.map((t, idx) => {
    const range = getTaskDateRange(projectStart, t.startDay, t.duration);
    const depStr =
      t.dependencies && t.dependencies.length > 0
        ? t.dependencies.map((d) => `#${String(d).padStart(2, "0")}`).join(", ")
        : "None";
    return [
      String(idx + 1).padStart(2, "0"),
      t.name,
      t.description || "Detailed scope executed according to approved engineering drawings.",
      t.status,
      formatTimelineDate(range.start, true),
      formatTimelineDate(range.end, true),
      `${t.duration}d`,
      depStr,
    ];
  });

  autoTable(doc, {
    startY: p2Y,
    margin: { left: margin, right: margin },
    head: [["#", "Scope of Work", "Description", "Status", "Planned Start", "Planned Due", "Duration", "Dependencies"]],
    body: tableData,
    theme: "plain",
    styles: {
      fillColor: cWhite,
      textColor: cTextPrimary,
      fontSize: 6.2,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2 },
      lineColor: cBorder,
      lineWidth: 0.2,
      font: "helvetica",
    },
    headStyles: {
      fillColor: cCardBg,
      textColor: cTextPrimary,
      fontStyle: "bold",
      fontSize: 6.2,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2 },
      lineColor: cBorder,
      lineWidth: 0.25,
    },
    alternateRowStyles: { fillColor: cAltRow },
    columnStyles: {
      0: { cellWidth: 7, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 34, fontStyle: "bold" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 12, halign: "center" },
      7: { cellWidth: 16, halign: "center" },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 3) {
        const status = data.cell.raw as string;
        if (statusColors[status]) {
          data.cell.styles.textColor = statusColors[status];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  /* ═══════════════════════════════════════════════════════════════════
   *  PAGE 3: LIVE FIELD BROADCASTS & TELEMETRY LOG
   * ═══════════════════════════════════════════════════════════════════ */
  doc.addPage();
  const p3Width = doc.internal.pageSize.getWidth();
  const p3Height = doc.internal.pageSize.getHeight();
  const p3UsableW = p3Width - margin * 2;

  doc.setFillColor(...cWhite);
  doc.rect(0, 0, p3Width, p3Height, "F");

  let p3Y = 24;
  drawSectionHeader(
    doc,
    "LIVE FIELD BROADCASTS & SITE TELEMETRY LOG",
    p3Y,
    p3Width,
    `${notifications.length} Total Dispatched Bulletins`
  );
  p3Y += 10;

  if (notifications.length === 0) {
    doc.setFillColor(...cCardBg);
    doc.roundedRect(margin, p3Y, p3UsableW, 30, 2.5, 2.5, "F");
    doc.setDrawColor(...cBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, p3Y, p3UsableW, 30, 2.5, 2.5, "S");

    doc.setTextColor(...cAccent);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("ALL FIELD OPERATIONS PROCEEDING NORMALLY", margin + 8, p3Y + 12);

    doc.setTextColor(...cTextSecondary);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      "No critical safety advisories, high-priority weather stoppages, or milestone deviations have been recorded for this site.",
      margin + 8,
      p3Y + 19
    );
  } else {
    for (const n of notifications.slice(0, 10)) {
      if (p3Y > p3Height - 48) {
        doc.addPage();
        doc.setFillColor(...cWhite);
        doc.rect(0, 0, p3Width, p3Height, "F");
        p3Y = 24;
        drawSectionHeader(
          doc,
          "LIVE FIELD BROADCASTS & SITE TELEMETRY LOG (CONT.)",
          p3Y,
          p3Width,
          "Page Continuation"
        );
        p3Y += 10;
      }

      let mediaUrls: string[] = [];
      if (n.media_url) {
        try {
          const p = JSON.parse(n.media_url);
          if (Array.isArray(p)) mediaUrls = p;
        } catch {
          mediaUrls = [n.media_url];
        }
      }
      const imageUrls = mediaUrls.filter((u) => !isVideoUrl(u));
      const loadedImages = imageUrls.filter((u) => mediaCache[u]);

      const msgLines = doc.splitTextToSize(n.message, p3UsableW - 16);
      const textH = msgLines.length * 3.8;
      const imgH = loadedImages.length > 0 ? 24 : 0;
      const cardHeight = Math.max(16, textH + imgH + 12);

      doc.setFillColor(...cCardBg);
      doc.roundedRect(margin, p3Y, p3UsableW, cardHeight, 2, 2, "F");
      doc.setDrawColor(...cBorder);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, p3Y, p3UsableW, cardHeight, 2, 2, "S");

      // Left Accent Ribbon
      const isSafety = n.type === "safety";
      const isMilestone = n.type === "milestone";
      const badgeAccent = isSafety ? [239, 68, 68] : isMilestone ? cAccent : statusColors.Processing;
      doc.setFillColor(...(badgeAccent as [number, number, number]));
      doc.roundedRect(margin, p3Y, 2.5, cardHeight, 1, 1, "F");

      // Category Pill
      doc.setFillColor(...(badgeAccent as [number, number, number]));
      doc.roundedRect(margin + 6, p3Y + 3, 22, 4.2, 1.2, 1.2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(4.8);
      doc.setFont("helvetica", "bold");
      const categoryLabel = isSafety
        ? "SITE SAFETY"
        : isMilestone
        ? "MILESTONE"
        : n.type.toUpperCase().replace("_", " ");
      doc.text(categoryLabel, margin + 17, p3Y + 5.8, { align: "center" });

      // Timestamp
      const dateStr = new Date(n.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.setTextColor(...cTextMuted);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(dateStr, p3Width - margin - 4, p3Y + 5.8, { align: "right" });

      // Message text
      doc.setTextColor(...cTextPrimary);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(msgLines, margin + 6, p3Y + 11);

      // Attached Photos
      if (loadedImages.length > 0) {
        let imgX = margin + 6;
        const imgY = p3Y + 10 + textH;
        const imgSize = 21;
        const imgGap = 3;

        for (const url of loadedImages.slice(0, 6)) {
          if (imgX + imgSize > p3Width - margin - 6) break;
          try {
            doc.addImage(mediaCache[url], "JPEG", imgX, imgY, imgSize, imgSize);
            doc.setDrawColor(...cBorderDark);
            doc.setLineWidth(0.25);
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 1.2, 1.2, "S");
          } catch {
            /* skip */
          }
          imgX += imgSize + imgGap;
        }

        doc.setTextColor(...cTextMuted);
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${loadedImages.length} attached photo${loadedImages.length !== 1 ? "s" : ""}`,
          p3Width - margin - 4,
          p3Y + cardHeight - 2.5,
          { align: "right" }
        );
      }

      p3Y += cardHeight + 4;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  PAGE 4: MASTER TIMELINE GANTT CHART (LANDSCAPE A4)
   * ═══════════════════════════════════════════════════════════════════ */
  doc.addPage("a4", "landscape");
  const lw = doc.internal.pageSize.getWidth(); // 297 mm
  const lh = doc.internal.pageSize.getHeight(); // 210 mm
  const lMargin = 12;

  doc.setFillColor(...cWhite);
  doc.rect(0, 0, lw, lh, "F");

  const ganttTop = 22;
  const labelWidth = 84;
  const ganttLeft = labelWidth + lMargin + 4;
  const ganttRight = lw - lMargin;
  const ganttWidth = ganttRight - ganttLeft;
  const totalDays = calendarDays.length;
  const dayWidth = ganttWidth / totalDays;
  const headerHeight = 11;
  const rowHeight = Math.min(7.2, (lh - ganttTop - 34) / (tasks.length + 1));
  const ganttBodyHeight = tasks.length * rowHeight;

  // Day header background
  doc.setFillColor(...cCardBg);
  doc.rect(ganttLeft, ganttTop, ganttWidth, headerHeight, "F");
  doc.setDrawColor(...cBorder);
  doc.setLineWidth(0.2);
  doc.rect(ganttLeft, ganttTop, ganttWidth, headerHeight, "S");

  // Task list header block (Left side)
  doc.setFillColor(...cCardBg);
  doc.rect(lMargin, ganttTop, labelWidth + 4, headerHeight, "F");
  doc.setDrawColor(...cBorder);
  doc.setLineWidth(0.2);
  doc.rect(lMargin, ganttTop, labelWidth + 4, headerHeight, "S");

  doc.setTextColor(...cTextPrimary);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("DELIVERABLE SCOPE", lMargin + 4, ganttTop + 6.5);

  // Month labels & Day numbers
  let lastMonth = -1;
  calendarDays.forEach((day, i) => {
    const x = ganttLeft + i * dayWidth;
    const month = day.date.getMonth();
    const isToday = i === todayIndex;

    // Month group title
    if (month !== lastMonth) {
      doc.setTextColor(...cAccent);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      const monthName = day.date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      doc.text(monthName, x + 1, ganttTop + 4);
      lastMonth = month;
    }

    // Saudi Weekend Shading (Friday & Saturday)
    if (day.isWeekend) {
      doc.setFillColor(...cWeekendBg);
      doc.rect(x, ganttTop + headerHeight, dayWidth, ganttBodyHeight, "F");
    }

    // Today Column Tint
    if (isToday) {
      doc.setFillColor(6, 95, 70);
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
      doc.rect(x, ganttTop, dayWidth, headerHeight + ganttBodyHeight, "F");
      doc.restoreGraphicsState();
    }

    // Day label
    doc.setTextColor(...(isToday ? cAccent : day.isWeekend ? cTextMuted : cTextSecondary));
    doc.setFontSize(4.5);
    doc.setFont("helvetica", isToday ? "bold" : "normal");
    doc.text(day.label, x + dayWidth / 2, ganttTop + 9.5, { align: "center" });

    // Vertical gridline
    doc.setDrawColor(...cBorder);
    doc.setLineWidth(0.1);
    doc.line(x, ganttTop + headerHeight, x, ganttTop + headerHeight + ganttBodyHeight);
  });

  // Today marker vertical line
  if (todayIndex >= 0) {
    const todayX = ganttLeft + todayIndex * dayWidth + dayWidth / 2;
    doc.setDrawColor(...cAccent);
    doc.setLineWidth(0.45);
    doc.line(todayX, ganttTop, todayX, ganttTop + headerHeight + ganttBodyHeight);

    // Today pill tag
    doc.setFillColor(...cAccent);
    doc.roundedRect(todayX - 5, ganttTop - 3.8, 10, 3.8, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(3.8);
    doc.setFont("helvetica", "bold");
    doc.text("TODAY", todayX, ganttTop - 1.2, { align: "center" });
  }

  // Task rows
  tasks.forEach((task, i) => {
    const ry = ganttTop + headerHeight + i * rowHeight;

    // Alternating background
    if (i % 2 === 0) {
      doc.setFillColor(...cAltRow);
      doc.rect(lMargin, ry, lw - lMargin * 2, rowHeight, "F");
    }

    // Horizontal gridline
    doc.setDrawColor(...cBorder);
    doc.setLineWidth(0.12);
    doc.line(lMargin, ry + rowHeight, lw - lMargin, ry + rowHeight);

    // Left task label
    doc.setTextColor(...cTextPrimary);
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "bold");
    const nameStr = `${String(task.id).padStart(2, "0")}. ${task.name}`;
    doc.text(nameStr.length > 42 ? `${nameStr.slice(0, 42)}...` : nameStr, lMargin + 3, ry + rowHeight / 2 + 1.5);

    // Duration pill
    doc.setTextColor(...cTextMuted);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(`${task.duration}d`, lMargin + labelWidth, ry + rowHeight / 2 + 1.5, { align: "right" });

    // Gantt bar
    const barStartX = ganttLeft + task.startDay * dayWidth;
    const barWidth = Math.max(dayWidth * task.duration, 2);
    const barH = rowHeight * 0.55;
    const barY = ry + (rowHeight - barH) / 2;
    const taskColor = statusColors[task.status] || statusColors.Planning;

    doc.setFillColor(...taskColor);
    doc.roundedRect(barStartX, barY, barWidth, barH, 1, 1, "F");

    // Bar label if wide enough
    if (barWidth > 14) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(4.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${task.duration}d`, barStartX + barWidth / 2, barY + barH / 2 + 1.2, { align: "center" });
    }
  });

  // Gantt Legend Row at bottom
  const gLegY = ganttTop + headerHeight + ganttBodyHeight + 5;
  let gLegX = lMargin;

  const ganttLegendItems = [
    { label: "Completed", color: statusColors.Completed },
    { label: "Processing (Active)", color: statusColors.Processing },
    { label: "Initiating (Ramp-up)", color: statusColors.Initiating },
    { label: "Planning (Queued)", color: statusColors.Planning },
    { label: "Saudi Weekend (Fri-Sat)", color: cWeekendBg, border: true },
    { label: "Today Line", color: cAccent, isLine: true },
  ];

  ganttLegendItems.forEach((item) => {
    if (item.isLine) {
      doc.setDrawColor(...item.color);
      doc.setLineWidth(0.8);
      doc.line(gLegX, gLegY - 0.5, gLegX + 5, gLegY - 0.5);
    } else {
      doc.setFillColor(...item.color);
      doc.roundedRect(gLegX, gLegY - 2.5, 4.5, 3.2, 0.8, 0.8, "F");
      if (item.border) {
        doc.setDrawColor(...cBorderDark);
        doc.setLineWidth(0.2);
        doc.roundedRect(gLegX, gLegY - 2.5, 4.5, 3.2, 0.8, 0.8, "S");
      }
    }
    doc.setTextColor(...cTextSecondary);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, gLegX + 6, gLegY);
    gLegX += 42;
  });

  /* ═══════════════════════════════════════════════════════════════════
   *  PASS 2: STAMP UNIVERSAL HEADER & FOOTER ON ALL PAGES
   * ═══════════════════════════════════════════════════════════════════ */
  const totalPages = doc.getNumberOfPages();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const isLandscape = pw > ph;
    const pageMargin = isLandscape ? 12 : 14;

    // ── 1. UNIVERSAL HEADER ──
    // Top Emerald Accent Ribbon
    doc.setFillColor(...cAccent);
    doc.rect(0, 0, pw, 1.6, "F");

    // Header Background Bar
    const headH = isLandscape ? 14 : 17;
    doc.setFillColor(...cCardBg);
    doc.rect(0, 1.6, pw, headH, "F");

    // Hairline divider
    doc.setDrawColor(...cBorder);
    doc.setLineWidth(0.25);
    doc.line(0, 1.6 + headH, pw, 1.6 + headH);

    // Left: Logo or Brand Title
    if (logoData) {
      doc.addImage(logoData, "PNG", pageMargin, 3.2, 34, 10.5);
    } else {
      doc.setTextColor(...cTextPrimary);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(brandLabel, pageMargin, 8);
      doc.setTextColor(...cTextSecondary);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(subLabel, pageMargin, 12);
    }

    // Center: Report Title
    doc.setTextColor(...cAccent);
    doc.setFontSize(isLandscape ? 8 : 8.5);
    doc.setFont("helvetica", "bold");
    doc.text("PROJECT EXECUTIVE INTELLIGENCE REPORT", pw / 2, isLandscape ? 7.5 : 8, {
      align: "center",
    });
    doc.setTextColor(...cTextMuted);
    doc.setFontSize(isLandscape ? 5.5 : 6);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL AUDIT & EXECUTION TELEMETRY", pw / 2, isLandscape ? 11.5 : 12.5, {
      align: "center",
    });

    // Right: Ref, Date, and Security Tag
    doc.setTextColor(...cTextPrimary);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`REF: ${projectInfo.projectRef || "SL-PRJ"}`, pw - pageMargin, isLandscape ? 7.5 : 8, {
      align: "right",
    });
    doc.setTextColor(...cTextSecondary);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(`DATE: ${today}`, pw - pageMargin, isLandscape ? 11.5 : 12.5, { align: "right" });

    // ── 2. UNIVERSAL FOOTER ──
    const footH = 10;
    const footY = ph - footH;

    doc.setFillColor(...cCardBg);
    doc.rect(0, footY, pw, footH, "F");
    doc.setDrawColor(...cBorder);
    doc.setLineWidth(0.25);
    doc.line(0, footY, pw, footY);

    // Left: Confidentiality Notice
    doc.setTextColor(...cTextSecondary);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    const footerNotice = hasCustomBranding
      ? `${branding!.company_name}  •  CONFIDENTIAL & PROPRIETARY`
      : "FABULOUZZ SIGHTLINE ENTERPRISE  •  STRICTLY CONFIDENTIAL";
    doc.text(footerNotice, pageMargin, ph - 4);

    // Center: System tag
    doc.setTextColor(...cTextMuted);
    doc.setFontSize(5);
    doc.text("SightLine Executive Reporting Engine  •  Uncontrolled when printed", pw / 2, ph - 4, {
      align: "center",
    });

    // Right: Page Count
    doc.setTextColor(...cTextPrimary);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(`Page ${pageNum} of ${totalPages}`, pw - pageMargin, ph - 4, { align: "right" });
  }

  const base64 = doc.output("datauristring");
  return { doc, base64 };
}
