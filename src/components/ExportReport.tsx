import { motion } from "framer-motion";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { getCalendarDays } from "@/data/projectData";
import { useProjectData } from "@/contexts/ProjectDataContext";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";

const ExportReport = () => {
  const [loading, setLoading] = useState(false);

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

  const { tasks, projectInfo } = useProjectData();

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

  const exportReport = async () => {
    setLoading(true);

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const counts = getStatusCounts();
      const progress = getOverallProgress();
      const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      const brandGreen: [number, number, number] = [47, 191, 47];
      const darkBg: [number, number, number] = [18, 18, 24];
      const cardBg: [number, number, number] = [28, 28, 38];
      const textWhite: [number, number, number] = [240, 240, 240];
      const textMuted: [number, number, number] = [160, 160, 170];

      const statusColors: Record<string, [number, number, number]> = {
        Completed: [34, 197, 94],
        Processing: [59, 130, 246],
        Initiating: [251, 191, 36],
        Planning: [168, 162, 158],
      };

      let logoData: string | null = null;
      try {
        logoData = await loadImageAsBase64(fabulouzzLogo);
      } catch {
        // fallback to text
      }

      const drawPageFooter = (doc: any, pageNum: number, totalPages: number) => {
        doc.setFillColor(...cardBg);
        doc.rect(0, pageHeight - 14, pageWidth, 14, "F");
        doc.setFillColor(...brandGreen);
        doc.rect(0, pageHeight - 14, pageWidth, 0.5, "F");
        doc.setTextColor(...textMuted);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.text("Powered by Fabulouzz Technologies  •  SightLine Project Command Center", 14, pageHeight - 5);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: "right" });
      };

      // ═══════════════════════════════════════════════════════════
      // PAGE 1 — COVER PAGE
      // ═══════════════════════════════════════════════════════════
      doc.setFillColor(...darkBg);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Decorative corner accents
      doc.setDrawColor(...brandGreen);
      doc.setLineWidth(0.8);
      doc.line(14, 20, 50, 20);
      doc.line(14, 20, 14, 56);
      doc.line(pageWidth - 14, pageHeight - 40, pageWidth - 50, pageHeight - 40);
      doc.line(pageWidth - 14, pageHeight - 40, pageWidth - 14, pageHeight - 76);

      // Large centered logo
      if (logoData) {
        doc.addImage(logoData, "PNG", pageWidth / 2 - 45, 50, 90, 28);
        // Add "SIGHTLINE Command Center" under logo
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

      // Divider line
      doc.setFillColor(...brandGreen);
      doc.rect(pageWidth / 2 - 30, 92, 60, 0.8, "F");

      // "PROJECT STATUS REPORT" label
      doc.setTextColor(...brandGreen);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const labelText = "PROJECT STATUS REPORT";
      doc.text(labelText, pageWidth / 2, 103, { align: "center", charSpace: 2 });

      // Project title
      doc.setTextColor(...textWhite);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(projectInfo.title, pageWidth - 60);
      doc.text(titleLines, pageWidth / 2, 120, { align: "center" });

      // Subtitle info
      const subtitleY = 120 + titleLines.length * 9 + 6;
      doc.setTextColor(...textMuted);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${projectInfo.client}  •  ${projectInfo.location}`, pageWidth / 2, subtitleY, { align: "center" });

      // Summary card block on cover
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
        doc.setFillColor(...cardBg);
        doc.roundedRect(cx, coverCardY, coverCardW, coverCardH, 2, 2, "F");
        doc.setFillColor(...card.color);
        doc.rect(cx, coverCardY, coverCardW, 1.5, "F");
        doc.setTextColor(...card.color);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(card.value, cx + coverCardW / 2, coverCardY + 16, { align: "center" });
        doc.setTextColor(...textMuted);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(card.label.toUpperCase(), cx + coverCardW / 2, coverCardY + 25, { align: "center" });
      });

      // Project details on cover
      const detailY = coverCardY + coverCardH + 16;
      doc.setFillColor(...cardBg);
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
        doc.setTextColor(...textMuted);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`${item[0]}:`, 38, dy);
        doc.setTextColor(...textWhite);
        doc.setFont("helvetica", "bold");
        doc.text(item[1], 78, dy);
      });

      // Confidential notice
      doc.setTextColor(...textMuted);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("CONFIDENTIAL — For authorized use only", pageWidth / 2, pageHeight - 22, { align: "center" });

      drawPageFooter(doc, 1, 3);

      // ═══════════════════════════════════════════════════════════
      // PAGE 2 — TASK BREAKDOWN (existing content)
      // ═══════════════════════════════════════════════════════════
      doc.addPage();
      doc.setFillColor(...darkBg);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Header band
      doc.setFillColor(...cardBg);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setFillColor(...brandGreen);
      doc.rect(0, 24, pageWidth, 0.8, "F");

      if (logoData) {
        doc.addImage(logoData, "PNG", 14, 4, 40, 13);
      }
      doc.setTextColor(...textMuted);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("TASK BREAKDOWN", pageWidth - 14, 10, { align: "right" });
      doc.setTextColor(...brandGreen);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(projectInfo.projectRef, pageWidth - 14, 17, { align: "right" });

      // Project Information Section
      let y = 32;
      doc.setFillColor(...cardBg);
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
        doc.setTextColor(...textMuted);
        doc.setFont("helvetica", "normal");
        doc.text(`${row[0]}:`, 20, iy);
        doc.setTextColor(...textWhite);
        doc.setFont("helvetica", "bold");
        doc.text(row[1], 55, iy);
        doc.setTextColor(...textMuted);
        doc.setFont("helvetica", "normal");
        doc.text(`${row[2]}:`, pageWidth / 2 + 5, iy);
        doc.setTextColor(...textWhite);
        doc.setFont("helvetica", "bold");
        doc.text(row[3], pageWidth / 2 + 40, iy);
      });

      y += 50;

      // Task Table
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
          fillColor: darkBg,
          textColor: textWhite,
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [40, 40, 55],
          lineWidth: 0.2,
          font: "helvetica",
        },
        headStyles: {
          fillColor: cardBg,
          textColor: brandGreen,
          fontStyle: "bold",
          fontSize: 7.5,
        },
        alternateRowStyles: {
          fillColor: [23, 23, 32],
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

      drawPageFooter(doc, 2, 3);

      // ═══════════════════════════════════════════════════════════
      // PAGE 3 — GANTT CHART TIMELINE (landscape)
      // ═══════════════════════════════════════════════════════════
      doc.addPage("a4", "landscape");
      const lw = doc.internal.pageSize.getWidth();
      const lh = doc.internal.pageSize.getHeight();

      doc.setFillColor(...darkBg);
      doc.rect(0, 0, lw, lh, "F");

      // Header
      doc.setFillColor(...cardBg);
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
      doc.setTextColor(...textMuted);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(projectInfo.projectRef, lw - 10, 13, { align: "right" });

      // Gantt chart layout
      const ganttTop = 28;
      const labelWidth = 90;
      const ganttLeft = labelWidth + 12;
      const ganttRight = lw - 10;
      const ganttWidth = ganttRight - ganttLeft;
      const calendarDays = getCalendarDays();
      const totalDays = calendarDays.length;
      const dayWidth = ganttWidth / totalDays;
      const rowHeight = 7.5;
      const headerHeight = 14;

      // Calendar header background
      doc.setFillColor(...cardBg);
      doc.rect(ganttLeft, ganttTop, ganttWidth, headerHeight, "F");

      // Month labels + day numbers
      const monthNames = ["Jan", "Feb", "Mar", "Apr"];
      let lastMonth = -1;
      calendarDays.forEach((day, i) => {
        const x = ganttLeft + i * dayWidth;
        const month = day.date.getMonth();

        // Month label
        if (month !== lastMonth) {
          doc.setTextColor(...brandGreen);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text(monthNames[month] || "", x + 1, ganttTop + 5);
          lastMonth = month;
        }

        // Day number
        doc.setTextColor(day.isWeekend ? 80 : 140, day.isWeekend ? 80 : 140, day.isWeekend ? 85 : 150);
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text(day.label, x + dayWidth / 2, ganttTop + 11, { align: "center" });

        // Weekend shading
        if (day.isWeekend) {
          doc.setFillColor(25, 25, 35);
          doc.rect(x, ganttTop + headerHeight, dayWidth, tasks.length * rowHeight, "F");
        }

        // Vertical grid line
        doc.setDrawColor(35, 35, 48);
        doc.setLineWidth(0.15);
        doc.line(x, ganttTop + headerHeight, x, ganttTop + headerHeight + tasks.length * rowHeight);
      });

      // Separator line under header
      doc.setFillColor(...brandGreen);
      doc.rect(ganttLeft, ganttTop + headerHeight - 0.4, ganttWidth, 0.4, "F");

      // Task rows
      tasks.forEach((task, i) => {
        const ry = ganttTop + headerHeight + i * rowHeight;

        // Alternating row bg
        if (i % 2 === 0) {
          doc.setFillColor(22, 22, 30);
          doc.rect(10, ry, ganttRight - 10, rowHeight, "F");
        }

        // Row number
        doc.setTextColor(...textMuted);
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text(String(task.id).padStart(2, "0"), 12, ry + rowHeight / 2 + 1.2);

        // Task name — allow wrapping for long names
        doc.setTextColor(...textWhite);
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        const maxNameWidth = labelWidth - 12;
        const nameLines = doc.splitTextToSize(task.name, maxNameWidth);
        const nameText = nameLines.length > 2 ? nameLines.slice(0, 2).join(" ").slice(0, 70) + "…" : nameLines.join(" ");
        doc.text(nameText, 20, ry + rowHeight / 2 + 1.2);

        // Gantt bar
        const barX = ganttLeft + task.startDay * dayWidth + 0.5;
        const barW = task.duration * dayWidth - 1;
        const barY = ry + 1.5;
        const barH = rowHeight - 3;
        const color = statusColors[task.status] || textMuted;

        // Bar shadow
        doc.setFillColor(color[0], color[1], color[2]);
        doc.setGState(doc.GState({ opacity: 0.25 }));
        doc.roundedRect(barX + 0.3, barY + 0.3, barW, barH, 1, 1, "F");
        doc.setGState(doc.GState({ opacity: 1 }));

        // Bar fill
        doc.setFillColor(...color);
        doc.roundedRect(barX, barY, barW, barH, 1, 1, "F");

        // Horizontal grid line
        doc.setDrawColor(35, 35, 48);
        doc.setLineWidth(0.1);
        doc.line(10, ry + rowHeight, ganttRight, ry + rowHeight);
      });

      // Legend
      const legendY = ganttTop + headerHeight + tasks.length * rowHeight + 8;
      doc.setTextColor(...textMuted);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text("LEGEND:", 10, legendY);

      let legendX = 30;
      Object.entries(statusColors).forEach(([status, color]) => {
        doc.setFillColor(...color);
        doc.roundedRect(legendX, legendY - 3, 8, 3.5, 0.8, 0.8, "F");
        doc.setTextColor(...textWhite);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(status, legendX + 10, legendY);
        legendX += 35;
      });

      // Weekend note
      doc.setTextColor(...textMuted);
      doc.setFontSize(5.5);
      doc.text("Shaded columns = Weekends (Fri/Sat — Saudi calendar)", legendX + 10, legendY);

      drawPageFooter(doc, 3, 3);

      doc.save(`SightLine_Report_${projectInfo.projectRef}_${today.replace(/\s/g, "-")}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      onClick={exportReport}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">Export PDF</span>
    </motion.button>
  );
};

export default ExportReport;
