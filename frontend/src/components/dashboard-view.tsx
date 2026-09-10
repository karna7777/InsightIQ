"use client";

import { useState } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisWorkspace } from "@/components/analysis-workspace";
import { ChartCard } from "@/components/chart-card";
import { IngestReportBanner } from "@/components/ingest-report";
import { KpiCard } from "@/components/kpi-card";
import { StoryMode } from "@/components/story-mode";
import {
  getForecast,
  getInsights,
  getInvestigation,
  getRecommendations,
} from "@/lib/api";
import { formatInteger } from "@/lib/utils";
import type {
  Dashboard,
  DecisionReport,
  ForecastReport,
  InsightReport,
  InvestigationReport,
  UploadResponse,
} from "@/lib/types";

// The full L2–L4 payload for a presentation, fetched together so Story Mode
// never pauses to load mid-narrative. Insights is required; the deeper reports
// are optional (a dataset without a date column has no forecast, say).
type Story =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "open";
      report: InsightReport;
      investigation: InvestigationReport | null;
      forecast: ForecastReport | null;
      decisions: DecisionReport | null;
    };

export function DashboardView({
  upload,
  dashboard,
  onReset,
}: {
  upload: UploadResponse;
  dashboard: Dashboard;
  onReset: () => void;
}) {
  const { roles } = upload.profile;
  const [story, setStory] = useState<Story>({ status: "idle" });

  async function present() {
    setStory({ status: "loading" });
    const id = upload.dataset_id;
    try {
      const [report, investigation, forecast, decisions] = await Promise.all([
        getInsights(id),
        getInvestigation(id).catch(() => null),
        getForecast(id).catch(() => null),
        getRecommendations(id).catch(() => null),
      ]);
      setStory({ status: "open", report, investigation, forecast, decisions });
    } catch (err) {
      setStory({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to analyze.",
      });
    }
  }

  return (
    <div className="space-y-8">
      {/* dataset header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Dashboard
          </p>
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">{upload.filename}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {formatInteger(upload.row_count)} rows · {upload.profile.columns.length} columns
            {roles.primary_date ? ` · time column: ${roles.primary_date}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={present}
            disabled={story.status === "loading"}
          >
            {story.status === "loading" ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Present with AI
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw /> New file
          </Button>
        </div>
      </div>

      {story.status === "error" && (
        <p className="text-sm text-[#d03b3b]">
          Couldn&apos;t start the presentation: {story.message}
        </p>
      )}

      {story.status === "open" && (
        <StoryMode
          upload={upload}
          dashboard={dashboard}
          report={story.report}
          investigation={story.investigation}
          forecast={story.forecast}
          decisions={story.decisions}
          onClose={() => setStory({ status: "idle" })}
        />
      )}

      <IngestReportBanner report={upload.ingest_report} />

      {/* KPI stat tiles */}
      {dashboard.kpis.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Key figures</SectionLabel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {dashboard.kpis.map((kpi, i) => (
              <KpiCard key={i} kpi={kpi} />
            ))}
          </div>
        </section>
      )}

      {/* charts */}
      {dashboard.charts.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Charts</SectionLabel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {dashboard.charts.map((chart) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>
        </section>
      )}

      {/* the intelligence loop: explain → investigate → predict → decide → ask */}
      <section className="space-y-3 border-t border-border pt-8">
        <SectionLabel>Intelligence</SectionLabel>
        <AnalysisWorkspace datasetId={upload.dataset_id} profile={upload.profile} />
      </section>
    </div>
  );
}

/** Small uppercase section label — the editorial rhythm marker for Analytics. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}
