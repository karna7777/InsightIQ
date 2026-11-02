"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  GitBranch,
  MessageSquare,
  Presentation,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  id: string;
  name: string;
  icon: LucideIcon;
  desc: string;
  benefits: string[];
  Preview: () => React.ReactElement;
}

/* ---------- representative previews (illustrative, not live) ---------- */

function DashboardPreview() {
  const bars = [52, 74, 61, 88, 70];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { l: "Revenue", v: "€1.24M" },
          { l: "Orders", v: "8,410" },
          { l: "AOV", v: "€147" },
        ].map((k) => (
          <div key={k.l} className="rounded-[10px] border border-border bg-card p-2.5">
            <div className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-muted-foreground">{k.l}</div>
            <div className="mt-1 font-display text-base font-semibold tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[10px] border border-border bg-card p-3">
        <div className="mb-2 text-[0.66rem] text-muted-foreground">Revenue by region</div>
        <div className="flex h-24 items-end gap-2">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t bg-primary"
              style={{ opacity: 0.55 + i * 0.09 }}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RcaPreview() {
  const factors = [
    { l: "Enterprise churn", v: -5.1, w: 100 },
    { l: "Discount depth", v: -2.4, w: 47 },
    { l: "New logos", v: +3.2, w: 63 },
    { l: "Seasonality", v: -1.0, w: 20 },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border border-border bg-card p-3">
        <div className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">Metric change</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold">Net margin</span>
          <span className="font-display text-xl font-semibold text-[var(--sem-crit)]">−5.3%</span>
        </div>
      </div>
      <div className="rounded-[10px] border border-border bg-card p-3">
        <div className="mb-2 text-[0.66rem] text-muted-foreground">Contributing factors</div>
        <div className="space-y-2">
          {factors.map((f, i) => {
            const neg = f.v < 0;
            return (
              <div key={f.l} className="flex items-center gap-2 text-[0.72rem]">
                <span className="w-28 shrink-0 truncate text-secondary-foreground">{f.l}</span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-background-2">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: neg ? "var(--sem-crit)" : "var(--sem-good)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${f.w}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                  />
                </div>
                <span
                  className="w-10 text-right font-mono tabular-nums"
                  style={{ color: neg ? "var(--sem-crit)" : "var(--sem-good)" }}
                >
                  {f.v > 0 ? "+" : ""}
                  {f.v}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ForecastPreview() {
  const hist = "M8,96 L60,84 L112,88 L164,66 L216,58";
  const fc = "M216,58 L268,48 L320,40 L372,30";
  return (
    <div className="rounded-[10px] border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.66rem] text-muted-foreground">Units · forecast +3 periods</span>
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.1em]" style={{ color: "var(--viz-forecast)" }}>
          95% band
        </span>
      </div>
      <svg viewBox="0 0 380 120" className="w-full" style={{ aspectRatio: "380 / 120" }}>
        <path d="M216,70 L372,42 L372,18 L216,46 Z" fill="var(--viz-band)" />
        <motion.path
          d={hist}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        <motion.path
          d={fc}
          fill="none"
          stroke="var(--viz-forecast)"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.9, ease: "easeInOut" }}
        />
      </svg>
      <div className="mt-1 flex items-center gap-2 text-[0.68rem] text-secondary-foreground">
        <TrendingUp className="size-3.5 text-primary" />
        Projected <span className="font-semibold text-foreground">+11%</span> next quarter, trend + seasonality.
      </div>
    </div>
  );
}

function QaPreview() {
  return (
    <div className="space-y-2.5">
      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[0.74rem] text-primary-foreground">
        Why did margin drop in October?
      </div>
      <div className="w-fit max-w-[88%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2.5">
        <p className="text-[0.74rem] leading-relaxed text-secondary-foreground">
          Margin fell <span className="font-semibold text-foreground">5.3pts</span> — enterprise discounting rose while
          COGS held flat.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded border border-border bg-background-2 px-1.5 py-0.5 font-mono text-[0.56rem] text-muted-foreground">
            SQL
          </span>
          <span className="font-mono text-[0.56rem] text-muted-foreground">grouped by segment, Oct vs Sep</span>
        </div>
      </div>
    </div>
  );
}

function SlidesPreview() {
  const slides = [
    { t: "Q4 Review", sub: "title" },
    { t: "", sub: "chart" },
    { t: "Recommend", sub: "actions" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {slides.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="aspect-[4/3] overflow-hidden rounded-[8px] border border-border bg-card p-2"
          >
            {s.sub === "title" && (
              <div className="flex h-full flex-col justify-end">
                <div className="h-1.5 w-8 rounded bg-primary" />
                <div className="mt-1 font-display text-[0.6rem] font-semibold leading-tight">{s.t}</div>
              </div>
            )}
            {s.sub === "chart" && (
              <div className="flex h-full items-end gap-1">
                {[40, 70, 55, 85].map((h, j) => (
                  <div key={j} className="flex-1 rounded-t bg-primary/70" style={{ height: `${h}%` }} />
                ))}
              </div>
            )}
            {s.sub === "actions" && (
              <div className="space-y-1 pt-1">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-1">
                    <span className="size-1 rounded-full bg-primary" />
                    <span className="h-1 flex-1 rounded bg-border-strong" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-[10px] border border-border bg-card px-3 py-2">
        <span className="text-[0.68rem] text-secondary-foreground">12 slides composed</span>
        <span className="rounded-[0.4rem] bg-foreground px-2.5 py-1 text-[0.62rem] font-medium text-background">
          Export .pptx
        </span>
      </div>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    id: "dashboard",
    name: "AI Dashboard Generation",
    icon: BarChart3,
    desc: "Drop a spreadsheet and InsightIQ profiles every column, then composes KPIs and the right charts for your data.",
    benefits: ["Automatic KPIs & chart selection", "Readable analytical summaries"],
    Preview: DashboardPreview,
  },
  {
    id: "rca",
    name: "Root Cause Analysis",
    icon: GitBranch,
    desc: "When a metric moves, InsightIQ decomposes the change into the factors that drove it — ranked and quantified.",
    benefits: ["Contributing factors, quantified", "Clear, comparative explanation"],
    Preview: RcaPreview,
  },
  {
    id: "forecast",
    name: "Forecasting",
    icon: TrendingUp,
    desc: "Trend and seasonality forecasts with prediction intervals — so you plan against a range, not a single guess.",
    benefits: ["Trend + seasonality model", "Honest prediction intervals"],
    Preview: ForecastPreview,
  },
  {
    id: "qa",
    name: "Natural Language Q&A",
    icon: MessageSquare,
    desc: "Ask questions in plain English. Answers are computed from your data with the SQL shown — never guessed.",
    benefits: ["Data-grounded answers", "The query is always visible"],
    Preview: QaPreview,
  },
  {
    id: "slides",
    name: "AI Presentation Generation",
    icon: Presentation,
    desc: "Turn the analysis into a presentation — titled slides, the key charts and recommendations, exported to PowerPoint.",
    benefits: ["Charts & narrative composed", "One-click .pptx export"],
    Preview: SlidesPreview,
  },
];

export function FeatureExplorer() {
  const [active, setActive] = useState(0);
  const F = FEATURES[active];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
      {/* left — feature nav */}
      <div className="flex flex-col gap-2">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          const on = i === active;
          return (
            <button
              key={f.id}
              onClick={() => setActive(i)}
              className={cn(
                "group rounded-[var(--radius)] border p-4 text-left transition-all duration-200",
                on
                  ? "border-primary/40 bg-[var(--accent-bg)] shadow-[var(--shadow-sm)]"
                  : "border-border bg-card hover:border-border-strong hover:bg-background-2",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-[0.5rem] transition-colors",
                    on ? "bg-primary text-primary-foreground" : "bg-background-2 text-muted-foreground",
                  )}
                >
                  <Icon className="size-[1.05rem]" />
                </span>
                <span className={cn("text-sm font-semibold", on ? "text-foreground" : "text-secondary-foreground")}>
                  {f.name}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pt-3 text-[0.82rem] leading-relaxed text-muted-foreground">{f.desc}</p>
                    <ul className="mt-3 space-y-1.5">
                      {f.benefits.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-[0.78rem] text-secondary-foreground">
                          <span className="size-1.5 rounded-full bg-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* right — preview */}
      <div className="relative min-h-[360px] rounded-[calc(var(--radius)+0.4rem)] border border-border-strong bg-background-2/50 p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            {F.name}
          </span>
          <span className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted-foreground">
            Illustrative
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={F.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <F.Preview />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
