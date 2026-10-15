import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

const ResetPassword = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setMounted(true);

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 4000);

    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
        clearTimeout(timer);
      }
    });

    // Also check if we already have a session (user clicked link and was auto-logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        clearTimeout(timer);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Password updated successfully!" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          {mounted && (
            <img
              src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
              alt="Fabulouzz"
              className="h-7 w-auto"
            />
          )}
          <div className="flex flex-col border-l border-border/30 pl-2.5">
            <span className="text-[10px] font-bold tracking-wide text-primary" style={{ fontFamily: "'Neuropol X Free', sans-serif" }}>
              SIGHTLINE
            </span>
            <span className="text-[7px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
              Command Center
            </span>
          </div>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Password Updated</h1>
            <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
            <a
              href="/?auth=login"
              className="inline-block mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Go to Login
            </a>
          </div>
        ) : !sessionReady ? (
          <div className="text-center space-y-4">
            {timedOut ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
                  ⚠️
                </div>
                <h1 className="text-xl font-bold text-foreground">Reset Link Verification</h1>
                <p className="text-sm text-muted-foreground">
                  No active password recovery session detected. Your link may have expired or already been used.
                </p>
                <div className="pt-2">
                  <a
                    href="/?auth=login"
                    className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    Request New Link or Login →
                  </a>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">Verifying Secure Link...</h1>
                <p className="text-sm text-muted-foreground">Validating single-use recovery token...</p>
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Set New Password</h1>
            <p className="text-sm text-muted-foreground mb-8 text-center">Enter your new password below.</p>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="New password"
                  className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </>
        )}

        <p className="mt-10 text-[10px] text-muted-foreground text-center">
          Powered by <a href="https://www.fabulouzz.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Fabulouzz Technologies</a>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
