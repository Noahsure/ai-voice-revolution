import { Button } from "@/components/ui/button";
import { Phone, Zap, Users, BarChart3, ArrowRight, Play } from "lucide-react";
import heroImage from "@/assets/nexavoice-hero.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      </div>
      
      {/* Floating elements */}
      <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-nexavoice-primary/20 rounded-full blur-xl nexavoice-animate-float" />
      <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-nexavoice-secondary/20 rounded-full blur-xl nexavoice-animate-float" style={{ animationDelay: '-2s' }} />
      <div className="absolute top-1/2 right-1/6 w-12 h-12 bg-nexavoice-accent/20 rounded-full blur-xl nexavoice-animate-float" style={{ animationDelay: '-4s' }} />
      
      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-hero px-6 py-2 rounded-full text-white text-sm font-medium mb-8 nexavoice-glow">
            <Zap className="w-4 h-4" />
            Revolutionizing Call Centers Globally
          </div>
          
          {/* Main headline */}
          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
            <span className="nexavoice-text-gradient">NEXAVOICE</span>
            <br />
            <span className="text-foreground">AI VOICE CALLING</span>
            <br />
            <span className="text-muted-foreground text-5xl md:text-6xl">PLATFORM</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Replace your entire call center with AI agents that handle inbound and outbound calls. 
            <span className="text-foreground font-semibold"> Launch your first campaign in under 3 minutes.</span>
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold nexavoice-text-gradient mb-2">10x</div>
              <div className="text-muted-foreground">Faster Setup</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold nexavoice-text-gradient mb-2">50+</div>
              <div className="text-muted-foreground">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold nexavoice-text-gradient mb-2">25+</div>
              <div className="text-muted-foreground">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold nexavoice-text-gradient mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="xl" className="group">
              Start Free 7-Day Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="xl" className="group">
              <Play className="w-5 h-5" />
              Watch Demo (2 min)
            </Button>
          </div>
          
          {/* Trust indicators */}
          <p className="text-sm text-muted-foreground mb-4">
            ✓ No Credit Card Required  ✓ Full Premium Access  ✓ Cancel Anytime
          </p>
          
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-nexavoice-primary" />
              Unlimited Calling
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-nexavoice-secondary" />
              50 Pre-Built Agents
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-nexavoice-accent" />
              Real-Time Analytics
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};