import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: 
          "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg",
        action: 
          "bg-white/5 text-white/70 hover:bg-indigo-500/20 hover:text-indigo-300 hover:scale-105 transition-all duration-200 active:scale-[0.98] focus:ring-indigo-500/40",
        edit: 
          "bg-white/5 text-white/70 hover:bg-amber-500/20 hover:text-amber-300 hover:scale-105 transition-all duration-200 active:scale-[0.98] focus:ring-amber-500/40",
        delete: 
          "bg-white/5 text-white/70 hover:bg-red-500/20 hover:text-red-400 hover:scale-105 transition-all duration-200 active:scale-[0.98] focus:ring-red-500/40",
        "create-new": 
          "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg h-12 font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
      rounded: {
        default: "rounded-md",
        full: "rounded-full",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
