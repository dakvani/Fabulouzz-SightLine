import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProgressRing from "@/components/ProgressRing";
import StatusTicker from "@/components/StatusTicker";
import MilestoneCountdown from "@/components/MilestoneCountdown";
import ProjectInfoCard from "@/components/ProjectInfoCard";
import GanttChart from "@/components/GanttChart";
import TaskList from "@/components/TaskList";
import KanbanBoard from "@/components/KanbanBoard";
import ActiveTasksPanel from "@/components/ActiveTasksPanel";
import EmailSubscription from "@/components/EmailSubscription";
import { getOverallProgress } from "@/data/projectData";
import { motion } from "framer-motion";

type ViewType = "dashboard" | "timeline" | "tasks" | "kanban";

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const progress = getOverallProgress();

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
      <motion.div
        className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(38, 92%, 55%, 0.04), transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(200, 70%, 50%, 0.03), transparent 70%)" }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

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
              <motion.div 
                className="lg:col-span-3 glass-card p-6 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <ProgressRing progress={progress} label="Overall Progress" />
              </motion.div>
              <div className="lg:col-span-5 space-y-3">
                <StatusTicker />
                <ProjectInfoCard />
              </div>
              <motion.div 
                className="lg:col-span-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <MilestoneCountdown />
              </motion.div>
            </div>

            {/* Active Tasks - Animated highlight */}
            <ActiveTasksPanel />

            {/* Gantt preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GanttChart />
            </motion.div>

            {/* Email subscription */}
            <EmailSubscription />
          </motion.div>
        )}

        {activeView === "timeline" && (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GanttChart />
          </motion.div>
        )}

        {activeView === "tasks" && (
          <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TaskList />
          </motion.div>
        )}

        {activeView === "kanban" && (
          <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <KanbanBoard />
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-muted-foreground py-6 border-t border-border/30"
      >
        <p>Powered by <span className="text-primary font-semibold">Fabulouzz Technologies</span> • SightLine Project Command Center</p>
      </motion.footer>
    </div>
  );
};

export default Index;
