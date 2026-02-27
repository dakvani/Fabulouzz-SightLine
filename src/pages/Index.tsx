import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProgressRing from "@/components/ProgressRing";
import StatusTicker from "@/components/StatusTicker";
import MilestoneCountdown from "@/components/MilestoneCountdown";
import ProjectInfoCard from "@/components/ProjectInfoCard";
import GanttChart from "@/components/GanttChart";
import TaskList from "@/components/TaskList";
import { getOverallProgress } from "@/data/projectData";
import { motion } from "framer-motion";

type ViewType = "dashboard" | "timeline" | "tasks";

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const progress = getOverallProgress();

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <AppHeader activeView={activeView} onViewChange={setActiveView} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 relative">
        {activeView === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Top row: Progress + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3 glass-card p-6 flex items-center justify-center">
                <ProgressRing progress={progress} label="Overall Progress" />
              </div>
              <div className="lg:col-span-5">
                <StatusTicker />
                <div className="mt-3">
                  <ProjectInfoCard />
                </div>
              </div>
              <div className="lg:col-span-4">
                <MilestoneCountdown />
              </div>
            </div>

            {/* Gantt preview */}
            <GanttChart />
          </motion.div>
        )}

        {activeView === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <GanttChart />
          </motion.div>
        )}

        {activeView === "tasks" && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <TaskList />
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Index;
