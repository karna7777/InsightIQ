import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-px active:translate-y-0",
        primary:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-px active:translate-y-0",
        outline: "border border-border bg-card hover:bg-foreground/5 hover:border-foreground/20",
        ghost: "hover:bg-foreground/5",
        link: "h-auto rounded-none p-0 text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-3.5 text-sm",
        lg: "h-12 px-7 text-[0.95rem]",
        icon: "size-10",
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
