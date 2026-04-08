import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  subscriptionTier: "free",
  isPremium: false,
  loading: true,
  refresh: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "premium">("free");
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setBranding(null);
      setSubscriptionTier("free");
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    // Fetch branding and profile tier in parallel
    const [brandingRes, profileRes] = await Promise.all([
      supabase.from("company_branding").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("subscription_tier").eq("id", userId).single(),
    ]);

    if (brandingRes.data) {
      setBranding(brandingRes.data as CompanyBranding);
    } else {
      setBranding(null);
    }

    const tier = (profileRes.data as any)?.subscription_tier;
    setSubscriptionTier(tier === "premium" ? "premium" : "free");
    setLoading(false);
  };

  useEffect(() => {
    fetchBranding();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchBranding();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        subscriptionTier,
        isPremium: subscriptionTier === "premium",
        loading,
        refresh: fetchBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};
