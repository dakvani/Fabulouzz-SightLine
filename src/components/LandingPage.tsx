import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, Eye, EyeOff, ChevronDown, ChevronRight, Shield, Briefcase, Users, ArrowLeft, Home } from "lucide-react";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LandingPageProps {
  onAuthSuccess: () => void;
}

type RoleOption = "admin" | "pm_engineer" | "client";

const roleLabels: Record<RoleOption, { label: string; icon: typeof Shield }> = {
  admin: { label: "Admin", icon: Shield },
  pm_engineer: { label: "PM / Engineer", icon: Briefcase },
  client: { label: "Client", icon: Users },
};

const LandingPage = ({ onAuthSuccess }: LandingPageProps) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption>("client");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => setMounted(true), []);

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
        onAuthSuccess();
      }
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Connection error",
        description: "Unable to reach the server. Please check your internet connection.",
        variant: "destructive",
        action: (
          <button
            onClick={() => handleLogin()}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        ),
      });
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://fabulouzzsightline.lovable.app/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your inbox", description: "If you are a registered user, you will receive a password reset link shortly." });
        setMode("login");
      }
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Connection error",
        description: "Unable to reach the server. Please check your internet connection.",
        variant: "destructive",
        action: (
          <button
            onClick={() => handleForgotPassword()}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        ),
      });
    }
  };

  const CurrentRoleIcon = roleLabels[selectedRole].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* LEFT SIDE — Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-8 sm:py-10 lg:py-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-md w-full mx-auto"
        >
          {/* Small logo for left side */}
          <div className="flex items-center gap-2.5 mb-10">
            {mounted && (
              <img
                src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
                alt="Fabulouzz"
                className="h-8 w-auto"
              />
            )}
            <div className="flex flex-col border-l border-border/30 pl-2.5">
               <span
                 className="text-xs font-bold tracking-wide text-primary"
                style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
              >
                SIGHTLINE
              </span>
              <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                Command Center
              </span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">
            {mode === "login" ? "Welcome Back" : "Reset Password"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8">
            {mode === "login"
              ? "Sign in to your SightLine account"
              : "Enter your email to receive a reset link"}
          </p>

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
                {roleDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
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
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="Email"
                  className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

              <p className="text-center text-xs text-muted-foreground">
                Need access?{" "}
                <a href="https://www.fabulouzz.com/get-quote" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                  Contact Fabulouzz
                </a>
              </p>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="Email"
                  className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

          {/* Footer */}
          <p className="mt-10 text-xs text-muted-foreground">
            Powered by <a href="https://www.fabulouzz.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Fabulouzz Technologies</a>
          </p>
        </motion.div>
      </div>

      {/* RIGHT SIDE — Branding */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.08)] via-[hsl(var(--card))] to-[hsl(var(--primary)/0.05)]" />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/[0.04] blur-[100px]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 flex flex-col items-center text-center px-12"
        >
          {/* Company Logo — clickable to fabulouzz.com */}
          {mounted && (
            <motion.a
              href="https://www.fabulouzz.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-10 cursor-pointer"
              initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 150, damping: 15 }}
              whileHover={{ scale: 1.08, filter: "drop-shadow(0 0 16px hsl(142, 60%, 45%, 0.4))" }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
                alt="Fabulouzz Technologies"
                className="h-16 xl:h-20 w-auto"
              />
            </motion.a>
          )}

          {/* App Name — each letter pops up */}
          <div
            className="flex items-center justify-center tracking-[0.3em] text-4xl xl:text-5xl mb-3 font-bold"
            style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
          >
            {"SIGHTLINE".split("").map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block text-primary cursor-default"
                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                animate={{ 
                  opacity: 1, y: [0, -6, 0], scale: [1, 1.1, 1],
                }}
                transition={{ 
                  delay: 0.6 + i * 0.07, 
                  y: { delay: 1.5 + i * 0.12, duration: 1.8, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
                  scale: { delay: 1.5 + i * 0.12, duration: 1.8, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
                  opacity: { duration: 0.4 }
                }}
                whileHover={{ scale: 1.3, y: -6, color: "hsl(142, 60%, 55%)", transition: { duration: 0.15 } }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Command Center — staggered fade */}
          <div className="flex items-center justify-center tracking-[0.4em] uppercase text-lg xl:text-xl mb-8">
            {"Command Center".split("").map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block text-muted-foreground font-semibold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, y: [0, -4, 0],
                }}
                transition={{ 
                  delay: 1.3 + i * 0.03,
                  y: { delay: 2.8 + i * 0.08, duration: 1.6, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" },
                  opacity: { duration: 0.3 }
                }}
                whileHover={{ scale: 1.2, color: "hsl(142, 60%, 45%)", transition: { duration: 0.1 } }}
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </div>

          <motion.div
            className="w-20 h-[2px] mb-8"
            style={{ background: "var(--gradient-primary)" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.8, duration: 0.6 }}
          />

          <motion.p
            className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0 }}
          >
            Real-time project monitoring, intelligent task management, and seamless collaboration — all in one place.
          </motion.p>

          {/* Go Home button */}
          <motion.a
            href="https://www.fabulouzz.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full text-base font-semibold border-2 border-primary/40 text-primary hover:border-primary hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] transition-all duration-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: [
                "0 0 0px 0px hsl(142, 60%, 45%, 0)",
                "0 0 16px 2px hsl(142, 60%, 45%, 0.15)",
                "0 0 0px 0px hsl(142, 60%, 45%, 0)",
              ],
            }}
            transition={{
              delay: 1.0,
              boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
          >
            <Home className="w-5 h-5" />
            Go to Fabulouzz Home
            <ChevronRight className="w-5 h-5" />
          </motion.a>
        </motion.div>
      </div>

      {/* Mobile branding footer (visible only on small screens) */}
      <div className="lg:hidden flex flex-col items-center py-8 px-6 border-t border-border/30">
        <a
          href="https://www.fabulouzz.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Go to Fabulouzz Home
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
