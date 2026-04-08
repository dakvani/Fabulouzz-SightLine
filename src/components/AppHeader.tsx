import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Eye, BarChart3, List, LayoutGrid, LogIn, LogOut, Shield, Sun, Moon, ArrowLeft, Menu, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import { useBranding } from "@/contexts/BrandingContext";
import AuthModal from "./AuthModal";
import AdminPanel from "./AdminPanel";
import BrandingSettings from "./BrandingSettings";
import ExportReport from "./ExportReport";

interface AppHeaderProps {
  activeView: "dashboard" | "timeline" | "tasks" | "kanban";
  onViewChange: (view: "dashboard" | "timeline" | "tasks" | "kanban") => void;
  onBackToProjects?: () => void;
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

const AppHeader = ({ activeView, onViewChange, onBackToProjects }: AppHeaderProps) => {
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showBranding, setShowBranding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { branding, isPremium } = useBranding();

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
        className={`sticky top-2 z-50 mx-2 sm:mx-3 md:mx-5 transition-all duration-300 ${scrolled ? "top-1" : ""}`}
      >
        <div
          className={`absolute inset-0 backdrop-blur-xl border border-border/20 transition-all duration-300 ${scrolled ? "bg-background/30" : "bg-background/10"}`}
          style={{
            borderRadius: scrolled ? "14px" : "18px",
            boxShadow: scrolled
              ? "0 4px 24px -4px hsl(var(--foreground) / 0.06)"
              : "0 2px 16px -2px hsl(var(--foreground) / 0.03)",
          }}
        />

        <div className="max-w-[1600px] mx-auto px-2.5 sm:px-3 md:px-5 h-12 sm:h-14 flex items-center justify-between relative">
          {/* Left: Back + Logo */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {onBackToProjects && (
              <motion.button
                onClick={onBackToProjects}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium border border-border/20 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex-shrink-0"
                title="Back to Projects"
              >
                <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Projects</span>
              </motion.button>
            )}
            <motion.div className="flex items-center gap-2 cursor-pointer min-w-0" onClick={() => onViewChange("dashboard")} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              {isPremium && branding?.logo_url ? (
                <motion.img src={branding.logo_url} alt={branding.company_name || "Company"} className="h-6 sm:h-7 w-auto flex-shrink-0 object-contain" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400 }} />
              ) : (
                <motion.img src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight} alt="Fabulouzz Technologies" className="h-6 sm:h-7 w-auto flex-shrink-0" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400 }} />
              )}
              <div className="hidden md:flex flex-col border-l border-border/30 pl-2.5">
                {isPremium && branding?.company_name ? (
                  <>
                    <span className="text-base font-bold tracking-wide" style={{ fontFamily: "'Neuropol X Free', sans-serif", color: branding.accent_color || 'hsl(var(--primary))' }}>{branding.company_name.toUpperCase()}</span>
                    {branding.tagline && <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">{branding.tagline}</span>}
                  </>
                ) : (
                  <>
                    <span className="text-base font-bold tracking-wide" style={{ fontFamily: "'Neuropol X Free', sans-serif", color: 'hsl(var(--primary))' }}>SIGHTLINE</span>
                    <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">Command Center</span>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Center: Nav tabs — hidden on mobile, shown on sm+ */}
          <motion.nav className="hidden sm:flex items-center bg-background/20 backdrop-blur-sm rounded-full p-0.5 border border-border/20" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            {views.map((v, i) => (
              <motion.button
                key={v.id}
                onClick={() => onViewChange(v.id)}
                className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-colors ${activeView === v.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {activeView === v.id && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 rounded-full" style={{ background: "var(--gradient-primary)", boxShadow: "0 2px 12px -2px hsl(var(--primary) / 0.4)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  <v.icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{v.label}</span>
                </span>
              </motion.button>
            ))}
          </motion.nav>

          {/* Right actions */}
          <motion.div className="flex items-center gap-1 sm:gap-1.5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <motion.button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center w-7 h-7 rounded-full border border-border/20 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            </motion.button>
            <div className="hidden sm:block">
              <ExportReport />
            </div>
            {user ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {isAdmin && (
                  <motion.button onClick={() => setShowAdmin(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium border border-primary/20 text-primary hover:bg-primary/10 transition-colors">
                    <Shield className="w-3 h-3" /><span className="hidden md:inline">Admin</span>
                  </motion.button>
                )}
                <motion.button onClick={() => setShowBranding(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium border border-border/20 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                  <Building2 className="w-3 h-3" /><span className="hidden md:inline">Branding</span>
                </motion.button>
                <span className="text-[10px] text-muted-foreground hidden lg:inline">{user.email}</span>
                <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium border border-border/20 text-muted-foreground hover:text-foreground hover:border-destructive/30 transition-colors">
                  <LogOut className="w-3 h-3" />
                </motion.button>
              </div>
            ) : (
              <motion.button onClick={() => setShowAuth(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold border border-primary/20 text-primary hover:bg-primary/10 transition-colors">
                <LogIn className="w-3 h-3" /><span className="hidden sm:inline">Login</span>
              </motion.button>
            )}
            {/* Mobile hamburger menu */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.9 }}
              className="flex sm:hidden items-center justify-center w-7 h-7 rounded-full border border-border/20 text-muted-foreground hover:text-foreground transition-colors"
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </motion.button>
          </motion.div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden relative z-10 px-3 pb-3"
          >
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { onViewChange(v.id); setMobileMenuOpen(false); }}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-medium transition-all ${
                    activeView === v.id
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                  } relative`}
                >
                  {activeView === v.id && (
                    <div className="absolute inset-0 rounded-xl" style={{ background: "var(--gradient-primary)" }} />
                  )}
                  <v.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{v.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-border/20">
              <ExportReport />
            </div>
          </motion.div>
        )}
      </motion.header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
};

export default AppHeader;
