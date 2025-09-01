import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Sparkles } from "lucide-react";

export const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "£100",
      yearlyPrice: "£1,000",
      description: "Perfect for small businesses getting started with AI calling",
      icon: Zap,
      features: [
        "50 Pre-built AI Agents",
        "5 Simultaneous Campaigns",
        "10,000 Call Minutes/Month",
        "10,000 Contacts per Campaign",
        "1 Team Member",
        "25 Languages",
        "Basic Analytics",
        "Email Support",
        "CSV Upload",
        "Basic Integrations"
      ],
      popular: false,
      buttonText: "Start Starter Plan",
      buttonVariant: "nexavoice" as const
    },
    {
      name: "Premium",
      price: "£250",
      yearlyPrice: "£2,500",
      description: "For growing businesses that need unlimited power",
      icon: Crown,
      features: [
        "Unlimited Custom AI Agents",
        "Unlimited Campaigns",
        "Unlimited Call Minutes",
        "Unlimited Contacts",
        "Unlimited Team Members",
        "50+ Languages & Voices",
        "Advanced Analytics & Reporting",
        "Live Call Monitoring",
        "Priority Support (24/7)",
        "Custom Integrations",
        "White-Label Options",
        "Full API Access",
        "A/B Testing",
        "Predictive Analytics"
      ],
      popular: true,
      buttonText: "Start Premium Plan",
      buttonVariant: "hero" as const
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-surface-muted via-background to-surface-elevated">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-nexavoice-primary/10 px-4 py-2 rounded-full text-nexavoice-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Simple & Transparent Pricing
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Choose Your <span className="nexavoice-text-gradient">Power Level</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with a 7-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 ${
                plan.popular
                  ? 'bg-gradient-card border-2 border-nexavoice-primary/50 nexavoice-glow'
                  : 'bg-card border border-border'
              } transition-all duration-300 hover:scale-105`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-hero px-6 py-2 rounded-full text-white text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${plan.popular ? 'bg-nexavoice-primary' : 'bg-nexavoice-secondary'}`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="text-sm text-nexavoice-primary font-medium">
                  or {plan.yearlyPrice}/year (save 17%)
                </div>
              </div>

              <Button 
                variant={plan.buttonVariant} 
                size="lg" 
                className="w-full mb-8"
              >
                {plan.buttonText}
              </Button>

              <div className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-nexavoice-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trial Information */}
        <div className="text-center bg-gradient-hero rounded-2xl p-8 text-white max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">7-Day Free Trial Includes:</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>Full Premium Access</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <div>No Credit Card Required</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>Priority Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};