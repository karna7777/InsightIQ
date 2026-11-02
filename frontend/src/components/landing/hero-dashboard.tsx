"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { CountUp } from "./count-up";

// Representative figures for the preview — illustrative, not live records.
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const HIST = [62, 70, 67, 79, 84, 81, 96, 104]; // revenue, €k
const FCAST = [104, 113, 121]; // Nov → projection

const CW = 440;
const CH = 176;
const PAD = { l: 8, r: 8, t: 16, b: 22 };
const MAX = 140;

function x(i: number, n: number) {
  return PAD.l + (i / (n - 1)) * (CW - PAD.l - PAD.r);
}
function y(v: number) {
  return PAD.t + (1 - v / MAX) * (CH - PAD.t - PAD.b);
}

function linePath(vals: number[], n: number, offset = 0) {
  return vals
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i + offset, n).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
}

export function HeroDashboard() {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const total = HIST.length + FCAST.length - 1; // forecast shares the last hist point
  const histPath = linePath(HIST, total);
  const areaPath = `${histPath} L${x(HIST.length - 1, total).toFixed(1)},${y(0).toFixed(1)} L${x(0, total).toFixed(1)},${y(0).toFixed(1)} Z`;
  const fcastPath = linePath(FCAST, total, HIST.length - 1);

  function onMove(e: React.MouseEvent) {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const fx = (e.clientX - r.left) / r.width;
    const idx = Math.round(fx * (HIST.length - 1));
    setHover(Math.max(0, Math.min(HIST.length - 1, idx)));
  }

  const hx = hover != null ? x(hover, total) : 0;
  const hy = hover != null ? y(HIST[hover]) : 0;

  return (
    <div className="relative w-full overflow-hidden rounded-[14px] border border-border-strong bg-card shadow-[var(--shadow-lg)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="ml-2 font-mono text-[0.68rem] text-muted-foreground">retail_q4.csv · overview</span>
        <span className="ml-auto rounded-full border border-border bg-background-2 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">
          Preview
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { l: "Revenue", node: <CountUp value={1.24} decimals={2} prefix="€" suffix="M" />, d: "+18%", up: true },
            { l: "Orders", node: <CountUp value={8410} />, d: "+6%", up: true },
            { l: "Margin", node: <CountUp value={32.4} decimals={1} suffix="%" />, d: "−1.2%", up: false },
          ].map((k) => (
            <div key={k.l} className="rounded-[10px] border border-border bg-background-2/60 p-2.5">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">{k.l}</div>
              <div className="mt-1 font-display text-[1.15rem] font-semibold leading-none tabular-nums text-foreground">
                {k.node}
              </div>
              <div
                className="mt-1 text-[0.62rem] font-medium"
                style={{ color: k.up ? "var(--sem-good)" : "var(--sem-crit)" }}
              >
                {k.d}
              </div>
            </div>
          ))}
        </div>

        {/* chart */}
        <div className="mt-3 rounded-[10px] border border-border bg-card p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[0.68rem] font-medium text-secondary-foreground">Revenue · monthly</span>
            <span className="flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-muted-foreground">
              <span className="inline-block h-1.5 w-3 rounded-full bg-primary" /> actual
              <span className="ml-1 inline-block h-1.5 w-3 rounded-full" style={{ background: "var(--viz-forecast)" }} /> forecast
            </span>
          </div>

          <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" style={{ aspectRatio: `${CW} / ${CH}` }}>
              <defs>
                <linearGradient id="hd-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* gridlines */}
              {[0.25, 0.5, 0.75].map((g) => (
                <line
                  key={g}
                  x1={PAD.l}
                  x2={CW - PAD.r}
                  y1={PAD.t + g * (CH - PAD.t - PAD.b)}
                  y2={PAD.t + g * (CH - PAD.t - PAD.b)}
                  stroke="var(--viz-grid)"
                  strokeWidth="1"
                />
              ))}

              {/* forecast band */}
              <path
                d={`M${x(HIST.length - 1, total)},${y(FCAST[0] + 4)} L${x(total, total)},${y(FCAST[FCAST.length - 1] + 12)} L${x(total, total)},${y(FCAST[FCAST.length - 1] - 12)} L${x(HIST.length - 1, total)},${y(FCAST[0] - 4)} Z`}
                fill="var(--viz-band)"
              />

              <path d={areaPath} fill="url(#hd-fill)" />

              {/* forecast (dashed, draws second) */}
              <motion.path
                d={fcastPath}
                fill="none"
                stroke="var(--viz-forecast)"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 1.1, ease: "easeInOut" }}
              />

              {/* actual (draws first) */}
              <motion.path
                d={histPath}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.3, ease: "easeInOut" }}
              />

              {/* hover guide + marker */}
              {hover != null && (
                <g>
                  <line x1={hx} x2={hx} y1={PAD.t} y2={CH - PAD.b} stroke="var(--border-strong)" strokeWidth="1" />
                  <circle cx={hx} cy={hy} r="4.5" fill="var(--card)" stroke="var(--primary)" strokeWidth="2.5" />
                </g>
              )}
            </svg>

            {/* hover tooltip (HTML overlay, positioned by %) */}
            {hover != null && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2 py-1 text-center shadow-[var(--shadow-md)]"
                style={{ left: `${(hx / CW) * 100}%`, top: `${(hy / CH) * 100}%`, marginTop: -8 }}
              >
                <div className="font-mono text-[0.54rem] uppercase tracking-[0.1em] text-muted-foreground">
                  {MONTHS[hover]}
                </div>
                <div className="font-display text-[0.8rem] font-semibold tabular-nums text-foreground">
                  €{HIST[hover]}k
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI insight line */}
        <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-primary/25 bg-[var(--accent-bg)] p-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-3" />
          </span>
          <p className="text-[0.72rem] leading-relaxed text-secondary-foreground">
            Revenue climbed <span className="font-semibold text-foreground">18%</span> this quarter, driven by the
            enterprise segment.
            <span className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary">
              See why <ArrowUpRight className="size-3" />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
