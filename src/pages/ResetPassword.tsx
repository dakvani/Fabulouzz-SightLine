import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserAuth } from "@/lib/auth/session";
import { sendBrandedEmail } from "@/lib/emailService";
import { toast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, ArrowRight, AlertTriangle, Mail } from "lucide-react";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

const ResetPassword = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fallback recovery request state
  const [requestEmail, setRequestEmail] = useState(searchParams.get("email") || "");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    setMounted(true);

    const initRecovery = async () => {
      // 0. Check for access_token and refresh_token in window.location.hash
      const hash = window.location.hash || "";
      if (hash.includes("access_token")) {
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.substring(1) : hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data?.session) {
              setSessionReady(true);
              return;
            }
          } catch (e) {
            console.warn("setSession error in reset-password:", e);
          }
        }
      }

      // 1. Check for PKCE code in query params
      const code = searchParams.get("code");
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            setSessionReady(true);
            return;
          }
        } catch (e) {
          console.warn("PKCE exchange error in reset-password:", e);
        }
      }

      // 2. Check for token_hash in query params
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (tokenHash && type === "recovery") {
        try {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (!error) {
            setSessionReady(true);
            return;
          }
        } catch (e) {
          console.warn("VerifyOtp error in reset-password:", e);
        }
      }

      // 3. Check for existing active session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      }
    };

    initRecovery();

    // 12-second generous window for token verification over mobile/slow networks
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 12000);

    // Listen for auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) {
        setSessionReady(true);
        clearTimeout(timer);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: userData, error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Password Updated", description: "Your account credentials have been successfully reset." });

      // Resolve role for automatic redirection
      if (userData?.user) {
        const auth = await resolveUserAuth(userData.user.id, userData.user.email);
        setUserRole(auth?.userRole || null);
      }
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) {
      toast({ title: "Email required", description: "Please enter your registered email address.", variant: "destructive" });
      return;
    }
    setRequesting(true);
    try {
      const res = await sendBrandedEmail({
        type: "reset_password",
        to: requestEmail.trim(),
        data: {
          resetUrl: "https://sightline.fabulouzz.com/reset-password",
          fullName: requestEmail.split("@")[0],
        },
      });
      setRequesting(false);
      if (res.success) {
        setRequestSent(true);
        toast({
          title: "Reset Link Sent",
          description: `Single-use recovery link dispatched to ${requestEmail.trim()} from info@fabulouzz.com.`,
        });
      } else {
        toast({ title: "Delivery Error", description: res.message || "Failed to dispatch reset link.", variant: "destructive" });
      }
    } catch (err: any) {
      setRequesting(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleProceed = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const auth = await resolveUserAuth(session?.user?.id, session?.user?.email);
      if (auth?.isSuperAdmin || auth?.isAdmin) {
        navigate("/admin", { replace: true });
      } else if (auth?.isProjectManager) {
        navigate("/?view=tasks", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          {mounted && (
            <img
              src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
              alt="Fabulouzz"
              className="h-8 w-auto"
            />
          )}
          <div className="flex flex-col border-l border-border/40 pl-3">
            <span className="text-xs font-bold tracking-wider text-primary" style={{ fontFamily: "'Neuropol X Free', sans-serif" }}>
              SIGHTLINE
            </span>
            <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.2em] uppercase">
              Command Center
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/85 backdrop-blur-xl border border-border/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-blue-500" />

          {success ? (
            <div className="text-center py-4 space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground">Password Reset Complete</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Your new password is now active. You are securely authenticated.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceed}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 group"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <span>Proceed to Command Center</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ) : !sessionReady ? (
            <div className="py-2 space-y-5 animate-in fade-in">
              {timedOut ? (
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <h1 className="text-xl font-bold text-foreground">Request Password Recovery</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      Enter your registered email to receive a fresh single-use verification link.
                    </p>
                  </div>

                  {requestSent ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                      <p className="text-xs font-semibold text-emerald-400">Fresh Recovery Link Dispatched!</p>
                      <p className="text-[11px] text-muted-foreground">
                        Please check your inbox at <strong>{requestEmail}</strong> and click the button to set your password.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestNewLink} className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Account Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="email"
                            required
                            value={requestEmail}
                            onChange={(e) => setRequestEmail(e.target.value)}
                            placeholder="admin@domain.com"
                            className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={requesting}
                        className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {requesting ? (
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>Send Fresh Recovery Link →</span>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => navigate("/?auth=login", { replace: true })}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Return to Login
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-center py-6">
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <h1 className="text-lg font-bold text-foreground">Verifying Secure Recovery Link...</h1>
                  <p className="text-xs text-muted-foreground">Validating single-use cryptographic token...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Security Verified</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Choose a strong, unique password for your SightLine account.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex justify-between">
                    <span>New Password</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Min 6 characters</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
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

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm new password"
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
                        <span>Update Password & Sign In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="mt-8 text-[11px] text-muted-foreground text-center">
          Provided by <a href="https://www.fabulouzz.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Fabulouzz Technologies</a>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
