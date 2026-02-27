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
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Row 1: Progress ring (tall narrow) + Status/Project (wide) + Weather/Milestone (medium) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-auto">
                {/* Progress - tall card */}
                <motion.div
                  className="md:col-span-3 glass-card p-5 flex flex-col items-center justify-center min-h-[220px] rounded-2xl"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                >
                  <ProgressRing progress={progress} size={140} label="Overall Progress" />
                </motion.div>

                {/* Middle column - stacked horizontal cards */}
                <div className="md:col-span-5 flex flex-col gap-3">
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                    <StatusTicker />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex-1">
                    <ProjectInfoCard />
                  </motion.div>
                </div>

                {/* Right column - compact cards */}
                <div className="md:col-span-4 flex flex-col gap-3">
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <WeatherWidget />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                    <MilestoneCountdown />
                  </motion.div>
                </div>
              </div>

              {/* Row 2: Active Tasks (wider) + Notifications (narrower) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <ActiveTasksPanel />
                </motion.div>
                <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <LiveNotifications />
                </motion.div>
              </div>

              {/* Row 3: Gantt chart full width */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <GanttChart />
              </motion.div>

              {/* Row 4: Email subscription */}
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
