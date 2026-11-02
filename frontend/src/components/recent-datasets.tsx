"use client";

import Link from "next/link";
import { ArrowUpRight, Database, FileSpreadsheet } from "lucide-react";
import { listDatasets } from "@/lib/api";
import { useAsyncData } from "@/lib/use-async-data";
import { formatInteger } from "@/lib/utils";
import type { DatasetSummary } from "@/lib/types";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.floor(d)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentDatasets({
  limit,
  query = "",
}: {
  limit?: number;
  query?: string;
}) {
  const { state } = useAsyncData<DatasetSummary[]>(() => listDatasets(), []);

  if (state.status === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: limit ?? 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[108px] rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Couldn&apos;t reach the server. Is the backend running on{" "}
        <span className="font-mono text-foreground">127.0.0.1:8000</span>?
        <div className="mt-1 text-xs">{state.message}</div>
      </div>
    );
  }

  let items = state.data;
  const q = query.trim().toLowerCase();
  if (q) items = items.filter((d) => d.filename.toLowerCase().includes(q));
  if (limit) items = items.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-border bg-card/40 px-6 py-12 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Database className="size-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          {q ? "No datasets match your search" : "No datasets yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {q ? "Try a different name." : "Upload a spreadsheet to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <Link
          key={d.id}
          href={`/d/${d.id}`}
          className="group relative overflow-hidden rounded-[var(--radius)] border border-border bg-card/50 p-5 transition-all duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-md)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div className="mt-4 truncate font-medium tracking-tight" title={d.filename}>
            {d.filename}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{formatInteger(d.row_count)} rows</span>
            <span className="opacity-40">·</span>
            <span>{relativeTime(d.uploaded_at)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
