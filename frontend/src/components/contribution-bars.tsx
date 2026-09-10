import { formatNumber } from "@/lib/utils";
import type { InvestigationDriver } from "@/lib/types";

/**
 * Diverging horizontal bars for signed contributions: a positive contribution
 * grows right (gain), a negative one grows left (loss), from a center axis.
 * Bar length is proportional to |contribution| against the largest in the set.
 * Share-of-change % is shown only when meaningful (hidden when segments offset,
 * where it explodes into misleading multiples).
 */
export function ContributionBars({
  drivers,
  showShare = true,
}: {
  drivers: InvestigationDriver[];
  showShare?: boolean;
}) {
  const maxAbs = Math.max(...drivers.map((d) => Math.abs(d.contribution ?? 0)), 1);

  return (
    <div className="space-y-1.5">
      {drivers.map((d, i) => {
        const c = d.contribution ?? 0;
        const positive = c >= 0;
        const width = (Math.abs(c) / maxAbs) * 50; // % of the half-width
        const barStyle: React.CSSProperties = positive
          ? { left: "50%", width: `${width}%` }
          : { right: "50%", width: `${width}%` };
        const color = positive ? "var(--sem-good)" : "var(--sem-crit)";
        return (
          <div key={i} className="flex items-center gap-3 text-xs">
            <div className="w-24 shrink-0 truncate text-right text-muted-foreground" title={d.segment}>
              {d.segment}
            </div>
            <div className="relative h-5 flex-1">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
              <div
                className="absolute inset-y-1 rounded-sm"
                style={{ ...barStyle, background: color, opacity: 0.85 }}
              />
            </div>
            <div className="w-24 shrink-0 text-right tabular-nums">
              <span style={{ color }}>
                {positive ? "+" : "−"}
                {formatNumber(Math.abs(c))}
              </span>
              {showShare && d.contribution_pct != null && (
                <span className="text-muted-foreground">
                  {" "}
                  ({Math.round(Math.abs(d.contribution_pct))}%)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
