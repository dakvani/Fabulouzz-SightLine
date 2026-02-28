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
import NotificationTicker from "@/components/NotificationTicker";
import EmailSubscription from "@/components/EmailSubscription";

import { useProjectData } from "@/contexts/ProjectDataContext";
import { motion } from "framer-motion";

type ViewType = "dashboard" | "timeline" | "tasks" | "kanban";

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const { tasks } = useProjectData();

  // Calculate progress from context data
  const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
  const progress = tasks.length > 0
    ? Math.round((tasks.reduce((sum, t) => sum + (weights[t.status] || 0), 0) / tasks.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background relative">

      <div className="relative z-10">
        <AppHeader activeView={activeView} onViewChange={setActiveView} />

        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 relative">
          {activeView === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="space-y-3">
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <StatusTicker />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <NotificationTicker />
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <motion.div className="md:col-span-3 glass-card p-6 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                  <ProgressRing progress={progress} size={130} label="Overall Progress" />
                </motion.div>
                <motion.div className="md:col-span-5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <MilestoneCountdown />
                </motion.div>
                <div className="md:col-span-4 grid grid-rows-2 gap-4">
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                    <WeatherWidget />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <ProjectInfoCard />
                  </motion.div>
                </div>
              </div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <ActiveTasksPanel />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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
