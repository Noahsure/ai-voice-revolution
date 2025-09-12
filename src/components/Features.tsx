import { Bot, Phone, BarChart3, Globe, Zap, Users, Clock, Shield, Sparkles } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: Bot,
      title: "Your Eleven Labs Agents",
      description: "Access all your custom Eleven Labs conversational AI agents directly through our interface. Complete synchronization with your account.",
      color: "text-neurovoice-primary"
    },
    {
      icon: Phone,
      title: "Manual & Batch Calling",
      description: "Make individual calls or upload CSV files for batch campaigns. Your Eleven Labs agents handle all conversations naturally.",
      color: "text-neurovoice-secondary"
    },
    {
      icon: BarChart3,
      title: "Real-Time Call Monitoring",
      description: "Monitor live conversations, track call outcomes, and analyze performance with detailed analytics dashboard.",
      color: "text-neurovoice-accent"
    },
    {
      icon: Globe,
      title: "29+ Languages Support",
      description: "Leverage Eleven Labs' multilingual capabilities to reach global audiences with natural, human-like conversations.",
      color: "text-neurovoice-primary"
    },
    {
      icon: Zap,
      title: "One-Click Sync",
      description: "Simply connect your Eleven Labs account and all your agents, voices, and settings sync automatically.",
      color: "text-neurovoice-secondary"
    },
    {
      icon: Users,
      title: "Inbound & Outbound",
      description: "Handle both inbound customer calls and outbound sales campaigns with the same powerful AI agents.",
      color: "text-neurovoice-accent"
    },
    {
      icon: Clock,
      title: "Always-On Availability",
      description: "Your Eleven Labs agents are available 24/7, providing consistent, high-quality conversations at any time.",
      color: "text-neurovoice-primary"
    },
    {
      icon: Shield,
      title: "Eleven Labs Security",
      description: "Built on Eleven Labs' secure infrastructure with enterprise-grade security and compliance features.", 
      color: "text-neurovoice-secondary"
    }
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-electric-blue/5 backdrop-blur-xl px-6 py-3 rounded-full text-electric-blue-dark text-sm font-medium mb-8 border border-electric-blue/10">
            <Sparkles className="w-4 h-4" />
            Eleven Labs Integration
          </div>
          <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight">
            The Ultimate Interface for
            <br />
            <span className="text-neurovoice-primary font-medium">Eleven Labs AI</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            Seamlessly connect your Eleven Labs account and transform your conversational AI agents 
            into a powerful calling platform for manual and batch operations.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-white border border-border/20 hover:border-electric-blue/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className={`inline-flex p-4 rounded-xl bg-gradient-ai shadow-sm ${feature.color} mb-6 group-hover:scale-105 transition-all duration-300`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-4 group-hover:text-electric-blue-dark transition-colors duration-200">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Process Flow */}
        <div className="mt-24">
          <h3 className="text-3xl font-light text-center mb-12 tracking-tight">
            Get Started in <span className="text-neurovoice-primary font-medium">3 Simple Steps</span>
          </h3>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neurovoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                1
              </div>
              <h4 className="text-lg font-semibold mb-3">Connect Eleven Labs</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Sync your Eleven Labs account and import all your conversational AI agents automatically.</p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neurovoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                2
              </div>
              <h4 className="text-lg font-semibold mb-3">Upload Contacts</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Upload your contact list or make manual calls using your synchronized AI agents.</p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neurovoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                3
              </div>
              <h4 className="text-lg font-semibold mb-3">Start Calling</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Launch campaigns and monitor real-time conversations powered by Eleven Labs AI.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};