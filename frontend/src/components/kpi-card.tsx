import { Card } from "@/components/ui/card";
import { formatKpi } from "@/lib/utils";
import type { KpiCard as KpiCardData } from "@/lib/types";

/**
 * A stat tile: the label sits above a hero number. No plot, so no hover layer
 * (per the dataviz form guidance — a bare stat tile is the one form that skips
 * interactivity). Hero figure uses proportional figures in the system sans.
 */
export function KpiCard({ kpi }: { kpi: KpiCardData }) {
  return (
    <Card className="p-5">
      <div className="truncate text-[0.7rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {kpi.label}
      </div>
      <div className="mt-2.5 text-3xl font-semibold tracking-tight tabular-nums">
        {formatKpi(kpi.value, kpi.format)}
      </div>
    </Card>
  );
}
