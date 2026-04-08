import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyBranding {
  id: string;
  user_id: string;
  company_name: string;
  logo_url: string | null;
  accent_color: string;
  tagline: string;
  website_url: string;
}

interface BrandingContextType {
  branding: CompanyBranding | null;
  subscriptionTier: "free" | "premium";
  isPremium: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  refresh: () => Promise<void>;
  startCheckout: (interval?: "monthly" | "annual") => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  subscriptionTier: "free",
  isPremium: false,
  loading: true,
  subscriptionEnd: null,
  refresh: async () => {},
  startCheckout: async () => {},
  openCustomerPortal: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "premium">("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply premium accent color as CSS variable on the root element
  useEffect(() => {
    const root = document.documentElement;
    if (branding?.accent_color && subscriptionTier === "premium") {
      const hex = branding.accent_color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
          case g: h = ((b - r) / d + 2) * 60; break;
          case b: h = ((r - g) / d + 4) * 60; break;
        }
      }
      const hsl = `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      root.style.setProperty("--primary", hsl);
      const fg = l > 0.5 ? "0 0% 10%" : "0 0% 98%";
      root.style.setProperty("--primary-foreground", fg);
    }
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
    };
  }, [branding?.accent_color, subscriptionTier]);

  const fetchBranding = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setBranding(null);
      setSubscriptionTier("free");
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    // Fetch branding and check subscription in parallel
    const [brandingRes, subRes] = await Promise.all([
      supabase.from("company_branding").select("*").eq("user_id", userId).maybeSingle(),
      supabase.functions.invoke("check-subscription"),
    ]);

    if (brandingRes.data) {
      setBranding(brandingRes.data as CompanyBranding);
    } else {
      setBranding(null);
    }

    if (subRes.data && !subRes.error) {
      const sub = subRes.data as any;
      setSubscriptionTier(sub.subscription_tier === "premium" ? "premium" : "free");
      setSubscriptionEnd(sub.subscription_end || null);
    } else {
      setSubscriptionTier("free");
      setSubscriptionEnd(null);
    }

    setLoading(false);
  }, []);

  const startCheckout = useCallback(async (interval: "monthly" | "annual" = "monthly") => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { interval },
    });
    if (error || !data?.url) {
      console.error("Checkout error:", error || data);
      return;
    }
    window.open(data.url, "_blank");
  }, []);

  const openCustomerPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error || !data?.url) {
      console.error("Portal error:", error || data);
      return;
    }
    window.open(data.url, "_blank");
  }, []);

  useEffect(() => {
    fetchBranding();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchBranding();
    });

    // Auto-refresh subscription every 60s
    const interval = setInterval(fetchBranding, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchBranding]);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        subscriptionTier,
        isPremium: subscriptionTier === "premium",
        loading,
        subscriptionEnd,
        refresh: fetchBranding,
        startCheckout,
        openCustomerPortal,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};
