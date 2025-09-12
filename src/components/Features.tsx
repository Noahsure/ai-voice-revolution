import { Bot, Phone, BarChart3, Globe, Zap, Users, Clock, Shield, Sparkles } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: Bot,
      title: "Smart AI Agents",
      description: "Advanced conversational AI agents that understand context, handle objections, and deliver natural human-like interactions.",
      color: "text-neurovoice-primary"
    },
    {
      icon: Phone,
      title: "Manual & Batch Operations",
      description: "Make individual calls or upload CSV files for large-scale campaigns. Complete flexibility for any calling strategy.",
      color: "text-neurovoice-secondary"
    },
    {
      icon: BarChart3,
      title: "Real-Time Intelligence",
      description: "Monitor live conversations, track performance metrics, and get AI-powered insights for continuous optimization.",
      color: "text-neurovoice-accent"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Support for 29+ languages with natural, native-level conversations that connect with customers worldwide.",
      color: "text-neurovoice-primary"
    },
    {
      icon: Zap,
      title: "Instant Deployment",
      description: "Go from setup to first call in minutes. No complex integrations or technical expertise required.",
      color: "text-neurovoice-secondary"
    },
    {
      icon: Users,
      title: "Complete Call Management",
      description: "Handle inbound customer service and outbound sales with the same powerful AI infrastructure.",
      color: "text-neurovoice-accent"
    },
    {
      icon: Clock,
      title: "24/7 Operations",
      description: "Your AI agents never sleep, ensuring consistent availability and service quality around the clock.",
      color: "text-neurovoice-primary"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Built with enterprise-grade security, compliance features, and reliable infrastructure you can trust.", 
      color: "text-neurovoice-secondary"
    }
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-electric-blue/5 backdrop-blur-xl px-6 py-3 rounded-full text-electric-blue-dark text-sm font-medium mb-8 border border-electric-blue/10">
            <Sparkles className="w-4 h-4" />
            Advanced AI Technology
          </div>
          <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight">
            The Ultimate AI
            <br />
            <span className="text-neurovoice-primary font-medium">Call Centre Solution</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            Combining simplicity with the most advanced AI technology to deliver 
            ultra maximum results for your business communications.
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
              <h4 className="text-lg font-semibold mb-3">Setup AI Agents</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Configure your advanced AI agents with custom personalities and conversation flows.</p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neurovoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                2
              </div>
              <h4 className="text-lg font-semibold mb-3">Upload Contacts</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Import your contact database or make manual calls using the smart AI interface.</p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neurovoice-primary text-white text-lg font-medium mb-6 group-hover:scale-105 transition-transform duration-200">
                3
              </div>
              <h4 className="text-lg font-semibold mb-3">Achieve Maximum Results</h4>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Launch campaigns and watch advanced AI technology deliver ultra maximum results.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};