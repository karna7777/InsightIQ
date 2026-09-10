"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { ContributionBars } from "@/components/contribution-bars";
import { ForecastChart } from "@/components/forecast-chart";
import { Badge } from "@/components/ui/badge";
import { formatInteger, formatKpi, formatNumber, formatPercent, pretty } from "@/lib/utils";
import type {
  Dashboard,
  DecisionReport,
  ForecastReport,
  Grade,
  InsightFinding,
  InsightReport,
  InvestigationReport,
  KpiCard as KpiCardData,
  UploadResponse,
} from "@/lib/types";

/**
 * Story Mode — the narrated, full-screen presentation over the auto-insights
 * report. One idea per slide, a hero visualization, and the AI's sentence on
 * top of numbers that were all computed locally. This is a pure experience
 * layer: it invents nothing, it only sequences what the engine already produced.
 *
 * Sequence: cover → executive summary → one slide per finding → what it
 * indicates → the brief. Keyboard: ← / → (or Space) to move, Esc to exit.
 */

type Slide =
  | { kind: "cover" }
  | { kind: "summary" }
  | { kind: "finding"; finding: InsightFinding; n: number }
  | { kind: "indicates" }
  | { kind: "why" }
  | { kind: "forecast" }
  | { kind: "recommendations" }
  | { kind: "brief" };

// Human labels for the deterministic finding kinds the backend emits.
const KIND_LABEL: Record<string, string> = {
  pop_change: "The trend",
  pareto: "Concentration",
  segment: "The segments",
  outliers: "The outliers",
  bounded: "The levels",
};

function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? "The finding";
}

export function StoryMode({
  upload,
  dashboard,
  report,
  investigation,
  forecast,
  decisions,
  onClose,
}: {
  upload: UploadResponse;
  dashboard: Dashboard;
  report: InsightReport;
  investigation?: InvestigationReport | null;
  forecast?: ForecastReport | null;
  decisions?: DecisionReport | null;
  onClose: () => void;
}) {
  // The executive arc: what happened → why → what's next → what to do.
  const hasWhy = !!investigation?.available;
  const hasForecast = !!forecast?.available;
  const hasDecisions = !!(decisions?.available && decisions.recommendations.length);

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [{ kind: "cover" }, { kind: "summary" }];
    report.findings.forEach((finding, i) =>
      out.push({ kind: "finding", finding, n: i + 1 }),
    );
    if (report.what_it_indicates) out.push({ kind: "indicates" });
    if (hasWhy) out.push({ kind: "why" });
    if (hasForecast) out.push({ kind: "forecast" });
    if (hasDecisions) out.push({ kind: "recommendations" });
    out.push({ kind: "brief" });
    return out;
  }, [report, hasWhy, hasForecast, hasDecisions]);

  const [index, setIndex] = useState(0);
  const total = slides.length;

  const go = useCallback(
    (delta: number) =>
      setIndex((i) => Math.min(total - 1, Math.max(0, i + delta))),
    [total],
  );

  // Keyboard navigation + body scroll lock while the overlay is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(total - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose, total]);

  const slide = slides[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Story Mode presentation"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* top chrome */}
      <div className="flex items-center justify-between px-5 py-4 sm:px-8">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="size-4 text-primary" />
          InsightIQ · Story Mode
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit Story Mode"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* stage — edge nav is pinned to the stage (outside the scroller) so it
          never scrolls away; the inner scroller centers a slide when it fits and
          scrolls from the top (no clipping) when a slide is taller than the view. */}
      <div className="relative flex-1 overflow-hidden">
        {/* edge nav — hidden on small screens, where the bottom bar drives */}
        <EdgeButton side="left" disabled={index === 0} onClick={() => go(-1)} />
        <EdgeButton
          side="right"
          disabled={index === total - 1}
          onClick={() => go(1)}
        />

        <div className="h-full overflow-y-auto px-5 sm:px-8">
          <div className="flex min-h-full items-center justify-center py-10">
            <div key={index} className="story-in mx-auto w-full max-w-4xl">
              {slide.kind === "cover" && <Cover upload={upload} total={total} />}
              {slide.kind === "summary" && (
                <Summary report={report} dashboard={dashboard} />
              )}
              {slide.kind === "finding" && (
                <Finding finding={slide.finding} n={slide.n} />
              )}
              {slide.kind === "indicates" && <Indicates report={report} />}
              {slide.kind === "why" && investigation && (
                <WhySlide report={investigation} />
              )}
              {slide.kind === "forecast" && forecast && (
                <ForecastSlide report={forecast} />
              )}
              {slide.kind === "recommendations" && decisions && (
                <RecommendationsSlide report={decisions} />
              )}
              {slide.kind === "brief" && (
                <Brief report={report} onRestart={() => setIndex(0)} onClose={onClose} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar: progress + mobile controls */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Prev
        </button>

        <div className="flex flex-1 items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-foreground/20 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

// --- edge navigation ------------------------------------------------------

function EdgeButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      className={`absolute ${
        side === "left" ? "left-2" : "right-2"
      } top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:flex`}
    >
      <Icon className="size-5" />
    </button>
  );
}

