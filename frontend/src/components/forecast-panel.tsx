"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, Loader2, RotateCcw, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ForecastChart } from "@/components/forecast-chart";
import { getForecast } from "@/lib/api";
import { useAsyncData } from "@/lib/use-async-data";
import { formatNumber, pretty } from "@/lib/utils";
import type { ForecastReport } from "@/lib/types";

export function ForecastPanel({
  datasetId,
  measures,
  onNext,
}: {
  datasetId: string;
  measures: string[];
  onNext?: () => void;
}) {
  const [measure, setMeasure] = useState<string>("");
  const { state, reload } = useAsyncData<ForecastReport>(
    () => getForecast(datasetId, measure || undefined),
    [datasetId, measure],
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold not-display">
          <TrendingUp className="size-4 text-primary" />
          What&apos;s next
          {state.status === "loading" && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </h3>
        {measures.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Measure
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Auto</option>
              {measures.map((m) => (
                <option key={m} value={m}>
                  {pretty(m)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {state.status === "loading" && <Skeleton />}

      {state.status === "error" && (
        <ErrorCard message={state.message} onRetry={reload} />
      )}

      {state.status === "ready" &&
        (state.data.available ? (
          <Report report={state.data} onNext={onNext} />
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            {state.data.reason ?? "A forecast isn't available for this dataset."}
          </Card>
        ))}
    </section>
  );
}

function Report({ report, onNext }: { report: ForecastReport; onNext?: () => void }) {
  const anomalies = report.history.filter((h) => h.anomaly);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{pretty(report.measure ?? "")}</span>
          <Badge tone="accent">{report.method}</Badge>
          {report.seasonal && <Badge tone="muted">seasonal</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">
            next {report.horizon} {report.grain}(s)
          </span>
        </div>

        <ForecastChart report={report} />

        {report.narrative && (
          <p className="mt-4 text-sm leading-relaxed text-secondary-foreground">
            {report.narrative}
          </p>
        )}
      </Card>

      {anomalies.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Past anomalies
            </h4>
            <Badge tone="crit">{report.anomaly_count}</Badge>
          </div>
          <ul className="space-y-1.5 text-sm">
            {anomalies.map((a, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">{a.period.slice(0, 10)}</span>
                <span className="tabular-nums">
                  <span className="font-medium">{formatNumber(a.value)}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    vs expected {formatNumber(a.expected)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {onNext && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onNext}>
            What should we do? <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="flex items-start gap-2 p-4 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#d03b3b]" />
      <div className="flex-1">
        <div className="font-medium">Couldn&apos;t forecast</div>
        <div className="mt-0.5 text-muted-foreground">{message}</div>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw /> Retry
      </Button>
    </Card>
  );
}

function Skeleton() {
  return (
    <Card className="p-5">
      <div className="h-3 w-40 rounded bg-foreground/5" />
      <div className="mt-4 h-64 w-full rounded bg-foreground/5" />
    </Card>
  );
}
