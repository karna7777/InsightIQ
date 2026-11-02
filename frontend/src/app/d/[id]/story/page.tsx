"use client";

import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { StoryMode } from "@/components/story-mode";
import {
  getForecast,
  getInsights,
  getInvestigation,
  getRecommendations,
} from "@/lib/api";
import { useAsyncData } from "@/lib/use-async-data";
import { useDataset } from "@/lib/dataset-context";
import type {
  DecisionReport,
  ForecastReport,
  InsightReport,
  InvestigationReport,
  UploadResponse,
} from "@/lib/types";

interface StoryBundle {
  report: InsightReport;
  investigation: InvestigationReport | null;
  forecast: ForecastReport | null;
  decisions: DecisionReport | null;
}

export default function StoryPage() {
  const router = useRouter();
  const { id, filename, rowCount, profile, dashboard } = useDataset();
  const back = () => router.push(`/d/${id}`);

  const { state } = useAsyncData<StoryBundle>(async () => {
    const [report, investigation, forecast, decisions] = await Promise.all([
      getInsights(id),
      getInvestigation(id).catch(() => null),
      getForecast(id).catch(() => null),
      getRecommendations(id).catch(() => null),
    ]);
    return { report, investigation, forecast, decisions };
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-md)]">
            <Sparkles className="size-6" />
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Composing your presentation…
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h2 className="text-xl font-semibold">Couldn&apos;t build the presentation</h2>
        <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
        <button
          onClick={back}
          className="mt-6 rounded-[0.55rem] border border-border-strong bg-card px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-background-2"
        >
          Back to overview
        </button>
      </div>
    );
  }

  const upload: UploadResponse = {
    dataset_id: id,
    filename,
    row_count: rowCount,
    profile,
    ingest_report: { entries: [] },
  };

  return (
    <StoryMode
      upload={upload}
      dashboard={dashboard}
      report={state.data.report}
      investigation={state.data.investigation}
      forecast={state.data.forecast}
      decisions={state.data.decisions}
      onClose={back}
    />
  );
}
