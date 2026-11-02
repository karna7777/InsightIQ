"use client";

import { RecommendationsPanel } from "@/components/recommendations-panel";
import { PageIntro } from "@/components/shell/page-intro";
import { useDataset } from "@/lib/dataset-context";

export default function DecidePage() {
  const { id } = useDataset();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <PageIntro
        eyebrow="Step 4 · What to do"
        title="Decision copilot"
        lead="Recommended actions derived from computed evidence, ranked by impact × confidence. Each cites the number it rests on."
      />
      <RecommendationsPanel datasetId={id} />
    </div>
  );
}
