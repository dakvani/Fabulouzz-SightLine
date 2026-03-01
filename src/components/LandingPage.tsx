import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, Eye, EyeOff, ChevronDown, ChevronRight, Shield, Briefcase, Users, ArrowLeft, Home } from "lucide-react";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import LandingHeroVisual from "@/components/landing/LandingHeroVisual";
import BlueprintBackground, { BlueprintGrid } from "@/components/landing/BlueprintBackground";
import MobileFooter from "@/components/landing/MobileFooter";

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      onAuthSuccess();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for a reset link." });
      setMode("login");
    }
  };

  const CurrentRoleIcon = roleLabels[selectedRole].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative">
      {/* Global blueprint background */}
      <BlueprintGrid />
      <BlueprintBackground />

      {/* LEFT SIDE — Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12 lg:py-0 relative z-10">
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
                className="h-7 w-auto"
              />
            )}
            <div className="flex flex-col border-l border-border/30 pl-2.5">
              <span
                className="text-[10px] font-bold tracking-wide text-primary"
                style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
              >
                SIGHTLINE
              </span>
              <span className="text-[7px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                Command Center
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {mode === "login" ? "Welcome Back" : "Reset Password"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
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
          <p className="mt-10 text-[10px] text-muted-foreground">
            Powered by <a href="https://www.fabulouzz.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Fabulouzz Technologies</a>
          </p>
        </motion.div>
      </div>

      {/* RIGHT SIDE — Interactive Project Visual */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.04)] via-background to-[hsl(var(--primary)/0.02)]">
        {/* Logo + branding overlay at top */}
        <div className="absolute top-8 left-8 right-8 z-20 flex items-center justify-between">
          {mounted && (
            <motion.a
              href="https://www.fabulouzz.com/"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
                alt="Fabulouzz Technologies"
                className="h-8 w-auto"
              />
            </motion.a>
          )}
        </div>

        {/* App name badge at top center */}
        <motion.div
          className="absolute top-8 left-0 right-0 z-20 flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div
            className="tracking-[0.3em] text-lg font-bold text-primary"
            style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
          >
            SIGHTLINE
          </div>
          <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.2em] uppercase">
            Command Center
          </span>
        </motion.div>

        {/* Main visual content */}
        <LandingHeroVisual />

        {/* Bottom CTA */}
        <motion.div
          className="absolute bottom-8 left-0 right-0 z-20 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
        >
          <a
            href="https://www.fabulouzz.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-300"
          >
            <Home className="w-3.5 h-3.5" />
            Go to Fabulouzz Home
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>

      {/* Mobile branding footer */}
      <MobileFooter />
    </div>
  );
};

export default LandingPage;
