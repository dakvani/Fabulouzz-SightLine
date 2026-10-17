import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserAuth } from "@/lib/auth/session";
import { ROLE_DEFINITIONS, normalizeRole, UserRole } from "@/lib/auth/roles";
import { Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, ArrowRight, UserCheck, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

const Onboarding = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Email and user context from URL or session
  const paramEmail = searchParams.get("email") || "";
  const paramRole = searchParams.get("role") || "";
  const paramName = searchParams.get("name") || "";
  const paramTemp = searchParams.get("temp") || searchParams.get("password") || "";

  const [email, setEmail] = useState(paramEmail);
  const [fullName, setFullName] = useState(paramName);
  const [detectedRole, setDetectedRole] = useState<UserRole>(normalizeRole(paramRole));

  // Form states
  const [tempPassword, setTempPassword] = useState(paramTemp);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"setup" | "success">("setup");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    const checkCurrentSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          const u = session.user;
          if (u.email) setEmail(u.email);
          if (u.user_metadata?.full_name) setFullName(u.user_metadata.full_name);

          // Resolve authoritative role from database
          const authRes = await resolveUserAuth(u.id, u.email);
          if (authRes) {
            setDetectedRole(authRes.userRole);
          }
        }
      } catch (err) {
        console.warn("Session check in onboarding:", err);
      } finally {
        setSessionChecking(false);
      }
    };

    checkCurrentSession();

    // Listen for auth state changes (e.g. if token was in hash fragment and Supabase auto-signed in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        if (session.user.email) setEmail(session.user.email);
        if (session.user.user_metadata?.full_name) setFullName(session.user.user_metadata.full_name);
        const authRes = await resolveUserAuth(session.user.id, session.user.email);
        if (authRes) {
          setDetectedRole(authRes.userRole);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const roleDef = ROLE_DEFINITIONS[detectedRole];

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // If user is not yet signed in, sign them in with their temporary password first
      if (!isAuthenticated) {
        if (!email.trim() || !tempPassword) {
          setErrorMessage("Please enter your email and temporary password from your invitation email.");
          setLoading(false);
          return;
        }

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: tempPassword,
        });

        if (signInErr) {
          setErrorMessage(`Authentication failed: ${signInErr.message}. Please verify your temporary password.`);
          setLoading(false);
          return;
        }
      }

      // Update password to the new permanent password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
          full_name: fullName.trim() || undefined,
        },
      });

      if (updateErr) {
        setErrorMessage(updateErr.message);
        setLoading(false);
        return;
      }

      setStep("success");
      toast({
        title: "Account Activated",
        description: "Your permanent password has been set. Welcome to SightLine!",
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToWorkspace = async () => {
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-lg w-full relative z-10">
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

        {/* Main Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-blue-500" />

          {step === "success" ? (
            <div className="text-center py-4 space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome to SightLine!</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Your account has been fully activated and secured.
                </p>
              </div>

              <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Activated Account</span>
                  <span className="font-semibold text-foreground">{email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Authorized Role</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${roleDef?.badgeColor}`}>
                    {roleDef?.title || detectedRole.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Privilege Scope</span>
                  <span className="text-muted-foreground font-medium">
                    {roleDef?.isProjectScoped ? "Assigned Projects Only" : "All Operational Modules"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToWorkspace}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 group"
                style={{ background: "var(--gradient-primary)" }}
              >
                <span>Enter Your Command Center</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Team Onboarding & Setup</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {fullName ? `Welcome, ${fullName}` : "Welcome to SightLine"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Complete your initial setup to access project timelines, Gantt charts, and live monitoring.
                </p>
              </div>

              {/* Role Context Pill - Non-editable, assigned by Administrator */}
              <div className="mb-6 bg-secondary/30 border border-border/40 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        {roleDef?.title || detectedRole.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">(Admin Assigned)</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {roleDef?.tierName || "Enterprise Authorized Tier"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${roleDef?.badgeColor}`}>
                    {detectedRole.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={isAuthenticated || !!paramEmail}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  />
                </div>

                {/* If not authenticated yet, prompt for temporary/given password from the administrator */}
                {!isAuthenticated && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 flex justify-between">
                      <span>Given / Temporary Password</span>
                      <span className="text-[11px] text-muted-foreground font-normal">From your invitation notice</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        required
                        placeholder="Enter password provided by administrator"
                        className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                )}

                {/* New Permanent Password */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex justify-between">
                    <span>Create Permanent Password</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Min 6 characters</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter new strong password"
                      className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Permanent Password */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Confirm Permanent Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Activate Account & Continue</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <span>Need assistance? Contact </span>
          <a href="mailto:info@fabulouzz.com" className="text-primary hover:underline font-medium">
            info@fabulouzz.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
