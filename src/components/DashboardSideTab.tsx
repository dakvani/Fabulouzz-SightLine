import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Palette,
  Sliders,
  Shield,
  Crown,
  LogOut,
  Building2,
  ExternalLink,
  Sparkles,
  Check,
  LayoutDashboard,
  Layers,
  CheckCircle2,
  ChevronRight,
  User,
  Zap,
} from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { useThemeStyle, THEME_OPTIONS, type ThemeType } from "@/contexts/ThemeStyleContext";
import ExportReport from "./ExportReport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

interface DashboardSideTabProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDetails: (tab?: "info" | "timeline" | "tasks" | "branding" | "team") => void;
  onNavigateToAdmin: () => void;
  onShowPricing?: () => void;
  onBackToProjects?: () => void;
  user: any;
}

export const DashboardSideTab = ({
  isOpen,
  onClose,
  onNavigateToDetails,
  onNavigateToAdmin,
  onShowPricing,
  onBackToProjects,
  user,
}: DashboardSideTabProps) => {
  const { branding, subscriptionTier, isEnterprise, isPremium, isAdmin } = useBranding();
  const { projectInfo, canEditProject, userRole } = useProjectData();
  const { themeStyle, setThemeStyle } = useThemeStyle();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Signed out", description: "You have been logged out of SightLine." });
      onClose();
    } catch (err: any) {
      toast({ title: "Error signing out", description: err.message, variant: "destructive" });
    }
  };

  const isLight = themeStyle === "light";
  const defaultLogo = isLight ? fabulouzzLogoLight : fabulouzzLogo;
  const currentLogo = branding?.logo_url || defaultLogo;
  const companyName = branding?.company_name || projectInfo.company || "Fabulouzz Technologies";
  const tagline = branding?.tagline || "SightLine Project Command Center";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Side Drawer Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm sm:max-w-md bg-card/95 backdrop-blur-xl border-l border-border/60 z-50 flex flex-col justify-between shadow-2xl overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pr-[env(safe-area-inset-right,0px)]"
          >
            {/* ── TOP HEADER OF SIDE TAB ── */}
            <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground tracking-tight">
                    Project Command Suite
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Ref: {projectInfo.projectRef || "REF"} • Control Center
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg border border-border/40 bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Close side tab"
                aria-label="Close Operations Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── MIDDLE SCROLLABLE CONTENT (Arrowed items from screenshot) ── */}
            <div className="flex-1 touch-scroll-y p-4 sm:p-5 space-y-5">
              {/* SECTION 1: THEME SELECTOR (Light & Dark) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-primary" />
                    Liquid Glass Theme
                  </span>
                  <span className="text-[10px] font-mono text-primary font-semibold">
                    Light & Dark
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {THEME_OPTIONS.map((t) => {
                    const isSelected = themeStyle === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setThemeStyle(t.id as ThemeType)}
                        className={`flex flex-col gap-2 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/40 bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm flex items-center justify-center"
                            style={{ backgroundColor: t.accentColor }}
                          >
                            {isSelected && <Check className="w-2 h-2 text-white" />}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-mono uppercase font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground leading-tight">
                            {t.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.isDark ? "Dark Mode" : "Light Mode"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: REPORT EXPORT & ACTIONS */}
              <div className="space-y-2.5 pt-2 border-t border-border/30">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  Executive Actions
                </span>

                <div className="space-y-2">
                  {/* Export Executive PDF Report */}
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Executive PDF Report</p>
                      <p className="text-[10px] text-muted-foreground">
                        Instant status & telemetry digest
                      </p>
                    </div>
                    <ExportReport />
                  </div>

                  {/* Manage Project (Project Details) */}
                  {canEditProject ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateToDetails("info");
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-primary" />
                          <span>Manage Project Data & Scope</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </button>

                      {/* Manage Timeline & Duration */}
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateToDetails("timeline");
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/30 hover:bg-secondary/60 text-foreground transition-all text-xs font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          <span>Manage Timeline & Durations</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </>
                  ) : (
                    <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs flex items-center gap-2 font-medium">
                      <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>Client Monitoring Mode: Read-Only Project Access</span>
                    </div>
                  )}

                  {/* Admin Suite (Enterprise Admin Center) */}
                  {(isAdmin || userRole === "super_admin" || userRole === "admin") && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToAdmin();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/30 hover:bg-secondary/60 text-foreground transition-all text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>Enterprise Admin Suite</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}

                  {/* Project Switcher */}
                  {onBackToProjects && (
                    <button
                      type="button"
                      onClick={() => {
                        onBackToProjects();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all text-xs font-medium"
                    >
                      <span>Switch Project</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── BOTTOM OF SIDE TAB (Plan Status & Company Branding aligned firmly) ── */}
            <div className="p-4 sm:p-5 border-t border-border/40 bg-secondary/40 space-y-3 mt-auto">
              {/* Card 1: Plan Status */}
              <div className="p-3 rounded-xl bg-card border border-border/50 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Plan Status
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {isEnterprise ? "Enterprise Tier" : isPremium ? "Premium Plan" : "Free Explorer"}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-mono">
                    {isEnterprise
                      ? "Unrestricted Access • White-Label Enabled"
                      : "Upgrade for Custom Branding"}
                  </p>
                </div>

                {onShowPricing && (
                  <button
                    onClick={() => {
                      onShowPricing();
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-all flex items-center gap-1"
                  >
                    <span>{isEnterprise ? "Plans" : "Upgrade"}</span>
                  </button>
                )}
              </div>

              {/* Card 2: Company Branding */}
              <div className="p-3 rounded-xl bg-card border border-border/50 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Company Identity
                    </span>
                  </div>
                  {canEditProject && (
                    <button
                      onClick={() => {
                        onNavigateToDetails("branding");
                        onClose();
                      }}
                      className="text-[10px] font-semibold text-primary hover:underline"
                    >
                      Customize
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <img
                    src={currentLogo}
                    alt={companyName}
                    className="h-7 w-auto max-w-[80px] object-contain rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {companyName}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider truncate">
                      {tagline}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: User Session & Logout */}
              {user && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/20">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                      {user.email}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    title="Sign out of SightLine"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default DashboardSideTab;
