import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Palette,
  Upload,
  Globe,
  Save,
  Loader2,
  X,
  Sparkles,
  Check,
  FileText,
  ShieldCheck,
  Lock,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingContext";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { toast } from "@/hooks/use-toast";

const PRESET_COLORS = [
  { name: "Emerald Mint", color: "#10b981" },
  { name: "Cyan Ice", color: "#06b6d4" },
  { name: "Cobalt Blue", color: "#3b82f6" },
  { name: "Indigo Modern", color: "#6366f1" },
  { name: "Imperial Violet", color: "#8b5cf6" },
  { name: "Amber Gold", color: "#f59e0b" },
  { name: "Crimson Red", color: "#ef4444" },
  { name: "Tactical Slate", color: "#64748b" },
];

export const ProjectBrandingManager = () => {
  const { branding, isPremium, isEnterprise, isAdmin, refresh: refreshBranding } = useBranding();
  const { projectInfo, projectId, canEditProject, userRole } = useProjectData();

  const [companyName, setCompanyName] = useState(branding?.company_name || projectInfo.company || "");
  const [tagline, setTagline] = useState(branding?.tagline || "Project Command Center");
  const [accentColor, setAccentColor] = useState(branding?.accent_color || "#10b981");
  const [websiteUrl, setWebsiteUrl] = useState(branding?.website_url || "https://fabulouzz.com");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(branding?.logo_url || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branding) {
      setCompanyName(branding.company_name || projectInfo.company || "");
      setTagline(branding.tagline || "Project Command Center");
      setAccentColor(branding.accent_color || "#10b981");
      setWebsiteUrl(branding.website_url || "https://fabulouzz.com");
      setLogoPreview(branding.logo_url || null);
    }
  }, [branding, projectInfo.company]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Logo file must be under 2MB.",
        variant: "destructive",
      });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSaveBranding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEditProject && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to modify branding.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Authentication required.");

      const userId = session.user.id;
      let finalLogoUrl = logoPreview;

      // Upload new logo if provided
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${userId}/logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(path, logoFile, { upsert: true });

        if (uploadError) {
          // If storage bucket isn't set up yet, warn gracefully but proceed
          console.warn("Storage upload warning:", uploadError);
        } else {
          const { data: publicData } = supabase.storage.from("company-logos").getPublicUrl(path);
          finalLogoUrl = publicData.publicUrl;
        }
      }

      // Upsert into company_branding
      const { error: brandingError } = await supabase.from("company_branding").upsert(
        {
          user_id: userId,
          company_name: companyName.trim(),
          tagline: tagline.trim(),
          accent_color: accentColor,
          website_url: websiteUrl.trim(),
          logo_url: finalLogoUrl,
        },
        { onConflict: "user_id" }
      );

      if (brandingError) throw brandingError;

      // Also sync company name to the current project if different
      if (projectId && companyName.trim() && companyName.trim() !== projectInfo.company) {
        await supabase
          .from("projects")
          .update({ company: companyName.trim() })
          .eq("id", projectId);
      }

      await refreshBranding();
      setLogoFile(null);
      toast({
        title: "Branding Configured",
        description: "Your custom brand identity and reports styling have been updated successfully.",
      });
    } catch (err: any) {
      console.error("Save branding error:", err);
      toast({
        title: "Failed to Save Branding",
        description: err.message || "Could not save branding settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/30">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                White-Label Branding & Reports Governance
              </h2>
              {canEditProject ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {userRole === "admin" ? "Enterprise Admin" : "PM Access"}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  View Only
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize company logo, brand color, header typography, and executive PDF report themes for this project.
            </p>
          </div>

          {canEditProject && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSaveBranding()}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shadow-md self-start sm:self-auto"
              style={{ background: "var(--gradient-primary)" }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Branding</span>
            </motion.button>
          )}
        </div>

        {/* Branding Form & Previews Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          {/* Left: Input Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Logo Upload Card */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-primary" />
                Company Logo (Header & PDF Cover)
              </label>

              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative group">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="h-16 w-32 rounded-xl border border-border/40 object-contain bg-background/80 p-2 shadow-sm"
                    />
                    {canEditProject && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Remove custom logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-16 w-32 rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 flex flex-col items-center justify-center text-muted-foreground">
                    <Building2 className="w-6 h-6 text-muted-foreground/60" />
                    <span className="text-[9px] mt-1">Default Logo</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-secondary/60 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Upload New Logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoSelect}
                      disabled={!canEditProject}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Recommended: Transparent PNG or SVG. Max 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Company / Organization Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!canEditProject}
                placeholder="e.g. Fabulouzz Technologies, Saudi Aramco, NEOM"
                className="bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-full"
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Company Tagline / Subtitle
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                disabled={!canEditProject}
                placeholder="e.g. Project Command Center, Architectural Construction Suite"
                className="bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-full"
              />
            </div>

            {/* Brand Accent Color */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" />
                Brand Accent Color
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={!canEditProject}
                  className="w-10 h-10 rounded-xl border border-border/60 cursor-pointer bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={!canEditProject}
                  placeholder="#10b981"
                  className="w-28 font-mono text-sm bg-secondary/40 border border-border/60 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  maxLength={7}
                />
                <div
                  className="h-9 flex-1 rounded-xl shadow-inner border border-border/30 flex items-center px-3 text-xs font-bold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Accent Color Preview
                </div>
              </div>

              {/* Color Swatch Presets */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1">
                  Presets:
                </span>
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setAccentColor(preset.color)}
                    disabled={!canEditProject}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-border/40 bg-secondary/40 hover:bg-secondary transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-muted-foreground text-[10px]">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Website URL */}
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                Company Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={!canEditProject}
                placeholder="https://www.example.com"
                className="bg-secondary/40 border border-border/60 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-full"
              />
            </div>
          </div>

          {/* Right: Live Preview Cards */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Live Visual Previews
            </span>

            {/* Preview 1: Header Brand Card */}
            <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  App Header Appearance
                </span>
                <span className="text-[9px] text-primary font-mono font-semibold">Live Preview</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 flex items-center gap-3">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-9 w-auto max-w-[90px] object-contain rounded-md"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm"
                    style={{ backgroundColor: accentColor, color: "#fff" }}
                  >
                    {(companyName || "S")[0].toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div
                    className="font-bold text-sm truncate tracking-wide"
                    style={{ color: accentColor }}
                  >
                    {companyName || "SIGHTLINE"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase truncate">
                    {tagline || "Command Center"}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview 2: PDF Report Cover Appearance */}
            <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  PDF Executive Report Cover
                </span>
                <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                  <FileText className="w-3 h-3 text-primary" /> Export Theme
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="text-xs font-bold tracking-wider" style={{ color: accentColor }}>
                      {companyName ? companyName.toUpperCase() : "FABULOUZZ TECHNOLOGIES"}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">OFFICIAL REPORT</span>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-mono uppercase">
                    PROJECT STATUS & METRICS DISCLOSURE
                  </p>
                  <p className="text-sm font-bold text-white">
                    {projectInfo.title || "SightLine Project Alpha"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Ref: {projectInfo.projectRef || "REF-001"} • Client: {projectInfo.client || "Client"}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
                  <span>{websiteUrl || "https://fabulouzz.com"}</span>
                  <span style={{ color: accentColor }}>Powered by SightLine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectBrandingManager;
