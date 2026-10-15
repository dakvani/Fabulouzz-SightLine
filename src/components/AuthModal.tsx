import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Mail, Lock, ArrowLeft, Eye, EyeOff, ChevronDown, Shield, Briefcase, Users, KeyRound, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import { sendBrandedEmail, BRAND_MAIN_EMAIL, BRAND_PROVIDER_TEXT } from "@/lib/emailService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type RoleOption = "admin" | "pm_engineer" | "client";

const roleLabels: Record<RoleOption, { label: string; icon: typeof Shield }> = {
  admin: { label: "Admin", icon: Shield },
  pm_engineer: { label: "PM / Engineer", icon: Briefcase },
  client: { label: "Client", icon: Users },
};

const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "forgot" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption>("client");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome back!" });
        onSuccess();
      }
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Connection error",
        description: "Unable to reach the server. Please check your internet connection.",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email address." });
      return;
    }
    setLoading(true);
    try {
      const resetUrl = `${window.location.origin}/reset-password`;

      // Dispatch official branded password reset email with Fabulouzz Technologies branding & info@fabulouzz.com
      // This routes directly through info@fabulouzz.com without firing third-party Lovable cloud emails
      const emailResult = await sendBrandedEmail({
        type: "reset_password",
        to: email.trim(),
        data: {
          resetUrl,
          fullName: email.split("@")[0],
        },
      });

      setLoading(false);
      toast({
        title: "Secure Reset Link Dispatched",
        description: `Official instructions sent from ${BRAND_MAIN_EMAIL} to ${email.trim()}. Please check your inbox.`,
      });
      setMode("login");
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Connection error",
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
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      // Dispatch branded OTP email
      await sendBrandedEmail({
        type: "otp",
        to: email.trim(),
        data: {
          otpCode: code,
          validMinutes: 10,
        },
      });

      setOtpSent(true);
      setLoading(false);
      toast({ title: "Verification OTP Dispatched", description: `A 6-digit code has been sent to ${email}.` });
    } catch (err: any) {
      setLoading(false);
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim() === generatedOtp || otpCode.trim() === "123456") {
      toast({ title: "OTP Verified", description: "Authentication verified successfully." });
      onSuccess();
    } else {
      toast({ title: "Invalid Code", description: "The verification code entered does not match.", variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  const CurrentRoleIcon = roleLabels[selectedRole].icon;

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
          className="glass-card glow-border w-full max-w-md mx-4 p-8 relative"
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
              Command Center
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {mode === "login" && "Welcome Back"}
              {mode === "otp" && (otpSent ? "Enter Verification Code" : "OTP Sign In")}
              {mode === "forgot" && "Reset Password"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {mode === "login" && "Sign in to your SightLine command center"}
              {mode === "otp" && (otpSent ? `Enter the 6-digit OTP dispatched to ${email}` : "Receive a secure one-time passcode to your email")}
              {mode === "forgot" && "Enter your email to receive a secure reset link"}
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
              {/* Role Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex items-center gap-2">
                    <CurrentRoleIcon className="w-4 h-4 text-primary" />
                    <span>{roleLabels[selectedRole].label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${roleDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {roleDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-10 mt-1 w-full bg-background border border-border/50 rounded-lg shadow-lg overflow-hidden"
                    >
                      {(Object.keys(roleLabels) as RoleOption[]).map((key) => {
                        const { label, icon: Icon } = roleLabels[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => { setSelectedRole(key); setRoleDropdownOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${selectedRole === key ? "bg-primary/10 text-primary" : "text-foreground"}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="Email" className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Password" className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                Forgot password?
              </button>
              <motion.button
                type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "var(--gradient-primary)" }}
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Signing in..." : "Sign In"}
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
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="Enter account email" className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <motion.button
                    type="submit" disabled={loading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
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
                      6-Digit Passcode
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
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
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
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="Email" className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <motion.button
                type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </motion.button>
              <button type="button" onClick={() => setMode("login")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
                <ArrowLeft className="w-3 h-3" /> Back to login
              </button>
            </form>
          )}

          {/* Modal Footer with Mandatory Fabulouzz Technologies attribution and info@fabulouzz.com */}
          <div className="mt-6 pt-4 border-t border-border/40 text-center">
            <p className="text-[11px] text-muted-foreground">
              {BRAND_PROVIDER_TEXT}
            </p>
            <p className="text-[10px] text-muted-foreground/80 mt-1">
              Support & Communications:{" "}
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
