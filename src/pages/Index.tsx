import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProgressRing from "@/components/ProgressRing";
import StatusTicker from "@/components/StatusTicker";
import MilestoneCountdown from "@/components/MilestoneCountdown";
import ProjectInfoCard from "@/components/ProjectInfoCard";
import WeatherWidget from "@/components/WeatherWidget";
import GanttChart from "@/components/GanttChart";
import TaskList from "@/components/TaskList";
import KanbanBoard from "@/components/KanbanBoard";
import ActiveTasksPanel from "@/components/ActiveTasksPanel";
import EmailSubscription from "@/components/EmailSubscription";
import LiveNotifications from "@/components/LiveNotifications";
import ParticleBackground from "@/components/ParticleBackground";
import { getOverallProgress } from "@/data/projectData";
import { motion } from "framer-motion";

type ViewType = "dashboard" | "timeline" | "tasks" | "kanban";

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const progress = getOverallProgress();

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10">
        <AppHeader activeView={activeView} onViewChange={setActiveView} />

        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 relative">
          {activeView === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <motion.div className="lg:col-span-3 glass-card p-6 flex items-center justify-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                  <ProgressRing progress={progress} label="Overall Progress" />
                </motion.div>
                <div className="lg:col-span-5 space-y-3">
                  <StatusTicker />
                  <ProjectInfoCard />
                </div>
                <div className="lg:col-span-4 space-y-3">
                  <WeatherWidget />
                  <MilestoneCountdown />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActiveTasksPanel />
                <LiveNotifications />
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <GanttChart />
              </motion.div>
              <EmailSubscription />
            </motion.div>
          )}

          {activeView === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><GanttChart /></motion.div>
          )}
          {activeView === "tasks" && (
            <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><TaskList /></motion.div>
          )}
          {activeView === "kanban" && (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><KanbanBoard /></motion.div>
          )}
        </main>

        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-xs text-muted-foreground py-6 border-t border-border/30">
          <p>Powered by <span className="text-primary font-semibold">Fabulouzz Technologies</span> • SightLine Project Command Center</p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
