import { motion } from "framer-motion";
import { CheckCircle2, Clock, TrendingUp, Home, ChevronRight, Layers, Hammer, HardHat } from "lucide-react";

const miniStats = [
  { icon: CheckCircle2, label: "Completed", value: "24", color: "text-[hsl(var(--completed))]" },
  { icon: Clock, label: "In Progress", value: "8", color: "text-[hsl(var(--processing))]" },
  { icon: TrendingUp, label: "On Track", value: "96%", color: "text-primary" },
];

const miniTasks = [
  { text: "Concrete pour — Block C", status: "done" },
  { text: "HVAC duct install — L3", status: "active" },
];

const MobileFooter = () => {
  return (
    <div className="lg:hidden flex flex-col items-center gap-5 py-8 px-6 border-t border-border/30 relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Mini stat strip */}
      <motion.div
        className="relative z-10 flex gap-3 w-full max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {miniStats.map((stat, i) => (
          <div key={stat.label} className="flex-1 glass-card p-2.5 flex flex-col items-center gap-0.5">
            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            <span className="text-sm font-bold text-foreground">{stat.value}</span>
            <span className="text-[8px] text-muted-foreground font-medium">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Mini task feed */}
      <motion.div
        className="relative z-10 w-full max-w-sm glass-card p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Hammer className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Live Tasks</span>
          <motion.span
            className="ml-auto flex items-center gap-1 text-[8px] text-[hsl(var(--completed))] font-medium"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="w-1 h-1 rounded-full bg-[hsl(var(--completed))]" />
            LIVE
          </motion.span>
        </div>
        <div className="space-y-1.5">
          {miniTasks.map((task, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 border border-border/30">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  task.status === "done" ? "bg-[hsl(var(--completed))]" : "bg-[hsl(var(--processing))]"
                }`}
              />
              <span className="text-[10px] text-foreground/80 font-medium truncate">{task.text}</span>
              <span
                className={`ml-auto text-[8px] font-semibold uppercase px-1 py-0.5 rounded ${
                  task.status === "done"
                    ? "text-[hsl(var(--completed))] bg-[hsl(var(--completed))]/10"
                    : "text-[hsl(var(--processing))] bg-[hsl(var(--processing))]/10"
                }`}
              >
                {task.status === "done" ? "Done" : "Active"}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.a
        href="https://www.fabulouzz.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Home className="w-3.5 h-3.5" />
        Go to Fabulouzz Home
        <ChevronRight className="w-3.5 h-3.5" />
      </motion.a>
    </div>
  );
};

export default MobileFooter;
