import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectData } from "@/contexts/ProjectDataContext";

interface Notification {
  id: string;
  message: string;
  type: string;
  created_at: string;
}

const NotificationTicker = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { selectedProjectId } = useProjectData();

  useEffect(() => {
    if (!selectedProjectId) {
      setNotifications([]);
      return;
    }

    supabase
      .from("notifications")
      .select("*")
      .eq("project_id", selectedProjectId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
      });

    const channel = supabase
      .channel(`ticker-notifications-${selectedProjectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `project_id=eq.${selectedProjectId}` },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev].slice(0, 5));
          setCurrentIndex(0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedProjectId]);

  useEffect(() => {
    if (notifications.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % notifications.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (notifications.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card px-4 py-2 flex items-center gap-3 overflow-hidden"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 5 }}
      >
        <Bell className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      </motion.div>
      <div className="flex-1 min-w-0 h-5 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-foreground/80 truncate absolute inset-0"
          >
            {notifications[currentIndex]?.message}
          </motion.p>
        </AnimatePresence>
      </div>
      <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">
        {notifications[currentIndex] && timeAgo(notifications[currentIndex].created_at)}
      </span>
    </motion.div>
  );
};

export default NotificationTicker;
