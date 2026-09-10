"use client";

import { AlertCircle, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRecommendations } from "@/lib/api";
import { useAsyncData } from "@/lib/use-async-data";
import { formatKpi } from "@/lib/utils";
import type { DecisionReport, Grade, Recommendation } from "@/lib/types";

const IMPACT_TONE: Record<Grade, "crit" | "warn" | "muted"> = {
  high: "crit",
  medium: "warn",
  low: "muted",
};
const CONF_TONE: Record<Grade, "good" | "warn" | "muted"> = {
  high: "good",
  medium: "warn",
  low: "muted",
};

export function RecommendationsPanel({ datasetId }: { datasetId: string }) {
  const { state, reload } = useAsyncData<DecisionReport>(
    () => getRecommendations(datasetId),
    [datasetId],
  );

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold not-display">
        <Lightbulb className="size-4 text-primary" />
        What to do
        {state.status === "loading" && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </h3>

      {state.status === "loading" && <Skeleton />}

      {state.status === "error" && (
        <Card className="flex items-start gap-2 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#d03b3b]" />
          <div className="flex-1">
            <div className="font-medium">Couldn&apos;t generate recommendations</div>
            <div className="mt-0.5 text-muted-foreground">{state.message}</div>
          </div>
          <Button variant="outline" size="sm" onClick={reload}>
            <RotateCcw /> Retry
          </Button>
        </Card>
      )}

      {state.status === "ready" &&
        (state.data.available ? (
          <Report report={state.data} />
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            {state.data.reason ?? "No recommendations are available for this dataset."}
          </Card>
        ))}
    </section>
  );
}

function Report({ report }: { report: DecisionReport }) {
  return (
    <div className="space-y-4">
      {report.summary && (
        <p className="text-sm leading-relaxed text-secondary-foreground">{report.summary}</p>
      )}
      <div className="space-y-3">
        {report.recommendations.map((rec, i) => (
          <RecommendationCard key={i} rank={i + 1} rec={rec} />
        ))}
      </div>
      {report.model && (
        <p className="text-xs text-muted-foreground">
          Actions ranked by impact × confidence; phrased by {report.model}. Every number
          computed locally.
        </p>
      )}
    </div>
  );
}

function RecommendationCard({ rank, rec }: { rank: number; rec: Recommendation }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
          {rank}
        </span>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{rec.title}</span>
            {rank === 1 && <Badge tone="accent">Top priority</Badge>}
          </div>
          <p className="text-sm leading-relaxed text-secondary-foreground">{rec.rationale}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Badge tone={IMPACT_TONE[rec.impact]}>Impact: {rec.impact}</Badge>
            <Badge tone={CONF_TONE[rec.confidence]}>Confidence: {rec.confidence}</Badge>
            <span className="ml-auto inline-flex items-baseline gap-2 rounded-md border border-border bg-foreground/[0.03] px-2.5 py-1">
              <span className="text-xs text-muted-foreground">{rec.evidence.label}</span>
              <span className="text-sm font-semibold tabular-nums">
                {formatKpi(rec.evidence.value, rec.evidence.format)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="p-5">
          <div className="flex gap-3">
            <div className="size-6 shrink-0 rounded-full bg-foreground/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-foreground/10" />
              <div className="h-3 w-full rounded bg-foreground/5" />
              <div className="h-3 w-4/5 rounded bg-foreground/5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
