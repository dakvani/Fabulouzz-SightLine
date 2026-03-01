import { motion } from "framer-motion";

// Animated project management background with Gantt bars, milestones, progress rings, and floating nodes
const ProjectManagementBackground = () => {
  // Gantt-like horizontal bars with staggered animation
  const ganttBars = [
    { y: "8%", width: "35%", x: "10%", delay: 0, color: "hsl(var(--primary))" },
    { y: "14%", width: "25%", x: "20%", delay: 0.5, color: "hsl(var(--primary))" },
    { y: "20%", width: "40%", x: "15%", delay: 1.0, color: "hsl(var(--primary))" },
    { y: "26%", width: "20%", x: "35%", delay: 1.5, color: "hsl(var(--primary))" },
    { y: "32%", width: "30%", x: "25%", delay: 2.0, color: "hsl(var(--primary))" },
    { y: "38%", width: "22%", x: "40%", delay: 2.5, color: "hsl(var(--primary))" },
  ];

  // Milestone diamonds
  const milestones = [
    { x: "45%", y: "8%", delay: 0.8 },
    { x: "45%", y: "20%", delay: 1.8 },
    { x: "55%", y: "32%", delay: 2.8 },
    { x: "62%", y: "38%", delay: 3.2 },
  ];

  // Floating task cards
  const taskCards = [
    { x: "60%", y: "50%", w: 120, h: 50, delay: 0.3, label: "Planning" },
    { x: "70%", y: "60%", w: 110, h: 50, delay: 1.2, label: "Design" },
    { x: "55%", y: "72%", w: 130, h: 50, delay: 2.1, label: "Execution" },
    { x: "75%", y: "80%", w: 100, h: 50, delay: 3.0, label: "Testing" },
  ];

  // Connecting dependency lines (SVG paths)
  const connections = [
    { x1: "45%", y1: "10%", x2: "45%", y2: "18%" },
    { x1: "45%", y1: "22%", x2: "55%", y2: "30%" },
    { x1: "55%", y1: "34%", x2: "62%", y2: "36%" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated grid lines - horizontal */}
      {[12, 24, 36, 48, 60, 72, 84].map((pct, i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute left-0 right-0 h-px"
          style={{ top: `${pct}%`, background: "hsl(var(--primary))" }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 0.04, scaleX: 1 }}
          transition={{ delay: i * 0.15, duration: 1.5 }}
        />
      ))}

      {/* Animated grid lines - vertical (timeline days) */}
      {[15, 30, 45, 60, 75, 90].map((pct, i) => (
        <motion.div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${pct}%`, background: "hsl(var(--primary))" }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 0.03, scaleY: 1 }}
          transition={{ delay: 0.5 + i * 0.12, duration: 1.2 }}
        />
      ))}

      {/* Gantt bars */}
      {ganttBars.map((bar, i) => (
        <motion.div
          key={`bar-${i}`}
          className="absolute h-[8px] rounded-full"
          style={{ top: bar.y, left: bar.x, background: bar.color }}
          initial={{ width: 0, opacity: 0 }}
          animate={{
            width: bar.width,
            opacity: [0, 0.15, 0.08, 0.12],
          }}
          transition={{
            delay: bar.delay,
            duration: 2,
            opacity: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}

      {/* Progress fill animation on gantt bars */}
      {ganttBars.map((bar, i) => (
        <motion.div
          key={`fill-${i}`}
          className="absolute h-[8px] rounded-full"
          style={{
            top: bar.y,
            left: bar.x,
            background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.3))`,
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: bar.width, opacity: 0.08 }}
          transition={{
            delay: bar.delay + 1,
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Milestone diamonds */}
      {milestones.map((m, i) => (
        <motion.div
          key={`ms-${i}`}
          className="absolute w-3 h-3 border border-primary/20"
          style={{ left: m.x, top: m.y, transform: "rotate(45deg)" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.2, 1],
            opacity: [0, 0.25, 0.12],
          }}
          transition={{
            delay: m.delay,
            duration: 1.5,
            opacity: { duration: 4, repeat: Infinity, repeatType: "reverse" },
          }}
        />
      ))}

      {/* SVG dependency arrows */}
      <svg className="absolute inset-0 w-full h-full">
        {connections.map((c, i) => (
          <motion.line
            key={`conn-${i}`}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 0.08, pathLength: 1 }}
            transition={{ delay: 1.5 + i * 0.6, duration: 2 }}
          />
        ))}
      </svg>

      {/* Floating task cards */}
      {taskCards.map((card, i) => (
        <motion.div
          key={`card-${i}`}
          className="absolute rounded-lg border border-primary/10 backdrop-blur-sm flex flex-col items-center justify-center"
          style={{
            left: card.x,
            top: card.y,
            width: card.w,
            height: card.h,
            background: "hsl(var(--primary) / 0.03)",
          }}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{
            opacity: [0, 0.15, 0.08, 0.12],
            y: [20, 0, -5, 0],
            scale: 1,
          }}
          transition={{
            delay: card.delay,
            duration: 6,
            y: { duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
            opacity: { duration: 8, repeat: Infinity, repeatType: "reverse" },
          }}
        >
          {/* Mini progress bar inside card */}
          <div className="w-3/4 h-1 rounded-full overflow-hidden mb-1.5" style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "hsl(var(--primary))" }}
              initial={{ width: "0%" }}
              animate={{ width: `${40 + i * 15}%` }}
              transition={{ delay: card.delay + 1, duration: 2, repeat: Infinity, repeatType: "reverse" }}
            />
          </div>
          <span className="text-[8px] font-semibold tracking-wider uppercase text-primary/30">
            {card.label}
          </span>
        </motion.div>
      ))}

      {/* Progress ring (large, centered-bottom) */}
      <motion.div
        className="absolute"
        style={{ left: "20%", bottom: "15%", width: 80, height: 80 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.1, scale: 1, rotate: 360 }}
        transition={{
          delay: 2,
          duration: 1.5,
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
      >
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.15" />
          <motion.circle
            cx="40" cy="40" r="34" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * 68}`}
            initial={{ strokeDashoffset: Math.PI * 68 }}
            animate={{ strokeDashoffset: Math.PI * 68 * 0.3 }}
            transition={{ delay: 2.5, duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <text x="40" y="43" textAnchor="middle" fill="hsl(var(--primary))" fontSize="12" fontWeight="bold" opacity="0.3">
            70%
          </text>
        </svg>
      </motion.div>

      {/* Second smaller progress ring */}
      <motion.div
        className="absolute"
        style={{ right: "10%", top: "65%", width: 50, height: 50 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.08, scale: 1, rotate: -360 }}
        transition={{
          delay: 3,
          duration: 1.5,
          rotate: { duration: 25, repeat: Infinity, ease: "linear" },
        }}
      >
        <svg viewBox="0 0 50 50" className="w-full h-full">
          <circle cx="25" cy="25" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.15" />
          <motion.circle
            cx="25" cy="25" r="20" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * 40}`}
            initial={{ strokeDashoffset: Math.PI * 40 }}
            animate={{ strokeDashoffset: Math.PI * 40 * 0.55 }}
            transition={{ delay: 3.5, duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        </svg>
      </motion.div>

      {/* Floating data points / schedule dots */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `${10 + (i % 6) * 16}%`,
            top: `${45 + Math.floor(i / 6) * 25}%`,
            background: "hsl(var(--primary))",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.2, 0.05, 0.15],
            scale: [0, 1.5, 1, 1.2],
          }}
          transition={{
            delay: 1 + i * 0.2,
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Timeline marker line (vertical, animated) */}
      <motion.div
        className="absolute w-0.5 rounded-full"
        style={{
          left: "50%",
          top: "5%",
          height: "40%",
          background: `linear-gradient(to bottom, transparent, hsl(var(--primary)), transparent)`,
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 0.06, scaleY: 1 }}
        transition={{ delay: 1, duration: 2 }}
      />

      {/* "Today" marker */}
      <motion.div
        className="absolute flex items-center gap-1"
        style={{ left: "48%", top: "4%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.15, 0.08, 0.15] }}
        transition={{ delay: 2, duration: 4, repeat: Infinity }}
      >
        <div className="w-2 h-2 rounded-full bg-primary/20" />
        <span className="text-[7px] font-bold uppercase tracking-wider text-primary/15">Today</span>
      </motion.div>
    </div>
  );
};

export default ProjectManagementBackground;
