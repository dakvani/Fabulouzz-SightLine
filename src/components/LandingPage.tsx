import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  LogIn, Mail, Lock, Eye, EyeOff, ChevronDown, ChevronRight,
  Shield, Briefcase, Users, ArrowLeft, Home,
  BarChart3, Kanban, CalendarRange, Bell, FileText, Palette,
  Zap, Clock, Globe, Crown, CheckCircle2, ArrowRight,
  LayoutDashboard, ListTodo, GanttChart, Activity,
  Sparkles, TrendingUp, Lock as LockIcon, AlertCircle, ShieldCheck,
  Quote, Star, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon
} from "lucide-react";
import { useThemeStyle } from "@/contexts/ThemeStyleContext";
import { ThemeSelector } from "./ThemeSelector";
import { DashboardDemoShowcase } from "./DashboardDemoShowcase";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sendBrandedEmail, BRAND_MAIN_EMAIL, BRAND_PROVIDER_TEXT, getProductionPortalUrl } from "@/lib/emailService";

interface LandingPageProps {
  onAuthSuccess: () => void;
}

const useScrollDirection = () => {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y > lastScrollY.current && y > 60) {
        setHidden(true);
      } else if (y < lastScrollY.current) {
        setHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { hidden, scrolled };
};

/* ── Animated section wrapper ── */
const AnimatedSection = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ── Feature card ── */
const FeatureCard = ({ icon: Icon, title, desc, delay, gradient }: { icon: any; title: string; desc: string; delay: number; gradient: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.25 } }}
      className="group relative liquid-glass-card p-7 sm:p-9 rounded-3xl overflow-hidden cursor-default shadow-xl shadow-black/5 dark:shadow-black/20"
    >
      <div className={`absolute top-0 left-0 w-full h-1.5 ${gradient}`} />
      <div className="absolute top-0 right-0 w-44 h-44 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[80px] bg-primary/20 pointer-events-none" />
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:scale-105 transition-all">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{title}</h3>
        <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
};

/* ── Floating badge ── */
const FloatingBadge = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    className={`absolute glass-card px-3 py-2 text-xs font-semibold flex items-center gap-2 shadow-lg ${className}`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
    transition={{
      delay,
      y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 },
    }}
  >
    {children}
  </motion.div>
);

