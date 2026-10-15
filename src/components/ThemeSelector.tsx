import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, Sparkles, Moon, Sun, ChevronDown } from "lucide-react";
import { useThemeStyle, THEME_OPTIONS, ThemeType } from "@/contexts/ThemeStyleContext";

export const ThemeSelector = () => {
  const { themeStyle, setThemeStyle, currentMeta } = useThemeStyle();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/40 hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60 text-foreground transition-all shadow-sm"
        title="Switch Design Theme"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentMeta.accentColor }}
        />
        <span className="text-[10px] sm:text-[11px] font-semibold hidden md:inline">
          {currentMeta.name}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-64 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-2xl shadow-2xl p-2 z-[100] space-y-1"
          >
            <div className="px-2.5 py-1.5 border-b border-border/30 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-primary" />
                Select Design Theme
              </span>
              <span className="text-[9px] font-mono text-primary font-bold">3 Themes</span>
            </div>

            <div className="space-y-1 pt-1">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = themeStyle === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setThemeStyle(theme.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2.5 group ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-secondary/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-border/50"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground leading-snug truncate">
                            {theme.name}
                          </p>
                          {theme.isDark ? (
                            <Moon className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                          ) : (
                            <Sun className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">
                          {theme.tagline}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mr-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;
