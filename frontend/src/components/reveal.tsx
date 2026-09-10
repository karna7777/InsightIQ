"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/lib/use-reveal";

/**
 * Thin wrapper around useReveal for declarative, staged scroll reveals. Renders
 * a <div> (or any element via `as`) that starts hidden and rises in when seen.
 * Use `delay` to stagger a sequence (headline → subhead → upload → footnote).
 */
export function Reveal({
  as: Tag = "div",
  delay,
  threshold,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  as?: React.ElementType;
  delay?: number;
  threshold?: number;
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>({ delay, threshold });
  return (
    <Tag
      ref={ref}
      data-revealed={revealed}
      className={cn("reveal", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
