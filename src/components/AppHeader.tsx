import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Eye, BarChart3, List, LayoutGrid, LogIn, LogOut, Shield, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import AuthModal from "./AuthModal";
import AdminPanel from "./AdminPanel";
import ExportReport from "./ExportReport";

interface AppHeaderProps {
  activeView: "dashboard" | "timeline" | "tasks" | "kanban";
  onViewChange: (view: "dashboard" | "timeline" | "tasks" | "kanban") => void;
}

const useScrollDirection = () => {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y > lastScrollY.current && y > 60) setHidden(true);
      else if (y < lastScrollY.current) setHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { hidden, scrolled };
};

const AppHeader = ({ activeView, onViewChange }: AppHeaderProps) => {
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
      else setIsAdmin(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    setIsAdmin(data?.role === "admin");
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false); };

  const { hidden, scrolled } = useScrollDirection();
  const { theme, setTheme } = useTheme();

  const views = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "timeline" as const, label: "Timeline", icon: Eye },
    { id: "tasks" as const, label: "Tasks", icon: List },
    { id: "kanban" as const, label: "Kanban", icon: LayoutGrid },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: hidden ? -80 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`sticky top-2 z-50 mx-4 sm:mx-6 transition-all duration-300 ${scrolled ? "top-1 mx-2 sm:mx-3" : ""}`}
      >
        <div
          className={`absolute inset-0 backdrop-blur-2xl border border-border/40 transition-all duration-300 ${scrolled ? "bg-card/80" : "bg-card/40"}`}
          style={{
            borderRadius: scrolled ? "14px" : "20px",
            boxShadow: scrolled
              ? "0 4px 20px -4px hsl(var(--background) / 0.6)"
              : "0 2px 12px -2px hsl(var(--background) / 0.4)",
          }}
        />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          {/* Logo section - bigger SightLine, command center tagline */}
          <motion.div className="flex items-center gap-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <motion.img src={fabulouzzLogo} alt="Fabulouzz Technologies" className="h-9 w-auto" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400 }} />
            <div className="hidden sm:flex flex-col border-l border-primary/20 pl-3">
              <span className="text-sm font-bold tracking-wide" style={{ fontFamily: "'Neuropol X Free', sans-serif", color: '#2fbf2f' }}>SIGHTLINE</span>
              <span className="text-[9px] text-white/70 font-medium tracking-widest uppercase leading-tight">Command Center</span>
            </div>
          </motion.div>

          <motion.nav className="flex items-center bg-secondary/30 backdrop-blur-sm rounded-full p-1 border border-border/30" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            {views.map((v, i) => (
              <motion.button
                key={v.id}
                onClick={() => onViewChange(v.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeView === v.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {activeView === v.id && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 rounded-full" style={{ background: "var(--gradient-primary)", boxShadow: "0 2px 12px -2px hsl(var(--primary) / 0.4)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <v.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{v.label}</span>
                </span>
              </motion.button>
            ))}
          </motion.nav>

          <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <motion.button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </motion.button>
            <ExportReport />
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <motion.button onClick={() => setShowAdmin(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                    <Shield className="w-3.5 h-3.5" /><span className="hidden sm:inline">Admin</span>
                  </motion.button>
                )}
                <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
                <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border border-border/30 text-muted-foreground hover:text-foreground hover:border-destructive/30 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            ) : (
              <motion.button onClick={() => setShowAuth(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                <LogIn className="w-3.5 h-3.5" /><span className="hidden sm:inline">Login</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
};

export default AppHeader;
