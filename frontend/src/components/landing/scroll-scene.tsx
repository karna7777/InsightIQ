"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import {
  ArrowUpRight,
  BarChart3,
  Database,
  Lightbulb,
  Sparkles,
  Target,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "upload", label: "Raw spreadsheet", icon: UploadCloud },
  { id: "process", label: "Profiled & typed", icon: Database },
  { id: "analyze", label: "Dashboard", icon: BarChart3 },
  { id: "discover", label: "Root cause", icon: Lightbulb },
  { id: "decide", label: "Decision", icon: Target },
];
const N = STEPS.length;

/**
 * A stacked layer that cross-dissolves in when it becomes the active stage.
 * Driven by the discrete `active` flag (derived from scroll progress) rather
 * than a per-stage scroll transform, so exactly one stage is ever visible —
 * no lingering layers, reliable across viewports.
 */
function Stage({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      aria-hidden={!active}
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 16, scale: active ? 1 : 0.985 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: active ? "auto" : "none" }}
      className="absolute inset-0 flex flex-col justify-center"
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------- stage content ----------------------------- */

const ROWS = [
  ["2024-10-02", "EMEA", "Enterprise", "48,120", "214"],
  ["2024-10-02", "AMER", "Mid-market", "31,540", "402"],
  ["2024-10-03", "APAC", "Enterprise", "52,870", "188"],
  ["2024-10-03", "EMEA", "SMB", "12,310", "530"],
  ["2024-10-04", "AMER", "Enterprise", "61,040", "171"],
];
const COLS = ["date", "region", "segment", "revenue", "orders"];
const TYPES = ["date", "text", "text", "€ num", "int"];

