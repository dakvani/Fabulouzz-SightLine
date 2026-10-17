import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserAuth } from "@/lib/auth/session";
import { ROLE_DEFINITIONS, normalizeRole, UserRole } from "@/lib/auth/roles";
import { CheckCircle2, ArrowRight, ShieldCheck, Compass, BarChart3, LayoutDashboard } from "lucide-react";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

const Welcome = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>(searchParams.get("email") || "");
  const [detectedRole, setDetectedRole] = useState<UserRole>(normalizeRole(searchParams.get("role")));
  const [isSessionActive, setIsSessionActive] = useState(false);

  useEffect(() => {
    setMounted(true);

    const initUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsSessionActive(true);
          setUserEmail(session.user.email || userEmail);
          const auth = await resolveUserAuth(session.user.id, session.user.email);
          if (auth) {
            setDetectedRole(auth.userRole);
          }
        }
      } catch (err) {
        console.warn("Welcome session init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  const roleDef = ROLE_DEFINITIONS[detectedRole];

  const handleLaunchApp = async () => {
    if (!isSessionActive) {
      navigate("/?auth=login&email=" + encodeURIComponent(userEmail), { replace: true });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const auth = await resolveUserAuth(session?.user?.id, session?.user?.email);

      if (auth?.isSuperAdmin || auth?.isAdmin) {
        navigate("/admin", { replace: true });
      } else if (auth?.isProjectManager) {
        navigate("/?view=tasks", { replace: true });
      } else {
        // Client or standard user
        navigate("/", { replace: true });
      }
    } catch {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          {mounted && (
            <img
              src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
              alt="Fabulouzz"
              className="h-8 w-auto"
            />
          )}
          <div className="flex flex-col border-l border-border/40 pl-3">
            <span
              className="text-xs font-bold tracking-wider text-primary uppercase"
              style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
            >
              SIGHTLINE
            </span>
            <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.2em] uppercase">
              Command Center
            </span>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="bg-card/85 backdrop-blur-xl border border-border/60 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-blue-500" />

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome to SightLine
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Your account is active and verified. You're ready to experience real-time project intelligence.
            </p>
          </div>

          {/* Account info pill */}
          <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 mb-6 space-y-2.5">
            {userEmail && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Registered User</span>
                <span className="font-semibold text-foreground">{userEmail}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Account Role</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${roleDef?.badgeColor}`}>
                {roleDef?.title || detectedRole.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Access Level</span>
              <span className="text-foreground font-medium">
                {roleDef?.tierName || "Verified Enterprise Tier"}
              </span>
            </div>
          </div>

          {/* Role Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="bg-secondary/20 border border-border/40 rounded-xl p-3.5 text-center">
              <LayoutDashboard className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-xs font-semibold text-foreground">Live Telemetry</div>
              <div className="text-[11px] text-muted-foreground mt-1">Real-time status rings & weather</div>
            </div>

            <div className="bg-secondary/20 border border-border/40 rounded-xl p-3.5 text-center">
              <BarChart3 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <div className="text-xs font-semibold text-foreground">Interactive Gantt</div>
              <div className="text-[11px] text-muted-foreground mt-1">S-curve progress & milestone gates</div>
            </div>

            <div className="bg-secondary/20 border border-border/40 rounded-xl p-3.5 text-center">
              <Compass className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <div className="text-xs font-semibold text-foreground">Executive Reports</div>
              <div className="text-[11px] text-muted-foreground mt-1">Publication-grade PDF export</div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleLaunchApp}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 group"
            style={{ background: "var(--gradient-primary)" }}
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <span>Provided by </span>
          <span className="text-foreground font-semibold">Fabulouzz Technologies</span>
          <span> • Questions? Contact </span>
          <a href="mailto:info@fabulouzz.com" className="text-primary hover:underline">
            info@fabulouzz.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
