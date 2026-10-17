import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Mail, Lock, ArrowLeft, Eye, EyeOff, Shield, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import { sendBrandedEmail, BRAND_MAIN_EMAIL, BRAND_PROVIDER_TEXT, getProductionPortalUrl } from "@/lib/emailService";
import { logAuditEvent } from "@/lib/auth/audit";
import { resolveUserAuth } from "@/lib/auth/session";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "forgot" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && isOpen) {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const authParam = params.get("auth");
      if (emailParam) setEmail(emailParam);
      if (authParam === "forgot" || authParam === "reset") {
        setMode("forgot");
      } else if (authParam === "otp") {
        setMode("otp");
      } else if (authParam === "login") {
        setMode("login");
      }
    }
  }, [isOpen]);

  const isLockedOut = (): boolean => {
    if (!lockoutUntil) return false;
    if (Date.now() < lockoutUntil) return true;
    setLockoutUntil(null);
    setFailedAttempts(0);
    return false;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (isLockedOut()) {
      const remainingSecs = Math.ceil((lockoutUntil! - Date.now()) / 1000);
      toast({
        title: "Account Temporarily Protected",
        description: `Too many unsuccessful login attempts. Please wait ${remainingSecs} seconds before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
          setLockoutUntil(lockTime);
          await logAuditEvent({
            action: "auth.rate_limit_locked",
            resourceType: "auth",
            actorEmail: cleanEmail,
            details: { failedAttempts: nextAttempts, lockDurationMinutes: LOCKOUT_MINUTES },
          });
          toast({
            title: "Security Cooldown Triggered",
            description: `Maximum login attempts exceeded. Access locked for ${LOCKOUT_MINUTES} minutes.`,
            variant: "destructive",
          });
        } else {
          await logAuditEvent({
            action: "auth.failed_login",
            resourceType: "auth",
            actorEmail: cleanEmail,
            details: { reason: error.message, attempt: nextAttempts },
          });
          toast({
            title: "Authentication Failed",
            description: "Invalid email or password. Please verify your credentials.",
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      const user = authData?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // Check account activation status
      const userAuth = await resolveUserAuth(user.id);
      if (userAuth && userAuth.status === "deactivated") {
        await supabase.auth.signOut();
        await logAuditEvent({
          action: "auth.deactivated_attempt",
          resourceType: "user",
          resourceId: user.id,
          actorEmail: cleanEmail,
          actorId: user.id,
          details: { status: "deactivated" },
        });
        setLoading(false);
        toast({
          title: "Account Deactivated",
          description: "This account has been deactivated. Please contact your System Administrator.",
          variant: "destructive",
        });
        return;
      }

      // Successful login
      setFailedAttempts(0);
      setLockoutUntil(null);

      // Record audit log
      await logAuditEvent({
        action: "auth.login_success",
        resourceType: "auth",
        resourceId: user.id,
        actorEmail: cleanEmail,
        actorId: user.id,
        details: { role: userAuth?.role || "client" },
      });

      // Update last_login_at in database
      supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id)
        .then();

      setLoading(false);
      toast({ title: "Authenticated Successfully", description: `Welcome back, ${userAuth?.fullName || cleanEmail}` });
      onSuccess();

      // Dispatch welcome notification
      const fullName = userAuth?.fullName || user.user_metadata?.full_name || cleanEmail.split("@")[0];
      const portalOrigin = getProductionPortalUrl();

      sendBrandedEmail({
        type: "welcome",
        to: cleanEmail,
        data: {
          fullName,
          loginUrl: `${portalOrigin}/`,
        },
      }).catch(() => {});
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Connection Error",
        description: "Unable to reach the authentication service. Please check your network connection.",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your registered email address." });
      return;
    }
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const portalOrigin = getProductionPortalUrl();
      const resetUrl = `${portalOrigin}/reset-password`;

      supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: resetUrl }).catch(() => {});

      await logAuditEvent({
        action: "auth.password_reset_requested",
        resourceType: "auth",
        actorEmail: cleanEmail,
        details: { resetUrl },
      });

      await sendBrandedEmail({
        type: "reset_password",
        to: cleanEmail,
        data: {
          resetUrl,
          fullName: cleanEmail.split("@")[0],
        },
      });

      setLoading(false);
      toast({
        title: "Secure Reset Link Dispatched",
        description: `Official instructions sent from ${BRAND_MAIN_EMAIL} to ${cleanEmail}. Please check your inbox.`,
      });
      setMode("login");
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Connection Error",
        description: "Unable to reach the server.",
        variant: "destructive",
      });
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email address to receive an OTP." });
      return;
    }
    setLoading(true);
    try {
      const cleanEmail = email.trim();

      // Request OTP via Supabase Auth
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      });

      // Also generate fallback verification code for email service
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      await sendBrandedEmail({
        type: "otp",
        to: cleanEmail,
        data: {
          otpCode: code,
          validMinutes: 10,
        },
      });

      setOtpSent(true);
      setLoading(false);
      toast({ title: "Verification OTP Dispatched", description: `A 6-digit secure code has been sent to ${cleanEmail}.` });
    } catch (err: any) {
      setLoading(false);
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim();
    const token = otpCode.trim();

    try {
      // 1. Try Supabase token verification
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: "email",
      });

      if (!error && data?.session) {
        await logAuditEvent({
          action: "auth.otp_verified",
          resourceType: "auth",
          actorEmail: cleanEmail,
          actorId: data.session.user.id,
          details: { method: "supabase_otp" },
        });

        toast({ title: "Authenticated", description: "OTP session verified successfully." });
        setLoading(false);
        onSuccess();
        return;
      }

      // 2. Fallback to generated OTP if applicable
      if (generatedOtp && token === generatedOtp) {
        await logAuditEvent({
          action: "auth.otp_verified",
          resourceType: "auth",
          actorEmail: cleanEmail,
          details: { method: "custom_otp" },
        });

        toast({ title: "Code Verified", description: "Secure passcode validated." });
        setLoading(false);
        onSuccess();
        return;
      }

      // Verification failed
      setLoading(false);
      await logAuditEvent({
        action: "auth.otp_failed",
        resourceType: "auth",
        actorEmail: cleanEmail,
        details: { tokenProvided: token.slice(0, 2) + "****" },
      });
      toast({ title: "Invalid Code", description: "The verification code is incorrect or expired.", variant: "destructive" });
    } catch (err: any) {
      setLoading(false);
      toast({ title: "Verification Error", description: err.message, variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="glass-card glow-border w-full max-w-md mx-3 sm:mx-4 p-5 sm:p-8 relative max-h-[90dvh] overflow-y-auto"
        >
          {/* Logo & App Name */}
          <div className="flex flex-col items-center mb-6">
            <img src={fabulouzzLogo} alt="Fabulouzz" className="h-8 mb-3" />
            <span
              className="text-primary font-bold tracking-[0.2em] text-sm mb-1"
              style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
            >
              SIGHTLINE
            </span>
            <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.15em] uppercase mb-3">
              Enterprise Command Center
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {mode === "login" && "Enterprise Sign In"}
              {mode === "otp" && (otpSent ? "Enter Verification Code" : "OTP Sign In")}
              {mode === "forgot" && "Reset Password"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {mode === "login" && "Enter your individual credentials to access your authorized tier"}
              {mode === "otp" && (otpSent ? `Enter the 6-digit OTP dispatched to ${email}` : "Receive a secure one-time passcode to your email")}
              {mode === "forgot" && "Enter your email to receive a verified password recovery link"}
            </p>
          </div>

          {/* Quick Mode Toggle */}
          {mode !== "forgot" && (
            <div className="flex rounded-lg bg-secondary/60 p-1 mb-4 border border-border/40">
              <button
                type="button"
                onClick={() => { setMode("login"); setOtpSent(false); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setMode("otp")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                  mode === "otp" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KeyRound className="w-3 h-3" /> OTP Code
              </button>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Enterprise RBAC: System Owner, Contractor Admin, PM & Client access.</span>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "var(--gradient-primary)" }}
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Authenticating..." : "Sign In"}
              </motion.button>
            </form>
          )}

          {mode === "otp" && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="Enter registered email"
                      className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <KeyRound className="w-4 h-4" />
                    {loading ? "Dispatching OTP..." : "Send Verification OTP"}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5 text-center">
                      6-Digit Secure Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      required
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 bg-secondary/50 border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    Verify & Access
                  </motion.button>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-primary hover:underline font-medium"
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="Enter account email"
                  className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </motion.button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Back to login
              </button>
            </form>
          )}

          {/* Modal Footer */}
          <div className="mt-6 pt-4 border-t border-border/40 text-center">
            <p className="text-[11px] text-muted-foreground">
              {BRAND_PROVIDER_TEXT}
            </p>
            <p className="text-[10px] text-muted-foreground/80 mt-1">
              Support & Administration:{" "}
              <a href={`mailto:${BRAND_MAIN_EMAIL}`} className="text-primary font-medium hover:underline">
                {BRAND_MAIN_EMAIL}
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
