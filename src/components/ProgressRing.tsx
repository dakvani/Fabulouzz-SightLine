import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, CheckCircle2, Activity } from "lucide-react";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const AnimatedCounter = ({ value, delay = 0.5 }: { value: number; delay?: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.8,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, inView, delay]);

  return <span ref={ref}>{display}</span>;
};

const ProgressRing = ({ progress, size = 160, strokeWidth = 8, label }: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  const getStatusInfo = () => {
    if (progress >= 80) return { icon: CheckCircle2, text: "Almost There!", color: "text-completed" };
    if (progress >= 40) return { icon: Activity, text: "In Progress", color: "text-processing" };
    return { icon: TrendingUp, text: "Getting Started", color: "text-initiating" };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  // Generate tick marks
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const innerR = radius - (isMajor ? 6 : 3);
    const outerR = radius - 1;
    return {
      x1: center + innerR * Math.cos(rad),
      y1: center + innerR * Math.sin(rad),
      x2: center + outerR * Math.cos(rad),
      y2: center + outerR * Math.sin(rad),
      isMajor,
      index: i,
    };
  });

  // Glowing dot at progress tip
  const progressAngle = ((progress / 100) * 360 - 90) * (Math.PI / 180);
  const dotX = center + radius * Math.cos(progressAngle);
  const dotY = center + radius * Math.sin(progressAngle);

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Outer container with subtle pulse */}
      <div className="relative">
        {/* Ambient glow behind ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)`,
            width: size + 20,
            height: size + 20,
            left: -10,
            top: -10,
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg width={size} height={size} className="relative z-10 -rotate-90">
          <defs>
            {/* Gradient for the progress arc */}
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(var(--primary) / 0.85)" />
              <stop offset="100%" stopColor="hsl(142 71% 45%)" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="ringGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="hsl(var(--primary))" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Dot glow */}
            <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
          </defs>

          {/* Tick marks */}
          {ticks.map((tick) => (
            <motion.line
              key={tick.index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={`hsl(var(--${tick.isMajor ? "muted-foreground" : "border"}))`}
              strokeWidth={tick.isMajor ? 1.5 : 0.5}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: tick.isMajor ? 0.4 : 0.2 }}
              transition={{ delay: 0.3 + tick.index * 0.008 }}
            />
          ))}

          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--border) / 0.4)"
            strokeWidth={strokeWidth}
          />

          {/* Secondary subtle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary) / 0.08)"
            strokeWidth={strokeWidth + 4}
          />

          {/* Glow layer */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            opacity={0.12}
            filter="url(#ringGlow)"
          />

          {/* Main progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            filter="url(#ringGlow)"
          />

          {/* Glowing tip dot */}
          {progress > 0 && (
            <>
              <motion.circle
                cx={dotX}
                cy={dotY}
                r={strokeWidth / 2 + 4}
                fill="hsl(var(--primary))"
                filter="url(#dotGlow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 2.5 }}
              />
              <motion.circle
                cx={dotX}
                cy={dotY}
                r={strokeWidth / 2}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.2, type: "spring", stiffness: 200 }}
              />
            </>
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ width: size, height: size }}>
          <motion.div
            className="flex flex-col items-center gap-0.5"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 120 }}
          >
            <span className="text-3xl font-bold font-mono text-foreground tracking-tight">
              <AnimatedCounter value={progress} delay={0.6} />
              <span className="text-lg text-primary ml-0.5">%</span>
            </span>
            <motion.div
              className={`flex items-center gap-1 ${status.color}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <StatusIcon className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">{status.text}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Label with animated underline */}
      {label && (
        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em]">{label}</span>
          <motion.div
            className="h-[2px] rounded-full bg-primary/40"
            initial={{ width: 0 }}
            animate={{ width: 40 }}
            transition={{ delay: 1.3, duration: 0.5, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </div>
  );
};

export default ProgressRing;
