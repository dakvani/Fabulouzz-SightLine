import { motion } from "framer-motion";
import { Eye, BarChart3, List, LayoutGrid, LogIn, User } from "lucide-react";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";

interface AppHeaderProps {
  activeView: "dashboard" | "timeline" | "tasks" | "kanban";
  onViewChange: (view: "dashboard" | "timeline" | "tasks" | "kanban") => void;
}

const AppHeader = ({ activeView, onViewChange }: AppHeaderProps) => {
  const views = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "timeline" as const, label: "Timeline", icon: Eye },
    { id: "tasks" as const, label: "Tasks", icon: List },
    { id: "kanban" as const, label: "Kanban", icon: LayoutGrid },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50"
    >
      {/* Curved transparent background */}
      <div className="absolute inset-0 bg-card/30 backdrop-blur-2xl border-b border-primary/10" 
        style={{ 
          borderRadius: "0 0 24px 24px",
          boxShadow: "0 8px 32px -8px hsl(38, 92%, 55%, 0.1), inset 0 -1px 0 0 hsl(38, 92%, 55%, 0.08)"
        }} 
      />
      
      {/* Animated glow line at bottom */}
      <motion.div
        className="absolute bottom-0 left-1/2 h-[1px]"
        style={{ 
          background: "linear-gradient(90deg, transparent, hsl(38, 92%, 55%, 0.6), transparent)",
          borderRadius: "0 0 24px 24px"
        }}
        initial={{ width: 0, x: 0 }}
        animate={{ width: "60%", x: "-50%" }}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
        {/* Logo + Branding */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.img 
            src={fabulouzzLogo} 
            alt="Fabulouzz Technologies" 
            className="h-8 w-auto"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          />
          <div className="hidden sm:block border-l border-primary/20 pl-3">
            <h1 className="text-sm font-bold text-foreground tracking-tight">
              <span className="text-gradient">SightLine</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Project Command Center</p>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.nav 
          className="flex items-center bg-secondary/30 backdrop-blur-sm rounded-full p-1 border border-border/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {views.map((v, i) => (
            <motion.button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeView === v.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeView === v.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--gradient-primary)", boxShadow: "0 2px 12px -2px hsl(38, 92%, 55%, 0.4)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <v.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </span>
            </motion.button>
          ))}
        </motion.nav>

        {/* Login Button */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          style={{ boxShadow: "0 0 16px -4px hsl(38, 92%, 55%, 0.2)" }}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Login</span>
        </motion.button>
      </div>
    </motion.header>
  );
};

export default AppHeader;