/* ── Stat counter ── */
const StatCounter = ({ value, label, suffix = "", delay = 0 }: { value: number; label: string; suffix?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), delay * 1000);
    return () => clearTimeout(timer);
  }, [isInView, value, delay]);

  return (
    <div ref={ref} className="text-center py-2">
      <div className="text-4xl sm:text-5xl md:text-6xl font-black text-primary tracking-tight">{count}{suffix}</div>
      <div className="text-sm sm:text-base text-muted-foreground/90 font-medium mt-2">{label}</div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                    */
/* ═══════════════════════════════════════════════════ */
const LandingPage = ({ onAuthSuccess }: LandingPageProps) => {
  const { isDark } = useThemeStyle();
  const { hidden, scrolled } = useScrollDirection();
  const [mounted, setMounted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const authParam = params.get("auth");
      if (emailParam) {
        setEmail(emailParam);
      }
      if (authParam === "login" || authParam === "signin" || emailParam) {
        setShowLogin(true);
        setMode("login");
      } else if (authParam === "forgot" || authParam === "reset") {
        setShowLogin(true);
        setMode("forgot");
      }
    }
  }, []);

  /* ── Auth handlers ── */
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      let res = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (res.error && password.trim() !== password) {
        res = await supabase.auth.signInWithPassword({ email: cleanEmail, password: password.trim() });
      }
      const authData = res.data;
      const error = res.error;
      setLoading(false);
      if (error) {
        const msg = error.message || "Invalid email or password. Please verify your credentials.";
        setLoginError(msg);
        toast({ title: "Login failed", description: msg, variant: "destructive" });
      } else {
        setLoginError(null);
        toast({ title: "Welcome back!" });
        onAuthSuccess();

        // Dispatch Welcome email on successful login
        const user = authData?.user;
        const targetEmail = user?.email || email.trim();
        const fullName = user?.user_metadata?.full_name || targetEmail.split("@")[0];
        const portalOrigin = getProductionPortalUrl();

        sendBrandedEmail({
          type: "welcome",
          to: targetEmail,
          data: {
            fullName,
            loginUrl: `${portalOrigin}/`,
          },
        }).then(res => {
          if (res.success) {
            console.info("[Auth] Welcome email dispatched to:", targetEmail);
          }
        }).catch(err => {
          console.warn("[Auth] Welcome email dispatch error:", err);
        });
      }
    } catch {
      setLoading(false);
      toast({ title: "Connection error", description: "Unable to reach the server.", variant: "destructive" });
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast({ title: "Email required", description: "Please enter your registered account email.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords mismatch", description: "New password and confirmation password do not match.", variant: "destructive" });
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
        setLoading(false);
        toast({ title: "Recovery Error", description: displayError, variant: "destructive" });
        return;
      }

      if (data?.error) {
        setLoading(false);
        toast({ title: "Recovery Error", description: data.error, variant: "destructive" });
        return;
      }

      // Automatically sign in with recovered credentials
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      setLoading(false);
      if (!signInErr) {
        toast({
          title: "Account Recovered Successfully",
          description: "Your password has been updated and you are now signed in.",
        });
        setShowLogin(false);
        onAuthSuccess();
      } else {
        toast({
          title: "Password Updated",
          description: "Password reset successful. Please sign in with your new password.",
        });
        setMode("login");
      }
    } catch (err: any) {
      setLoading(false);
      toast({ title: "Connection error", description: err?.message || "Unable to reach the server.", variant: "destructive" });
    }
  };

  const features = [
    { icon: LayoutDashboard, title: "Real-Time Dashboard", desc: "Live progress rings, status tickers, and milestone countdowns — all updating in real time.", gradient: "bg-gradient-to-r from-primary to-primary/50" },
    { icon: GanttChart, title: "Interactive Gantt Charts", desc: "Visualize project timelines with drag-friendly Gantt charts. Track dependencies and critical paths.", gradient: "bg-gradient-to-r from-[hsl(var(--processing))] to-[hsl(var(--processing)/0.5)]" },
    { icon: Kanban, title: "Kanban Board", desc: "Drag-and-drop task management across Planning, Initiating, Processing, and Completed columns.", gradient: "bg-gradient-to-r from-[hsl(var(--initiating))] to-[hsl(var(--initiating)/0.5)]" },
    { icon: ListTodo, title: "Smart Task Management", desc: "Create, assign, and track tasks with status workflows, dependencies, and automatic progress calculation.", gradient: "bg-gradient-to-r from-[hsl(var(--warning))] to-[hsl(var(--warning)/0.5)]" },
    { icon: Bell, title: "Live Notifications", desc: "Stay informed with real-time push notifications for task updates, milestones, and team activity.", gradient: "bg-gradient-to-r from-[hsl(var(--info))] to-[hsl(var(--info)/0.5)]" },
    { icon: FileText, title: "PDF Report Export", desc: "Generate professional branded PDF reports with a single click. Premium users get custom logos and colors.", gradient: "bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(var(--success)/0.5)]" },
    { icon: Palette, title: "White-Label Branding", desc: "Premium users can customize logos, company names, accent colors — the entire UI adapts to your brand.", gradient: "bg-gradient-to-r from-primary to-[hsl(var(--initiating))]" },
    { icon: Users, title: "Team Collaboration", desc: "Invite PMs, engineers, and clients with role-based access. Everyone sees exactly what they need.", gradient: "bg-gradient-to-r from-[hsl(var(--planning))] to-[hsl(var(--planning)/0.5)]" },
    { icon: Globe, title: "Email Subscriptions", desc: "Stakeholders can subscribe to project updates and receive automated email notifications on milestones.", gradient: "bg-gradient-to-r from-[hsl(var(--processing))] to-primary" },
  ];

  const steps = [
    { icon: Zap, title: "Create Your Project", desc: "Set up projects with timelines, team members, and milestones in under a minute." },
    { icon: ListTodo, title: "Manage Tasks", desc: "Break work into trackable tasks with statuses, dependencies, and Gantt chart visualization." },
    { icon: Activity, title: "Monitor Progress", desc: "Watch real-time dashboards, receive notifications, and export reports — all from one command center." },
  ];

  const plans = [
    {
      tier: "Free",
      price: "$0",
      description: "Essential project oversight for individual PMs and small site teams.",
      features: [
        "1 Active Project",
        "Interactive Gantt Timeline & Saudi Weekend Grid",
        "Real-Time Dashboard & KPI Rings",
        "Kanban Workflow & Task Management",
        "Milestone Gate Tracking & Weather Feeds",
        "Standard PDF Report Export (Watermarked)",
        "Email Notifications & Status Alerts",
      ],
      highlight: false,
      badge: "Starter",
      actionText: "Get Started Free",
    },
    {
      tier: "Premium",
      price: "$29",
      description: "Full white-label branding and unlimited projects for high-performing contractors.",
      features: [
        "Unlimited Active Projects",
        "Full Custom White-Label Branding (Logo & Colors)",
        "Watermark-Free Publication-Grade PDF Reports",
        "Automated Stakeholder Email Broadcasts",
        "Detailed WBS Engineering Breakdown",
        "Priority Email & Chat Support",
        "14-Day Free Trial (Save 17% on Annual)",
      ],
      highlight: true,
      badge: "Most Popular",
      actionText: "Start 14-Day Free Trial",
    },
    {
      tier: "Enterprise",
      price: "$99",
      description: "Multi-project fleet governance, user provisioning, and dedicated infrastructure.",
      features: [
        "Multi-Project Fleet Command Deck (/admin)",
        "Role-Based Access Control (Admin, PM, Client)",
        "User Provisioning & Subscription Management",
        "Branded Email Notification & Invitation Suite",
        "Audit Trail Logging & Multi-Tenant Isolation",
        "99.9% High-Availability Uptime SLA",
        "Dedicated Account Manager & Direct Support",
      ],
      highlight: false,
      badge: "Full Fleet Power",
      actionText: "Deploy Enterprise",
    },
  ];

  const smoothScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const testimonials = [
    { name: "Sarah Chen", role: "Project Manager, Arcadia Build Co.", quote: "SightLine transformed how we report to clients. The branded PDFs alone saved us hours every week.", stars: 5, avatar: "SC" },
    { name: "James Oduya", role: "Civil Engineer, Meridian Infrastructure", quote: "The Gantt charts and live notifications keep our entire team aligned. We've cut delays by 40% since adopting SightLine.", stars: 5, avatar: "JO" },
    { name: "Lisa Fernandez", role: "Operations Director, Vertex Group", quote: "White-label branding makes it look like our own platform. Clients love the professionalism.", stars: 5, avatar: "LF" },
    { name: "David Kim", role: "CTO, Horizon Developments", quote: "From Kanban to PDF exports, everything just works. The best project command center we've used.", stars: 5, avatar: "DK" },
    { name: "Priya Sharma", role: "Senior PM, BuildRight Solutions", quote: "The real-time dashboard gives stakeholders instant visibility. No more 'where are we?' emails.", stars: 5, avatar: "PS" },
  ];

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const nextTestimonial = () => setTestimonialIdx((i) => (i + 1) % testimonials.length);
  const prevTestimonial = () => setTestimonialIdx((i) => (i - 1 + testimonials.length) % testimonials.length);

  // Auto-advance testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden scroll-smooth">
      {/* ═══════ EDGE-ROUNDED FLOATING AUTOHIDING NAV ═══════ */}
      <motion.nav
        initial={{ y: -70, opacity: 0, scale: 0.95 }}
        animate={{
          y: hidden ? -110 : 0,
          opacity: hidden ? 0 : 1,
          scale: hidden ? 0.95 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 24,
          mass: 0.8,
        }}
        className="fixed top-3 sm:top-4 inset-x-0 z-50 mx-auto max-w-6xl px-3 sm:px-4 pointer-events-none"
      >
        <div className="pointer-events-auto liquid-header-pill rounded-full px-4 sm:px-6 h-13 sm:h-14 flex items-center justify-between shadow-2xl transition-all">
          <motion.div
            role="button"
            tabIndex={0}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title="SightLine Command Center - Click to scroll to top"
          >
            {mounted && (
              <motion.img
                src={isDark ? fabulouzzLogo : fabulouzzLogoLight}
                alt="Fabulouzz"
                className="h-7 w-auto drop-shadow-sm transition-transform duration-300 group-hover:rotate-[-4deg] group-hover:scale-105"
              />
            )}
            <div className="flex flex-col border-l border-white/15 dark:border-white/10 pl-2.5">
              <span
                className="text-xs font-bold tracking-wide text-primary transition-colors group-hover:text-emerald-400"
                style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
              >
                SIGHTLINE
              </span>
              <span className="text-[7px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                Command Center
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#features"
              onClick={(e) => smoothScroll(e, "features")}
              className="hidden md:inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Features
            </a>
            <a
              href="#demo"
              onClick={(e) => smoothScroll(e, "demo")}
              className="hidden sm:inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Live Demo
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => smoothScroll(e, "how-it-works")}
              className="hidden md:inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              How It Works
            </a>
            <a
              href="#testimonials"
              onClick={(e) => smoothScroll(e, "testimonials")}
              className="hidden lg:inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Testimonials
            </a>
            <a
              href="#pricing"
              onClick={(e) => smoothScroll(e, "pricing")}
              className="hidden sm:inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Pricing
            </a>

            {/* Quick 2-State Theme Toggle (Light & Dark) */}
            <ThemeSelector />

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowLogin(true)}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold text-primary-foreground shadow-md flex items-center gap-1.5 cursor-pointer"
              style={{ background: "var(--gradient-primary)" }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="relative pt-24 sm:pt-32 pb-20 min-h-[100vh] flex items-center overflow-hidden">
        {/* Deep Melt & Feather Blurry BG Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-[8%] w-[650px] h-[650px] rounded-full bg-primary/[0.12] blur-[200px]" />
          <div className="absolute bottom-10 right-[8%] w-[580px] h-[580px] rounded-full bg-[hsl(var(--processing)/0.12)] blur-[180px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-emerald-500/[0.08] blur-[220px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: "80px 80px",
            }}
          />
          {/* Feathered Melt Vignette joining seamlessly to background */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left - Larger Executive Copy */}
            <div className="lg:col-span-5 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 sm:py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs sm:text-sm font-bold mb-6 shadow-md shadow-primary/10"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                Project Management, Reimagined
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-foreground tracking-tight leading-[1.04] mb-6"
              >
                Your Projects.{" "}
                <span className="text-gradient">One Command Center.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-base sm:text-lg md:text-xl text-muted-foreground/90 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 sm:mb-9 font-normal"
              >
                Real-time telemetry dashboards, Saudi-calendar Gantt charts, Kanban boards, live notifications, and executive branded PDF reports — engineered for peak performance.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65 }}
                className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLogin(true)}
                  className="px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold text-primary-foreground shadow-2xl flex items-center gap-2.5 cursor-pointer"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.a
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  href="#features"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => smoothScroll(e, "features")}
                  className="px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-semibold border border-white/20 dark:border-white/10 text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-colors flex items-center gap-2 liquid-glass"
                >
                  Explore Features <ChevronDown className="w-4 h-4" />
                </motion.a>
              </motion.div>
            </div>

            {/* Right - Live Animated Dashboard Demo Showcase with Feathered Melt Edge */}
            <motion.div
              id="demo"
              initial={{ opacity: 0, x: 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-7 w-full scroll-mt-24 relative"
            >
              <DashboardDemoShowcase />
              {/* Soft feather overlay at the showcase base */}
              <div className="absolute -bottom-4 inset-x-4 h-12 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none rounded-b-3xl" />
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground/70" />
        </motion.div>
      </section>

      {/* ═══════ STATS ═══════ */}
      <section className="relative py-20 overflow-hidden">
        {/* Soft feather blurry ambient join */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[850px] h-36 bg-primary/[0.08] blur-[160px] rounded-full" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="liquid-glass-card rounded-3xl p-8 sm:p-12 grid grid-cols-2 sm:grid-cols-4 gap-8 shadow-2xl border border-white/20 dark:border-white/10 melt-radial">
            <StatCounter value={99} suffix="%" label="Uptime Reliability" delay={0} />
            <StatCounter value={500} suffix="+" label="Projects Tracked" delay={0.15} />
            <StatCounter value={50} suffix="+" label="Engineering Teams" delay={0.3} />
            <StatCounter value={10} suffix="x" label="Faster Reporting" delay={0.45} />
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative py-24 sm:py-32 scroll-mt-16 overflow-hidden">
        {/* Diffuse feather blurry orbs joining seamlessly into the background */}
        <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] bg-primary/[0.08] blur-[220px] pointer-events-none rounded-full" />
        <div className="absolute bottom-10 -right-40 w-[600px] h-[600px] bg-[hsl(var(--processing)/0.08)] blur-[220px] pointer-events-none rounded-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-semibold mb-5 shadow-sm">
              <Sparkles className="w-4 h-4" /> Core Capabilities
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-5 tracking-tight">Everything You Need to Deliver</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">
              From real-time telemetry dashboards to white-label PDF reports, SightLine unifies your entire project management workflow into one seamless command center.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={0.08 * i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="relative py-24 sm:py-32 scroll-mt-16 overflow-hidden">
        {/* Soft blurry background blend */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[850px] h-[450px] bg-emerald-500/[0.05] blur-[220px] rounded-full" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-semibold mb-5 shadow-sm">
              <Clock className="w-4 h-4" /> Seamless Workflow
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-5 tracking-tight">Up and Running in Minutes</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
              Three simple steps to transform project chaos into crystal-clear visibility.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {steps.map((s, i) => (
              <AnimatedSection key={s.title} delay={0.15 * i} className="text-center relative">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-primary/5"
                  whileHover={{ rotate: 8, scale: 1.1 }}
                >
                  <s.icon className="w-8 h-8 text-primary" />
                </motion.div>
                <span className="text-xs font-bold text-primary mb-2.5 block tracking-wide uppercase">Step {i + 1}</span>
                <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed">{s.desc}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section id="testimonials" className="relative py-24 sm:py-32 scroll-mt-16 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[380px] bg-primary/[0.07] blur-[200px] pointer-events-none rounded-full" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-semibold mb-5 shadow-sm">
              <Quote className="w-4 h-4" /> Client Feedback
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-5 tracking-tight">Trusted by Project Teams</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground/90 max-w-xl mx-auto leading-relaxed">
              See what project managers, engineers, and clients say about SightLine.
            </p>
          </AnimatedSection>

          <div className="relative max-w-3xl mx-auto">
            {/* Navigation arrows */}
            <button
              onClick={prevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-12 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors shadow-lg cursor-pointer"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-12 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors shadow-lg cursor-pointer"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>

            {/* Card */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIdx}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="liquid-glass-card p-8 sm:p-12 rounded-3xl text-center shadow-2xl border border-white/20 dark:border-white/10"
                >
                  {/* Stars */}
                  <div className="flex justify-center gap-1.5 mb-6">
                    {Array.from({ length: testimonials[testimonialIdx].stars }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                    ))}
                  </div>

                  <p className="text-xl sm:text-2xl text-foreground font-medium leading-relaxed mb-9 italic">
                    "{testimonials[testimonialIdx].quote}"
                  </p>

                  <div className="flex items-center justify-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shadow-sm">
                      {testimonials[testimonialIdx].avatar}
                    </div>
                    <div className="text-left">
                      <div className="text-base font-bold text-foreground">{testimonials[testimonialIdx].name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{testimonials[testimonialIdx].role}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIdx(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${i === testimonialIdx ? "bg-primary w-8" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="relative py-24 sm:py-32 scroll-mt-16 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-primary/[0.08] blur-[220px] pointer-events-none rounded-full" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-semibold mb-5 shadow-sm">
              <Crown className="w-4 h-4" /> Transparent Pricing Plans
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-5 tracking-tight">Plans Built for Modern Engineering & EPC</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
              Start free, upgrade for full corporate white-label branding, or scale across your entire portfolio with our Enterprise Command Deck.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span>Provided by <strong className="text-foreground">Fabulouzz Technologies</strong></span>
              <span>•</span>
              <a href="mailto:info@fabulouzz.com" className="text-primary hover:underline font-semibold flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> info@fabulouzz.com
              </a>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <AnimatedSection key={plan.tier} delay={0.1 * i} className="h-full">
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`liquid-glass-card p-7 sm:p-9 rounded-3xl relative overflow-hidden flex flex-col justify-between h-full transition-all duration-300 shadow-xl ${
                    plan.highlight
                      ? "border-primary/50 ring-2 ring-primary/30 shadow-2xl shadow-primary/10"
                      : "border-border/60 hover:border-primary/30"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-[hsl(var(--processing))]" />
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        plan.highlight
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-secondary text-muted-foreground border-border/50"
                      }`}>
                        {plan.badge}
                      </span>
                      {plan.highlight && <Crown className="w-5 h-5 text-primary" />}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-foreground">{plan.tier}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-5 min-h-[38px] leading-relaxed">{plan.description}</p>
                    <div className="mb-6 pb-6 border-b border-border/40">
                      <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">{plan.price}</span>
                      <span className="text-muted-foreground text-sm font-medium">/month</span>
                    </div>
                    <ul className="space-y-3.5 mb-8">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground/90">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowLogin(true)}
                      className={`w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                        plan.highlight
                          ? "text-primary-foreground shadow-primary/20"
                          : "text-foreground bg-secondary/80 border border-border/60 hover:bg-secondary"
                      }`}
                      style={plan.highlight ? { background: "var(--gradient-primary)" } : {}}
                    >
                      {plan.actionText}
                    </motion.button>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>

          {/* Custom Enterprise Banner */}
          <div className="mt-14 p-7 sm:p-9 rounded-3xl liquid-glass-card border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
            <div>
              <h4 className="text-lg sm:text-xl font-bold text-foreground">Need Custom Integrations or Multi-Site Licensing?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground/90 mt-1 max-w-xl leading-relaxed">
                Provided by Fabulouzz Technologies — our team delivers dedicated database instances, custom ERP bridges, and private corporate deployments.
              </p>
            </div>
            <a
              href="mailto:info@fabulouzz.com?subject=SightLine%20Enterprise%20Custom%20Deployment"
              className="whitespace-nowrap px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" /> Contact info@fabulouzz.com
            </a>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        {/* Deep ambient blur join */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[850px] h-[400px] bg-primary/[0.12] blur-[220px] rounded-full" />
        </div>
        <AnimatedSection className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-5 tracking-tight">Ready to Take Command?</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join teams already using SightLine to deliver projects faster, with full visibility and professional reporting.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowLogin(true)}
            className="px-9 sm:px-10 py-4 sm:py-4.5 rounded-full text-base sm:text-lg font-bold text-primary-foreground shadow-2xl inline-flex items-center gap-2.5 cursor-pointer"
            style={{ background: "var(--gradient-primary)" }}
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </motion.button>
        </AnimatedSection>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="relative py-12 border-t border-border/20 bg-card/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            {mounted && <img src={isDark ? fabulouzzLogo : fabulouzzLogoLight} alt="Fabulouzz" className="h-7 w-auto" />}
            <div className="text-xs text-muted-foreground">
              <span>Provided by </span>
              <a href="https://www.fabulouzz.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                Fabulouzz Technologies
              </a>
              <span className="block sm:inline sm:ml-2 text-muted-foreground/80">• SightLine Command Center</span>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap justify-center">
            <a href="mailto:info@fabulouzz.com" className="text-primary font-medium hover:underline flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> info@fabulouzz.com
            </a>
            <a href="https://www.fabulouzz.com/get-quote" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Contact Sales
            </a>
            <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="hover:text-foreground transition-colors">
              Plans & Pricing
            </a>
          </div>
        </div>
      </footer>

      {/* ═══════ LOGIN MODAL OVERLAY ═══════ */}
      {showLogin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="liquid-glass-card p-6 sm:p-8 rounded-2xl w-full max-w-md relative border border-white/20 dark:border-white/10 shadow-2xl"
          >
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-8">
              {mounted && <img src={isDark ? fabulouzzLogo : fabulouzzLogoLight} alt="Fabulouzz" className="h-7 w-auto" />}
              <div className="flex flex-col border-l border-border/30 pl-2.5">
                <span className="text-xs font-bold tracking-wide text-primary" style={{ fontFamily: "'Neuropol X Free', sans-serif" }}>SIGHTLINE</span>
                <span className="text-[7px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">Command Center</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">{mode === "login" ? "Welcome Back" : "Password Recovery"}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {mode === "login"
                ? "Sign in to your SightLine account"
                : "Enter your registered email and new password to recover your account immediately"}
            </p>

            {/* Highly Visible In-Modal Error Alert Banner */}
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mb-4 p-3.5 rounded-xl bg-destructive/15 border-2 border-destructive/50 text-destructive-foreground dark:text-rose-200 text-xs sm:text-sm font-medium flex items-start gap-2.5 shadow-xl shadow-destructive/15 relative z-20"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-400">Authentication Error</p>
                  <p className="text-xs text-rose-300/90 mt-0.5 leading-snug">{loginError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginError(null)}
                  className="text-rose-400 hover:text-rose-200 p-0.5 cursor-pointer"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </motion.div>
            )}

            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email"
                    className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password"
                    className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">Forgot password?</button>
                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: "var(--gradient-primary)" }}>
                  <LogIn className="w-4 h-4" /> {loading ? "Signing in..." : "Sign In"}
                </motion.button>
                <p className="text-center text-xs text-muted-foreground">
                  Need access? <a href="https://www.fabulouzz.com/get-quote" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Contact Fabulouzz</a>
                </p>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                {/* Account Email */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Account Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="e.g. support@fabulouzz.com"
                      className="w-full pl-10 pr-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">New Password (Min 6 chars)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm new password"
                      className="w-full pl-10 pr-10 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  style={{ background: "var(--gradient-primary)" }}>
                  <ShieldCheck className="w-4 h-4" />
                  {loading ? "Recovering..." : "Recover Password & Sign In"}
                </motion.button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button type="button" onClick={() => setMode("login")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    <ArrowLeft className="w-3 h-3" /> Back to login
                  </button>
                  <a href={`/reset-password?email=${encodeURIComponent(email)}`} className="text-primary hover:underline font-medium">
                    Full page recovery →
                  </a>
                </div>
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
      )}
    </div>
  );
};

export default LandingPage;
