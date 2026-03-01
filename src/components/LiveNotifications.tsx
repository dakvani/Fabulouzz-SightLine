import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Image, Clock, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  message: string;
  type: string;
  media_url: string | null;
  created_at: string;
}

const LiveNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newFlash, setNewFlash] = useState(false);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const openLightbox = useCallback((urls: string[], index: number) => {
    setLightbox({ urls, index });
  }, []);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const navigateLightbox = useCallback((dir: 1 | -1) => {
    setLightbox(prev => {
      if (!prev) return null;
      const next = (prev.index + dir + prev.urls.length) % prev.urls.length;
      return { ...prev, index: next };
    });
  }, []);

  useEffect(() => {
    // Fetch recent notifications
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
      });

    // Subscribe to realtime
    const channel = supabase
      .channel("live-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications(prev => [n, ...prev].slice(0, 10));
          setNewFlash(true);
          setTimeout(() => setNewFlash(false), 3000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getMediaUrls = (url: string | null): string[] => {
    if (!url) return [];
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [url];
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card overflow-hidden relative"
    >
      {newFlash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2 }}
          className="absolute inset-0 border-2 border-primary/40 rounded-xl pointer-events-none z-10"
        />
      )}

      <div className="p-4 border-b border-border/50 flex items-center gap-2">
        <motion.div
          animate={newFlash ? { rotate: [0, -15, 15, -15, 0], scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Bell className="w-4 h-4 text-primary" />
        </motion.div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Updates</h3>
        {notifications.length > 0 && (
          <span className="ml-auto text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {notifications.length}
          </span>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No updates yet. Status changes will appear here in real-time.
            </div>
          ) : (
            notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="px-4 py-3 border-b border-border/20 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{n.message}</p>
                    {getMediaUrls(n.media_url).length > 0 && (
                      <div className={`mt-2 grid gap-1.5 ${getMediaUrls(n.media_url).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {getMediaUrls(n.media_url).map((url, i) => (
                          <div key={i} className="rounded-lg overflow-hidden border border-border/30 cursor-pointer" onClick={() => openLightbox(getMediaUrls(n.media_url), i)}>
                            <img src={url} alt={`Update media ${i + 1}`} className="w-full max-h-32 object-cover hover:opacity-80 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      {getMediaUrls(n.media_url).length > 0 && <Image className="w-3 h-3 text-muted-foreground ml-2" />}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>

    {/* Lightbox */}
    <AnimatePresence>
      {lightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-md"
          onClick={closeLightbox}
        >
          <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          {lightbox.urls.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); navigateLightbox(-1); }}
                className="absolute left-4 p-2 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); navigateLightbox(1); }}
                className="absolute right-4 p-2 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <motion.img
            key={lightbox.index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            src={lightbox.urls[lightbox.index]}
            alt="Full size media"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          {lightbox.urls.length > 1 && (
            <div className="absolute bottom-6 flex gap-1.5">
              {lightbox.urls.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, index: i } : null); }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === lightbox.index ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default LiveNotifications;
