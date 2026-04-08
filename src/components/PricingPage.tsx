import { motion } from "framer-motion";
import { Check, X, Sparkles, ArrowLeft, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/BrandingContext";

interface PricingPageProps {
  onBack: () => void;
}

const features = [
  { name: "Project tracking & Gantt charts", free: true, premium: true },
  { name: "Task management & Kanban board", free: true, premium: true },
  { name: "Live notifications & status updates", free: true, premium: true },
  { name: "Email subscriber notifications", free: true, premium: true },
  { name: "PDF report exports", free: true, premium: true },
  { name: "Custom company branding (logo, name, colors)", free: false, premium: true },
  { name: "Branded PDF reports with your logo", free: false, premium: true },
  { name: "Custom accent color across app UI", free: false, premium: true },
  { name: "Remove 'Powered by SightLine' watermark", free: false, premium: true },
  { name: "Priority support", free: false, premium: true },
];

const PricingPage = ({ onBack }: PricingPageProps) => {
  const { isPremium, startCheckout, openCustomerPortal, subscriptionEnd } = useBranding();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Upgrade to Premium for white-label branding, custom reports, and a fully personalised experience.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <motion.div
            className="glass-card rounded-2xl p-6 sm:p-8 border border-border/40 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Free</h2>
            </div>
            <p className="text-muted-foreground text-xs mb-5">For personal and small projects</p>
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">$0</span>
              <span className="text-muted-foreground text-sm"> /month</span>
            </div>
            <ul className="space-y-3 flex-1">
              {features.map((f) => (
                <li key={f.name} className="flex items-start gap-2 text-sm">
                  {f.free ? (
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                  )}
                  <span className={f.free ? "text-foreground" : "text-muted-foreground/50"}>
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {!isPremium ? (
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
            className="glass-card rounded-2xl p-6 sm:p-8 border-2 border-primary/50 flex flex-col relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Popular badge */}
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              POPULAR
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Premium</h2>
            </div>
            <p className="text-muted-foreground text-xs mb-5">For teams and professional branding</p>
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">$29</span>
              <span className="text-muted-foreground text-sm"> /month</span>
            </div>
            <ul className="space-y-3 flex-1">
              {features.map((f) => (
                <li key={f.name} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">{f.name}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPremium ? (
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
                <Button className="w-full" onClick={startCheckout}>
                  <Sparkles className="w-4 h-4 mr-1.5" /> Upgrade to Premium
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        {/* FAQ / Note */}
        <motion.p
          className="text-center text-xs text-muted-foreground mt-10 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Cancel anytime. All plans include unlimited projects and team members.
          Premium features activate instantly after checkout.
        </motion.p>
      </div>
    </div>
  );
};

export default PricingPage;
