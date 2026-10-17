import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global Interceptor that runs at the top level of the BrowserRouter.
 * Intercepts any incoming auth links received via email (password recovery,
 * user onboarding/invites, welcome confirmations, or deep links) and routes
 * them directly to the relevant dedicated page, eliminating landing page confusion.
 */
export const AuthLinkInterceptor = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 0. Auto-redirect Vercel preview/branch deployments to the official production domain
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname.endsWith(".vercel.app") && !hostname.startsWith("localhost")) {
        const prodUrl = `https://sightline.fabulouzz.com${window.location.pathname}${window.location.search}${window.location.hash}`;
        console.info(`[AuthLinkInterceptor] Redirecting from Vercel preview deployment to production: ${prodUrl}`);
        window.location.replace(prodUrl);
        return;
      }
    }

    // 1. Inspect URL Hash Fragments (#access_token=...&type=recovery|invite|signup)
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const pathname = location.pathname;

    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.substring(1) : hash);
    const searchParams = new URLSearchParams(search);

    // Check for auth errors (e.g. link expired, OTP expired, access denied)
    const hashError = hashParams.get("error") || searchParams.get("error");
    const hashErrorDesc = hashParams.get("error_description") || searchParams.get("error_description");

    if (hashError && pathname !== "/auth/error") {
      navigate(`/auth/error?error=${encodeURIComponent(hashError)}&message=${encodeURIComponent(hashErrorDesc || "Email link is invalid or has expired.")}`, { replace: true });
      return;
    }

    const type = hashParams.get("type") || searchParams.get("type");
    const mode = searchParams.get("mode");

    // Case A: Password Recovery link
    if ((type === "recovery" || mode === "reset") && pathname !== "/reset-password") {
      navigate(`/reset-password${hash || search}`, { replace: true });
      return;
    }

    // Case B: Onboarding / Team Invitation link
    if ((type === "invite" || mode === "onboarding" || mode === "invite") && pathname !== "/onboarding") {
      navigate(`/onboarding${hash || search}`, { replace: true });
      return;
    }

    // Case C: Welcoming / Signup Confirmation link
    if ((type === "signup" || type === "email_change" || mode === "welcome") && pathname !== "/welcome") {
      navigate(`/welcome${hash || search}`, { replace: true });
      return;
    }

    // 2. Supabase Auth State Event Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && location.pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true });
      } else if (session?.user?.user_metadata?.must_change_password) {
        if (location.pathname !== "/onboarding" && location.pathname !== "/reset-password") {
          navigate("/onboarding", { replace: true });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  return null;
};
