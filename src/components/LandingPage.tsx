import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  LogIn, Mail, Lock, Eye, EyeOff, ChevronDown, ChevronRight,
  Shield, Briefcase, Users, ArrowLeft, Home,
  BarChart3, Kanban, CalendarRange, Bell, FileText, Palette,
  Zap, Clock, Globe, Crown, CheckCircle2, ArrowRight,
  LayoutDashboard, ListTodo, GanttChart, Activity,
  Sparkles, TrendingUp, Lock as LockIcon,
  Quote, Star, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon
} from "lucide-react";
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
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group relative glass-card p-6 sm:p-8 overflow-hidden cursor-default"
    >
      <div className={`absolute top-0 left-0 w-full h-1 ${gradient}`} />
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[60px] bg-primary/10" />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
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
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-bold text-primary">{count}{suffix}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                    */
/* ═══════════════════════════════════════════════════ */
const LandingPage = ({ onAuthSuccess }: LandingPageProps) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption>("client");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => setMounted(true), []);

  /* ── Auth handlers ── */
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
    } catch {
      setLoading(false);
      toast({ title: "Connection error", description: "Unable to reach the server.", variant: "destructive" });
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
        toast({ title: "Check your inbox", description: "If registered, you'll receive a reset link." });
        setMode("login");
      }
    } catch {
      setLoading(false);
      toast({ title: "Connection error", description: "Unable to reach the server.", variant: "destructive" });
    }
  };

  const CurrentRoleIcon = roleLabels[selectedRole].icon;

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
    { tier: "Free", price: "$0", features: ["Up to 3 projects", "Dashboard & Gantt charts", "Kanban board", "Task management", "Email notifications"], highlight: false },
    { tier: "Premium", price: "$29", features: ["Unlimited projects", "White-label branding", "Custom PDF reports", "Priority support", "14-day free trial", "Annual billing save 17%"], highlight: true },
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
    const timer = setInterval(nextTestimonial, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden scroll-smooth">
      {/* ═══════ NAV ═══════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {mounted && (
              <img src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight} alt="Fabulouzz" className="h-7 w-auto" />
            )}
            <div className="flex flex-col border-l border-border/30 pl-2.5">
              <span className="text-xs font-bold tracking-wide text-primary" style={{ fontFamily: "'Neuropol X Free', sans-serif" }}>SIGHTLINE</span>
              <span className="text-[7px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">Command Center</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" onClick={(e) => smoothScroll(e, "how-it-works")} className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowLogin(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <span className="flex items-center gap-1.5"><LogIn className="w-4 h-4" /> Sign In</span>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="relative pt-14 min-h-[100vh] flex items-center overflow-hidden">
        {/* BG elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-[10%] w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
          <div className="absolute bottom-20 right-[10%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--processing)/0.06)] blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }} />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Project Management, Reimagined
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] mb-6"
              >
                Your Projects.{" "}
                <span className="text-gradient">One Command Center.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-8"
              >
                Real-time dashboards, Gantt charts, Kanban boards, live notifications, and branded PDF reports — everything your team needs to deliver projects on time.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65 }}
                className="flex flex-wrap gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLogin(true)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground shadow-lg flex items-center gap-2"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.a
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  href="#features"
                  className="px-6 py-3 rounded-xl text-sm font-semibold border border-border/50 text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-2"
                >
                  Explore Features <ChevronDown className="w-4 h-4" />
                </motion.a>
              </motion.div>
            </div>

            {/* Right - animated dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: -8 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden lg:block"
              style={{ perspective: "1200px" }}
            >
              <div className="glass-card p-6 rounded-2xl border border-border/50 relative">
                {/* Mock dashboard header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--warning))]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--success))]" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">sightline-dashboard</span>
                </div>

                {/* Mock progress ring */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <motion.div
                    className="glass-card p-4 flex flex-col items-center"
                    animate={{ boxShadow: ["0 0 0px hsl(142,60%,45%,0)", "0 0 20px hsl(142,60%,45%,0.1)", "0 0 0px hsl(142,60%,45%,0)"] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <svg viewBox="0 0 80 80" className="w-16 h-16 mb-2">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                      <motion.circle
                        cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={213}
                        initial={{ strokeDashoffset: 213 }}
                        animate={{ strokeDashoffset: 213 * 0.28 }}
                        transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <span className="text-xs text-muted-foreground">Progress</span>
                  </motion.div>

                  {/* Mock status bars */}
                  <div className="glass-card p-4 col-span-2 flex flex-col gap-2">
                    {[
                      { label: "Completed", color: "bg-[hsl(var(--completed))]", w: "w-[72%]" },
                      { label: "Processing", color: "bg-[hsl(var(--processing))]", w: "w-[45%]" },
                      { label: "Planning", color: "bg-[hsl(var(--planning))]", w: "w-[20%]" },
                    ].map((b, i) => (
                      <div key={b.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-16 truncate">{b.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${b.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: b.w.replace("w-[", "").replace("]", "") }}
                            transition={{ duration: 1.2, delay: 1.2 + i * 0.2, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock Gantt bars */}
                <div className="space-y-2">
                  {[
                    { name: "Foundation Work", color: "bg-[hsl(var(--completed))]", left: "0%", width: "55%" },
                    { name: "Structural Frame", color: "bg-[hsl(var(--processing))]", left: "30%", width: "40%" },
                    { name: "Interior Fitout", color: "bg-[hsl(var(--initiating))]", left: "55%", width: "35%" },
                  ].map((bar, i) => (
                    <div key={bar.name} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-24 truncate">{bar.name}</span>
                      <div className="flex-1 relative h-4 bg-muted/30 rounded">
                        <motion.div
                          className={`absolute top-0 h-full rounded ${bar.color}/80`}
                          style={{ left: bar.left }}
                          initial={{ width: 0 }}
                          animate={{ width: bar.width }}
                          transition={{ duration: 1, delay: 1.8 + i * 0.15, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <FloatingBadge className="top-[-10px] right-[-10px]" delay={2}>
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground">Live Updates</span>
              </FloatingBadge>
              <FloatingBadge className="bottom-[-10px] left-[-10px]" delay={2.4}>
                <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                <span className="text-foreground">72% Complete</span>
              </FloatingBadge>
              <FloatingBadge className="top-[40%] right-[-20px]" delay={2.8}>
                <Bell className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
                <span className="text-foreground">3 Updates</span>
              </FloatingBadge>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </section>

      {/* ═══════ STATS ═══════ */}
      <section className="py-16 border-y border-border/30 bg-card/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <StatCounter value={99} suffix="%" label="Uptime" delay={0} />
          <StatCounter value={500} suffix="+" label="Projects Tracked" delay={0.15} />
          <StatCounter value={50} suffix="+" label="Teams" delay={0.3} />
          <StatCounter value={10} suffix="x" label="Faster Reporting" delay={0.45} />
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-4">
              <Sparkles className="w-3 h-3" /> Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">Everything You Need to Deliver</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From real-time dashboards to white-label PDF reports, SightLine puts every project management tool in one place.</p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={0.08 * i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-card/50 border-y border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-4">
              <Clock className="w-3 h-3" /> How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">Up and Running in Minutes</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Three simple steps to take control of your project delivery.</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {steps.map((s, i) => (
              <AnimatedSection key={s.title} delay={0.15 * i} className="text-center relative">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 relative z-10"
                  whileHover={{ rotate: 8, scale: 1.1 }}
                >
                  <s.icon className="w-6 h-6 text-primary" />
                </motion.div>
                <span className="text-xs font-bold text-primary mb-2 block">Step {i + 1}</span>
                <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-4">
              <Crown className="w-3 h-3" /> Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Start free, upgrade when you need premium branding and unlimited projects.</p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan, i) => (
              <AnimatedSection key={plan.tier} delay={0.1 * i}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`glass-card p-8 rounded-2xl relative overflow-hidden ${plan.highlight ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-[hsl(var(--processing))]" />
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      {plan.highlight && <Crown className="w-5 h-5 text-primary" />}
                      {plan.tier}
                    </h3>
                    <div className="mt-2">
                      <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowLogin(true)}
                    className={`w-full py-3 rounded-xl text-sm font-bold ${plan.highlight ? "text-primary-foreground" : "text-foreground border border-border/50 hover:bg-secondary/50"}`}
                    style={plan.highlight ? { background: "var(--gradient-primary)" } : {}}
                  >
                    {plan.highlight ? "Start 14-Day Free Trial" : "Get Started"}
                  </motion.button>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="py-20 sm:py-28 bg-card/50 border-t border-border/30">
        <AnimatedSection className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">Ready to Take Command?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Join teams already using SightLine to deliver projects faster, with full visibility and professional reporting.</p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowLogin(true)}
            className="px-8 py-3.5 rounded-xl text-base font-bold text-primary-foreground shadow-lg inline-flex items-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </motion.button>
        </AnimatedSection>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="py-8 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {mounted && <img src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight} alt="Fabulouzz" className="h-6 w-auto" />}
            <span className="text-xs text-muted-foreground">
              Powered by <a href="https://www.fabulouzz.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Fabulouzz Technologies</a>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="https://www.fabulouzz.com/get-quote" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Contact</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
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
            className="glass-card p-6 sm:p-8 rounded-2xl w-full max-w-md relative border border-border/50"
          >
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-8">
              {mounted && <img src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight} alt="Fabulouzz" className="h-7 w-auto" />}
              <div className="flex flex-col border-l border-border/30 pl-2.5">
                <span className="text-xs font-bold tracking-wide text-primary" style={{ fontFamily: "'Neuropol X Free', sans-serif" }}>SIGHTLINE</span>
                <span className="text-[7px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">Command Center</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">{mode === "login" ? "Welcome Back" : "Reset Password"}</h2>
            <p className="text-sm text-muted-foreground mb-6">{mode === "login" ? "Sign in to your SightLine account" : "Enter your email to receive a reset link"}</p>

            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Role */}
                <div className="relative">
                  <button type="button" onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <div className="flex items-center gap-2"><CurrentRoleIcon className="w-4 h-4 text-primary" /><span>{roleLabels[selectedRole].label}</span></div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${roleDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {roleDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute z-10 mt-1 w-full bg-background border border-border/50 rounded-lg shadow-lg overflow-hidden">
                      {(Object.keys(roleLabels) as RoleOption[]).map(key => {
                        const { label, icon: Icon } = roleLabels[key];
                        return (
                          <button key={key} type="button" onClick={() => { setSelectedRole(key); setRoleDropdownOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${selectedRole === key ? "bg-primary/10 text-primary" : "text-foreground"}`}>
                            <Icon className="w-4 h-4" /><span className="font-medium">{label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
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
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--gradient-primary)" }}>
                  <LogIn className="w-4 h-4" /> {loading ? "Signing in..." : "Sign In"}
                </motion.button>
                <p className="text-center text-xs text-muted-foreground">
                  Need access? <a href="https://www.fabulouzz.com/get-quote" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Contact Fabulouzz</a>
                </p>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email"
                    className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </motion.button>
                <button type="button" onClick={() => setMode("login")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back to login
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LandingPage;
