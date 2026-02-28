import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, ChevronRight, Eye } from "lucide-react";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";
import AuthModal from "./AuthModal";

interface LandingPageProps {
  onAuthSuccess: () => void;
}

const LandingPage = ({ onAuthSuccess }: LandingPageProps) => {
  const [showAuth, setShowAuth] = useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);




  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/[0.04] blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-info/[0.02] blur-[80px]" />
      </div>

      {/* Header bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-3 sm:mx-5 mt-3"
      >
        <div className="bg-background/10 backdrop-blur-xl border border-border/20 rounded-2xl">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {mounted && (
                <motion.img
                  src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
                  alt="Fabulouzz Technologies"
                  className="h-8 w-auto"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                />
              )}
              <div className="hidden sm:flex flex-col border-l border-border/30 pl-2.5">
                <span
                  className="text-[11px] font-bold tracking-wide text-primary"
                  style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
                >
                  SIGHTLINE
                </span>
                <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.15em] uppercase leading-tight">
                  Command Center
                </span>
              </div>
            </div>
            <motion.button
              onClick={() => setShowAuth(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Logo mark */}
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
              {mounted && (
                <img
                  src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
                  alt="Fabulouzz Technologies"
                  className="h-20 sm:h-24 w-auto relative z-10"
                />
              )}
            </div>
          </motion.div>

          <motion.h1
            className="text-primary font-bold tracking-[0.25em] text-lg sm:text-xl mb-3"
            style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            SIGHTLINE
          </motion.h1>

          <motion.p
            className="text-muted-foreground font-semibold tracking-[0.2em] uppercase text-[10px] sm:text-xs mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Command Center
          </motion.p>

          <motion.div
            className="w-16 h-[2px] mx-auto mb-8"
            style={{ background: "var(--gradient-primary)" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          />

          <motion.p
            className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Real-time project monitoring, intelligent task management, and seamless collaboration — all in one place.
          </motion.p>

          <motion.button
            onClick={() => setShowAuth(true)}
            className="group relative inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold text-primary-foreground overflow-hidden transition-all"
            style={{ background: "var(--gradient-primary)" }}
            whileHover={{ scale: 1.03, boxShadow: "0 8px 30px -8px hsl(var(--primary) / 0.5)" }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Eye className="w-4 h-4" />
            Get Started
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        </motion.div>

        {/* Fabulouzz home link */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <a
            href="https://fabulouzz.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            Visit Fabulouzz Home
          </a>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="relative z-10 text-center text-[10px] sm:text-xs text-muted-foreground py-6 border-t border-border/30"
      >
        <p>
          Powered by{" "}
          <span className="text-primary font-semibold">Fabulouzz Technologies</span> •
          SightLine Project Command Center
        </p>
      </motion.footer>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          onAuthSuccess();
        }}
      />
    </div>
  );
};

export default LandingPage;
