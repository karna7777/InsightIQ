import { cn, formatKpi } from "@/lib/utils";
import type { KpiCard as KpiCardData } from "@/lib/types";

/**
 * A stat tile: the label sits above a hero number. No plot, so no hover layer
 * (per the dataviz form guidance — a bare stat tile is the one form that skips
 * interactivity). `featured` gives the headline figure a gradient edge + aura.
 */
export function KpiCard({
  kpi,
  featured = false,
}: {
  kpi: KpiCardData;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius)] border bg-card p-5 shadow-[var(--shadow-sm)]",
        featured ? "border-primary/35 bg-[var(--accent-bg)]" : "border-border",
      )}
    >
      {featured && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
      )}
      <div className="truncate font-mono text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {kpi.label}
      </div>
      <div
        className={cn(
          "mt-2.5 font-display text-[1.9rem] font-semibold leading-none tabular-nums",
          featured ? "text-primary" : "text-foreground",
        )}
      >
        {formatKpi(kpi.value, kpi.format)}
      </div>
    </div>
  );
}
