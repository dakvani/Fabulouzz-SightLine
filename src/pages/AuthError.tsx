import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw, Mail } from "lucide-react";
import { useTheme } from "next-themes";
import fabulouzzLogo from "@/assets/fabulouzz-logo.png";
import fabulouzzLogoLight from "@/assets/fabulouzz-logo-light.png";

const AuthError = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const errorMessage = searchParams.get("message") || "The security token or email verification link is invalid, expired, or has already been used.";
  const errorType = searchParams.get("error") || "link_expired";

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <img
            src={theme === "dark" ? fabulouzzLogo : fabulouzzLogoLight}
            alt="Fabulouzz"
            className="h-8 w-auto"
          />
          <div className="flex flex-col border-l border-border/40 pl-3">
            <span
              className="text-xs font-bold tracking-wider text-primary uppercase"
              style={{ fontFamily: "'Neuropol X Free', sans-serif" }}
            >
              SIGHTLINE
            </span>
            <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.2em] uppercase">
              Command Center
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/85 backdrop-blur-xl border border-border/60 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Link Expired or Invalid
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 text-xs text-muted-foreground text-left space-y-1.5">
            <div className="font-semibold text-foreground">Security Note:</div>
            <p>
              To protect enterprise data, all password recovery and invitation links are strictly single-use and automatically expire.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate("/?auth=forgot", { replace: true })}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
              style={{ background: "var(--gradient-primary)" }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Request Fresh Reset Link</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/?auth=login", { replace: true })}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-foreground bg-secondary/60 hover:bg-secondary border border-border/60 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            <span>Need assistance? </span>
            <a href="mailto:info@fabulouzz.com" className="text-primary hover:underline font-semibold">
              info@fabulouzz.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthError;
