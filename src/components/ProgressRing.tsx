import { motion } from "framer-motion";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const ProgressRing = ({ progress, size = 160, strokeWidth = 10, label }: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* SVG Ring with perfectly centered percentage */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="progress-ring -rotate-90 origin-center"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border) / 0.4)"
            strokeWidth={strokeWidth}
          />
          {/* Subtle Glow effect */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
            opacity={0.25}
            filter="blur(3px)"
          />
          {/* Animated Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.span
            className={`${
              size <= 95
                ? "text-lg sm:text-xl font-extrabold"
                : size <= 125
                ? "text-xl sm:text-2xl font-extrabold"
                : "text-2xl sm:text-3xl font-extrabold"
            } font-mono text-foreground tracking-tight`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {progress}%
          </motion.span>
        </div>
      </div>

      {label && (
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
          {label}
        </span>
      )}
    </div>
  );
};

export default ProgressRing;
