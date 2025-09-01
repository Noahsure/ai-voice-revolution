import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				// NEXAVOICE Premium Brand Colors
				nexavoice: {
					primary: 'hsl(var(--nexavoice-primary))',
					'primary-light': 'hsl(var(--nexavoice-primary-light))',
					'primary-dark': 'hsl(var(--nexavoice-primary-dark))',
					secondary: 'hsl(var(--nexavoice-secondary))',
					accent: 'hsl(var(--nexavoice-accent))'
				},
				platinum: {
					DEFAULT: 'hsl(var(--platinum))',
					light: 'hsl(var(--platinum-light))',
					dark: 'hsl(var(--platinum-dark))'
				},
				luxury: {
					gold: 'hsl(var(--luxury-gold))',
					'gold-light': 'hsl(var(--luxury-gold-light))',
					'gold-dark': 'hsl(var(--luxury-gold-dark))'
				},
			},
			backgroundImage: {
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-premium': 'var(--gradient-premium)',
				'gradient-luxury': 'var(--gradient-luxury)',
				'gradient-card': 'var(--gradient-card)', 
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-platinum': 'var(--gradient-platinum)',
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				'xl': 'var(--shadow-xl)',
				'2xl': 'var(--shadow-2xl)',
				'glow': 'var(--shadow-glow)',
				'glow-intense': 'var(--shadow-glow-intense)',
				'luxury': 'var(--shadow-luxury)',
				'platinum': 'var(--shadow-platinum)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				float: {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(240 100% 50% / 0.3)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(240 100% 50% / 0.6), 0 0 80px hsl(240 100% 50% / 0.3)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'luxury-shimmer': 'luxury-shimmer 3s ease-in-out infinite',
				'premium-float': 'premium-float 8s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
