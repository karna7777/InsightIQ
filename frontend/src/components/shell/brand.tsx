import Link from "next/link";
import { cn } from "@/lib/utils";

/** The InsightIQ wordmark: a solid forest glyph + editorial type. */
export function Brand({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="InsightIQ home"
    >
      <span className="relative grid size-8 shrink-0 place-items-center rounded-[0.5rem] bg-primary text-primary-foreground shadow-[var(--shadow-sm)] transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105">
        <span className="font-display text-sm font-bold tracking-tight">iQ</span>
      </span>
      {!compact && (
        <span className="font-display text-[1.1rem] font-semibold tracking-tight text-foreground">
          Insight<span className="text-primary">IQ</span>
        </span>
      )}
    </Link>
  );
}
