"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatResult } from "@/components/chat-result";
import { askQuestion } from "@/lib/api";
import type { ChatResponse } from "@/lib/types";

const EXAMPLES = [
  "Total revenue by product",
  "Revenue over time by month",
  "Which region has the highest revenue?",
];

export function ChatPanel({ datasetId }: { datasetId: string }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ChatResponse[]>([]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setQuestion("");
    try {
      const res = await askQuestion(datasetId, q);
      setResults((prev) => [res, ...prev]);
    } catch (err) {
      setResults((prev) => [
        { question: q, error: err instanceof Error ? err.message : "Request failed." },
        ...prev,
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold not-display">
        <Sparkles className="size-4 text-primary" />
        Ask a question
      </h3>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. which product is most profitable?"
          disabled={busy}
          className="flex-1 rounded-[calc(var(--radius)-0.25rem)] border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />
        <Button type="submit" disabled={busy || !question.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
          {busy ? "Thinking" : "Ask"}
        </Button>
      </form>

      {results.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => submit(ex)}
              disabled={busy}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {results.map((r, i) => (
          <ChatResult key={results.length - i} result={r} />
        ))}
      </div>
    </section>
  );
}
