import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Twitter, Linkedin, Github, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Footer = () => {
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate('/auth');
  };

  const handleScheduleDemo = () => {
    // Scroll to features section for demo
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Demo", href: "#demo" },
      { label: "API Docs", href: "#api" },
      { label: "Integrations", href: "#integrations" }
    ],
    company: [
      { label: "About Us", href: "#about" },
      { label: "Careers", href: "#careers" },
      { label: "Press", href: "#press" },
      { label: "Blog", href: "#blog" },
      { label: "Contact", href: "#contact" }
    ],
    support: [
      { label: "Help Center", href: "#help" },
      { label: "Community", href: "#community" },
      { label: "Status", href: "#status" },
      { label: "Security", href: "#security" },
      { label: "Compliance", href: "#compliance" }
    ],
    legal: [
      { label: "Privacy Policy", href: "#privacy" },
      { label: "Terms of Service", href: "#terms" },
      { label: "Cookie Policy", href: "#cookies" },
      { label: "GDPR", href: "#gdpr" },
      { label: "DPA", href: "#dpa" }
    ]
  };

  return (
    <footer className="bg-gradient-to-br from-background via-surface-muted to-surface-elevated border-t border-border/50">
      {/* CTA Section */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to <span className="neurovoice-text-gradient">Supercharge</span> Your Eleven Labs AI?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Transform your Eleven Labs conversational AI agents into a powerful calling platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={handleStartTrial}>
                <Zap className="w-5 h-5" />
                Start Your Free Trial
              </Button>
              <Button variant="outline" size="xl" onClick={handleScheduleDemo}>
                Schedule Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              7-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-hero">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div className="font-black text-xl neurovoice-text-gradient">
                NEUROVOICE
              </div>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The ultimate interface for Eleven Labs conversational AI agents. Make manual and batch calls,
              handle inbound conversations, all powered by your synchronized Eleven Labs account.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4" />
                hello@neurovoice.ai
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4" />
                +1 555-NEURO-AI
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4" />
                San Francisco, CA
              </div>
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-muted-foreground hover:text-neurovoice-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-muted-foreground hover:text-neurovoice-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-muted-foreground hover:text-neurovoice-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-muted-foreground hover:text-neurovoice-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 NEUROVOICE. All rights reserved. The ultimate Eleven Labs AI interface.
            </p>
            
            <div className="flex items-center gap-4">
              <a 
                href="#twitter" 
                className="p-2 rounded-lg bg-surface-muted hover:bg-neurovoice-primary/10 hover:text-neurovoice-primary transition-colors"
                aria-label="Follow on Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="#linkedin" 
                className="p-2 rounded-lg bg-surface-muted hover:bg-neurovoice-primary/10 hover:text-neurovoice-primary transition-colors"
                aria-label="Follow on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="#github" 
                className="p-2 rounded-lg bg-surface-muted hover:bg-neurovoice-primary/10 hover:text-neurovoice-primary transition-colors"
                aria-label="View on GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};