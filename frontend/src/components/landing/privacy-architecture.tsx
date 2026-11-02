"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Database,
  FileSpreadsheet,
  Lightbulb,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const LOCAL: { icon: LucideIcon; label: string; sub: string }[] = [
  { icon: FileSpreadsheet, label: "Spreadsheet", sub: "CSV · Excel" },
  { icon: Database, label: "Local processing", sub: "in-process DuckDB" },
  { icon: BarChart3, label: "Analytics engine", sub: "SQL · statistics" },
  { icon: Lightbulb, label: "Insights", sub: "charts · narrative" },
];

export function PrivacyArchitecture() {
  return (
    <div className="space-y-5">
      {/* on-machine boundary */}
      <div className="relative rounded-[calc(var(--radius)+0.3rem)] border border-primary/30 bg-[var(--accent-bg)]/50 p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-primary">On your machine</span>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {LOCAL.map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={n.label} className="flex min-w-0 items-center gap-3 sm:flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3 shadow-[var(--shadow-sm)]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[0.5rem] bg-[var(--accent-bg)] text-primary">
                    <Icon className="size-[1.05rem]" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[0.82rem] font-semibold">{n.label}</div>
                    <div className="truncate font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {n.sub}
                    </div>
                  </div>
                </motion.div>
                {i < LOCAL.length - 1 && (
                  <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* outbound AI step — represented honestly */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
          <span className="hidden h-px w-8 bg-border-strong sm:block" />
          <span className="rounded-full border border-dashed border-border-strong px-2.5 py-1">
            aggregated summaries only
          </span>
          <ArrowRight className="size-4" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius)] border border-dashed border-border-strong bg-card p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.5rem] bg-background-2 text-secondary-foreground">
            <Sparkles className="size-[1.05rem]" />
          </span>
          <div className="min-w-0">
            <div className="text-[0.82rem] font-semibold">AI language model</div>
            <div className="text-[0.72rem] text-muted-foreground">
              phrases the explanations — numbers are computed locally first
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
