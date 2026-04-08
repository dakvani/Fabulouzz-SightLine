import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Palette, Globe, Building2, Sparkles, X, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface BrandingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const BrandingSettings = ({ isOpen, onClose }: BrandingSettingsProps) => {
  const { branding, isPremium, refresh } = useBranding();
  const [companyName, setCompanyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branding) {
      setCompanyName(branding.company_name || "");
      setTagline(branding.tagline || "");
      setAccentColor(branding.accent_color || "#4f46e5");
      setWebsiteUrl(branding.website_url || "");
      setLogoPreview(branding.logo_url || null);
    }
  }, [branding]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");
      const userId = session.user.id;

      let logoUrl = branding?.logo_url || null;

      // Upload logo if new file selected
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${userId}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("company-logos")
          .getPublicUrl(path);
        logoUrl = publicData.publicUrl;
      }

      // Upsert branding record
      const { error } = await supabase.from("company_branding").upsert(
        {
          user_id: userId,
          company_name: companyName,
          tagline,
          accent_color: accentColor,
          website_url: websiteUrl,
          logo_url: logoUrl,
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      await refresh();
      toast({ title: "Branding Saved", description: "Your company branding has been updated." });
      setLogoFile(null);
      onClose();
    } catch (err: any) {
      console.error("Save branding error:", err);
      toast({ title: "Save Failed", description: err.message || "Could not save branding.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isPremium) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Premium Feature
            </DialogTitle>
            <DialogDescription>
              Custom branding is available for Premium subscribers. Upgrade to customize your company logo, name, and colors across the app and PDF reports.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Company Branding
          </DialogTitle>
          <DialogDescription>
            Customize your branding to appear in the app header and PDF reports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Company Logo
            </Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative group">
                  <img src={logoPreview} alt="Logo preview" className="h-14 w-auto rounded-lg border border-border/30 object-contain bg-background p-1" />
                  <button
                    onClick={() => { setLogoFile(null); setLogoPreview(branding?.logo_url || null); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="h-14 w-14 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-border/30 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                Choose File
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoSelect} />
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground">PNG, JPG, SVG or WebP. Max 2MB.</p>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Company Name
            </Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Construction Ltd."
              maxLength={100}
            />
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Building the future"
              maxLength={150}
            />
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Brand Color
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer bg-transparent"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#4f46e5"
                className="w-32 font-mono text-sm"
                maxLength={7}
              />
              <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: accentColor }} />
            </div>
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Website URL
            </Label>
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://www.example.com"
              maxLength={200}
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Header Preview</Label>
            <div className="rounded-xl border border-border/30 bg-card p-3 flex items-center gap-3">
              {logoPreview ? (
                <img src={logoPreview} alt="Preview" className="h-8 w-auto object-contain" />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {companyName?.[0] || "?"}
                </div>
              )}
              <div>
                <div className="font-bold text-sm" style={{ color: accentColor }}>{companyName || "Company Name"}</div>
                <div className="text-[10px] text-muted-foreground">{tagline || "Tagline"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save Branding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandingSettings;
