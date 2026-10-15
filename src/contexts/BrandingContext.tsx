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

export type SubscriptionTier = "free" | "premium" | "enterprise";

interface BrandingContextType {
  branding: CompanyBranding | null;
  subscriptionTier: SubscriptionTier;
  isPremium: boolean;
  isEnterprise: boolean;
  isAdmin: boolean;
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
  isEnterprise: false,
  isAdmin: false,
  loading: true,
  subscriptionEnd: null,
  refresh: async () => {},
  startCheckout: async () => {},
  openCustomerPortal: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPremiumEffective = isAdmin || subscriptionTier === "enterprise" || subscriptionTier === "premium";
  const isEnterpriseEffective = isAdmin || subscriptionTier === "enterprise";

  // Apply accent color as CSS variable on the root element
  useEffect(() => {
    const root = document.documentElement;
    if (branding?.accent_color && isPremiumEffective) {
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
  }, [branding?.accent_color, isPremiumEffective]);

  const fetchBranding = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setBranding(null);
      setSubscriptionTier("free");
      setIsAdmin(false);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    try {
      // Parallel fetch: Branding, User Roles, Profile Tier, and Stripe subscription
      const [brandingRes, roleRes, profileRes, subRes] = await Promise.all([
        supabase.from("company_branding").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle(),
        supabase.functions.invoke("check-subscription").catch(() => ({ data: null, error: null })),
      ]);

      if (brandingRes.data) {
        setBranding(brandingRes.data as CompanyBranding);
      } else {
        setBranding(null);
      }

      const roles = (roleRes.data || []).map((r: any) => r.role);
      const adminRole = roles.includes("admin");
      setIsAdmin(adminRole);

      // Admin user is automatically granted Enterprise Tier with all premium options
      if (adminRole) {
        setSubscriptionTier("enterprise");
        setSubscriptionEnd(null);
        // Ensure profile has 'enterprise' stored in database
        if (profileRes.data?.subscription_tier !== "enterprise") {
          supabase.from("profiles").update({ subscription_tier: "enterprise" }).eq("id", userId).then();
        }
      } else {
        const dbTier = profileRes.data?.subscription_tier;
        if (dbTier === "enterprise" || dbTier === "premium") {
          setSubscriptionTier(dbTier as SubscriptionTier);
          setSubscriptionEnd(null);
        } else if (subRes.data && !subRes.error && (subRes.data as any).subscription_tier === "premium") {
          setSubscriptionTier("premium");
          setSubscriptionEnd((subRes.data as any).subscription_end || null);
        } else {
          setSubscriptionTier("free");
          setSubscriptionEnd(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch branding or subscription:", err);
    } finally {
      setLoading(false);
    }
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
        isPremium: isPremiumEffective,
        isEnterprise: isEnterpriseEffective,
        isAdmin,
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
