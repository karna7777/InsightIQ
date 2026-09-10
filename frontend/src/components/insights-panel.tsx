"use client";

import { AlertCircle, ArrowRight, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartCard } from "@/components/chart-card";
import { getInsights } from "@/lib/api";
import { useAsyncData } from "@/lib/use-async-data";
import { formatKpi } from "@/lib/utils";
import type { InsightFinding, InsightReport } from "@/lib/types";

// Finding kinds that describe a *change* — for these, "Why did this change?"
// leads naturally into the Investigation tab.
const CHANGE_KINDS = new Set(["pop_change", "segment", "pareto"]);

export function InsightsPanel({
  datasetId,
  onInvestigate,
}: {
  datasetId: string;
  onInvestigate?: () => void;
}) {
  const { state, reload } = useAsyncData<InsightReport>(
    () => getInsights(datasetId),
    [datasetId],
  );

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold not-display">
        <Lightbulb className="size-4 text-primary" />
        Insights
        {state.status === "loading" && (
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> analyzing your data…
          </span>
        )}
      </h3>

      {state.status === "loading" && <Skeleton />}

      {state.status === "error" && (
        <Card className="flex items-start gap-2 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#d03b3b]" />
          <div className="flex-1">
            <div className="font-medium">Couldn&apos;t generate insights</div>
            <div className="mt-0.5 text-muted-foreground">{state.message}</div>
          </div>
          <Button variant="outline" size="sm" onClick={reload}>
            <RotateCcw /> Retry
          </Button>
        </Card>
      )}

      {state.status === "ready" && (
        <Report report={state.data} onInvestigate={onInvestigate} />
      )}
    </section>
  );
}

function Report({
  report,
  onInvestigate,
}: {
  report: InsightReport;
  onInvestigate?: () => void;
}) {
  return (
    <div className="space-y-5">
      <Section title="Overview">
        <p className="text-sm leading-relaxed text-secondary-foreground">
          {report.overview}
        </p>
      </Section>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key findings
        </h4>
        <div className="space-y-4">
          {report.findings.map((f, i) => (
            <FindingCard
              key={i}
              index={i + 1}
              finding={f}
              onInvestigate={onInvestigate}
            />
          ))}
        </div>
      </div>

      <Section title="What it indicates">
        <p className="text-sm leading-relaxed text-secondary-foreground">
          {report.what_it_indicates}
        </p>
      </Section>

      <Section title="Caveats">
        <ul className="space-y-1 text-sm text-muted-foreground">
          {report.caveats.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Section>

      {report.model && (
        <p className="text-xs text-muted-foreground">
          Narrative phrased by {report.model}; every number computed locally.
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </Card>
  );
}

function FindingCard({
  index,
  finding,
  onInvestigate,
}: {
  index: number;
  finding: InsightFinding;
  onInvestigate?: () => void;
}) {
  const canInvestigate = onInvestigate && CHANGE_KINDS.has(finding.kind);
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm leading-relaxed">{finding.statement}</p>
          <div className="flex flex-wrap items-center gap-3">
            <MetricChip finding={finding} />
            {canInvestigate && (
              <button
                type="button"
                onClick={onInvestigate}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
              >
                Why did this change? <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
          {finding.chart && <ChartCard chart={finding.chart} bare />}
        </div>
      </div>
    </Card>
  );
}

function MetricChip({ finding }: { finding: InsightFinding }) {
  const { metric } = finding;
  const value = metric.value ?? 0;
  // Color signed percentage deltas by direction; leave plain metrics neutral.
  let valueClass = "text-foreground";
  if (metric.format === "percent") {
    valueClass = value >= 0 ? "text-[var(--viz-good)]" : "text-[#d03b3b]";
  }
  return (
    <div className="inline-flex items-baseline gap-2 rounded-md border border-border bg-foreground/[0.03] px-3 py-1.5">
      <span className="text-xs text-muted-foreground">{metric.label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>
        {formatKpi(metric.value, metric.format)}
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="h-3 w-24 rounded bg-foreground/10" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-foreground/5" />
          <div className="h-3 w-4/5 rounded bg-foreground/5" />
        </div>
      </Card>
      {[0, 1].map((i) => (
        <Card key={i} className="p-5">
          <div className="h-3 w-2/3 rounded bg-foreground/5" />
          <div className="mt-3 h-6 w-40 rounded bg-foreground/10" />
        </Card>
      ))}
    </div>
  );
}
