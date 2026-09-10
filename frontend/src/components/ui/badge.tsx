import * as React from "react";
import { cn } from "@/lib/utils";

// Semantic tone → theme-aware CSS tokens (defined in globals.css). Kept
// separate from the brand accent so severity never competes with chrome.
type Tone = "good" | "warn" | "crit" | "muted" | "accent";

const TONE: Record<Tone, string> = {
  good: "text-[var(--sem-good)] bg-[var(--sem-good-bg)]",
  warn: "text-[var(--sem-warn)] bg-[var(--sem-warn-bg)]",
  crit: "text-[var(--sem-crit)] bg-[var(--sem-crit-bg)]",
  muted: "text-[var(--sem-muted)] bg-[var(--sem-muted-bg)]",
  accent: "text-primary bg-primary/10",
};

export function Badge({
  tone = "muted",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-medium",
        TONE[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
