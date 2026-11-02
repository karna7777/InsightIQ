import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.55rem] font-medium transition-all duration-200 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        // Forest-green solid — the primary call to action.
        accent:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-px active:translate-y-0",
        primary:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-px active:translate-y-0",
        // High-contrast neutral (charcoal).
        default:
          "bg-foreground text-background shadow-[var(--shadow-sm)] hover:opacity-90 hover:shadow-[var(--shadow-md)] hover:-translate-y-px active:translate-y-0",
        outline:
          "border border-border-strong bg-card hover:bg-background-2 hover:border-primary/45",
        ghost: "hover:bg-foreground/6",
        link: "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-3.5 text-sm",
        lg: "h-12 px-7 text-[0.95rem]",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
