"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import {
  BarChart3,
  Database,
  Lightbulb,
  Target,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  name: string;
  icon: LucideIcon;
  short: string;
  detail: string;
}

const STAGES: Stage[] = [
  { id: "upload", name: "Upload", icon: UploadCloud, short: "CSV or Excel", detail: "Drop a spreadsheet. InsightIQ detects the schema, column types and roles automatically." },
  { id: "process", name: "Process", icon: Database, short: "Local DuckDB", detail: "The file loads into an in-process DuckDB engine on your machine, cleaning nulls, dates and numerics." },
  { id: "analyze", name: "Analyze", icon: BarChart3, short: "Computed with SQL", detail: "KPIs, distributions and the right charts are computed with SQL — every number is traceable to a query." },
  { id: "discover", name: "Discover", icon: Lightbulb, short: "Patterns & causes", detail: "Narrative insights, root-cause decomposition and forecasts surface what changed and why." },
  { id: "decide", name: "Decide", icon: Target, short: "Ranked actions", detail: "Recommendations ranked by impact and confidence, ready to present as a shareable story." },
];

export function DataJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [active, setActive] = useState(0);
  const A = STAGES[active];

  return (
    <div ref={ref}>
      {/* desktop horizontal rail */}
      <div className="relative hidden md:block">
        {/* base track */}
        <div className="absolute left-[10%] right-[10%] top-7 h-0.5 -translate-y-1/2 rounded-full bg-border" />
        {/* animated fill */}
        <motion.div
          className="absolute left-[10%] top-7 h-0.5 -translate-y-1/2 origin-left rounded-full bg-primary"
          style={{ right: "10%" }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="relative flex justify-between">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const on = i === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className="group flex w-1/5 flex-col items-center text-center"
              >
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={inView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ delay: 0.25 + i * 0.22, type: "spring", stiffness: 200, damping: 16 }}
                  className={cn(
                    "grid size-14 place-items-center rounded-2xl border-2 bg-background transition-colors duration-300",
                    on ? "border-primary text-primary" : "border-border-strong text-muted-foreground group-hover:border-primary/50",
                  )}
                >
                  <Icon className="size-6" />
                </motion.span>
                <span className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Step {i + 1}
                </span>
                <span className={cn("mt-1 text-sm font-semibold", on ? "text-foreground" : "text-secondary-foreground")}>
                  {s.name}
                </span>
                <span className="mt-0.5 text-[0.72rem] text-muted-foreground">{s.short}</span>
              </button>
            );
          })}
        </div>

        {/* detail panel */}
        <motion.div
          key={A.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mt-10 max-w-2xl rounded-[var(--radius)] border border-border bg-card p-5 text-center shadow-[var(--shadow-sm)]"
        >
          <div className="font-display text-lg font-semibold">{A.name}</div>
          <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{A.detail}</p>
        </motion.div>
      </div>

      {/* mobile vertical sequence */}
      <ol className="relative space-y-6 md:hidden">
        <div className="absolute bottom-6 left-7 top-6 w-0.5 bg-border" />
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative flex gap-4"
            >
              <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-primary/60 bg-background text-primary">
                <Icon className="size-6" />
              </span>
              <div className="pt-1">
                <div className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Step {i + 1}
                </div>
                <div className="mt-0.5 text-sm font-semibold">{s.name}</div>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-muted-foreground">{s.detail}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
