import { Bot, Phone, BarChart3, Globe, Zap, Users, Clock, Shield, Sparkles } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: Bot,
      title: "50+ Pre-Built AI Agents",
      description: "Choose from Sales Pro Sarah, Scheduler Sam, Helper Hannah, and 47 more specialized agents. Each optimized for specific tasks.",
      color: "text-nexavoice-primary"
    },
    {
      icon: Phone,
      title: "3-Click Campaign Launch",
      description: "Upload contacts, select agent, hit launch. Your AI is calling within minutes, not weeks.",
      color: "text-nexavoice-secondary"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Live call monitoring, sentiment analysis, conversion tracking, and quality scoring for every conversation.",
      color: "text-nexavoice-accent"
    },
    {
      icon: Globe,
      title: "50+ Languages",
      description: "Reach customers worldwide with native-level fluency in English, Spanish, French, Mandarin, and 46 more languages.",
      color: "text-nexavoice-primary"
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "No technical knowledge required. Connect your Twilio account and start calling in under 5 minutes.",
      color: "text-nexavoice-secondary"
    },
    {
      icon: Users,
      title: "Unlimited Scalability",
      description: "Handle 1 call or 10,000 simultaneous calls. Our infrastructure scales automatically with your needs.",
      color: "text-nexavoice-accent"
    },
    {
      icon: Clock,
      title: "24/7 Calling",
      description: "Your AI agents never sleep, never take breaks, and maintain consistent quality around the clock.",
      color: "text-nexavoice-primary"
    },
    {
      icon: Shield,
      title: "Compliance Built-In",
      description: "GDPR, TCPA, and DNC compliance monitoring. Automatic opt-out handling and consent management.",
      color: "text-nexavoice-secondary"
    }
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-luxury-gold/5 backdrop-blur-xl px-6 py-3 rounded-full text-luxury-gold-dark text-sm font-medium mb-8 border border-luxury-gold/10">
            <Sparkles className="w-4 h-4" />
            Revolutionary Features
          </div>
          <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight">
            Everything You Need to
            <br />
            <span className="text-nexavoice-primary font-medium">Dominate Your Market</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            Built for business owners who demand results, not complexity. Every feature designed 
            to get you from zero to profitable calling campaigns in minutes.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-white border border-border/20 hover:border-luxury-gold/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className={`inline-flex p-4 rounded-xl bg-gradient-platinum shadow-sm ${feature.color} mb-6 group-hover:scale-105 transition-all duration-300`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-4 group-hover:text-luxury-gold-dark transition-colors duration-200">
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
            Launch Your First Campaign in <span className="text-nexavoice-primary font-medium">3 Simple Steps</span>
          </h3>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-nexavoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                1
              </div>
              <h4 className="text-lg font-semibold mb-3">Upload Contacts</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Drag & drop your CSV or Excel file. We'll auto-detect phone numbers and names.</p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-nexavoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                2
              </div>
              <h4 className="text-lg font-semibold mb-3">Choose AI Agent</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Select from 50+ pre-trained agents or create your own custom agent.</p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-nexavoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                3
              </div>
              <h4 className="text-lg font-semibold mb-3">Launch & Monitor</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Hit launch and watch real-time analytics as your AI starts converting leads.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};