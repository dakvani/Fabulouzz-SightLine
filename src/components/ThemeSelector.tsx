import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useThemeStyle } from "@/contexts/ThemeStyleContext";

export const ThemeSelector = () => {
  const { themeStyle, toggleTheme, isDark } = useThemeStyle();

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl hover:border-primary/50 text-foreground transition-all shadow-sm group cursor-pointer"
      title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      aria-label="Toggle Light and Dark Mode"
    >
      <div className="relative w-3.5 h-3.5 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-45 transition-transform duration-300" />
        )}
      </div>
      <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide hidden sm:inline text-foreground/90">
        {isDark ? "Dark" : "Light"}
      </span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isDark ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
        }`}
      />
    </motion.button>
  );
};

export default ThemeSelector;

