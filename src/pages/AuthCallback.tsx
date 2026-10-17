import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserAuth } from "@/lib/auth/session";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [statusText, setStatusText] = useState("Authenticating and routing...");

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.substring(1) : hash);
        const searchParams = new URLSearchParams(search);

        // 1. Check for error in hash or query
        const error = hashParams.get("error") || searchParams.get("error");
        const errorDescription = hashParams.get("error_description") || searchParams.get("error_description");
        if (error) {
          navigate(`/auth/error?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "Authentication link invalid or expired")}`, { replace: true });
          return;
        }

        // 2. Check for explicit type parameter
        const authType = hashParams.get("type") || searchParams.get("type");
        if (authType === "recovery") {
          setStatusText("Redirecting to password recovery...");
          navigate(`/reset-password${window.location.hash || window.location.search}`, { replace: true });
          return;
        }

        if (authType === "invite") {
          setStatusText("Redirecting to team onboarding...");
          navigate(`/onboarding${window.location.hash || window.location.search}`, { replace: true });
          return;
        }

        if (authType === "signup" || authType === "email_change") {
          setStatusText("Redirecting to welcome portal...");
          navigate(`/welcome${window.location.hash || window.location.search}`, { replace: true });
          return;
        }

        // 3. Check for PKCE authorization code
        const code = searchParams.get("code");
        if (code) {
          setStatusText("Exchanging security authorization code...");
          const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            navigate(`/auth/error?message=${encodeURIComponent(exchangeErr.message)}`, { replace: true });
            return;
          }
        }

        // 4. Resolve session and user role
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // If user metadata requires password change, forward to onboarding
          if (session.user.user_metadata?.must_change_password) {
            navigate("/onboarding", { replace: true });
            return;
          }

          const auth = await resolveUserAuth(session.user.id, session.user.email);
          if (auth?.isSuperAdmin || auth?.isAdmin) {
            navigate("/admin", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          // Fallback to landing page with login modal open
          navigate("/?auth=login", { replace: true });
        }
      } catch (err: any) {
        console.error("Auth callback routing error:", err);
        navigate(`/auth/error?message=${encodeURIComponent(err?.message || "Authentication routing failed")}`, { replace: true });
      }
    };

    handleAuthRedirect();
  }, [navigate, location]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-foreground">SightLine Security Router</h2>
        <p className="text-xs text-muted-foreground">{statusText}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
