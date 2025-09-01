import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Twitter, Linkedin, Github, Zap } from "lucide-react";

export const Footer = () => {
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
              Ready to <span className="nexavoice-text-gradient">Revolutionize</span> Your Calling?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of businesses already using NEXAVOICE to transform their call operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl">
                <Zap className="w-5 h-5" />
                Start Your Free Trial
              </Button>
              <Button variant="outline" size="xl">
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
              <div className="font-black text-xl nexavoice-text-gradient">
                NEXAVOICE
              </div>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The world's most advanced AI voice calling platform. Transform your business 
              with AI agents that never sleep, never take breaks, and convert leads 24/7.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4" />
                hello@nexavoice.ai
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4" />
                +44 20 7946 0958
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4" />
                London, United Kingdom
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
                    className="text-muted-foreground hover:text-nexavoice-primary transition-colors text-sm"
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
                    className="text-muted-foreground hover:text-nexavoice-primary transition-colors text-sm"
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
                    className="text-muted-foreground hover:text-nexavoice-primary transition-colors text-sm"
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
                    className="text-muted-foreground hover:text-nexavoice-primary transition-colors text-sm"
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
              © 2024 NEXAVOICE. All rights reserved. Built to revolutionize call centers globally.
            </p>
            
            <div className="flex items-center gap-4">
              <a 
                href="#twitter" 
                className="p-2 rounded-lg bg-surface-muted hover:bg-nexavoice-primary/10 hover:text-nexavoice-primary transition-colors"
                aria-label="Follow on Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="#linkedin" 
                className="p-2 rounded-lg bg-surface-muted hover:bg-nexavoice-primary/10 hover:text-nexavoice-primary transition-colors"
                aria-label="Follow on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="#github" 
                className="p-2 rounded-lg bg-surface-muted hover:bg-nexavoice-primary/10 hover:text-nexavoice-primary transition-colors"
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