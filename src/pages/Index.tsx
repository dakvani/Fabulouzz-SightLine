import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LandingPage from "@/components/LandingPage";
import ProjectSelector from "@/components/ProjectSelector";
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
import ChangePasswordModal from "@/components/ChangePasswordModal";
import SubscribePromptModal from "@/components/SubscribePromptModal";
import ScrollToTop from "@/components/ScrollToTop";
import LiveNotifications from "@/components/LiveNotifications";
import PricingPage from "@/components/PricingPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProjectDetailsPage from "@/components/ProjectDetailsPage";
import ProjectHealthCard from "@/components/ProjectHealthCard";
import OngoingWorks from "@/components/OngoingWorks";
import DashboardSideTab from "@/components/DashboardSideTab";
import { SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useProjectData } from "@/contexts/ProjectDataContext";
import { motion } from "framer-motion";

type ViewType = "dashboard" | "timeline" | "tasks" | "kanban" | "details" | "pricing";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [detailsTab, setDetailsTab] = useState<
    "info" | "timeline" | "tasks" | "branding" | "team" | "broadcasts" | "subscribers"
  >("info");
  const [sideTabOpen, setSideTabOpen] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const { tasks, selectedProjectId, setSelectedProjectId, loading: projectLoading } = useProjectData();
  const navigate = useNavigate();

  const [showLoadingEscape, setShowLoadingEscape] = useState(false);

  useEffect(() => {
    // Safety timer to prevent auth check from hanging indefinitely
    const authSafetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      clearTimeout(authSafetyTimer);
      if (u?.user_metadata?.must_change_password) {
        setMustChangePassword(true);
      }
      // Clear project selection on logout
      if (!u) {
        setSelectedProjectId(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      clearTimeout(authSafetyTimer);
      if (u?.user_metadata?.must_change_password) {
        setMustChangePassword(true);
      }
    }).catch(() => {
      setLoading(false);
    });

    return () => {
      clearTimeout(authSafetyTimer);
      subscription.unsubscribe();
    };
  }, [setSelectedProjectId]);

  useEffect(() => {
    let timer: any;
    if (projectLoading) {
      timer = setTimeout(() => setShowLoadingEscape(true), 2500);
    } else {
      setShowLoadingEscape(false);
    }
    return () => clearTimeout(timer);
  }, [projectLoading]);

  // Read URL search params (e.g. ?view=details&tab=info)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const tabParam = params.get("tab");
    if (viewParam && ["dashboard", "timeline", "tasks", "kanban", "details", "pricing"].includes(viewParam)) {
      setActiveView(viewParam as ViewType);
    }
    if (
      tabParam &&
      ["info", "timeline", "tasks", "branding", "team", "broadcasts", "subscribers"].includes(tabParam)
    ) {
      setDetailsTab(tabParam as any);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <motion.div
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
          Authenticating SightLine Command Deck...
        </span>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onAuthSuccess={() => {}} />;
  }

  // Show project selector if no project is selected
  if (!selectedProjectId) {
    return (
      <>
        <ChangePasswordModal
          isOpen={mustChangePassword}
          onSuccess={() => setMustChangePassword(false)}
        />
        <ProjectSelector
          onSelectProject={(id) => setSelectedProjectId(id)}
          userId={user.id}
        />
      </>
    );
  }

  // Only show full-screen loader if project is loading AND we have zero tasks loaded yet
  if (projectLoading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-4">
        <motion.div
          className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Opening Project Command Center...
        </span>
        {showLoadingEscape && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 mt-2"
          >
            <p className="text-[11px] text-muted-foreground">Connecting to site telemetry...</p>
            <button
              onClick={() => setSelectedProjectId(null)}
              className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Switch or Re-select Project
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
  const progress = tasks.length > 0
    ? Math.round((tasks.reduce((sum, t) => sum + (weights[t.status] || 0), 0) / tasks.length) * 100)
    : 0;

  if (activeView === "pricing") {
    return <PricingPage onBack={() => setActiveView("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <ChangePasswordModal
        isOpen={mustChangePassword}
        onSuccess={() => setMustChangePassword(false)}
      />
      <SubscribePromptModal userId={user.id} />
      <div className="relative z-10">
        <AppHeader
          activeView={activeView as "dashboard" | "timeline" | "tasks" | "kanban" | "details"}
          onViewChange={setActiveView}
          onBackToProjects={() => setSelectedProjectId(null)}
          onShowPricing={() => setActiveView("pricing")}
          onToggleSideTab={() => setSideTabOpen((p) => !p)}
          isSideTabOpen={sideTabOpen}
        />

        <ErrorBoundary fallbackTitle="SightLine Project Dashboard Encountered an Error">
          <main className="max-w-[1600px] mx-auto px-2.5 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 relative">
            {activeView === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 sm:space-y-4 md:space-y-5">
                <div className="space-y-2 sm:space-y-3">
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <StatusTicker />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <NotificationTicker />
                  </motion.div>
                </div>

                {/* 3-Column Reworked Grid (2-row stack per column) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-5 items-stretch">
                  {/* Column 1: Left Stack (md:col-span-3) - Top: Health & KPI, Bottom: Overall Progress Ring */}
                  <div className="md:col-span-3 flex flex-col gap-3 sm:gap-4 h-full">
                    <ProjectHealthCard />
                    <motion.div
                      className="glass-card p-3 sm:p-3.5 flex flex-col items-center justify-between flex-1 min-h-0 overflow-hidden"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.18 }}
                    >
                      {/* Top Header for Overall Progress */}
                      <div className="w-full flex items-center justify-between pb-1 border-b border-border/20 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          Overall Progress
                        </span>
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          {progress}%
                        </span>
                      </div>

                      {/* Dead-centered Status Circle */}
                      <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full my-auto py-1.5">
                        <ProgressRing progress={progress} size={92} strokeWidth={8} />
                      </div>

                      {/* Bottom Metric Counts - Strictly Contained Inside Box */}
                      <div className="grid grid-cols-3 gap-1.5 w-full pt-1.5 border-t border-border/30 text-center shrink-0">
                        <div className="py-1 px-1.5 rounded-lg bg-secondary/40">
                          <span className="text-[8px] uppercase font-bold text-muted-foreground block leading-tight">Done</span>
                          <span className="text-xs font-mono font-bold text-emerald-500 leading-tight">
                            {tasks.filter((t) => t.status === "Completed").length}
                          </span>
                        </div>
                        <div className="py-1 px-1.5 rounded-lg bg-secondary/40">
                          <span className="text-[8px] uppercase font-bold text-muted-foreground block leading-tight">Active</span>
                          <span className="text-xs font-mono font-bold text-amber-500 leading-tight">
                            {tasks.filter((t) => t.status === "Processing" || t.status === "Initiating").length}
                          </span>
                        </div>
                        <div className="py-1 px-1.5 rounded-lg bg-secondary/40">
                          <span className="text-[8px] uppercase font-bold text-muted-foreground block leading-tight">Queue</span>
                          <span className="text-xs font-mono font-bold text-muted-foreground leading-tight">
                            {tasks.filter((t) => t.status === "Planning").length}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Column 2: Center Stack (md:col-span-5) - Top: Key Milestones, Bottom: Ongoing Works */}
                  <div className="md:col-span-5 flex flex-col gap-3 sm:gap-4 h-full">
                    <motion.div
                      className="flex-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <MilestoneCountdown
                        onManageTimeline={() => {
                          setDetailsTab("timeline");
                          setActiveView("details");
                        }}
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.24 }}
                    >
                      <OngoingWorks
                        onOpenDetails={() => {
                          setDetailsTab("tasks");
                          setActiveView("details");
                        }}
                        onOpenTimeline={() => {
                          setActiveView("timeline");
                        }}
                      />
                    </motion.div>
                  </div>

                  {/* Column 3: Right Stack (md:col-span-4) - Top: Weather Widget, Bottom: Project Info Card */}
                  <div className="md:col-span-4 flex flex-col gap-3 sm:gap-4 h-full">
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                      <WeatherWidget />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex-1 flex flex-col h-full min-h-0"
                    >
                      <ProjectInfoCard
                        onEditDetails={() => {
                          setDetailsTab("info");
                          setActiveView("details");
                        }}
                      />
                    </motion.div>
                  </div>
                </div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <LiveNotifications />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <GanttChart
                    onManageTimeline={() => {
                      setDetailsTab("timeline");
                      setActiveView("details");
                    }}
                  />
                </motion.div>
                <EmailSubscription />
              </motion.div>
            )}

            {activeView === "timeline" && (
              <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GanttChart
                  onManageTimeline={() => {
                    setDetailsTab("timeline");
                    setActiveView("details");
                  }}
                />
              </motion.div>
            )}
            {activeView === "tasks" && (
              <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TaskList
                  onOpenDetails={() => {
                    setDetailsTab("tasks");
                    setActiveView("details");
                  }}
                />
              </motion.div>
            )}
            {activeView === "kanban" && (
              <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <KanbanBoard
                  onOpenDetails={() => {
                    setDetailsTab("tasks");
                    setActiveView("details");
                  }}
                />
              </motion.div>
            )}
            {activeView === "details" && (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ProjectDetailsPage
                  initialTab={detailsTab}
                  onBackToDashboard={() => setActiveView("dashboard")}
                  onNavigateView={(view) => setActiveView(view)}
                />
              </motion.div>
            )}
          </main>
        </ErrorBoundary>

        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-xs text-muted-foreground py-5 sm:py-6 px-3 border-t border-border/30">
          <p>Powered by <a href="https://www.fabulouzz.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Fabulouzz Technologies</a> • SightLine Project Command Center</p>
        </motion.footer>
      </div>

      {/* Hidable Side Tab Panel */}
      <DashboardSideTab
        isOpen={sideTabOpen}
        onClose={() => setSideTabOpen(false)}
        onNavigateToDetails={(tab) => {
          if (tab) setDetailsTab(tab);
          setActiveView("details");
        }}
        onNavigateToAdmin={() => navigate("/admin")}
        onShowPricing={() => setActiveView("pricing")}
        onBackToProjects={() => setSelectedProjectId(null)}
        user={user}
      />

      {/* Floating Edge Tab to open side tab when hidden */}
      {!sideTabOpen && (
        <motion.button
          onClick={() => setSideTabOpen(true)}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -4, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-card/90 backdrop-blur-md border border-r-0 border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary px-1.5 py-3.5 rounded-l-xl shadow-xl transition-all hidden md:flex flex-col items-center gap-1.5 group cursor-pointer"
          title="Open Project Operations & Quick Actions"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
            Operations
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
        </motion.button>
      )}

      <ScrollToTop />
    </div>
  );
};

export default Index;
