import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        
        // NEXAVOICE Sophisticated Variants
        hero: "bg-gradient-hero text-white font-semibold hover:scale-[1.02] hover:shadow-glow transition-all duration-300 shadow-lg",
        nexavoice: "bg-nexavoice-primary text-white font-medium hover:bg-nexavoice-primary-light hover:scale-[1.02] hover:shadow-glow transition-all duration-300",
        premium: "bg-gradient-premium text-nexavoice-primary font-semibold hover:scale-[1.02] hover:shadow-platinum transition-all duration-300 shadow-md border border-platinum/20",
        luxury: "bg-gradient-luxury text-white font-semibold hover:scale-[1.02] hover:shadow-luxury transition-all duration-300 shadow-lg",
        accent: "bg-nexavoice-accent text-white font-medium hover:bg-nexavoice-accent/90 hover:scale-[1.02] transition-all duration-300",
        glass: "bg-white/5 backdrop-blur-xl text-white hover:bg-white/10 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300",
        glow: "bg-gradient-hero text-white font-semibold animate-pulse-glow hover:scale-[1.02] transition-all duration-300",
        platinum: "bg-gradient-platinum text-nexavoice-primary font-semibold hover:scale-[1.02] hover:shadow-platinum transition-all duration-300 border border-platinum/30",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-md px-4",
        lg: "h-14 rounded-xl px-8 text-base",
        xl: "h-16 rounded-xl px-10 text-lg font-semibold",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