function RawGrid({ profiled }: { profiled?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-card">
      <div className="grid grid-cols-5 border-b border-border bg-background-2/70">
        {COLS.map((c, i) => (
          <div key={c} className="px-2.5 py-2">
            <div className="font-mono text-[0.62rem] font-medium text-secondary-foreground">{c}</div>
            {profiled && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="mt-1 inline-block rounded border border-primary/30 bg-[var(--accent-bg)] px-1.5 py-0.5 font-mono text-[0.52rem] uppercase tracking-wide text-primary"
              >
                {TYPES[i]}
              </motion.div>
            )}
          </div>
        ))}
      </div>
      {ROWS.map((r, ri) => (
        <div
          key={ri}
          className={cn("grid grid-cols-5 border-b border-border/70 last:border-0", profiled && "opacity-80")}
        >
          {r.map((cell, ci) => (
            <div
              key={ci}
              className={cn(
                "truncate px-2.5 py-2 font-mono text-[0.66rem] tabular-nums",
                ci >= 3 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MiniChart() {
  return (
    <svg viewBox="0 0 360 120" className="w-full" style={{ aspectRatio: "360 / 120" }}>
      <defs>
        <linearGradient id="ss-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66].map((g) => (
        <line key={g} x1="6" x2="354" y1={12 + g * 92} y2={12 + g * 92} stroke="var(--viz-grid)" />
      ))}
      <path d="M6,92 L74,80 L142,86 L210,58 L278,64 L346,36 L346,112 L6,112 Z" fill="url(#ss-fill)" />
      <path
        d="M6,92 L74,80 L142,86 L210,58 L278,64 L346,36"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardStage() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { l: "Revenue", v: "€1.24M" },
          { l: "Orders", v: "8,410" },
          { l: "Margin", v: "32.4%" },
        ].map((k) => (
          <div key={k.l} className="rounded-[10px] border border-border bg-card p-2.5">
            <div className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-muted-foreground">{k.l}</div>
            <div className="mt-1 font-display text-lg font-semibold tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[10px] border border-border bg-card p-3">
        <div className="mb-1 text-[0.66rem] text-muted-foreground">Revenue · monthly</div>
        <MiniChart />
      </div>
    </div>
  );
}

function RcaStage() {
  const factors = [
    { l: "Enterprise discounting", v: "−3.1", w: 100, neg: true },
    { l: "COGS drift", v: "−1.4", w: 45, neg: true },
    { l: "New logos", v: "+0.9", w: 30, neg: false },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2 rounded-[10px] border border-border bg-card px-3 py-2.5">
        <span className="font-display text-lg font-semibold">Net margin</span>
        <span className="font-display text-lg font-semibold text-[var(--sem-crit)]">−5.3%</span>
        <span className="ml-auto font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
          vs. prior Q
        </span>
      </div>
      <div className="space-y-2 rounded-[10px] border border-border bg-card p-3">
        {factors.map((f) => (
          <div key={f.l} className="flex items-center gap-2 text-[0.72rem]">
            <span className="w-36 shrink-0 truncate text-secondary-foreground">{f.l}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-background-2">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${f.w}%`, background: f.neg ? "var(--sem-crit)" : "var(--sem-good)" }}
              />
            </div>
            <span
              className="w-9 text-right font-mono tabular-nums"
              style={{ color: f.neg ? "var(--sem-crit)" : "var(--sem-good)" }}
            >
              {f.v}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2.5 rounded-[10px] border border-primary/25 bg-[var(--accent-bg)] p-3">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p className="text-[0.72rem] leading-relaxed text-secondary-foreground">
          Deeper enterprise discounting is the dominant driver — not volume.
        </p>
      </div>
    </div>
  );
}

function DecideStage() {
  const actions = [
    { t: "Reset enterprise discount floor to 12%", impact: "High", conf: "0.86" },
    { t: "Shift APAC spend to mid-market", impact: "Med", conf: "0.71" },
    { t: "Renegotiate top-3 COGS contracts", impact: "Med", conf: "0.64" },
  ];
  return (
    <div className="space-y-2.5">
      {actions.map((a, i) => (
        <div
          key={a.t}
          className={cn(
            "flex items-center gap-3 rounded-[10px] border p-3",
            i === 0 ? "border-primary/40 bg-[var(--accent-bg)]" : "border-border bg-card",
          )}
        >
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[0.62rem] font-semibold",
              i === 0 ? "bg-primary text-primary-foreground" : "bg-background-2 text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <span className="flex-1 text-[0.76rem] font-medium text-foreground">{a.t}</span>
          <span className="hidden gap-1.5 font-mono text-[0.56rem] uppercase tracking-wide text-muted-foreground sm:flex">
            <span className="rounded border border-border px-1.5 py-0.5">{a.impact}</span>
            <span className="rounded border border-border px-1.5 py-0.5">conf {a.conf}</span>
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-[10px] border border-border bg-card px-3 py-2.5">
        <span className="text-[0.72rem] text-secondary-foreground">Ranked by impact × confidence</span>
        <span className="inline-flex items-center gap-1 rounded-[0.4rem] bg-foreground px-2.5 py-1 text-[0.62rem] font-medium text-background">
          Present <ArrowUpRight className="size-3" />
        </span>
      </div>
    </div>
  );
}

export function ScrollScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setStep(Math.max(0, Math.min(N - 1, Math.round(v * N - 0.5))));
  });

  const fillScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how" ref={ref} className="relative h-[360vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-5 sm:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 text-center sm:mb-10">
            <div className="eyebrow mb-3 flex items-center justify-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" /> See it happen
            </div>
            <h2 className="text-3xl sm:text-[2.5rem]">
              A spreadsheet becomes a <span className="italic text-primary">decision</span>
            </h2>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
            {/* vertical stepper (lg) */}
            <div className="relative hidden lg:block">
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border" />
              <motion.div
                style={{ scaleY: fillScaleY }}
                className="absolute left-[18px] top-2 bottom-2 w-0.5 origin-top bg-primary"
              />
              <ul className="space-y-6">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const on = i <= step;
                  const current = i === step;
                  return (
                    <li key={s.id} className="relative flex items-center gap-3.5">
                      <span
                        className={cn(
                          "relative z-10 grid size-9 place-items-center rounded-full border-2 bg-background transition-colors duration-300",
                          on ? "border-primary text-primary" : "border-border-strong text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span
                        className={cn(
                          "text-sm transition-colors duration-300",
                          current ? "font-semibold text-foreground" : on ? "text-secondary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* morphing product panel */}
            <div className="relative mx-auto w-full max-w-xl">
              {/* horizontal stepper (mobile) */}
              <div className="mb-3 flex items-center justify-between gap-1 lg:hidden">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex flex-1 items-center">
                    <span
                      className={cn(
                        "size-2 rounded-full transition-colors duration-300",
                        i <= step ? "bg-primary" : "bg-border-strong",
                      )}
                    />
                    {i < N - 1 && (
                      <span className={cn("h-0.5 flex-1", i < step ? "bg-primary" : "bg-border-strong")} />
                    )}
                  </div>
                ))}
              </div>

              <div className="relative overflow-hidden rounded-[14px] border border-border-strong bg-card shadow-[var(--shadow-lg)]">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className="size-2.5 rounded-full bg-border-strong" />
                  <span className="size-2.5 rounded-full bg-border-strong" />
                  <span className="size-2.5 rounded-full bg-border-strong" />
                  <span className="ml-2 font-mono text-[0.68rem] text-muted-foreground">
                    retail_q4.csv · {STEPS[step].label.toLowerCase()}
                  </span>
                  <span className="ml-auto rounded-full border border-border bg-background-2 px-2 py-0.5 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted-foreground">
                    Live
                  </span>
                </div>
                {/* fixed-height canvas for the stacked stages */}
                <div className="relative h-[300px] p-4 sm:h-[320px] sm:p-5">
                  <Stage active={step === 0}>
                    <RawGrid />
                  </Stage>
                  <Stage active={step === 1}>
                    <RawGrid profiled />
                  </Stage>
                  <Stage active={step === 2}>
                    <DashboardStage />
                  </Stage>
                  <Stage active={step === 3}>
                    <RcaStage />
                  </Stage>
                  <Stage active={step === 4}>
                    <DecideStage />
                  </Stage>
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">
                Illustrative · scroll to advance
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
