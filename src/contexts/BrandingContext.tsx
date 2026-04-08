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
  startCheckout: () => Promise<void>;
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

  const startCheckout = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout");
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
