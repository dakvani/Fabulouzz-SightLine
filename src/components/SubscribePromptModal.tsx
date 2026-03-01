import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle2, ArrowDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface SubscribePromptModalProps {
  userId: string;
}

const SubscribePromptModal = ({ userId }: SubscribePromptModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hasSeenBefore, setHasSeenBefore] = useState(false);

  const storageKey = `subscribe_prompt_dismissed_${userId}`;

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed === "true") return;

    const seenKey = `subscribe_prompt_seen_${userId}`;
    const seen = localStorage.getItem(seenKey);
    setHasSeenBefore(!!seen);

    // Show after a short delay for better UX
    const timer = setTimeout(() => {
      setIsOpen(true);
      if (!seen) localStorage.setItem(seenKey, "true");
    }, 1500);

    return () => clearTimeout(timer);
  }, [userId, storageKey]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, "true");
    }
    setIsOpen(false);
  };

  const handleSubscribeNow = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, "true");
    }
    setIsOpen(false);
    // Scroll to the email subscription section
    setTimeout(() => {
      const el = document.getElementById("email-subscription-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md glass-card p-6 sm:p-8 glow-border"
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 1.5, delay: 0.3 }}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Mail className="w-6 h-6 text-primary-foreground" />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Stay Updated!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Subscribe with your email address on this page to receive live updates about your assigned project progress and milestones.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  I Already Subscribed
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubscribeNow}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground transition-all"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <ArrowDown className="w-4 h-4" />
                  Subscribe Now
                </motion.button>
              </div>

              {hasSeenBefore && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 pt-1"
                >
                  <Checkbox
                    id="dont-show"
                    checked={dontShowAgain}
                    onCheckedChange={(checked) => setDontShowAgain(!!checked)}
                  />
                  <label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer select-none">
                    Don't show this again
                  </label>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SubscribePromptModal;
