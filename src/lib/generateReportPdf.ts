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
      resolve(asJpeg ? canvas.toDataURL("image/jpeg", 0.6) : canvas.toDataURL("image/png"));
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
  isDark: boolean;
  notifications?: NotificationData[];
  branding?: BrandingData | null;
}

export async function generateReportPdf({ tasks, projectInfo, isDark, notifications = [], branding = null }: ReportOptions): Promise<{ doc: any; base64: string }> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  /* ── Color palette ── */
  const brandGreen: [number, number, number] = [47, 191, 47];
  const bgColor: [number, number, number] = isDark ? [15, 15, 22] : [255, 255, 255];
  const cardBg: [number, number, number] = isDark ? [24, 24, 34] : [247, 247, 250];
  const cardBgAlt: [number, number, number] = isDark ? [20, 20, 28] : [252, 252, 254];
  const textPrimary: [number, number, number] = isDark ? [240, 240, 245] : [25, 25, 35];
  const textSecondary: [number, number, number] = isDark ? [140, 140, 155] : [110, 110, 120];
  const altRow: [number, number, number] = isDark ? [20, 20, 28] : [250, 250, 253];
  const gridLine: [number, number, number] = isDark ? [40, 40, 55] : [225, 225, 235];
  const weekendBg: [number, number, number] = isDark ? [22, 22, 32] : [242, 242, 247];
  const divider: [number, number, number] = isDark ? [50, 50, 65] : [210, 210, 220];

  const statusColors: Record<string, [number, number, number]> = {
    Completed: [34, 197, 94],
    Processing: [59, 130, 246],
    Initiating: [251, 191, 36],
    Planning: [168, 162, 158],
  };

  /* ── Derived data ── */
  const projectStart = parseProjectDate(projectInfo.startDate);
  const timelineEnd = getTimelineEndDate(projectInfo, tasks);
  const calendarDays = getCalendarDays(projectStart, timelineEnd);

  const counts = {
    completed: tasks.filter(t => t.status === "Completed").length,
    processing: tasks.filter(t => t.status === "Processing").length,
    initiating: tasks.filter(t => t.status === "Initiating").length,
    planning: tasks.filter(t => t.status === "Planning").length,
    total: tasks.length,
  };

  const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
  const progress = counts.total > 0 ? Math.round((tasks.reduce((s, t) => s + (weights[t.status] || 0), 0) / counts.total) * 100) : 0;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const now = new Date();
  const todayIndex = calendarDays.findIndex(d =>
    d.date.getFullYear() === now.getFullYear() && d.date.getMonth() === now.getMonth() && d.date.getDate() === now.getDate()
  );

  /* ── Assets ── */
  let logoData: string | null = null;
  // If premium branding with custom logo, use that; otherwise default
  if (branding?.logo_url) {
    try { logoData = await loadImageAsBase64(branding.logo_url); } catch { /* fallback */ }
  }
  if (!logoData) {
    try { logoData = await loadImageAsBase64(isDark ? fabulouzzLogo : fabulouzzLogoLight); } catch { /* fallback text */ }
  }
  const hasCustomBranding = !!(branding?.company_name);
  const brandLabel = hasCustomBranding ? branding!.company_name.toUpperCase() : "FABULOUZZ TECHNOLOGIES";
  const subLabel = hasCustomBranding ? (branding!.tagline || "Project Command Center") : "SIGHTLINE Command Center";

  const videoExts = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".ogg"];
  const isVideoUrl = (url: string) => videoExts.some(ext => url.toLowerCase().split("?")[0].endsWith(ext));

  const mediaCache: Record<string, string> = {};
  for (const n of notifications) {
    if (!n.media_url) continue;
    let urls: string[] = [];
    try { const p = JSON.parse(n.media_url); if (Array.isArray(p)) urls = p; } catch { urls = [n.media_url]; }
    for (const url of urls) {
      if (isVideoUrl(url)) continue;
      try { mediaCache[url] = await loadImageAsBase64(url, 300, true); } catch { /* skip */ }
    }
  }

  const hasNotifications = notifications.length > 0;
  let totalPages = hasNotifications ? 4 : 3;

  /* ── Shared drawing helpers ── */
  const drawBg = (d: any, w: number, h: number) => { d.setFillColor(...bgColor); d.rect(0, 0, w, h, "F"); };

  const drawPageFooter = (d: any, pageNum: number, pw: number, ph: number) => {
    d.setFillColor(...cardBg);
    d.rect(0, ph - 12, pw, 12, "F");
    d.setFillColor(...brandGreen);
    d.rect(0, ph - 12, pw, 0.4, "F");
    d.setTextColor(...textSecondary);
    d.setFontSize(5.5);
    d.setFont("helvetica", "normal");
    const footerText = hasCustomBranding ? `${branding!.company_name}  •  Powered by SightLine` : "Powered by Fabulouzz Technologies  •  SightLine Project Command Center";
    d.text(footerText, margin, ph - 4.5);
    d.text(`Page ${pageNum} of ${totalPages}`, pw - margin, ph - 4.5, { align: "right" });
  };

  const drawPageHeader = (d: any, sectionTitle: string, pw: number) => {
    d.setFillColor(...cardBg);
    d.rect(0, 0, pw, 22, "F");
    d.setFillColor(...brandGreen);
    d.rect(0, 22, pw, 0.6, "F");
    if (logoData) d.addImage(logoData, "PNG", margin, 3, 38, 12);
    // Center-aligned section title
    d.setTextColor(...brandGreen);
    d.setFontSize(9);
    d.setFont("helvetica", "bold");
    d.text(sectionTitle, pw / 2, 10, { align: "center" });
    // Right-aligned project ref
    d.setTextColor(...textSecondary);
    d.setFontSize(6.5);
    d.setFont("helvetica", "normal");
    d.text(projectInfo.projectRef, pw - margin, 16, { align: "right" });
  };

  const drawSectionTitle = (d: any, title: string, y: number, pw: number) => {
    d.setTextColor(...brandGreen);
    d.setFontSize(9);
    d.setFont("helvetica", "bold");
    d.text(title, margin, y);
    d.setDrawColor(...brandGreen);
    d.setLineWidth(0.3);
    d.line(margin, y + 1.5, pw - margin, y + 1.5);
  };

  /* ════════════════════════════════════════════════════
   *  PAGE 1 — COVER PAGE
   * ════════════════════════════════════════════════════ */
  drawBg(doc, pageWidth, pageHeight);

  // Corner accents
  doc.setDrawColor(...brandGreen);
  doc.setLineWidth(0.6);
  doc.line(margin, 22, margin + 30, 22);
  doc.line(margin, 22, margin, 52);
  doc.line(pageWidth - margin, pageHeight - 36, pageWidth - margin - 30, pageHeight - 36);
  doc.line(pageWidth - margin, pageHeight - 36, pageWidth - margin, pageHeight - 66);

  // Logo & branding — all center-aligned
  if (logoData) {
    doc.addImage(logoData, "PNG", pageWidth / 2 - 40, 44, 80, 25);
  } else {
    doc.setTextColor(...brandGreen);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(brandLabel, pageWidth / 2, 62, { align: "center" });
  }

  // Sub-label — centered
  doc.setTextColor(...brandGreen);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(subLabel, pageWidth / 2, logoData ? 80 : 76, { align: "center" });

  // Divider — centered
  const dividerY = logoData ? 86 : 82;
  doc.setFillColor(...brandGreen);
  doc.rect(pageWidth / 2 - 30, dividerY, 60, 0.6, "F");

  // PROJECT STATUS REPORT — manually centered (charSpace breaks align:"center")
  doc.setTextColor(...brandGreen);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const reportLabel = "PROJECT STATUS REPORT";
  const charSp = 2.5;
  const labelBaseWidth = doc.getTextWidth(reportLabel);
  const labelTotalWidth = labelBaseWidth + charSp * (reportLabel.length - 1);
  const labelX = (pageWidth - labelTotalWidth) / 2;
  doc.text(reportLabel, labelX, dividerY + 10, { charSpace: charSp });

  // Project title — centered
  const titleY = dividerY + 24;
  doc.setTextColor(...textPrimary);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(projectInfo.title, pageWidth - 56);
  doc.text(titleLines, pageWidth / 2, titleY, { align: "center" });

  const afterTitle = titleY + titleLines.length * 8 + 4;
  doc.setTextColor(...textSecondary);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${projectInfo.client}  •  ${projectInfo.location}`, pageWidth / 2, afterTitle, { align: "center" });

  // Summary metric cards
  const cardY = afterTitle + 16;
  const cardGap = 5;
  const cardW = (pageWidth - margin * 2 - cardGap * 3) / 4;
  const cardH = 30;

  const summaryCards = [
    { label: "OVERALL PROGRESS", value: `${progress}%`, color: brandGreen },
    { label: "COMPLETED", value: `${counts.completed}`, color: statusColors.Completed },
    { label: "IN PROGRESS", value: `${counts.processing + counts.initiating}`, color: statusColors.Processing },
    { label: "PLANNING", value: `${counts.planning}`, color: statusColors.Planning },
  ];

  summaryCards.forEach((card, i) => {
    const cx = margin + i * (cardW + cardGap);
    doc.setFillColor(...cardBg);
    doc.roundedRect(cx, cardY, cardW, cardH, 2.5, 2.5, "F");
    doc.setFillColor(...card.color);
    doc.roundedRect(cx, cardY, cardW, 2, 2.5, 2.5, "F");
    doc.rect(cx, cardY + 1, cardW, 1, "F"); // clean bottom of top accent
    doc.setTextColor(...card.color);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, cx + cardW / 2, cardY + 15, { align: "center" });
    doc.setTextColor(...textSecondary);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text(card.label, cx + cardW / 2, cardY + 23, { align: "center" });
  });

  // Project details card
  const detY = cardY + cardH + 14;
  const detH = 50;
  doc.setFillColor(...cardBg);
  doc.roundedRect(margin + 10, detY, pageWidth - margin * 2 - 20, detH, 2.5, 2.5, "F");
  doc.setFillColor(...brandGreen);
  doc.rect(margin + 10, detY, 2, detH, "F");

  const coverDetails = [
    ["Project Ref", projectInfo.projectRef],
    ["Project Manager", projectInfo.projectManager],
    ["Reporting To", projectInfo.reportingTo],
    ["Project Engineer", projectInfo.projectEngineer],
    ["Duration", `${projectInfo.startDate}  →  ${projectInfo.endDate}`],
    ["Report Date", today],
  ];

  coverDetails.forEach((item, i) => {
    const dy = detY + 8 + i * 6.8;
    doc.setTextColor(...textSecondary);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${item[0]}:`, margin + 18, dy);
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text(item[1], margin + 56, dy);
  });

  // Status distribution bar
  const barY = detY + detH + 12;
  drawSectionTitle(doc, "STATUS DISTRIBUTION", barY, pageWidth);

  const barTop = barY + 6;
  const barW = pageWidth - margin * 2;
  const barH = 6;
  const segments = [
    { count: counts.completed, color: statusColors.Completed, label: "Completed" },
    { count: counts.processing, color: statusColors.Processing, label: "Processing" },
    { count: counts.initiating, color: statusColors.Initiating, label: "Initiating" },
    { count: counts.planning, color: statusColors.Planning, label: "Planning" },
  ];

  // Bar background
  doc.setFillColor(...cardBg);
  doc.roundedRect(margin, barTop, barW, barH, 2, 2, "F");

  let segX = margin;
  segments.forEach((seg, si) => {
    const w = (seg.count / counts.total) * barW;
    if (w > 0) {
      doc.setFillColor(...seg.color);
      if (si === 0) doc.roundedRect(segX, barTop, w, barH, 2, 2, "F");
      else if (si === segments.length - 1) doc.roundedRect(segX, barTop, w, barH, 2, 2, "F");
      else doc.rect(segX, barTop, w, barH, "F");
      if (w > 12) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.text(`${seg.count}`, segX + w / 2, barTop + 4, { align: "center" });
      }
      segX += w;
    }
  });

  // Legend
  const legY = barTop + barH + 5;
  let legX = margin;
  segments.forEach(seg => {
    doc.setFillColor(...seg.color);
    doc.roundedRect(legX, legY - 2, 4, 3, 0.8, 0.8, "F");
    doc.setTextColor(...textSecondary);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(`${seg.label} (${seg.count})`, legX + 6, legY + 0.2);
    legX += 40;
  });

  // Stats bar
  const statsY = legY + 8;
  doc.setFillColor(...cardBg);
  doc.roundedRect(margin, statsY, barW, 10, 2, 2, "F");
  const activeTasks = tasks.filter(t => t.status === "Processing" || t.status === "Initiating");
  const liveUpdates = notifications.filter(n => n.type === "live_update");
  const statusUpdates = notifications.filter(n => n.type === "status_update");

  const statsItems = [
    `Total Tasks: ${counts.total}`,
    `Active: ${activeTasks.length}`,
    `Live Updates: ${liveUpdates.length}`,
    `Status Updates: ${statusUpdates.length}`,
    `Media: ${notifications.reduce((sum, n) => { if (!n.media_url) return sum; try { const p = JSON.parse(n.media_url); return sum + (Array.isArray(p) ? p.length : 1); } catch { return sum + 1; } }, 0)} files`,
  ];
  const statW = barW / statsItems.length;
  statsItems.forEach((s, i) => {
    doc.setTextColor(...textPrimary);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(s, margin + i * statW + statW / 2, statsY + 6.5, { align: "center" });
  });

  // Confidential
  doc.setTextColor(...textSecondary);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("CONFIDENTIAL — For authorized use only", pageWidth / 2, pageHeight - 18, { align: "center" });

  drawPageFooter(doc, 1, pageWidth, pageHeight);

  /* ════════════════════════════════════════════════════
   *  PAGE 2 — TASK BREAKDOWN
   * ════════════════════════════════════════════════════ */
  doc.addPage();
  drawBg(doc, pageWidth, pageHeight);
  drawPageHeader(doc, "TASK BREAKDOWN", pageWidth);

  let y = 28;

  // Project info card
  doc.setFillColor(...cardBg);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 2.5, 2.5, "F");
  doc.setFillColor(...brandGreen);
  doc.rect(margin, y, 2, 38, "F");

  doc.setTextColor(...brandGreen);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT INFORMATION", margin + 8, y + 7);

  const infoItems = [
    ["Project Manager", projectInfo.projectManager, "Reporting To", projectInfo.reportingTo],
    ["Project Engineer", projectInfo.projectEngineer, "Company", projectInfo.company],
    ["Client", projectInfo.client, "Location", projectInfo.location],
    ["Start Date", projectInfo.startDate, "End Date", projectInfo.endDate],
  ];

  const colLabel1 = margin + 8;
  const colVal1 = margin + 44;
  const colLabel2 = pageWidth / 2 + 4;
  const colVal2 = pageWidth / 2 + 40;

  infoItems.forEach((row, i) => {
    const iy = y + 14 + i * 6;
    doc.setTextColor(...textSecondary);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`${row[0]}:`, colLabel1, iy);
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], colVal1, iy);
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(`${row[2]}:`, colLabel2, iy);
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text(row[3], colVal2, iy);
  });

  y += 46;
  drawSectionTitle(doc, "TASK BREAKDOWN", y, pageWidth);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Task Name", "Status", "Start Date", "End Date", "Duration", "Dependencies"]],
    body: tasks.map(t => {
      const range = getTaskDateRange(projectStart, t.startDay, t.duration);
      return [
        String(t.id).padStart(2, "0"),
        t.name,
        t.status,
        formatTimelineDate(range.start, true),
        formatTimelineDate(range.end, true),
        `${t.duration}d`,
        t.dependencies && t.dependencies.length > 0 ? t.dependencies.map(d => `#${String(d).padStart(2, "0")}`).join(", ") : "—",
      ];
    }),
    theme: "plain",
    styles: {
      fillColor: bgColor,
      textColor: textPrimary,
      fontSize: 6.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2 },
      lineColor: gridLine,
      lineWidth: 0.15,
      font: "helvetica",
    },
    headStyles: {
      fillColor: cardBg,
      textColor: brandGreen,
      fontStyle: "bold",
      fontSize: 6.5,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2 },
    },
    alternateRowStyles: { fillColor: altRow },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 14, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 2) {
        const status = data.cell.raw as string;
        if (statusColors[status]) {
          data.cell.styles.textColor = statusColors[status];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  drawPageFooter(doc, 2, pageWidth, pageHeight);

  /* ════════════════════════════════════════════════════
   *  PAGE 3 — LIVE UPDATES & MEDIA (if any)
   * ════════════════════════════════════════════════════ */
  let currentPage = 3;
  if (hasNotifications) {
    doc.addPage();
    drawBg(doc, pageWidth, pageHeight);
    drawPageHeader(doc, "LIVE UPDATES & MEDIA", pageWidth);

    let uy = 28;
    drawSectionTitle(doc, "RECENT UPDATES & NOTIFICATIONS", uy, pageWidth);
    doc.setTextColor(...textSecondary);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${notifications.length} updates (${liveUpdates.length} live, ${statusUpdates.length} status) as of ${today}`, pageWidth - margin, uy, { align: "right" });
    uy += 8;

    for (const n of notifications) {
      if (uy > pageHeight - 45) {
        drawPageFooter(doc, currentPage, pageWidth, pageHeight);
        doc.addPage();
        totalPages++;
        currentPage++;
        drawBg(doc, pageWidth, pageHeight);
        drawPageHeader(doc, "LIVE UPDATES & MEDIA (CONT.)", pageWidth);
        uy = 28;
      }

      let mediaUrls: string[] = [];
      if (n.media_url) {
        try { const p = JSON.parse(n.media_url); if (Array.isArray(p)) mediaUrls = p; } catch { mediaUrls = [n.media_url]; }
      }
      const imageUrls = mediaUrls.filter(u => !isVideoUrl(u));
      const msgLines = doc.splitTextToSize(n.message, pageWidth - margin * 2 - 16);
      const textHeight = msgLines.length * 3.8;
      const loadedImages = imageUrls.filter(u => mediaCache[u]);
      const imageRows = Math.ceil(loadedImages.length / 5);
      const imageRowH = loadedImages.length > 0 ? imageRows * 24 : 0;
      const cardHeight = Math.max(16, textHeight + imageRowH + 12);

      doc.setFillColor(...cardBg);
      doc.roundedRect(margin, uy, pageWidth - margin * 2, cardHeight, 2.5, 2.5, "F");

      const isLiveUpdate = n.type === "live_update";
      const accentColor = isLiveUpdate ? brandGreen : statusColors.Processing;
      doc.setFillColor(...accentColor);
      doc.rect(margin, uy, 2, cardHeight, "F");

      // Type badge
      const badgeLabel = isLiveUpdate ? "LIVE UPDATE" : n.type.toUpperCase().replace("_", " ");
      doc.setFillColor(...accentColor);
      doc.roundedRect(margin + 6, uy + 2.5, 20, 4, 1.2, 1.2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(4.5);
      doc.setFont("helvetica", "bold");
      doc.text(badgeLabel, margin + 16, uy + 5.2, { align: "center" });

      // Timestamp
      const dateStr = new Date(n.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.setTextColor(...textSecondary);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(dateStr, pageWidth - margin - 4, uy + 5.2, { align: "right" });

      // Message
      doc.setTextColor(...textPrimary);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(msgLines, margin + 6, uy + 11);

      // Images grid
      if (loadedImages.length > 0) {
        let imgY = uy + 10 + textHeight;
        let imgX = margin + 6;
        const imgSize = 22;
        const imgGap = 2.5;

        for (const url of loadedImages) {
          if (imgX + imgSize > pageWidth - margin - 4) {
            imgX = margin + 6;
            imgY += imgSize + imgGap;
          }
          try {
            doc.addImage(mediaCache[url], "JPEG", imgX, imgY, imgSize, imgSize);
            doc.setDrawColor(...gridLine);
            doc.setLineWidth(0.2);
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 1.2, 1.2, "S");
          } catch { /* skip */ }
          imgX += imgSize + imgGap;
        }

        doc.setTextColor(...textSecondary);
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text(`${loadedImages.length} photo${loadedImages.length !== 1 ? "s" : ""}`, pageWidth - margin - 4, uy + cardHeight - 3, { align: "right" });
      }

      uy += cardHeight + 4;
    }

    drawPageFooter(doc, currentPage, pageWidth, pageHeight);
    currentPage++;
  }

  /* ════════════════════════════════════════════════════
   *  LAST PAGE — GANTT CHART TIMELINE (landscape)
   * ════════════════════════════════════════════════════ */
  doc.addPage("a4", "landscape");
  const lw = doc.internal.pageSize.getWidth();
  const lh = doc.internal.pageSize.getHeight();

  drawBg(doc, lw, lh);

  // Header
  doc.setFillColor(...cardBg);
  doc.rect(0, 0, lw, 18, "F");
  doc.setFillColor(...brandGreen);
  doc.rect(0, 18, lw, 0.6, "F");

  if (logoData) doc.addImage(logoData, "PNG", 10, 3, 34, 10);
  // Center-aligned title
  doc.setTextColor(...brandGreen);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT TIMELINE — GANTT CHART", lw / 2, 10, { align: "center" });
  // Right-aligned ref
  doc.setTextColor(...textSecondary);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(projectInfo.projectRef, lw - 10, 14, { align: "right" });

  const ganttTop = 24;
  const labelWidth = 88;
  const ganttLeft = labelWidth + 10;
  const ganttRight = lw - 8;
  const ganttWidth = ganttRight - ganttLeft;
  const totalDays = calendarDays.length;
  const dayWidth = ganttWidth / totalDays;
  const rowHeight = Math.min(7.5, (lh - ganttTop - 35) / (tasks.length + 2));
  const headerHeight = 12;
  const ganttBodyHeight = tasks.length * rowHeight;

  // Day headers bg
  doc.setFillColor(...cardBg);
  doc.rect(ganttLeft, ganttTop, ganttWidth, headerHeight, "F");

  // Month labels + day numbers
  let lastMonth = -1;
  calendarDays.forEach((day, i) => {
    const x = ganttLeft + i * dayWidth;
    const month = day.date.getMonth();
    const isToday = i === todayIndex;

    if (month !== lastMonth) {
      doc.setTextColor(...brandGreen);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      const monthName = day.date.toLocaleDateString("en-GB", { month: "short" });
      doc.text(monthName, x + 1, ganttTop + 4.5);
      lastMonth = month;
    }

    if (isToday) {
      doc.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      doc.setGState(doc.GState({ opacity: 0.15 }));
      doc.rect(x, ganttTop, dayWidth, headerHeight + ganttBodyHeight, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
    } else if (day.isWeekend) {
      doc.setFillColor(...weekendBg);
      doc.rect(x, ganttTop + headerHeight, dayWidth, ganttBodyHeight, "F");
    }

    if (isToday) {
      doc.setTextColor(...brandGreen);
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
    } else {
      const dim = day.isWeekend ? (isDark ? 75 : 170) : (isDark ? 130 : 105);
      doc.setTextColor(dim, dim, dim + 5);
      doc.setFontSize(4.5);
      doc.setFont("helvetica", "normal");
    }
    doc.text(day.label, x + dayWidth / 2, ganttTop + 10, { align: "center" });

    // Vertical gridlines
    doc.setDrawColor(...gridLine);
    doc.setLineWidth(0.1);
    doc.line(x, ganttTop + headerHeight, x, ganttTop + headerHeight + ganttBodyHeight);
  });

  // Today marker
  if (todayIndex >= 0) {
    const todayX = ganttLeft + todayIndex * dayWidth + dayWidth / 2;
    doc.setDrawColor(...brandGreen);
    doc.setLineWidth(0.5);
    const segLen = 2;
    const gapLen = 1.5;
    for (let sy = ganttTop; sy < ganttTop + headerHeight + ganttBodyHeight; sy += segLen + gapLen) {
      doc.line(todayX, sy, todayX, Math.min(sy + segLen, ganttTop + headerHeight + ganttBodyHeight));
    }
    doc.setFillColor(...brandGreen);
    doc.roundedRect(todayX - 5, ganttTop - 3.5, 10, 3.5, 1, 1, "F");
    doc.setTextColor(...(isDark ? [15, 15, 22] as [number, number, number] : [255, 255, 255] as [number, number, number]));
    doc.setFontSize(3.5);
    doc.setFont("helvetica", "bold");
    doc.text("TODAY", todayX, ganttTop - 0.8, { align: "center" });
  }

  // Header bottom line
  doc.setFillColor(...brandGreen);
  doc.rect(ganttLeft, ganttTop + headerHeight - 0.3, ganttWidth, 0.3, "F");

  // Task rows
  tasks.forEach((task, i) => {
    const ry = ganttTop + headerHeight + i * rowHeight;

    // Alternating row bg
    if (i % 2 === 0) {
      doc.setFillColor(...cardBgAlt);
      doc.rect(8, ry, ganttRight - 8, rowHeight, "F");
    }

    // Row divider
    doc.setDrawColor(...gridLine);
    doc.setLineWidth(0.08);
    doc.line(8, ry + rowHeight, ganttRight, ry + rowHeight);

    // Task number
    doc.setTextColor(...textSecondary);
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "bold");
    doc.text(String(task.id).padStart(2, "0"), 10, ry + rowHeight / 2 + 1.2);

    // Task name
    doc.setTextColor(...textPrimary);
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "normal");
    const maxNameW = labelWidth - 10;
    const nameLines = doc.splitTextToSize(task.name, maxNameW);
    const nameText = nameLines.length > 2 ? nameLines.slice(0, 2).join(" ").slice(0, 75) + "…" : nameLines.join(" ");
    doc.text(nameText, 18, ry + rowHeight / 2 + 1.2);

    // Gantt bar
    const barX = ganttLeft + task.startDay * dayWidth + 0.5;
    const barBW = task.duration * dayWidth - 1;
    const barYPos = ry + 1.8;
    const barBH = rowHeight - 3.6;
    const color = statusColors[task.status] || textSecondary;

    // Shadow
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setGState(doc.GState({ opacity: 0.2 }));
    doc.roundedRect(barX + 0.3, barYPos + 0.3, barBW, barBH, 1.2, 1.2, "F");
    doc.setGState(doc.GState({ opacity: 1 }));

    // Bar
    doc.setFillColor(...color);
    doc.roundedRect(barX, barYPos, barBW, barBH, 1.2, 1.2, "F");

    // Duration label on bar
    if (barBW > 12) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(3.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${task.duration}d`, barX + barBW / 2, barYPos + barBH / 2 + 1, { align: "center" });
    }
  });

  // Legend
  const legendY = ganttTop + headerHeight + ganttBodyHeight + 6;
  doc.setTextColor(...textSecondary);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("LEGEND:", 10, legendY);

  let legendX = 28;
  Object.entries(statusColors).forEach(([status, color]) => {
    doc.setFillColor(...color);
    doc.roundedRect(legendX, legendY - 2.5, 7, 3, 0.8, 0.8, "F");
    doc.setTextColor(...textPrimary);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(status, legendX + 9, legendY);
    legendX += 34;
  });

  doc.setFillColor(...brandGreen);
  doc.roundedRect(legendX, legendY - 2.5, 7, 3, 0.8, 0.8, "F");
  doc.setTextColor(...textPrimary);
  doc.setFontSize(5.5);
  doc.text("Today", legendX + 9, legendY);
  legendX += 28;

  doc.setTextColor(...textSecondary);
  doc.setFontSize(5);
  doc.text("Shaded columns = Weekends (Fri/Sat — Saudi calendar)", legendX + 8, legendY);

  // Timeline date range label
  doc.setTextColor(...textSecondary);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Timeline: ${formatTimelineDate(projectStart)} → ${formatTimelineDate(timelineEnd)}  (${totalDays} days)`,
    lw - 10,
    legendY,
    { align: "right" }
  );

  drawPageFooter(doc, currentPage, lw, lh);

  const base64 = doc.output("datauristring").split(",")[1];
  return { doc, base64 };
}