// --- slides ---------------------------------------------------------------

function Eyebrow({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <p
      className={`mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-primary ${
        center ? "justify-center" : ""
      }`}
    >
      <span className="h-px w-6 bg-primary/40" aria-hidden />
      {children}
    </p>
  );
}

function Cover({ upload, total }: { upload: UploadResponse; total: number }) {
  const { roles } = upload.profile;
  const period =
    typeof roles.primary_date === "string" ? roles.primary_date : null;
  return (
    <div className="text-center">
      <Eyebrow center>AI analysis</Eyebrow>
      <h1 className="text-balance text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl">
        {upload.filename}
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
        {formatInteger(upload.row_count)} rows · {upload.profile.columns.length}{" "}
        columns{period ? ` · time column: ${period}` : ""}
      </p>
      <p className="mt-12 text-sm text-muted-foreground">
        {total} slides · use{" "}
        <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">←</kbd>{" "}
        <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">→</kbd>{" "}
        to navigate ·{" "}
        <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">Esc</kbd>{" "}
        to exit
      </p>
    </div>
  );
}

function Summary({
  report,
  dashboard,
}: {
  report: InsightReport;
  dashboard: Dashboard;
}) {
  const kpis = dashboard.kpis.slice(0, 4);
  return (
    <div>
      <Eyebrow>Executive summary</Eyebrow>
      {kpis.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((kpi, i) => (
            <HeroStat key={i} kpi={kpi} />
          ))}
        </div>
      )}
      <p className="text-balance font-display text-2xl font-medium leading-[1.28] sm:text-[1.9rem]">
        {report.overview}
      </p>
    </div>
  );
}

function HeroStat({ kpi }: { kpi: KpiCardData }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[var(--shadow-sm)]">
      <div className="truncate text-xs text-muted-foreground">{kpi.label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {formatKpi(kpi.value, kpi.format)}
      </div>
    </div>
  );
}

