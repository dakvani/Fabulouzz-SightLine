import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Image, Clock, X, ChevronLeft, ChevronRight, Loader2, Zap, Video, Play, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectData } from "@/contexts/ProjectDataContext";

interface Notification {
  id: string;
  message: string;
  type: string;
  media_url: string | null;
  created_at: string;
  task_id: string | null;
}

const LiveNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newFlash, setNewFlash] = useState(false);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerText, setTickerText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const { tasks, selectedProjectId } = useProjectData();

  const activeTasks = tasks.filter(t => t.status === "Processing" || t.status === "Initiating");
  const allTickerItems = activeTasks.map(t => t.name);

  // Typewriter effect: type and erase active task names
  useEffect(() => {
    if (allTickerItems.length === 0) {
      setTickerText("");
      return;
    }
    const currentText = allTickerItems[tickerIndex % allTickerItems.length];
    let charIndex = 0;
    let erasing = false;
    setIsTyping(true);

    const interval = setInterval(() => {
      if (!erasing) {
        charIndex++;
        setTickerText(currentText.slice(0, charIndex));
        if (charIndex >= currentText.length) {
          erasing = true;
          // Pause before erasing
          setTimeout(() => {
            const eraseInterval = setInterval(() => {
              charIndex--;
              setTickerText(currentText.slice(0, charIndex));
              if (charIndex <= 0) {
                clearInterval(eraseInterval);
                setIsTyping(false);
                setTickerIndex(prev => (prev + 1) % allTickerItems.length);
              }
            }, 30);
          }, 2000);
          clearInterval(interval);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [tickerIndex, allTickerItems.length]);

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
    if (!selectedProjectId) {
      setNotifications([]);
      return;
    }

    supabase
      .from("notifications")
      .select("*")
      .eq("project_id", selectedProjectId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
      });

    const channel = supabase
      .channel(`live-notifications-${selectedProjectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `project_id=eq.${selectedProjectId}` },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications(prev => [n, ...prev].slice(0, 30));
          setNewFlash(true);
          setTimeout(() => setNewFlash(false), 3000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedProjectId]);

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

  const isVideo = (url: string): boolean => {
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogg'];
    const lower = url.toLowerCase().split('?')[0];
    return videoExts.some(ext => lower.endsWith(ext));
  };

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      else if (e.key === "ArrowRight") navigateLightbox(1);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, navigateLightbox, closeLightbox]);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card overflow-hidden relative"
    >
      {/* Subtle fade-in glow for new updates */}
      <AnimatePresence>
        {newFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="absolute inset-0 rounded-xl pointer-events-none z-10 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
          />
        )}
      </AnimatePresence>

      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/50 flex items-center gap-3">
        <motion.div
          animate={newFlash ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Bell className="w-4 h-4 text-primary" />
        </motion.div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Updates</h3>
        {notifications.length > 0 && (
          <span className="ml-auto text-[10px] font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            {notifications.length}
          </span>
        )}
      </div>

      {/* Currently Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="px-5 py-5 sm:px-6 sm:py-6 bg-processing/5 max-h-[280px] sm:max-h-[340px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-4 h-4 text-processing" />
            </motion.div>
            <span className="text-xs font-bold uppercase tracking-wider text-processing">
              Currently Active
            </span>
            <span className="ml-auto text-[10px] font-mono bg-processing/20 text-processing px-2.5 py-1 rounded-full font-bold">
              {activeTasks.length} LIVE
            </span>
          </div>
          <div className="space-y-3">
            {activeTasks.map(task => {
              const isProcessing = task.status === "Processing";
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[0.625rem] border ${
                    isProcessing
                      ? "bg-processing/10 border-processing/25"
                      : "bg-initiating/10 border-initiating/25"
                  }`}
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-processing flex-shrink-0" /> : <Zap className="w-3.5 h-3.5 text-initiating flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isProcessing ? "text-processing" : "text-initiating"}`}>
                      {task.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isProcessing ? "In Progress" : "Starting Up"}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isProcessing ? "bg-processing/20 text-processing" : "bg-initiating/20 text-initiating"
                  }`}>
                    {task.status}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Updates Feed — Card-style like Active Tasks */}
      <div className="max-h-[720px] sm:max-h-[820px] xl:max-h-[920px] overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-3">
        <AnimatePresence initial={false}>
          {notifications.map((n) => {
            const mediaUrls = getMediaUrls(n.media_url);
            const hasMedia = mediaUrls.length > 0;
            const videoCount = mediaUrls.filter(u => isVideo(u)).length;
            const photoCount = mediaUrls.length - videoCount;

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="rounded-[0.625rem] border border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden"
              >
                {/* Update header */}
                <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-relaxed">{n.message}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.created_at)}
                      </span>
                      {n.type && (
                        <span className="text-[9px] font-mono uppercase bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">
                          {n.type.replace(/_/g, " ")}
                        </span>
                      )}
                      {hasMedia && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {photoCount > 0 && <><Image className="w-3 h-3" />{photoCount} photo{photoCount > 1 ? "s" : ""}</>}
                          {videoCount > 0 && <><Video className="w-3 h-3 ml-1" />{videoCount} video{videoCount > 1 ? "s" : ""}</>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Media grid — visually nested under this update */}
                {hasMedia && (
                  <div className="px-4 pb-3 sm:px-5 sm:pb-4">
                    <div className={`grid gap-2 ${mediaUrls.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {mediaUrls.map((url, i) => (
                        <div
                          key={i}
                          className="rounded-[0.625rem] overflow-hidden border border-border/20 cursor-pointer relative group"
                          onClick={() => openLightbox(mediaUrls, i)}
                        >
                          {isVideo(url) ? (
                            <>
                              <video src={url} muted className="w-full h-44 object-cover" preload="metadata" />
                              <div className="absolute inset-0 flex items-center justify-center bg-background/30 group-hover:bg-background/10 transition-colors">
                                <Play className="w-8 h-8 text-foreground drop-shadow-lg" />
                              </div>
                            </>
                          ) : (
                            <img src={url} alt={`Media for: ${n.message.slice(0, 40)}`} className="w-full h-44 object-cover group-hover:opacity-90 transition-opacity" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>

    {/* Lightbox with prev/next */}
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-mono text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full z-10">
              {lightbox.index + 1} / {lightbox.urls.length}
            </div>
          )}

          {lightbox.urls.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); navigateLightbox(-1); }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-secondary/70 text-foreground hover:bg-secondary transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); navigateLightbox(1); }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-secondary/70 text-foreground hover:bg-secondary transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {isVideo(lightbox.urls[lightbox.index]) ? (
            <motion.video
              key={lightbox.index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              src={lightbox.urls[lightbox.index]}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          ) : (
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
          )}

          {lightbox.urls.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {lightbox.urls.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, index: i } : null); }}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${i === lightbox.index ? 'bg-primary scale-125' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'}`}
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