import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Eye, BarChart3, List, LayoutGrid, LogIn, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import AuthModal from "./AuthModal";
import AdminPanel from "./AdminPanel";
import ExportReport from "./ExportReport";

interface AppHeaderProps {
  activeView: "dashboard" | "timeline" | "tasks" | "kanban";
  onViewChange: (view: "dashboard" | "timeline" | "tasks" | "kanban") => void;
}

const HeaderParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dots: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];

    const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; ctx.scale(2, 2); };
    resize();

    for (let i = 0; i < 25; i++) {
      dots.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.2,
        r: 1 + Math.random() * 1.5,
        o: 0.1 + Math.random() * 0.2,
      });
    }

    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(90, 65%, 50%, ${d.o})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const AppHeader = ({ activeView, onViewChange }: AppHeaderProps) => {
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
      else setIsAdmin(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    setIsAdmin(data?.role === "admin");
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false); };

  const views = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "timeline" as const, label: "Timeline", icon: Eye },
    { id: "tasks" as const, label: "Tasks", icon: List },
    { id: "kanban" as const, label: "Kanban", icon: LayoutGrid },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-2 z-50 mx-4 sm:mx-6"
      >
        <div
          className="absolute inset-0 bg-card/20 backdrop-blur-2xl border border-primary/10 overflow-hidden"
          style={{
            borderRadius: "20px",
            boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.12), inset 0 1px 0 0 hsl(var(--primary) / 0.06)",
          }}
        >
          <HeaderParticles />
        </div>

        <motion.div
          className="absolute bottom-0 left-1/2 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)", borderRadius: "20px" }}
          initial={{ width: 0, x: 0 }}
          animate={{ width: "50%", x: "-50%" }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          {/* Logo section - bigger SightLine, command center tagline */}
          <motion.div className="flex items-center gap-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <motion.img src={fabulouzzLogo} alt="Fabulouzz Technologies" className="h-9 w-auto" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400 }} />
            <div className="hidden sm:flex flex-col border-l border-primary/20 pl-3">
              <h1 className="text-base font-extrabold tracking-tight leading-tight flex items-center">
                <span className="text-foreground">Fab</span>
                <motion.span
                  className="inline-block font-extrabold"
                  animate={{
                    textShadow: [
                      "0 0 6px hsla(0, 0%, 100%, 0.4)",
                      "0 0 16px hsla(0, 0%, 100%, 0.9)",
                      "0 0 6px hsla(0, 0%, 100%, 0.4)",
                    ],
                  }}
                  style={{ color: "white" }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  u
                </motion.span>
                <span className="text-foreground">lo</span>
                <motion.span
                  className="inline-block font-extrabold"
                  animate={{
                    textShadow: [
                      "0 0 6px hsla(0, 0%, 100%, 0.4)",
                      "0 0 16px hsla(0, 0%, 100%, 0.9)",
                      "0 0 6px hsla(0, 0%, 100%, 0.4)",
                    ],
                  }}
                  style={{ color: "white" }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                >
                  u
                </motion.span>
                <span className="text-foreground">zz</span>
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-primary tracking-wide">SIGHTLINE</span>
                <span className="text-[9px] text-muted-foreground font-medium tracking-widest uppercase">Command Center</span>
              </div>
            </div>
          </motion.div>

          <motion.nav className="flex items-center bg-secondary/30 backdrop-blur-sm rounded-full p-1 border border-border/30" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            {views.map((v, i) => (
              <motion.button
                key={v.id}
                onClick={() => onViewChange(v.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeView === v.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {activeView === v.id && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 rounded-full" style={{ background: "var(--gradient-primary)", boxShadow: "0 2px 12px -2px hsl(var(--primary) / 0.4)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <v.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{v.label}</span>
                </span>
              </motion.button>
            ))}
          </motion.nav>

          <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <ExportReport />
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <motion.button onClick={() => setShowAdmin(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                    <Shield className="w-3.5 h-3.5" /><span className="hidden sm:inline">Admin</span>
                  </motion.button>
                )}
                <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
                <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border border-border/30 text-muted-foreground hover:text-foreground hover:border-destructive/30 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            ) : (
              <motion.button onClick={() => setShowAuth(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                style={{ boxShadow: "0 0 16px -4px hsl(var(--primary) / 0.2)" }}>
                <LogIn className="w-3.5 h-3.5" /><span className="hidden sm:inline">Login</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
};

export default AppHeader;
