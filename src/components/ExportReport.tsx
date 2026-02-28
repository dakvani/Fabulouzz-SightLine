import { motion } from "framer-motion";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useTheme } from "next-themes";
import { generateReportPdf } from "@/lib/generateReportPdf";

const ExportReport = () => {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const { tasks, projectInfo } = useProjectData();

  const exportReport = async () => {
    setLoading(true);
    try {
      const isDark = theme === "dark";
      const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const { doc } = await generateReportPdf({ tasks, projectInfo, isDark });
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
