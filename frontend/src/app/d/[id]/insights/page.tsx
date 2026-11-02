"use client";

import { useRouter } from "next/navigation";
import { InsightsPanel } from "@/components/insights-panel";
import { PageIntro } from "@/components/shell/page-intro";
import { useDataset } from "@/lib/dataset-context";

export default function InsightsPage() {
  const { id } = useDataset();
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <PageIntro
        eyebrow="Step 1 · What happened"
        title="Insights"
        lead="A narrative report of the strongest patterns in your data — each statement backed by a number computed locally."
      />
      <InsightsPanel datasetId={id} onInvestigate={() => router.push(`/d/${id}/why`)} />
    </div>
  );
}
