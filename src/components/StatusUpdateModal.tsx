import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Send, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { TaskStatus } from "@/data/projectData";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskName: string;
  currentStatus: TaskStatus;
}

const StatusUpdateModal = ({ isOpen, onClose, taskId, taskName, currentStatus }: StatusUpdateModalProps) => {
  const [newStatus, setNewStatus] = useState<TaskStatus>(currentStatus);
  const [message, setMessage] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setMediaPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let mediaUrl: string | null = null;

      // Upload all media files
      if (mediaFiles.length > 0) {
        const urls: string[] = [];
        for (const file of mediaFiles) {
          const ext = file.name.split(".").pop();
          const path = `task-${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("task-media")
            .upload(path, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from("task-media")
            .getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
        mediaUrl = JSON.stringify(urls);
      }

      // Create notification
      const { error: notifError } = await supabase.from("notifications").insert({
        message: message || `Task #${taskId} "${taskName}" status updated to ${newStatus}`,
        type: "status_update",
        media_url: mediaUrl,
      });

      if (notifError) throw notifError;

      toast({ title: "Status Updated", description: `Task #${taskId} notification sent` });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md glass-card p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Update Status — Task #{taskId}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-4 truncate">{taskName}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">New Status</label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as TaskStatus)}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="Planning">Planning</option>
                <option value="Initiating">Initiating</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Update Note</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe the update..."
                rows={3}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Attach Media ({mediaFiles.length}/5)</label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border/50 bg-secondary/20 cursor-pointer hover:border-primary/40 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to upload photos/videos</span>
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
              </label>
              {mediaPreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {mediaPreviews.map((preview, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-border/30 relative aspect-square">
                      <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Sending..." : "Send Update"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusUpdateModal;
