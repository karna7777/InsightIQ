"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { InvestigationPanel } from "@/components/investigation-panel";
import { PageIntro } from "@/components/shell/page-intro";
import { useDataset } from "@/lib/dataset-context";

export default function WhyPage() {
  const { id, profile } = useDataset();
  const router = useRouter();
  const additive = useMemo(() => {
    const by = new Map(profile.columns.map((c) => [c.name, c]));
    return profile.roles.measures.filter((m) => by.get(m)?.aggregation === "additive");
  }, [profile]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <PageIntro
        eyebrow="Step 2 · Why"
        title="Root-cause investigation"
        lead="Decomposes the change between the two most recent periods into per-segment contributions, then drills into the biggest driver."
      />
      <InvestigationPanel
        datasetId={id}
        measures={additive}
        onNext={() => router.push(`/d/${id}/forecast`)}
      />
    </div>
  );
}
