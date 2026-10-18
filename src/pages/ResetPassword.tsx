import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserAuth } from "@/lib/auth/session";
import { toast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, ArrowRight, Mail, KeyRound, AlertCircle } from "lucide-react";
import { useThemeStyle } from "@/contexts/ThemeStyleContext";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

const ResetPassword = () => {
  const { isDark } = useThemeStyle();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Prefill email if provided in query parameters or hash
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam.trim());
    } else {
      // Check if there is an active session with an email
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      });
    }
  }, [searchParams]);

  const handleDirectRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      const err = "Please enter a valid registered account email.";
      setErrorMessage(err);
      toast({ title: "Email Required", description: err, variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      const err = "Password must be at least 6 characters long.";
      setErrorMessage(err);
      toast({ title: "Password Too Short", description: err, variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      const err = "New password and confirmation password do not match.";
      setErrorMessage(err);
      toast({ title: "Passwords Mismatch", description: err, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Direct recovery via backend Edge Function (no expiring secure links or magic tokens required)
      const { data, error } = await supabase.functions.invoke("recover-password", {
        body: {
          email: cleanEmail,
          newPassword: password,
        },
      });

      if (error) {
        let displayError = "Failed to recover password. Please check your email.";
        try {
          if (error.context && typeof error.context.json === "function") {
            const errJson = await error.context.json();
            if (errJson?.error) displayError = errJson.error;
          } else if (error.message) {
            displayError = error.message;
          }
        } catch (_) {
          if (error.message) displayError = error.message;
        }
        setErrorMessage(displayError);
        toast({ title: "Recovery Error", description: displayError, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data?.error) {
        setErrorMessage(data.error);
        toast({ title: "Recovery Error", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Automatically sign the user in with their freshly recovered credentials
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      setLoading(false);
      setSuccess(true);
      toast({
        title: "Account Recovered Successfully",
        description: "Your password has been reset and you are now signed in.",
      });

      // Automatically redirect after brief display
      setTimeout(async () => {
        try {
          const userId = authData?.user?.id || data?.userId;
          const auth = await resolveUserAuth(userId, cleanEmail);
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
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || "An unexpected error occurred during password recovery.";
      setErrorMessage(msg);
      toast({ title: "Connection Error", description: msg, variant: "destructive" });
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
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          {mounted && (
            <img
              src={isDark ? fabulouzzLogo : fabulouzzLogoLight}
              alt="Fabulouzz"
              className="h-8 w-auto drop-shadow-sm"
            />
          )}
          <div className="flex flex-col border-l border-white/20 dark:border-white/10 pl-3">
            <span
              className="text-xs font-bold tracking-wider text-primary"
              style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
            >
              SIGHTLINE
            </span>
            <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.2em] uppercase">
              Command Center
            </span>
          </div>
        </div>

        {/* Liquid Glass Card Container */}
        <div className="liquid-glass-card rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-white/20 dark:border-white/10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-cyan-500" />

          {success ? (
            <div className="text-center py-4 space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground">Password Recovered</h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Your password has been successfully updated. You are now logged in and being redirected to the command deck.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceed}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <span>Proceed to Command Center</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Direct Account Recovery</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Account Password Recovery</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Enter your registered email and choose your new password to restore account access immediately.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleDirectRecovery} className="space-y-4">
                {/* Account Email */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="e.g. support@fabulouzz.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>
                </div>

                {/* New Password */}
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
                      className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Recover Password & Sign In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/?auth=login", { replace: true })}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  ← Return to Login
                </button>
              </div>
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
