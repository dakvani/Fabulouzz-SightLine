import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  LayoutDashboard,
  CalendarRange,
  ListTodo,
  Kanban,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  Play,
  Pause,
  TrendingUp,
  CloudSun,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

type DemoTab = "dashboard" | "timeline" | "scopes" | "kanban";

const SCENE_DURATION_MS = 6000;

export const DashboardDemoShowcase = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "100px" });

  const [activeTab, setActiveTab] = useState<DemoTab>("dashboard");
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const tabs: { id: DemoTab; label: string; icon: any; tagline: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, tagline: "Executive Telemetry" },
    { id: "timeline", label: "Timeline", icon: CalendarRange, tagline: "Gantt Milestones" },
    { id: "scopes", label: "Scopes", icon: Layers, tagline: "Deliverable Checklist" },
    { id: "kanban", label: "Kanban", icon: Kanban, tagline: "Live Workflow" },
  ];

  // Auto-cycle through tabs seamlessly when in view and playing
  useEffect(() => {
    if (!isPlaying || !isInView) return;

    const interval = 50;
    const step = (interval / SCENE_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Switch to next tab
          setActiveTab((current) => {
            const idx = tabs.findIndex((t) => t.id === current);
            return tabs[(idx + 1) % tabs.length].id;
          });
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, isInView, tabs]);

  const handleSelectTab = useCallback((tab: DemoTab) => {
    setActiveTab(tab);
    setProgress(0);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-5xl mx-auto">
      {/* Outer Glow & Ambient liquid reflection */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/30 via-[hsl(var(--processing))]/20 to-primary/30 blur-2xl opacity-40 pointer-events-none transform-gpu" />

      {/* Main Glass Showcase Container */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-[#070b14]/75 backdrop-blur-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.2)] overflow-hidden transition-all">
        {/* ── WINDOW TITLEBAR / CONTROLS ── */}
        <div className="px-4 py-3 border-b border-white/15 dark:border-white/10 flex items-center justify-between bg-white/30 dark:bg-white/[0.03] backdrop-blur-xl">
          {/* macOS Window dots + URL pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-600/50 shadow-sm" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-600/50 shadow-sm" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-600/50 shadow-sm" />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 dark:border-white/10 bg-white/40 dark:bg-black/20 text-[11px] font-mono text-muted-foreground">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span>sightline.fabulouzz.com/projects/falcon-command</span>
            </div>
          </div>

          {/* Telemetry live status & Play/Pause */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
              Live Demo
            </div>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-1 rounded-lg border border-white/15 dark:border-white/10 hover:border-primary/40 bg-white/40 dark:bg-white/5 text-muted-foreground hover:text-foreground transition-all"
              title={isPlaying ? "Pause Auto-play" : "Resume Auto-play"}
              aria-label="Toggle demo playback"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-primary" />}
            </button>
          </div>
        </div>

        {/* ── SCENE NAVIGATION TABS (Edge Rounded Pill) ── */}
        <div className="px-3 sm:px-5 pt-3 pb-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar border-b border-white/10">
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/10 dark:bg-white/5 border border-white/15 dark:border-white/10 backdrop-blur-md">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? "text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="demoTabHighlight"
                      className="absolute inset-0 rounded-full"
                      style={{ background: "var(--gradient-primary)" }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-muted-foreground hidden md:flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            <span>Interactive 60FPS Command Surface</span>
          </div>
        </div>

        {/* ── DISPLAY SURFACE (SMOOTH TRANSITIONS) ── */}
        <div className="p-4 sm:p-6 min-h-[340px] sm:min-h-[380px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && <DashboardScene key="dashboard" />}
            {activeTab === "timeline" && <TimelineScene key="timeline" />}
            {activeTab === "scopes" && <ScopesScene key="scopes" />}
            {activeTab === "kanban" && <KanbanScene key="kanban" />}
          </AnimatePresence>

          {/* Continuous Progress Scrubber */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Phase: {tabs.find((t) => t.id === activeTab)?.tagline}
            </span>
            <div className="flex-1 max-w-[200px] h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-75 ease-linear rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>Auto-Playing Preview</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── 1. DASHBOARD SCENE ── */
const DashboardScene = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className="space-y-4"
  >
    {/* Top metric row */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Progress ring card */}
      <div className="p-3.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/30 dark:bg-white/[0.03] backdrop-blur-md flex items-center gap-3">
        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
          <svg className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r="23" stroke="currentColor" strokeWidth="4.5" className="text-white/10" fill="transparent" />
            <motion.circle
              cx="28"
              cy="28"
              r="23"
              stroke="hsl(var(--primary))"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={144.5}
              initial={{ strokeDashoffset: 144.5 }}
              animate={{ strokeDashoffset: 144.5 * (1 - 0.78) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <span className="absolute font-mono font-bold text-xs text-foreground">78%</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Overall Progress</p>
          <p className="text-sm font-extrabold text-foreground leading-tight">Phase 3 Structural</p>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">+12% ahead of plan</span>
        </div>
      </div>

      {/* Weather telemetry card */}
      <div className="p-3.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/30 dark:bg-white/[0.03] backdrop-blur-md flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
            <CloudSun className="w-3 h-3 text-amber-400" /> Site Climate
          </span>
          <p className="text-sm font-extrabold text-foreground mt-0.5">Dubai Command</p>
          <p className="text-[10px] text-muted-foreground font-mono">29°C • Clear Sky • Safe Winds</p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
          Optimal
        </span>
      </div>

      {/* Milestone countdown */}
      <div className="p-3.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/30 dark:bg-white/[0.03] backdrop-blur-md flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" /> Key Milestone
          </span>
          <p className="text-sm font-extrabold text-foreground mt-0.5">Glass Enclosure Delivery</p>
          <p className="text-[10px] text-primary font-mono font-bold">T-Minus 8 Days</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono text-xs font-bold">
          08
        </div>
      </div>
    </div>

    {/* Live tasks & Activity row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="p-3.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-foreground">
          <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /> Active Workstreams</span>
          <span className="text-[10px] font-mono text-muted-foreground">3 Ongoing</span>
        </div>

        <div className="space-y-1.5">
          {[
            { title: "Curtain Wall Glazing Inspection", owner: "Sarah PM", pct: 90, status: "Testing" },
            { title: "HVAC Dual-Chiller Integration", owner: "Lead Eng", pct: 65, status: "Active" },
            { title: "LEED Gold Sensor Verification", owner: "Eco Team", pct: 40, status: "Review" },
          ].map((t) => (
            <div key={t.title} className="p-2 rounded-lg bg-white/40 dark:bg-white/[0.03] border border-white/10 flex items-center justify-between text-[11px]">
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-foreground truncate">{t.title}</p>
                <p className="text-[9px] text-muted-foreground font-mono">{t.owner} • {t.pct}% complete</p>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary border border-primary/25 shrink-0">
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-foreground">
          <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Health Diagnostics</span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">100% On Track</span>
        </div>

        <div className="space-y-2 pt-1 text-[11px]">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Budget Burn Velocity</span>
              <span className="font-mono text-foreground font-semibold">68% ($1.42M / $2.1M)</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "68%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Safety & Compliance Compliance</span>
              <span className="font-mono text-foreground font-semibold">99.4% Zero Incidents</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "99.4%" }} />
            </div>
          </div>

          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>All critical deliverables cleared for client stakeholder sign-off</span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

/* ── 2. TIMELINE / GANTT SCENE ── */
const TimelineScene = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className="space-y-3"
  >
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <CalendarRange className="w-3.5 h-3.5 text-primary" />
          Interactive Gantt Execution Pipeline
        </h4>
        <p className="text-[10px] text-muted-foreground font-mono">Q3 - Q4 Critical Path Alignment</p>
      </div>
      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
        Milestone View
      </span>
    </div>

    {/* Gantt Schedule Rows */}
    <div className="space-y-2 border border-white/15 dark:border-white/10 rounded-xl p-3 bg-white/30 dark:bg-white/[0.02] backdrop-blur-md">
      {/* Month column headers */}
      <div className="grid grid-cols-12 gap-1 text-[9px] font-mono text-muted-foreground border-b border-white/10 pb-1.5">
        <span className="col-span-4 font-bold text-foreground">Workstream / Scope</span>
        <span className="col-span-2 text-center">Jul</span>
        <span className="col-span-2 text-center">Aug</span>
        <span className="col-span-2 text-center text-primary font-bold">Sep (Now)</span>
        <span className="col-span-2 text-center">Oct</span>
      </div>

      {[
        { name: "Piling & Substructure", startCol: "col-start-5", span: "col-span-3", pct: "100%", color: "bg-emerald-500" },
        { name: "Core Structural Framing", startCol: "col-start-6", span: "col-span-4", pct: "92%", color: "bg-primary" },
        { name: "Façade & Curtain Glazing", startCol: "col-start-8", span: "col-span-4", pct: "64%", color: "bg-cyan-500" },
        { name: "Interior Architectural Fitout", startCol: "col-start-9", span: "col-span-4", pct: "35%", color: "bg-indigo-500" },
      ].map((bar, i) => (
        <div key={bar.name} className="grid grid-cols-12 gap-1 items-center py-1">
          <div className="col-span-4 text-[11px] font-medium text-foreground truncate pr-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="truncate">{bar.name}</span>
          </div>

          <div className="col-span-8 relative h-6 bg-white/5 rounded-md overflow-hidden flex items-center px-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
              className={`h-4.5 rounded ${bar.color}/85 shadow-sm flex items-center justify-between px-2 text-[9px] font-bold text-white`}
              style={{ width: bar.pct }}
            >
              <span className="truncate">{bar.pct}</span>
              <CheckCircle2 className="w-2.5 h-2.5 shrink-0 ml-1" />
            </motion.div>
          </div>
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
      <span className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-400" /> Critical path dependencies synchronized with live site sensors
      </span>
      <span className="font-mono text-primary font-bold">Zero Delay Flagged</span>
    </div>
  </motion.div>
);

/* ── 3. SCOPES & DELIVERABLES SCENE ── */
const ScopesScene = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className="space-y-3"
  >
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Contractual Scope & Deliverables Matrix
        </h4>
        <p className="text-[10px] text-muted-foreground font-mono">Verified Against Master Specs</p>
      </div>
      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
        4 / 4 Scopes Clear
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {[
        { code: "SCP-01", title: "Acoustic Insulation & Glass Envelope", items: "14 / 14 Specs", stat: "Approved", pct: 100 },
        { code: "SCP-02", title: "BMS Automation & Sensor Grid", items: "19 / 20 Specs", stat: "In Audit", pct: 95 },
        { code: "SCP-03", title: "Emergency Backup Generator Substation", items: "8 / 8 Specs", stat: "Approved", pct: 100 },
        { code: "SCP-04", title: "Executive Penthouse Interior Fitout", items: "12 / 16 Specs", stat: "In Progress", pct: 75 },
      ].map((scope) => (
        <div key={scope.code} className="p-3 rounded-xl border border-white/15 dark:border-white/10 bg-white/30 dark:bg-white/[0.02] backdrop-blur-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-primary">{scope.code}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${scope.pct === 100 ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"}`}>
              {scope.stat}
            </span>
          </div>
          <p className="text-xs font-bold text-foreground leading-snug">{scope.title}</p>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
            <span>{scope.items}</span>
            <span className="font-mono text-foreground font-semibold">{scope.pct}%</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${scope.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

/* ── 4. KANBAN WORKFLOW SCENE ── */
const KanbanScene = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className="space-y-3"
  >
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Kanban className="w-3.5 h-3.5 text-primary" />
          Live Collaborative Kanban Board
        </h4>
        <p className="text-[10px] text-muted-foreground font-mono">Drag-and-Drop Workflow Execution</p>
      </div>
      <span className="text-[10px] font-mono text-primary font-semibold">Real-Time Sync</span>
    </div>

    {/* Kanban Columns */}
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {/* Col 1: Backlog / Planning */}
      <div className="p-2.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pb-1 border-b border-white/10">
          <span>Planning</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[9px] font-mono">1</span>
        </div>
        <div className="p-2 rounded-lg bg-white/40 dark:bg-white/[0.03] border border-white/10 shadow-sm space-y-1">
          <span className="text-[9px] font-mono uppercase text-indigo-400 font-bold">Procurement</span>
          <p className="text-[11px] font-semibold text-foreground leading-tight">Marble Slabs Shipment</p>
          <div className="flex items-center justify-between pt-1 text-[9px] text-muted-foreground">
            <span>Due in 14d</span>
            <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[9px] flex items-center justify-center">MS</span>
          </div>
        </div>
      </div>

      {/* Col 2: In Progress */}
      <div className="p-2.5 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-primary pb-1 border-b border-primary/20">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            In Progress
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-[9px] font-mono">2</span>
        </div>

        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="p-2 rounded-lg bg-white/50 dark:bg-white/[0.05] border border-primary/30 shadow-md space-y-1"
        >
          <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold">Façade</span>
          <p className="text-[11px] font-semibold text-foreground leading-tight">South Elevation Double Glaze</p>
          <div className="flex items-center justify-between pt-1 text-[9px] text-muted-foreground">
            <span className="text-primary font-bold">Active Crane 2</span>
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] flex items-center justify-center">PM</span>
          </div>
        </motion.div>
      </div>

      {/* Col 3: Completed */}
      <div className="p-2.5 rounded-xl border border-white/15 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pb-1 border-b border-white/10">
          <span>Completed</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono">3</span>
        </div>
        <div className="p-2 rounded-lg bg-white/40 dark:bg-white/[0.03] border border-white/10 shadow-sm space-y-1 opacity-80">
          <span className="text-[9px] font-mono uppercase text-muted-foreground font-bold">Structure</span>
          <p className="text-[11px] font-semibold text-foreground leading-tight line-through">Level 18 Concrete Pour</p>
          <div className="flex items-center justify-between pt-1 text-[9px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Passed Lab Test</span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default DashboardDemoShowcase;
