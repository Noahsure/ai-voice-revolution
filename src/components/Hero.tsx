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
      
      {/* Minimal Elegant Elements */}
      <div className="absolute top-1/3 left-1/5 w-24 h-24 bg-nexavoice-accent/10 rounded-full blur-3xl nexavoice-refined-float" />
      <div className="absolute bottom-1/4 right-1/3 w-32 h-32 bg-luxury-gold/8 rounded-full blur-3xl nexavoice-refined-float" style={{ animationDelay: '-2s' }} />
      <div className="absolute top-2/3 right-1/5 w-16 h-16 bg-platinum/15 rounded-full blur-2xl nexavoice-refined-float" style={{ animationDelay: '-4s' }} />
      
      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="max-w-6xl mx-auto">
          {/* Sophisticated Badge */}
          <div className="inline-flex items-center gap-3 bg-nexavoice-primary/5 backdrop-blur-xl px-8 py-3 rounded-full text-nexavoice-primary text-sm font-medium mb-12 border border-nexavoice-primary/10 shadow-sm">
            <Zap className="w-4 h-4" />
            Revolutionizing Call Centers Globally
          </div>
          
          {/* Refined Typography */}
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tight">
            <span className="text-nexavoice-primary">NEXAVOICE</span>
            <br />
            <span className="text-foreground font-light">AI VOICE CALLING</span>
            <br />
            <span className="text-muted-foreground text-4xl md:text-5xl font-extralight tracking-wide">PLATFORM</span>
          </h1>
          
          {/* Elegant Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            Replace your entire call center with AI agents that handle inbound and outbound calls with sophisticated precision.
            <span className="text-foreground font-medium block mt-2">Launch your first campaign in under 3 minutes.</span>
          </p>
          
          {/* Refined Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-nexavoice-primary mb-2">10×</div>
              <div className="text-muted-foreground text-sm font-medium uppercase tracking-wide">Faster Setup</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-nexavoice-primary mb-2">50+</div>
              <div className="text-muted-foreground text-sm font-medium uppercase tracking-wide">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-nexavoice-primary mb-2">25+</div>
              <div className="text-muted-foreground text-sm font-medium uppercase tracking-wide">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-nexavoice-primary mb-2">99.9%</div>
              <div className="text-muted-foreground text-sm font-medium uppercase tracking-wide">Uptime</div>
            </div>
          </div>
          
          {/* Sophisticated CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button variant="hero" size="xl" className="group font-medium" onClick={() => window.location.href = '/auth'}>
              Start Free 7-Day Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
            <Button variant="glass" size="xl" className="group font-medium">
              <Play className="w-5 h-5" />
              Watch Demo
            </Button>
          </div>
          
          {/* Minimal Trust Indicators */}
          <p className="text-sm text-muted-foreground mb-8 font-light">
            No Credit Card Required  •  Full Premium Access  •  Cancel Anytime
          </p>
          
          {/* Clean Feature Highlights */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-nexavoice-accent" />
              <span className="font-medium">Unlimited Calling</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-nexavoice-accent" />
              <span className="font-medium">50 Pre-Built Agents</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-nexavoice-accent" />
              <span className="font-medium">Real-Time Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};