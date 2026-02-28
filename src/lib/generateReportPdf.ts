import { type ProjectTask, type ProjectInfo, getCalendarDays } from "@/data/projectData";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
};

export interface ReportOptions {
  tasks: ProjectTask[];
  projectInfo: ProjectInfo;
  isDark: boolean;
}

export async function generateReportPdf({ tasks, projectInfo, isDark }: ReportOptions): Promise<{ doc: any; base64: string }> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const getStatusCounts = () => ({
    completed: tasks.filter(t => t.status === "Completed").length,
    processing: tasks.filter(t => t.status === "Processing").length,
    initiating: tasks.filter(t => t.status === "Initiating").length,
    planning: tasks.filter(t => t.status === "Planning").length,
    total: tasks.length,
  });

  const getOverallProgress = () => {
    const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
    const total = tasks.reduce((sum, t) => sum + (weights[t.status] || 0), 0);
    return Math.round((total / tasks.length) * 100);
  };

  const counts = getStatusCounts();
  const progress = getOverallProgress();
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const brandGreen: [number, number, number] = [47, 191, 47];
  const bgColor: [number, number, number] = isDark ? [18, 18, 24] : [255, 255, 255];
  const cardBgColor: [number, number, number] = isDark ? [28, 28, 38] : [245, 245, 248];
  const textPrimary: [number, number, number] = isDark ? [240, 240, 240] : [30, 30, 40];
  const textSecondary: [number, number, number] = isDark ? [160, 160, 170] : [100, 100, 110];
  const altRowColor: [number, number, number] = isDark ? [23, 23, 32] : [250, 250, 252];
  const gridLineColor: [number, number, number] = isDark ? [40, 40, 55] : [220, 220, 230];
  const weekendBg: [number, number, number] = isDark ? [25, 25, 35] : [240, 240, 245];
  const altGanttRow: [number, number, number] = isDark ? [22, 22, 30] : [248, 248, 252];

  const statusColors: Record<string, [number, number, number]> = {
    Completed: [34, 197, 94],
    Processing: [59, 130, 246],
    Initiating: [251, 191, 36],
    Planning: [168, 162, 158],
  };

  let logoData: string | null = null;
  try {
    logoData = await loadImageAsBase64(isDark ? fabulouzzLogo : fabulouzzLogoLight);
  } catch {
    // fallback to text
  }

  const calendarDays = getCalendarDays();
  const now = new Date();
  const todayIndex = calendarDays.findIndex(d =>
    d.date.getFullYear() === now.getFullYear() &&
    d.date.getMonth() === now.getMonth() &&
    d.date.getDate() === now.getDate()
  );

  const drawPageFooter = (doc: any, pageNum: number, totalPages: number, pw: number, ph: number) => {
    doc.setFillColor(...cardBgColor);
    doc.rect(0, ph - 14, pw, 14, "F");
    doc.setFillColor(...brandGreen);
    doc.rect(0, ph - 14, pw, 0.5, "F");
    doc.setTextColor(...textSecondary);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("Powered by Fabulouzz Technologies  •  SightLine Project Command Center", 14, ph - 5);
    doc.text(`Page ${pageNum} of ${totalPages}`, pw - 14, ph - 5, { align: "right" });
  };

  // PAGE 1 — COVER PAGE
  doc.setFillColor(...bgColor);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(...brandGreen);
  doc.setLineWidth(0.8);
  doc.line(14, 20, 50, 20);
  doc.line(14, 20, 14, 56);
  doc.line(pageWidth - 14, pageHeight - 40, pageWidth - 50, pageHeight - 40);
  doc.line(pageWidth - 14, pageHeight - 40, pageWidth - 14, pageHeight - 76);

  if (logoData) {
    doc.addImage(logoData, "PNG", pageWidth / 2 - 45, 50, 90, 28);
    doc.setTextColor(...brandGreen);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SIGHTLINE Command Center", pageWidth / 2, 86, { align: "center" });
  } else {
    doc.setTextColor(...brandGreen);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("FABULOUZZ TECHNOLOGIES", pageWidth / 2, 72, { align: "center" });
    doc.setFontSize(12);
    doc.text("SIGHTLINE Command Center", pageWidth / 2, 82, { align: "center" });
  }

  doc.setFillColor(...brandGreen);
  doc.rect(pageWidth / 2 - 30, 92, 60, 0.8, "F");

  doc.setTextColor(...brandGreen);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT STATUS REPORT", pageWidth / 2, 103, { align: "center", charSpace: 2 });

  doc.setTextColor(...textPrimary);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(projectInfo.title, pageWidth - 60);
  doc.text(titleLines, pageWidth / 2, 120, { align: "center" });

  const subtitleY = 120 + titleLines.length * 9 + 6;
  doc.setTextColor(...textSecondary);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${projectInfo.client}  •  ${projectInfo.location}`, pageWidth / 2, subtitleY, { align: "center" });

  const coverCardY = subtitleY + 18;
  const coverCardW = (pageWidth - 28 - 18) / 4;
  const coverCardH = 32;

  const summaryCards = [
    { label: "Overall Progress", value: `${progress}%`, color: brandGreen },
    { label: "Completed", value: `${counts.completed}`, color: statusColors.Completed },
    { label: "In Progress", value: `${counts.processing + counts.initiating}`, color: statusColors.Processing },
    { label: "Planning", value: `${counts.planning}`, color: statusColors.Planning },
  ];

  summaryCards.forEach((card, i) => {
    const cx = 14 + i * (coverCardW + 6);
    doc.setFillColor(...cardBgColor);
    doc.roundedRect(cx, coverCardY, coverCardW, coverCardH, 2, 2, "F");
    doc.setFillColor(...card.color);
    doc.rect(cx, coverCardY, coverCardW, 1.5, "F");
    doc.setTextColor(...card.color);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, cx + coverCardW / 2, coverCardY + 16, { align: "center" });
    doc.setTextColor(...textSecondary);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(card.label.toUpperCase(), cx + coverCardW / 2, coverCardY + 25, { align: "center" });
  });

  const detailY = coverCardY + coverCardH + 16;
  doc.setFillColor(...cardBgColor);
  doc.roundedRect(30, detailY, pageWidth - 60, 52, 2, 2, "F");
  doc.setFillColor(...brandGreen);
  doc.rect(30, detailY, 1.5, 52, "F");

  const coverDetails = [
    ["Project Ref", projectInfo.projectRef],
    ["Project Manager", projectInfo.projectManager],
    ["Reporting To", projectInfo.reportingTo],
    ["Project Engineer", projectInfo.projectEngineer],
    ["Duration", `${projectInfo.startDate}  to  ${projectInfo.endDate}`],
    ["Report Date", today],
  ];

  coverDetails.forEach((item, i) => {
    const dy = detailY + 9 + i * 7;
    doc.setTextColor(...textSecondary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${item[0]}:`, 38, dy);
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text(item[1], 78, dy);
  });

  doc.setTextColor(...textSecondary);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("CONFIDENTIAL — For authorized use only", pageWidth / 2, pageHeight - 22, { align: "center" });

  drawPageFooter(doc, 1, 3, pageWidth, pageHeight);

  // PAGE 2 — TASK BREAKDOWN
  doc.addPage();
  doc.setFillColor(...bgColor);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(...cardBgColor);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setFillColor(...brandGreen);
  doc.rect(0, 24, pageWidth, 0.8, "F");

  if (logoData) {
    doc.addImage(logoData, "PNG", 14, 4, 40, 13);
  }
  doc.setTextColor(...textSecondary);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("TASK BREAKDOWN", pageWidth - 14, 10, { align: "right" });
  doc.setTextColor(...brandGreen);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(projectInfo.projectRef, pageWidth - 14, 17, { align: "right" });

  let y = 32;
  doc.setFillColor(...cardBgColor);
  doc.roundedRect(14, y, pageWidth - 28, 42, 2, 2, "F");
  doc.setFillColor(...brandGreen);
  doc.rect(14, y, 1.5, 42, "F");

  doc.setTextColor(...brandGreen);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT INFORMATION", 20, y + 7);

  const infoItems = [
    ["Project Manager", projectInfo.projectManager, "Reporting To", projectInfo.reportingTo],
    ["Project Engineer", projectInfo.projectEngineer, "Company", projectInfo.company],
    ["Client", projectInfo.client, "Location", projectInfo.location],
    ["Start Date", projectInfo.startDate, "End Date", projectInfo.endDate],
  ];

  doc.setFontSize(8);
  infoItems.forEach((row, i) => {
    const iy = y + 14 + i * 7;
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(`${row[0]}:`, 20, iy);
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], 55, iy);
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(`${row[2]}:`, pageWidth / 2 + 5, iy);
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text(row[3], pageWidth / 2 + 40, iy);
  });

  y += 50;

  doc.setTextColor(...brandGreen);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TASK BREAKDOWN", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["#", "Task Name", "Status", "Duration"]],
    body: tasks.map(t => [
      String(t.id).padStart(2, "0"),
      t.name,
      t.status,
      `${t.duration} days`,
    ]),
    theme: "plain",
    styles: {
      fillColor: bgColor,
      textColor: textPrimary,
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: gridLineColor,
      lineWidth: 0.2,
      font: "helvetica",
    },
    headStyles: {
      fillColor: cardBgColor,
      textColor: brandGreen,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: altRowColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
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

  drawPageFooter(doc, 2, 3, pageWidth, pageHeight);

  // PAGE 3 — GANTT CHART TIMELINE (landscape)
  doc.addPage("a4", "landscape");
  const lw = doc.internal.pageSize.getWidth();
  const lh = doc.internal.pageSize.getHeight();

  doc.setFillColor(...bgColor);
  doc.rect(0, 0, lw, lh, "F");

  doc.setFillColor(...cardBgColor);
  doc.rect(0, 0, lw, 20, "F");
  doc.setFillColor(...brandGreen);
  doc.rect(0, 20, lw, 0.8, "F");

  if (logoData) {
    doc.addImage(logoData, "PNG", 10, 3, 36, 11);
  }
  doc.setTextColor(...brandGreen);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT TIMELINE — GANTT CHART", lw / 2, 13, { align: "center" });
  doc.setTextColor(...textSecondary);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(projectInfo.projectRef, lw - 10, 13, { align: "right" });

  const ganttTop = 28;
  const labelWidth = 90;
  const ganttLeft = labelWidth + 12;
  const ganttRight = lw - 10;
  const ganttWidth = ganttRight - ganttLeft;
  const totalDays = calendarDays.length;
  const dayWidth = ganttWidth / totalDays;
  const rowHeight = 7.5;
  const headerHeight = 14;
  const ganttBodyHeight = tasks.length * rowHeight;

  doc.setFillColor(...cardBgColor);
  doc.rect(ganttLeft, ganttTop, ganttWidth, headerHeight, "F");

  const monthNames = ["Jan", "Feb", "Mar", "Apr"];
  let lastMonth = -1;
  calendarDays.forEach((day, i) => {
    const x = ganttLeft + i * dayWidth;
    const month = day.date.getMonth();
    const isToday = i === todayIndex;

    if (month !== lastMonth) {
      doc.setTextColor(...brandGreen);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text(monthNames[month] || "", x + 1, ganttTop + 5);
      lastMonth = month;
    }

    if (isToday) {
      doc.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      doc.setGState(doc.GState({ opacity: 0.2 }));
      doc.rect(x, ganttTop, dayWidth, headerHeight, "F");
      doc.rect(x, ganttTop + headerHeight, dayWidth, ganttBodyHeight, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
    }

    if (day.isWeekend && !isToday) {
      doc.setFillColor(...weekendBg);
      doc.rect(x, ganttTop + headerHeight, dayWidth, ganttBodyHeight, "F");
    }

    if (isToday) {
      doc.setTextColor(...brandGreen);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
    } else {
      const dimness = day.isWeekend ? (isDark ? 80 : 170) : (isDark ? 140 : 100);
      doc.setTextColor(dimness, dimness, dimness + 5);
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
    }
    doc.text(day.label, x + dayWidth / 2, ganttTop + 11, { align: "center" });

    doc.setDrawColor(...gridLineColor);
    doc.setLineWidth(0.15);
    doc.line(x, ganttTop + headerHeight, x, ganttTop + headerHeight + ganttBodyHeight);
  });

  if (todayIndex >= 0) {
    const todayX = ganttLeft + todayIndex * dayWidth + dayWidth / 2;
    doc.setDrawColor(...brandGreen);
    doc.setLineWidth(0.6);
    const segLen = 2;
    const gapLen = 1.5;
    for (let sy = ganttTop; sy < ganttTop + headerHeight + ganttBodyHeight; sy += segLen + gapLen) {
      const endY = Math.min(sy + segLen, ganttTop + headerHeight + ganttBodyHeight);
      doc.line(todayX, sy, todayX, endY);
    }
    doc.setFillColor(...brandGreen);
    doc.roundedRect(todayX - 6, ganttTop - 4, 12, 4, 1, 1, "F");
    doc.setTextColor(...(isDark ? [18, 18, 24] as [number, number, number] : [255, 255, 255] as [number, number, number]));
    doc.setFontSize(3.5);
    doc.setFont("helvetica", "bold");
    doc.text("TODAY", todayX, ganttTop - 1, { align: "center" });
  }

  doc.setFillColor(...brandGreen);
  doc.rect(ganttLeft, ganttTop + headerHeight - 0.4, ganttWidth, 0.4, "F");

  tasks.forEach((task, i) => {
    const ry = ganttTop + headerHeight + i * rowHeight;

    if (i % 2 === 0) {
      doc.setFillColor(...altGanttRow);
      doc.rect(10, ry, ganttRight - 10, rowHeight, "F");
    }

    doc.setTextColor(...textSecondary);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(String(task.id).padStart(2, "0"), 12, ry + rowHeight / 2 + 1.2);

    doc.setTextColor(...textPrimary);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    const maxNameWidth = labelWidth - 12;
    const nameLines = doc.splitTextToSize(task.name, maxNameWidth);
    const nameText = nameLines.length > 2 ? nameLines.slice(0, 2).join(" ").slice(0, 70) + "…" : nameLines.join(" ");
    doc.text(nameText, 20, ry + rowHeight / 2 + 1.2);

    const barX = ganttLeft + task.startDay * dayWidth + 0.5;
    const barW = task.duration * dayWidth - 1;
    const barY = ry + 1.5;
    const barH = rowHeight - 3;
    const color = statusColors[task.status] || textSecondary;

    doc.setFillColor(color[0], color[1], color[2]);
    doc.setGState(doc.GState({ opacity: 0.25 }));
    doc.roundedRect(barX + 0.3, barY + 0.3, barW, barH, 1, 1, "F");
    doc.setGState(doc.GState({ opacity: 1 }));

    doc.setFillColor(...color);
    doc.roundedRect(barX, barY, barW, barH, 1, 1, "F");

    doc.setDrawColor(...gridLineColor);
    doc.setLineWidth(0.1);
    doc.line(10, ry + rowHeight, ganttRight, ry + rowHeight);
  });

  const legendY = ganttTop + headerHeight + ganttBodyHeight + 8;
  doc.setTextColor(...textSecondary);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("LEGEND:", 10, legendY);

  let legendX = 30;
  Object.entries(statusColors).forEach(([status, color]) => {
    doc.setFillColor(...color);
    doc.roundedRect(legendX, legendY - 3, 8, 3.5, 0.8, 0.8, "F");
    doc.setTextColor(...textPrimary);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(status, legendX + 10, legendY);
    legendX += 35;
  });

  doc.setFillColor(...brandGreen);
  doc.roundedRect(legendX, legendY - 3, 8, 3.5, 0.8, 0.8, "F");
  doc.setTextColor(...textPrimary);
  doc.setFontSize(6);
  doc.text("Today", legendX + 10, legendY);
  legendX += 30;

  doc.setTextColor(...textSecondary);
  doc.setFontSize(5.5);
  doc.text("Shaded columns = Weekends (Fri/Sat — Saudi calendar)", legendX + 10, legendY);

  drawPageFooter(doc, 3, 3, lw, lh);

  const base64 = doc.output("datauristring").split(",")[1];

  return { doc, base64 };
}
