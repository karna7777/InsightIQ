"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Minus,
  RotateCcw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContributionBars } from "@/components/contribution-bars";
import { getInvestigation } from "@/lib/api";
import { useAsyncData } from "@/lib/use-async-data";
import { formatNumber, formatPercent, pretty } from "@/lib/utils";
import type { InvestigationReport } from "@/lib/types";

export function InvestigationPanel({
  datasetId,
  measures,
  onNext,
}: {
  datasetId: string;
  measures: string[];
  onNext?: () => void;
}) {
  const [measure, setMeasure] = useState<string>("");
  const { state, reload } = useAsyncData<InvestigationReport>(
    () => getInvestigation(datasetId, measure || undefined),
    [datasetId, measure],
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold not-display">
          <Search className="size-4 text-primary" />
          Why it changed
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
            {state.data.reason ?? "Investigation isn't available for this dataset."}
          </Card>
        ))}
    </section>
  );
}

function Report({
  report,
  onNext,
}: {
  report: InvestigationReport;
  onNext?: () => void;
}) {
  const dir = report.direction ?? "flat";
  const Arrow = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const dirColor =
    dir === "up" ? "var(--sem-good)" : dir === "down" ? "var(--sem-crit)" : "var(--sem-muted)";

  return (
    <div className="space-y-5">
      {/* headline change */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">
              {pretty(report.measure ?? "")} · {report.previous_period?.slice(0, 10)} →{" "}
              {report.latest_period?.slice(0, 10)} ({report.grain})
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {formatNumber(report.total_latest)}
              </span>
              <span
                className="flex items-center gap-0.5 text-sm font-medium tabular-nums"
                style={{ color: dirColor }}
              >
                <Arrow className="size-4" />
                {report.total_delta_pct != null ? formatPercent(report.total_delta_pct) : "—"}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              was {formatNumber(report.total_previous)}
            </div>
          </div>
        </div>
        {report.narrative && (
          <p className="mt-4 text-sm leading-relaxed text-secondary-foreground">
            {report.narrative}
          </p>
        )}
      </Card>

      {/* offsetting callout */}
      {report.offsetting && report.offsetting_detail && (
        <Card className="border-[var(--sem-warn)]/40 bg-[var(--sem-warn-bg)] p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Badge tone="warn">Offsetting</Badge>
            The net change hides large opposing movements
          </div>
          <p className="mt-1.5 text-muted-foreground">
            By {pretty(report.offsetting_detail.dimension).toLowerCase()}:{" "}
            <span className="text-[var(--sem-good)]">
              {report.offsetting_detail.top_gain.segment} +
              {formatNumber(report.offsetting_detail.top_gain.contribution)}
            </span>{" "}
            vs{" "}
            <span className="text-[var(--sem-crit)]">
              {report.offsetting_detail.top_loss.segment}{" "}
              {formatNumber(report.offsetting_detail.top_loss.contribution)}
            </span>
            .
          </p>
        </Card>
      )}

      {/* primary driver + drill */}
      {report.primary_driver && (
        <Card className="p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Biggest driver
          </h4>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-semibold">
              {report.primary_driver.segment}
            </span>
            <span className="text-xs text-muted-foreground">
              by {pretty(report.primary_driver.dimension).toLowerCase()}
            </span>
            <span
              className="ml-auto text-sm font-semibold tabular-nums"
              style={{
                color:
                  (report.primary_driver.contribution ?? 0) >= 0
                    ? "var(--sem-good)"
                    : "var(--sem-crit)",
              }}
            >
              {(report.primary_driver.contribution ?? 0) >= 0 ? "+" : "−"}
              {formatNumber(Math.abs(report.primary_driver.contribution ?? 0))}
            </span>
          </div>
          {report.primary_driver.children.length > 0 && (
            <div className="mt-4 border-l-2 border-border pl-4">
              <div className="mb-2 text-xs text-muted-foreground">
                Within it, by{" "}
                {pretty(report.primary_driver.children[0].dimension).toLowerCase()}:
              </div>
              <ContributionBars
                drivers={report.primary_driver.children}
                showShare={!report.offsetting}
              />
            </div>
          )}
        </Card>
      )}

      {/* per-dimension breakdowns */}
      {report.breakdowns.map((b) => (
        <Card key={b.dimension} className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              By {pretty(b.dimension)}
            </h4>
            {b.offsetting && <Badge tone="warn">Offsetting</Badge>}
          </div>
          <ContributionBars drivers={b.drivers} showShare={!b.offsetting} />
        </Card>
      ))}

      {onNext && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onNext}>
            See what&apos;s next <ArrowRight />
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
        <div className="font-medium">Couldn&apos;t investigate</div>
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
    <div className="space-y-4">
      <Card className="p-5">
        <div className="h-3 w-40 rounded bg-foreground/5" />
        <div className="mt-3 h-7 w-32 rounded bg-foreground/10" />
        <div className="mt-3 h-3 w-full rounded bg-foreground/5" />
      </Card>
      {[0, 1].map((i) => (
        <Card key={i} className="p-5">
          <div className="h-3 w-24 rounded bg-foreground/5" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full rounded bg-foreground/5" />
            <div className="h-4 w-4/5 rounded bg-foreground/5" />
          </div>
        </Card>
      ))}
    </div>
  );
}
