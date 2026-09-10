"use client";

import { AlertCircle, Code2 } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { KpiCard } from "@/components/kpi-card";
import type { ChatResponse } from "@/lib/types";

export function ChatResult({ result }: { result: ChatResponse }) {
  return (
    <div className="space-y-3 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div className="text-base font-medium">{result.question}</div>

      {result.error ? (
        <div className="flex items-start gap-2 rounded-[var(--radius)] border border-border bg-card p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#d03b3b]" />
          <div>
            <div className="font-medium">I couldn&apos;t answer that</div>
            <div className="mt-0.5 text-muted-foreground">{result.error}</div>
          </div>
        </div>
      ) : (
        <>
          {result.takeaway && (
            <p className="text-sm leading-relaxed text-secondary-foreground">
              {result.takeaway}
            </p>
          )}
          {result.kpi && (
            <div className="max-w-xs">
              <KpiCard kpi={result.kpi} />
            </div>
          )}
          {result.chart && <ChartCard chart={result.chart} />}
        </>
      )}

      {/* The generated SQL is always shown — transparency is a feature. */}
      {result.sql && (
        <SqlDisclosure
          sql={result.sql}
          reasoning={result.reasoning}
          model={result.model}
          rowCount={result.row_count}
        />
      )}
    </div>
  );
}

function SqlDisclosure({
  sql,
  reasoning,
  model,
  rowCount,
}: {
  sql: string;
  reasoning?: string | null;
  model?: string | null;
  rowCount?: number | null;
}) {
  return (
    <details className="rounded-md border border-border bg-card">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <Code2 className="size-3.5" />
        View generated SQL
        <span className="ml-auto font-mono">
          {model}
          {rowCount != null ? ` · ${rowCount} rows` : ""}
        </span>
      </summary>
      <div className="border-t border-border px-3 py-3">
        {reasoning && (
          <p className="mb-2 text-xs italic text-muted-foreground">{reasoning}</p>
        )}
        <pre className="overflow-x-auto rounded bg-foreground/5 p-3 text-xs">
          <code className="font-mono">{sql}</code>
        </pre>
      </div>
    </details>
  );
}
