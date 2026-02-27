import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, Send } from "lucide-react";

const EmailSubscription = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6 glow-border"
    >
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Mail className="w-5 h-5 text-primary" />
        </motion.div>
        <h3 className="text-sm font-semibold text-foreground">Get Update Notifications</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Subscribe to receive email notifications whenever the project status is updated.
      </p>
      {subscribed ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-completed"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">You're subscribed! We'll notify you on updates.</span>
        </motion.div>
      ) : (
        <form onSubmit={handleSubscribe} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            className="flex-1 bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground transition-all"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Send className="w-3.5 h-3.5" />
            Subscribe
          </motion.button>
        </form>
      )}
    </motion.div>
  );
};

export default EmailSubscription;
