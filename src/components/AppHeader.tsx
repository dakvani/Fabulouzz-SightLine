import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  BarChart3,
  List,
  LayoutGrid,
  LogIn,
  LogOut,
  Shield,
  Sun,
  Moon,
  ArrowLeft,
  Menu,
  X,
  Building2,
  Crown,
  Briefcase,
  Sliders,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeStyle } from "@/contexts/ThemeStyleContext";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import { useBranding } from "@/contexts/BrandingContext";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { ROLE_DEFINITIONS } from "@/lib/auth/roles";
import AuthModal from "./AuthModal";
import ExportReport from "./ExportReport";
import ThemeSelector from "./ThemeSelector";

interface AppHeaderProps {
  activeView: "dashboard" | "timeline" | "tasks" | "kanban" | "details" | "pricing";
  onViewChange: (view: any) => void;
  onBackToProjects?: () => void;
  onShowPricing?: () => void;
  onToggleSideTab?: () => void;
  isSideTabOpen?: boolean;
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

const AppHeader = ({
  activeView,
  onViewChange,
  onBackToProjects,
  onShowPricing,
  onToggleSideTab,
  isSideTabOpen,
}: AppHeaderProps) => {
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { branding, isPremium } = useBranding();
  const { canEditProject, userRole, isSuperAdmin, isAdmin: ctxIsAdmin } = useProjectData();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdministrative = isSuperAdmin || ctxIsAdmin;

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  const { hidden, scrolled } = useScrollDirection();
  const { isDark } = useThemeStyle();

  const views = useMemo(() => {
    const base: { id: "dashboard" | "timeline" | "tasks" | "kanban" | "details"; label: string; icon: any }[] = [
      { id: "dashboard", label: "Dashboard", icon: BarChart3 },
      { id: "timeline", label: "Timeline", icon: Eye },
      { id: "tasks", label: "Tasks", icon: List },
      { id: "kanban", label: "Kanban", icon: LayoutGrid },
    ];
    if (canEditProject) {
      base.push({ id: "details", label: "Project Details", icon: Sliders });
    }
    return base;
  }, [canEditProject]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: hidden ? -90 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-2 sm:top-3.5 z-50 mx-auto max-w-7xl px-2 sm:px-4 transition-all duration-300 pointer-events-none"
      >
        <div className="pointer-events-auto liquid-header-pill rounded-full sm:rounded-2xl px-3 sm:px-5 h-13 sm:h-14 flex items-center justify-between shadow-2xl transition-all">
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
            <motion.div
              className="flex items-center gap-2 cursor-pointer min-w-0"
              onClick={() => onViewChange("dashboard")}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {isPremium && branding?.logo_url ? (
                <motion.img
                  src={branding.logo_url}
                  alt={branding.company_name || "Company"}
                  className="h-6 sm:h-7 w-auto flex-shrink-0 object-contain"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                />
              ) : (
                <motion.img
                  src={isDark ? fabulouzzLogo : fabulouzzLogoLight}
                  alt="Fabulouzz Technologies"
                  className="h-6 sm:h-7 w-auto flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                />
              )}
              <div className="hidden md:flex flex-col border-l border-border/30 pl-2.5">
                {isPremium && branding?.company_name ? (
                  <>
                    <span
                      className="text-base font-bold tracking-wide"
                      style={{
                        fontFamily: "'Neuropol X Free', sans-serif",
                        color: branding.accent_color || "hsl(var(--primary))",
                      }}
                    >
                      {branding.company_name.toUpperCase()}
                    </span>
                    {branding.tagline && (
                      <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                        {branding.tagline}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span
                      className="text-base font-bold tracking-wide"
                      style={{
                        fontFamily: "'Neuropol X Free', sans-serif",
                        color: "hsl(var(--primary))",
                      }}
                    >
                      SIGHTLINE
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                      Command Center
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Center: Nav tabs — hidden on mobile, shown on sm+ */}
          <motion.nav
            className="hidden sm:flex items-center bg-background/20 backdrop-blur-sm rounded-full p-0.5 border border-border/20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {views.map((v, i) => (
              <motion.button
                key={v.id}
                onClick={() => onViewChange(v.id)}
                className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-colors ${
                  activeView === v.id
                    ? "text-primary-foreground font-semibold"
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
                    style={{
                      background: "var(--gradient-primary)",
                      boxShadow: "0 2px 12px -2px hsl(var(--primary) / 0.4)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  <v.icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{v.label}</span>
                </span>
              </motion.button>
            ))}
          </motion.nav>

          {/* Right actions */}
          <motion.div
            className="flex items-center gap-1.5 sm:gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Quick Liquid Glass Theme Switcher (Light & Dark) */}
            <ThemeSelector />

            {user ? (
              <motion.button
                onClick={onToggleSideTab}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 min-h-[36px] rounded-full text-[11px] font-semibold border transition-all shadow-sm ${
                  isSideTabOpen
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60"
                }`}
                title="Open Control Suite (Themes, Export Reports, Manage Project, Admin Suite, Plan Status)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Operations Menu</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </motion.button>
            ) : (
              <motion.button
                onClick={() => setShowAuth(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-[11px] font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </motion.button>
            )}

            {/* Mobile hamburger menu */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle Navigation Menu"
              className="flex sm:hidden items-center justify-center w-8 h-8 min-h-[36px] min-w-[36px] rounded-xl border border-border/20 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
            <div className="grid grid-cols-5 gap-1.5 mt-1">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    onViewChange(v.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-[44px] rounded-xl text-[9px] font-medium transition-all ${
                    activeView === v.id
                      ? "text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                  } relative`}
                >
                  {activeView === v.id && (
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "var(--gradient-primary)" }}
                    />
                  )}
                  <v.icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 truncate w-full text-center">
                    {v.id === "details" ? "Details" : v.label}
                  </span>
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
    </>
  );
};

export default AppHeader;
