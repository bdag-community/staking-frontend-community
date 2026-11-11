import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground font-semibold shadow-[inset_0_1px_0_rgb(255_255_255_/_0.36),inset_0_0_0_1px_rgb(255_255_255_/_0.18)] hover:brightness-105",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-primary/45 bg-primary/5 text-primary hover:bg-primary/10",
        secondary: "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glow: "bg-primary text-primary-foreground font-semibold shadow-[inset_0_1px_0_rgb(255_255_255_/_0.36),inset_0_0_0_1px_rgb(255_255_255_/_0.18)] hover:brightness-105",
        "outline-glow": "border border-primary/30 bg-primary/5 text-foreground hover:border-primary/50 hover:bg-primary/10",
        success: "bg-success text-success-foreground hover:bg-success/90",
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        sm: "min-h-11 px-4",
        lg: "min-h-[52px] px-7 py-3.5 text-base",
        xl: "min-h-[52px] px-7 py-3.5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
