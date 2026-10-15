import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles, ArrowLeft, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/BrandingContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PricingPageProps {
  onBack: () => void;
}

const features = [
  { name: "Project tracking & Gantt charts", free: true, premium: true, enterprise: true },
  { name: "Task management & Kanban board", free: true, premium: true, enterprise: true },
  { name: "Live notifications & status updates", free: true, premium: true, enterprise: true },
  { name: "Email subscriber notifications", free: true, premium: true, enterprise: true },
  { name: "PDF report exports", free: true, premium: true, enterprise: true },
  { name: "Custom company branding (logo, name, colors)", free: false, premium: true, enterprise: true },
  { name: "Branded PDF reports with your logo", free: false, premium: true, enterprise: true },
  { name: "Custom accent color across app UI", free: false, premium: true, enterprise: true },
  { name: "Remove 'Powered by SightLine' watermark", free: false, premium: true, enterprise: true },
  { name: "Multi-project Fleet Command Center (/admin)", free: false, premium: false, enterprise: true },
  { name: "Role-Based Access Control & User Provisioning", free: false, premium: false, enterprise: true },
  { name: "Global Project Broadcasts & Realtime Tickers", free: false, premium: false, enterprise: true },
  { name: "Priority enterprise support & SLA", free: false, premium: true, enterprise: true },
];

const PricingPage = ({ onBack }: PricingPageProps) => {
  const { isPremium, isEnterprise, isAdmin, subscriptionTier, startCheckout, openCustomerPortal, subscriptionEnd } = useBranding();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const price = billing === "monthly" ? 29 : 290;
  const perMonth = billing === "monthly" ? 29 : +(290 / 12).toFixed(2);
  const enterprisePrice = billing === "monthly" ? 99 : 990;
  const enterprisePerMonth = billing === "monthly" ? 99 : +(990 / 12).toFixed(2);

  const handleCheckout = () => {
    startCheckout(billing);
  };

  const isCurrentEnterprise = isAdmin || isEnterprise || subscriptionTier === "enterprise";
  const isCurrentPremium = !isCurrentEnterprise && (isPremium || subscriptionTier === "premium");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back button */}
        <motion.button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </motion.button>

        {/* Header */}
        <motion.div
          className="text-center mb-10 sm:mb-14"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
            <Crown className="w-3.5 h-3.5" />
            <span>Enterprise-Grade Project Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mb-6">
            Choose the right power level for your projects. Admins and Enterprise users receive full access to all white-labeling, fleet dashboards, and custom exports.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-muted/60 rounded-full p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                billing === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                billing === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="ml-1.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* 3-Tier Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto">
          {/* Free Plan */}
          <motion.div
            className="glass-card rounded-2xl p-6 border border-border/40 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Free</h2>
            </div>
            <p className="text-muted-foreground text-xs mb-4">For individual clients & project viewers</p>
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">$0</span>
              <span className="text-muted-foreground text-sm"> /month</span>
            </div>
            <ul className="space-y-2.5 flex-1 text-xs">
              {features.map((f) => (
                <li key={f.name} className="flex items-start gap-2">
                  {f.free ? (
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted-foreground/30 mt-0.5 shrink-0" />
                  )}
                  <span className={f.free ? "text-foreground" : "text-muted-foreground/40"}>
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {!isPremium && !isCurrentEnterprise ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Free Tier
                </Button>
              )}
            </div>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            className="glass-card rounded-2xl p-6 border border-primary/40 flex flex-col relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Premium</h2>
            </div>
            <p className="text-muted-foreground text-xs mb-4">
              For teams requiring custom branding & PDF reports
            </p>
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">${price}</span>
              <span className="text-muted-foreground text-sm">
                {billing === "monthly" ? " /month" : " /year"}
              </span>
              {billing === "annual" && (
                <span className="block text-xs text-muted-foreground mt-1">
                  ${perMonth}/mo — billed annually
                </span>
              )}
            </div>
            <ul className="space-y-2.5 flex-1 text-xs">
              {features.map((f) => (
                <li key={f.name} className="flex items-start gap-2">
                  {f.premium ? (
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted-foreground/30 mt-0.5 shrink-0" />
                  )}
                  <span className={f.premium ? "text-foreground" : "text-muted-foreground/40"}>
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isCurrentPremium ? (
                <div className="space-y-2">
                  <Button className="w-full" disabled>
                    <Sparkles className="w-4 h-4 mr-1.5" /> Your Current Plan
                  </Button>
                  {subscriptionEnd && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Renews {new Date(subscriptionEnd).toLocaleDateString()}
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={openCustomerPortal}>
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={handleCheckout}>
                  <Sparkles className="w-4 h-4 mr-1.5" /> Start 14-Day Free Trial
                </Button>
              )}
            </div>
          </motion.div>

          {/* Enterprise Plan */}
          <motion.div
            className="glass-card rounded-2xl p-6 border-2 border-amber-500/50 shadow-xl shadow-amber-500/5 flex flex-col relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Enterprise Tag */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3 fill-white" />
              <span>SUPER ADMIN</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-foreground">Enterprise</h2>
            </div>
            <p className="text-muted-foreground text-xs mb-4">
              Full multi-project fleet control, RBAC, and white-labeling
            </p>
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">${enterprisePrice}</span>
              <span className="text-muted-foreground text-sm">
                {billing === "monthly" ? " /month" : " /year"}
              </span>
              {billing === "annual" && (
                <span className="block text-xs text-muted-foreground mt-1">
                  ${enterprisePerMonth}/mo — billed annually
                </span>
              )}
            </div>
            <ul className="space-y-2.5 flex-1 text-xs">
              {features.map((f) => (
                <li key={f.name} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-foreground font-medium">{f.name}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isCurrentEnterprise ? (
                <div className="space-y-2">
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20" disabled>
                    <Crown className="w-4 h-4 mr-1.5 fill-white" /> Active Enterprise SuperAdmin
                  </Button>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold text-center">
                    All premium options unlocked
                  </p>
                </div>
              ) : (
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  onClick={() => {
                    toast({
                      title: "Contact Enterprise Sales or Super Admin",
                      description: "Enterprise tier is granted directly by the Super Administrator via /admin.",
                    });
                  }}
                >
                  <Crown className="w-4 h-4 mr-1.5" /> Request Enterprise Access
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Footer Note */}
        <motion.p
          className="text-center text-xs text-muted-foreground mt-10 max-w-lg mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Super Administrators automatically hold Enterprise status with all white-labeling, custom reports, and project fleet options fully unlocked.
        </motion.p>
      </div>
    </div>
  );
};

export default PricingPage;
