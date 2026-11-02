"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb, Search, Sparkles, TrendingUp } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/shell/page-intro";
import { useDataset } from "@/lib/dataset-context";

const NEXT = [
  { href: "insights", label: "What happened", icon: Sparkles, body: "Narrative insights", tone: "var(--primary)" },
  { href: "why", label: "Why", icon: Search, body: "Root-cause drivers", tone: "var(--accent-cyan)" },
  { href: "forecast", label: "What's next", icon: TrendingUp, body: "Forecast + anomalies", tone: "var(--accent-blue)" },
  { href: "decide", label: "What to do", icon: Lightbulb, body: "Ranked actions", tone: "var(--sem-warn)" },
];

export default function OverviewPage() {
  const { id, dashboard, profile } = useDataset();
  const { roles } = profile;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <PageIntro
        eyebrow="Dashboard"
        title="Overview"
        lead={
          roles.primary_date
            ? `Auto-generated from your data. Time column: ${roles.primary_date}.`
            : "Auto-generated KPIs and charts, computed directly from your data."
        }
      />

      {dashboard.kpis.length > 0 && (
        <section className="mb-10">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {dashboard.kpis.map((kpi, i) => (
              <KpiCard key={i} kpi={kpi} featured={i === 1} />
            ))}
          </div>
        </section>
      )}

      {dashboard.charts.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Charts
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {dashboard.charts.map((chart) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>
        </section>
      )}

      {/* continue the loop */}
      <section className="border-t border-border pt-8">
        <div className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Continue the analysis
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NEXT.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={`/d/${id}/${n.href}`}
                className="group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card/50 p-4 transition-all duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-md)]"
              >
                <div
                  className="grid size-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: `color-mix(in oklab, ${n.tone} 16%, transparent)`, color: n.tone }}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
