import { motion } from "framer-motion";
import { CheckCircle2, Clock, Hammer, HardHat, Layers, TrendingUp } from "lucide-react";

const ganttBars = [
  { label: "Site Prep", width: "55%", left: "5%", color: "hsl(var(--completed))", delay: 0.8 },
  { label: "Foundation", width: "40%", left: "20%", color: "hsl(var(--processing))", delay: 1.0 },
  { label: "Structural", width: "50%", left: "30%", color: "hsl(var(--initiating))", delay: 1.2 },
  { label: "MEP Systems", width: "35%", left: "45%", color: "hsl(var(--info))", delay: 1.4 },
  { label: "Finishing", width: "30%", left: "60%", color: "hsl(var(--planning))", delay: 1.6 },
];

const statCards = [
  { icon: CheckCircle2, label: "Completed", value: "24", color: "text-[hsl(var(--completed))]" },
  { icon: Clock, label: "In Progress", value: "8", color: "text-[hsl(var(--processing))]" },
  { icon: TrendingUp, label: "On Track", value: "96%", color: "text-primary" },
];

const floatingTasks = [
  { text: "Concrete pour — Block C", status: "done", y: 0 },
  { text: "HVAC duct install — Level 3", status: "active", y: 0 },
  { text: "Electrical rough-in review", status: "pending", y: 0 },
];

const LandingHeroVisual = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 px-8 xl:px-14 select-none">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glows */}
        <motion.div
          className="absolute top-[10%] right-[5%] w-[45%] h-[45%] rounded-full bg-primary/[0.06] blur-[100px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.1, 0.06] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[10%] left-[0%] w-[40%] h-[40%] rounded-full bg-[hsl(var(--info))]/[0.04] blur-[80px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Top stat cards */}
      <motion.div
        className="relative z-10 flex gap-3 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="flex-1 glass-card p-3 flex flex-col items-center gap-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.12, type: "spring", stiffness: 200 }}
          >
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-lg font-bold text-foreground">{stat.value}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Mini Gantt chart */}
      <motion.div
        className="relative z-10 w-full max-w-md glass-card p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Project Timeline</span>
        </div>
        <div className="space-y-2">
          {ganttBars.map((bar, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-16 text-right font-medium truncate">
                {bar.label}
              </span>
              <div className="flex-1 h-5 bg-muted/50 rounded-md relative overflow-hidden">
                <motion.div
                  className="absolute top-0.5 bottom-0.5 rounded-sm"
                  style={{ backgroundColor: bar.color, left: bar.left }}
                  initial={{ width: 0 }}
                  animate={{ width: bar.width }}
                  transition={{ delay: bar.delay, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
        {/* Timeline axis labels */}
        <div className="flex justify-between mt-2 px-[4.5rem]">
          {["W1", "W4", "W8", "W12", "W16"].map((w) => (
            <span key={w} className="text-[8px] text-muted-foreground/60 font-mono">{w}</span>
          ))}
        </div>
      </motion.div>

      {/* Live task feed */}
      <motion.div
        className="relative z-10 w-full max-w-md glass-card p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Hammer className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Active Tasks</span>
          <motion.span
            className="ml-auto flex items-center gap-1 text-[9px] text-[hsl(var(--completed))] font-medium"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--completed))]" />
            LIVE
          </motion.span>
        </div>
        <div className="space-y-2">
          {floatingTasks.map((task, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/40 border border-border/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + i * 0.15, duration: 0.5 }}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.status === "done"
                    ? "bg-[hsl(var(--completed))]"
                    : task.status === "active"
                    ? "bg-[hsl(var(--processing))]"
                    : "bg-[hsl(var(--planning))]"
                }`}
              />
              <span className="text-[11px] text-foreground/80 font-medium truncate">{task.text}</span>
              <span
                className={`ml-auto text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                  task.status === "done"
                    ? "text-[hsl(var(--completed))] bg-[hsl(var(--completed))]/10"
                    : task.status === "active"
                    ? "text-[hsl(var(--processing))] bg-[hsl(var(--processing))]/10"
                    : "text-muted-foreground bg-muted/60"
                }`}
              >
                {task.status === "done" ? "Done" : task.status === "active" ? "Active" : "Queue"}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating construction icon */}
      <motion.div
        className="absolute top-8 right-8 z-0"
        animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <HardHat className="w-10 h-10 text-primary/10" />
      </motion.div>

      {/* Animated progress ring */}
      <motion.div
        className="absolute bottom-12 right-12 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" className="opacity-15">
          <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <motion.circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={175.9}
            strokeDashoffset={175.9}
            animate={{ strokeDashoffset: 175.9 * 0.04 }}
            transition={{ delay: 1.8, duration: 1.5, ease: "easeOut" }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default LandingHeroVisual;
