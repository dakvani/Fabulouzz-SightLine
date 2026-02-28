import { useState } from "react";
import { motion } from "framer-motion";
import { useProjectData } from "@/contexts/ProjectDataContext";
import ProgressRing from "./ProgressRing";
import { Mail, CheckCircle2, Loader2, Clock, Zap, ExternalLink } from "lucide-react";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";

const PublicStatusPage = () => {
  const { tasks, projectInfo } = useProjectData();
  
  const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
  const progress = tasks.length > 0 ? Math.round((tasks.reduce((sum, t) => sum + (weights[t.status] || 0), 0) / tasks.length) * 100) : 0;
  const counts = {
    completed: tasks.filter(t => t.status === "Completed").length,
    processing: tasks.filter(t => t.status === "Processing").length,
    initiating: tasks.filter(t => t.status === "Initiating").length,
    planning: tasks.filter(t => t.status === "Planning").length,
    total: tasks.length,
  };
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  const completedTasks = tasks.filter(t => t.status === "Completed");
  const activeTasks = tasks.filter(t => t.status === "Processing" || t.status === "Initiating");
  const upcomingTasks = tasks.filter(t => t.status === "Planning");

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={fabulouzzLogo} alt="Fabulouzz Technologies" className="h-7 w-auto" />
            <div className="border-l border-border/50 pl-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Project Status</p>
            </div>
          </div>
          <span className="text-xs font-mono text-primary">{projectInfo.projectRef}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative space-y-8">
        {/* Project Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{projectInfo.title}</h1>
          <p className="text-sm text-muted-foreground">
            {projectInfo.client} • {projectInfo.location} • {projectInfo.startDate} to {projectInfo.endDate}
          </p>
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 flex flex-col sm:flex-row items-center gap-8"
        >
          <ProgressRing progress={progress} size={140} label="Overall Progress" />
          <div className="flex-1 grid grid-cols-2 gap-4">
            {[
              { label: "Completed", count: counts.completed, icon: CheckCircle2, cls: "text-completed" },
              { label: "In Progress", count: counts.processing + counts.initiating, icon: Loader2, cls: "text-processing" },
              { label: "Planning", count: counts.planning, icon: Clock, cls: "text-planning" },
              { label: "Total Tasks", count: counts.total, icon: Zap, cls: "text-primary" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className={`w-5 h-5 ${item.cls}`} />
                <div>
                  <p className="text-xl font-bold font-mono text-foreground">{item.count}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Tasks - Highlighted */}
        {activeTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card overflow-hidden glow-border"
          >
            <div className="p-4 border-b border-border/50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-processing animate-pulse" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Currently Active</h3>
            </div>
            <div className="divide-y divide-border/30">
              {activeTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-xs font-mono text-primary w-6">#{task.id}</span>
                  <p className="text-sm text-foreground flex-1">{task.name}</p>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full border ${
                    task.status === "Processing"
                      ? "bg-processing/15 text-processing border-processing/30"
                      : "bg-initiating/15 text-initiating border-initiating/30"
                  }`}>
                    {task.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Completed Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Completed</h3>
          </div>
          <div className="divide-y divide-border/30">
            {completedTasks.map(task => (
              <div key={task.id} className="px-4 py-3 flex items-center gap-3 opacity-80">
                <CheckCircle2 className="w-4 h-4 text-completed" />
                <p className="text-sm text-foreground flex-1">{task.name}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Email Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 glow-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Get Update Notifications</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Subscribe to receive email notifications whenever the project status is updated.
          </p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-completed">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">You're subscribed! We'll notify you on updates.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all"
              >
                Subscribe
              </button>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Powered by <span className="text-primary font-semibold">Fabulouzz Technologies</span> • SightLine Project Command Center</p>
        </div>
      </main>
    </div>
  );
};

export default PublicStatusPage;