function Finding({ finding, n }: { finding: InsightFinding; n: number }) {
  return (
    <div>
      <Eyebrow>
        {String(n).padStart(2, "0")} · {kindLabel(finding.kind)}
      </Eyebrow>
      <h2 className="text-balance text-2xl font-medium leading-[1.14] tracking-tight sm:text-3xl md:text-4xl">
        {finding.statement}
      </h2>

      <div className="mt-6">
        <MetricChip finding={finding} big={!finding.chart} />
      </div>

      {finding.chart ? (
        <div className="mt-7 rounded-[calc(var(--radius)+0.25rem)] border border-border bg-card p-5 shadow-[var(--shadow-md)] sm:p-6">
          <ChartCard chart={finding.chart} bare height={280} />
        </div>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">
        Narrated by AI · every number computed locally.
      </p>
    </div>
  );
}

function MetricChip({
  finding,
  big = false,
}: {
  finding: InsightFinding;
  big?: boolean;
}) {
  const { metric } = finding;
  const value = metric.value ?? 0;
  let valueClass = "text-foreground";
  if (metric.format === "percent") {
    valueClass = value >= 0 ? "text-[var(--viz-good)]" : "text-[#d03b3b]";
  }
  return (
    <div
      className={`inline-flex items-baseline gap-3 rounded-[var(--radius)] border border-border bg-foreground/[0.03] ${
        big ? "px-6 py-4" : "px-4 py-2.5"
      }`}
    >
      <span className="text-sm text-muted-foreground">{metric.label}</span>
      <span
        className={`font-semibold tabular-nums ${valueClass} ${
          big ? "text-4xl" : "text-lg"
        }`}
      >
        {formatKpi(metric.value, metric.format)}
      </span>
    </div>
  );
}

function Indicates({ report }: { report: InsightReport }) {
  return (
    <div>
      <Eyebrow>What it indicates</Eyebrow>
      <p className="text-balance font-display text-3xl font-medium leading-[1.24] sm:text-4xl">
        {report.what_it_indicates}
      </p>
    </div>
  );
}

function WhySlide({ report }: { report: InvestigationReport }) {
  const dir = report.direction ?? "flat";
  const dirColor =
    dir === "up" ? "var(--sem-good)" : dir === "down" ? "var(--sem-crit)" : "var(--sem-muted)";
  const verb = dir === "up" ? "rose" : dir === "down" ? "fell" : "held steady";
  const primary = report.primary_driver;
  const bars = primary?.children.length ? primary.children : report.breakdowns[0]?.drivers ?? [];
  const barsLabel = primary?.children.length
    ? `Within ${primary.segment}, by ${pretty(primary.children[0].dimension).toLowerCase()}`
    : report.breakdowns[0]
      ? `By ${pretty(report.breakdowns[0].dimension).toLowerCase()}`
      : "";

  return (
    <div>
      <Eyebrow>Why it changed</Eyebrow>
      <h2 className="text-balance text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
        {pretty(report.measure ?? "")} {verb}
        {report.total_delta_pct != null && (
          <span style={{ color: dirColor }}> {formatPercent(report.total_delta_pct)}</span>
        )}
      </h2>
      {report.narrative && (
        <p className="mt-5 text-lg leading-relaxed text-secondary-foreground">
          {report.narrative}
        </p>
      )}
      {report.offsetting && report.offsetting_detail ? (
        <div className="mt-7 rounded-[var(--radius)] border border-[var(--sem-warn)]/40 bg-[var(--sem-warn-bg)] p-5">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Badge tone="warn">Offsetting</Badge> Large opposing movements
          </div>
          <p className="text-base text-muted-foreground">
            <span className="text-[var(--sem-good)]">
              {report.offsetting_detail.top_gain.segment} +
              {formatNumber(report.offsetting_detail.top_gain.contribution)}
            </span>{" "}
            vs{" "}
            <span className="text-[var(--sem-crit)]">
              {report.offsetting_detail.top_loss.segment}{" "}
              {formatNumber(report.offsetting_detail.top_loss.contribution)}
            </span>
          </p>
        </div>
      ) : bars.length ? (
        <div className="mt-7 rounded-[calc(var(--radius)+0.25rem)] border border-border bg-card p-5 shadow-[var(--shadow-md)] sm:p-6">
          {barsLabel && <div className="mb-3 text-xs text-muted-foreground">{barsLabel}</div>}
          <ContributionBars drivers={bars} showShare={!report.offsetting} />
        </div>
      ) : null}
    </div>
  );
}

function ForecastSlide({ report }: { report: ForecastReport }) {
  const end = report.forecast[report.forecast.length - 1];
  return (
    <div>
      <Eyebrow>What&apos;s next</Eyebrow>
      <h2 className="text-balance text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
        {pretty(report.measure ?? "")} forecast
        {end?.value != null && (
          <span className="text-primary"> → {formatNumber(end.value)}</span>
        )}
      </h2>
      <div className="mt-7 rounded-[calc(var(--radius)+0.25rem)] border border-border bg-card p-5 shadow-[var(--shadow-md)] sm:p-6">
        <ForecastChart report={report} height={280} />
      </div>
      {report.narrative && (
        <p className="mt-5 text-base leading-relaxed text-secondary-foreground">
          {report.narrative}
        </p>
      )}
    </div>
  );
}

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

function RecommendationsSlide({ report }: { report: DecisionReport }) {
  return (
    <div>
      <Eyebrow>What we should do</Eyebrow>
      <h2 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">
        Recommended actions
      </h2>
      {report.summary && (
        <p className="mt-4 text-lg leading-relaxed text-secondary-foreground">
          {report.summary}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {report.recommendations.slice(0, 4).map((rec, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-4"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{rec.title}</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Badge tone={IMPACT_TONE[rec.impact]}>Impact: {rec.impact}</Badge>
                <Badge tone={CONF_TONE[rec.confidence]}>Confidence: {rec.confidence}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Brief({
  report,
  onRestart,
  onClose,
}: {
  report: InsightReport;
  onRestart: () => void;
  onClose: () => void;
}) {
  return (
    <div>
      <Eyebrow>The brief · your data in 60 seconds</Eyebrow>
      <h2 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">
        What matters, at a glance
      </h2>

      <div className="mt-8 divide-y divide-border rounded-[var(--radius)] border border-border">
        {report.findings.map((f, i) => (
          <BriefRow key={i} finding={f} />
        ))}
      </div>

      {report.caveats.length > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Keep in mind: </span>
          {report.caveats[0]}
        </p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {report.model
          ? `Narrative phrased by ${report.model}; every number computed locally.`
          : "Every number computed locally."}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-foreground/5"
        >
          <RotateCcw className="size-4" /> Restart
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px hover:shadow-[var(--shadow-md)]"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}

function BriefRow({ finding }: { finding: InsightFinding }) {
  const { metric } = finding;
  const value = metric.value ?? 0;
  let valueClass = "text-foreground";
  if (metric.format === "percent") {
    valueClass = value >= 0 ? "text-[var(--viz-good)]" : "text-[#d03b3b]";
  }
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">
        {metric.label}
      </span>
      <span className={`shrink-0 text-lg font-semibold tabular-nums ${valueClass}`}>
        {formatKpi(metric.value, metric.format)}
      </span>
    </div>
  );
}
