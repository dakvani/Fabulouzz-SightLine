import { motion } from "framer-motion";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { projectInfo, tasks, getStatusCounts, getOverallProgress } from "@/data/projectData";
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

  const exportReport = async () => {
    setLoading(true);

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const counts = getStatusCounts();
      const progress = getOverallProgress();
      const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      const brandGreen: [number, number, number] = [47, 191, 47];
      const darkBg: [number, number, number] = [18, 18, 24];
      const cardBg: [number, number, number] = [28, 28, 38];
      const textWhite: [number, number, number] = [240, 240, 240];
      const textMuted: [number, number, number] = [160, 160, 170];

      // Full page dark background
      doc.setFillColor(...darkBg);
      doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

      // Header band
      doc.setFillColor(...cardBg);
      doc.rect(0, 0, pageWidth, 38, "F");

      // Green accent line
      doc.setFillColor(...brandGreen);
      doc.rect(0, 38, pageWidth, 1, "F");

      // Logo
      try {
        const logoData = await loadImageAsBase64(fabulouzzLogo);
        doc.addImage(logoData, "PNG", 14, 8, 50, 16);
      } catch {
        doc.setTextColor(...brandGreen);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("FABULOUZZ TECHNOLOGIES", 14, 20);
      }

      // Header right side
      doc.setTextColor(...textMuted);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("PROJECT STATUS REPORT", pageWidth - 14, 14, { align: "right" });
      doc.setTextColor(...brandGreen);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(projectInfo.projectRef, pageWidth - 14, 21, { align: "right" });
      doc.setTextColor(...textMuted);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${today}`, pageWidth - 14, 28, { align: "right" });

      let y = 48;

      // Project Title
      doc.setTextColor(...textWhite);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(projectInfo.title, pageWidth / 2, y, { align: "center" });
      y += 7;
      doc.setTextColor(...textMuted);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${projectInfo.client}  •  ${projectInfo.location}  •  ${projectInfo.startDate} to ${projectInfo.endDate}`, pageWidth / 2, y, { align: "center" });
      y += 12;

      // Progress & Summary Cards Row
      const cardY = y;
      const cardH = 30;
      const gap = 6;
      const cardW = (pageWidth - 28 - gap * 3) / 4;

      const summaryCards = [
        { label: "Overall Progress", value: `${progress}%`, color: brandGreen },
        { label: "Completed", value: `${counts.completed}`, color: [34, 197, 94] as [number, number, number] },
        { label: "In Progress", value: `${counts.processing + counts.initiating}`, color: [59, 130, 246] as [number, number, number] },
        { label: "Planning", value: `${counts.planning}`, color: [168, 162, 158] as [number, number, number] },
      ];

      summaryCards.forEach((card, i) => {
        const cx = 14 + i * (cardW + gap);
        // Card background
        doc.setFillColor(...cardBg);
        doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "F");
        // Top accent
        doc.setFillColor(...card.color);
        doc.rect(cx, cardY, cardW, 1.5, "F");
        // Value
        doc.setTextColor(...card.color);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(card.value, cx + cardW / 2, cardY + 15, { align: "center" });
        // Label
        doc.setTextColor(...textMuted);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(card.label.toUpperCase(), cx + cardW / 2, cardY + 23, { align: "center" });
      });

      y = cardY + cardH + 10;

      // Project Information Section
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

      // Task Breakdown Table
      doc.setTextColor(...brandGreen);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TASK BREAKDOWN", 14, y);
      y += 4;

      const statusColors: Record<string, [number, number, number]> = {
        Completed: [34, 197, 94],
        Processing: [59, 130, 246],
        Initiating: [251, 191, 36],
        Planning: [168, 162, 158],
      };

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

      // Footer
      const finalY = (doc as any).lastAutoTable?.finalY || y + 60;
      const footerY = Math.max(finalY + 10, doc.internal.pageSize.getHeight() - 20);

      doc.setFillColor(...cardBg);
      doc.rect(0, footerY - 2, pageWidth, 20, "F");
      doc.setFillColor(...brandGreen);
      doc.rect(0, footerY - 2, pageWidth, 0.5, "F");

      doc.setTextColor(...textMuted);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Powered by Fabulouzz Technologies  •  SightLine Project Command Center", pageWidth / 2, footerY + 5, { align: "center" });
      doc.text("CONFIDENTIAL — For authorized use only", pageWidth / 2, footerY + 10, { align: "center" });

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
