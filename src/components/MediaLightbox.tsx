import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MediaLightboxProps {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}

const isVideo = (url: string): boolean => {
  const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogg'];
  const lower = url.toLowerCase().split('?')[0];
  return videoExts.some(ext => lower.endsWith(ext));
};

const MediaLightbox = ({ urls, initialIndex, onClose }: MediaLightboxProps) => {
  const [index, setIndex] = useState(initialIndex);

  const navigate = useCallback((dir: 1 | -1) => {
    setIndex(prev => (prev + dir + urls.length) % urls.length);
  }, [urls.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-md"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors z-10">
        <X className="w-5 h-5" />
      </button>

      {urls.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-mono text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full z-10">
          {index + 1} / {urls.length}
        </div>
      )}

      {urls.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); navigate(-1); }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-secondary/70 text-foreground hover:bg-secondary transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); navigate(1); }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-secondary/70 text-foreground hover:bg-secondary transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {isVideo(urls[index]) ? (
        <motion.video
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          src={urls[index]}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <motion.img
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          src={urls[index]}
          alt="Full size media"
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      )}

      {urls.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIndex(i); }}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === index ? 'bg-primary scale-125' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default MediaLightbox;
