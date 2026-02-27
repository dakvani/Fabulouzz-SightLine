import { motion } from "framer-motion";
import { Eye, BarChart3, List } from "lucide-react";

interface AppHeaderProps {
  activeView: "dashboard" | "timeline" | "tasks";
  onViewChange: (view: "dashboard" | "timeline" | "tasks") => void;
}

const AppHeader = ({ activeView, onViewChange }: AppHeaderProps) => {
  const views = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "timeline" as const, label: "Timeline", icon: Eye },
    { id: "tasks" as const, label: "Tasks", icon: List },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/50 bg-card/40 backdrop-blur-xl sticky top-0 z-50"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Eye className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight">
              Fabulouzz <span className="text-gradient">SightLine</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Project Command Center</p>
          </div>
        </div>

        <nav className="flex items-center bg-secondary/50 rounded-lg p-1">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === v.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </motion.header>
  );
};

export default AppHeader;
