import { AlertTriangle } from "lucide-react";
import type { IngestReport } from "@/lib/types";

/**
 * Surfaces exactly what the loader coerced or dropped (constraint #7:
 * "report to the user what was coerced or dropped"). Silent when there's
 * nothing to report.
 */
export function IngestReportBanner({ report }: { report: IngestReport }) {
  if (!report.entries.length) return null;
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-[var(--viz-good)]" />
        We cleaned up this file while loading it
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {report.entries.map((e, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-foreground">•</span>
            <span>
              {e.column ? (
                <span className="font-medium text-foreground">{e.column}: </span>
              ) : null}
              {e.note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
