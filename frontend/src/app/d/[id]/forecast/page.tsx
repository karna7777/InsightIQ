"use client";

import { useRouter } from "next/navigation";
import { ForecastPanel } from "@/components/forecast-panel";
import { PageIntro } from "@/components/shell/page-intro";
import { useDataset } from "@/lib/dataset-context";

export default function ForecastPage() {
  const { id, profile } = useDataset();
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <PageIntro
        eyebrow="Step 3 · What's next"
        title="Forecast"
        lead="A trend + seasonality projection with 95% prediction intervals, and historical points flagged as anomalies."
      />
      <ForecastPanel
        datasetId={id}
        measures={profile.roles.measures}
        onNext={() => router.push(`/d/${id}/decide`)}
      />
    </div>
  );
}
