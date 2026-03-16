import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Image, Clock, Loader2, Video, Play, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { toast } from "@/hooks/use-toast";
import MediaLightbox from "./MediaLightbox";
import CreateUpdateForm from "./CreateUpdateForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { tasks, selectedProjectId } = useProjectData();

  const activeTasks = tasks.filter(t => t.status === "Processing" || t.status === "Initiating");
  const allTickerItems = activeTasks.map(t => t.name);

  // Check admin role
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).single();
      setIsAdmin(data?.role === "admin");
    };
    check();
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (allTickerItems.length === 0) {
      setTickerText("");
      return;
    }
    const currentText = allTickerItems[tickerIndex % allTickerItems.length];
    let charIndex = 0;

    const interval = setInterval(() => {
      charIndex++;
      setTickerText(currentText.slice(0, charIndex));
      if (charIndex >= currentText.length) {
        setTimeout(() => {
          const eraseInterval = setInterval(() => {
            charIndex--;
            setTickerText(currentText.slice(0, charIndex));
            if (charIndex <= 0) {
              clearInterval(eraseInterval);
              setTickerIndex(prev => (prev + 1) % allTickerItems.length);
            }
          }, 30);
        }, 2000);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [tickerIndex, allTickerItems.length]);

  const openLightbox = useCallback((urls: string[], index: number) => {
    setLightbox({ urls, index });
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("notifications").delete().eq("id", deleteTarget);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNotifications(prev => prev.filter(n => n.id !== deleteTarget));
      toast({ title: "Deleted", description: "Notification removed" });
    }
    setDeleteTarget(null);
  };

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

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card overflow-hidden relative"
    >
      {/* Fade-in glow */}
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

      {/* Header: Bell + LIVE UPDATES + Ticker + Latest update */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/50 flex items-center gap-3 min-h-[56px]">
        <motion.div
          animate={newFlash ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex-shrink-0"
        >
          <Bell className="w-4 h-4 text-primary" />
        </motion.div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex-shrink-0">Live Updates</h3>

        {/* Typewriter ticker inline in header */}
        {activeTasks.length > 0 && (
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <span className="text-border/40">|</span>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="flex-shrink-0">
              <Loader2 className="w-3 h-3 text-processing" />
            </motion.div>
            <span className="text-xs font-semibold text-processing truncate min-w-0">
              {tickerText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className="inline-block w-[2px] h-3 bg-processing ml-0.5 align-middle"
              />
            </span>
            <span className="text-[9px] font-mono bg-processing/20 text-processing px-2 py-0.5 rounded-full font-bold flex-shrink-0">
              {activeTasks.length} LIVE
            </span>
          </div>
        )}

        {/* Latest notification accent pill */}
        {notifications.length > 0 && (
          <div className="ml-auto flex-shrink-0 max-w-[30%]">
            <span className="text-[10px] font-medium text-accent-foreground bg-accent/20 px-2.5 py-1 rounded-full truncate block">
              {notifications[0].message.length > 40 ? notifications[0].message.slice(0, 40) + "…" : notifications[0].message}
            </span>
          </div>
        )}
      </div>

      {/* Compose + Feed */}
      <div className="max-h-[720px] sm:max-h-[820px] xl:max-h-[920px] overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-3">
        <CreateUpdateForm />

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
                className="rounded-[0.625rem] border border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden group/card"
              >
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
                  {/* Admin delete button */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/card:opacity-100 flex-shrink-0"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

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

    {/* Lightbox */}
    <AnimatePresence>
      {lightbox && (
        <MediaLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
};

export default LiveNotifications;
