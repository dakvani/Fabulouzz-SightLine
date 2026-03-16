import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Upload, X, Play, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { toast } from "@/hooks/use-toast";

const CreateUpdateForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { projectId } = useProjectData();

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

  const handleSubmit = async () => {
    if (!message.trim() && mediaFiles.length === 0) return;
    if (!projectId) return;
    setLoading(true);

    try {
      let mediaUrl: string | null = null;

      if (mediaFiles.length > 0) {
        const urls: string[] = [];
        for (const file of mediaFiles) {
          const ext = file.name.split(".").pop();
          const path = `updates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

      const { error } = await supabase.from("notifications").insert({
        message: message.trim() || "New update posted",
        type: "live_update",
        media_url: mediaUrl,
        project_id: projectId,
      });

      if (error) throw error;

      toast({ title: "Update Posted", description: "Your update is now live" });
      setMessage("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setIsOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }

    setLoading(false);
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-[0.625rem] border border-dashed border-border/40 bg-secondary/5 hover:bg-secondary/15 hover:border-primary/30 transition-colors text-muted-foreground"
      >
        <Plus className="w-4 h-4" />
        <span className="text-xs font-medium">Post an update...</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[0.625rem] border border-primary/20 bg-primary/5 overflow-hidden"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">New Update</span>
          <button onClick={() => { setIsOpen(false); setMessage(""); setMediaFiles([]); setMediaPreviews([]); }} className="p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What's the update?"
          rows={2}
          className="w-full bg-secondary/30 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          autoFocus
        />

        {/* Media previews */}
        {mediaPreviews.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {mediaPreviews.map((preview, i) => {
              const file = mediaFiles[i];
              const isVid = file?.type?.startsWith("video/");
              return (
                <div key={i} className="rounded-lg overflow-hidden border border-border/30 relative aspect-square">
                  {isVid ? (
                    <>
                      <video src={preview} muted className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-background/20 pointer-events-none">
                        <Play className="w-4 h-4 text-foreground drop-shadow" />
                      </div>
                    </>
                  ) : (
                    <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button type="button" onClick={() => removeFile(i)} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Media</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
          </label>

          <motion.button
            onClick={handleSubmit}
            disabled={loading || (!message.trim() && mediaFiles.length === 0)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground disabled:opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {loading ? "Posting..." : "Post"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default CreateUpdateForm;
