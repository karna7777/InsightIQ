"use client";

import { ChatPanel } from "@/components/chat-panel";
import { PageIntro } from "@/components/shell/page-intro";
import { useDataset } from "@/lib/dataset-context";

export default function AskPage() {
  const { id } = useDataset();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <PageIntro
        eyebrow="Ask your data"
        title="Natural-language Q&A"
        lead="Ask a question in plain English. InsightIQ writes DuckDB SQL, validates it, runs it, and shows the SQL, a chart and a one-line takeaway."
      />
      <ChatPanel datasetId={id} />
    </div>
  );
}
