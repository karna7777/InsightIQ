"use client";

import { use } from "react";
import Link from "next/link";
import { AlertCircle, Play } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { DatasetProvider, useDatasetBundle } from "@/lib/dataset-context";
import { formatInteger } from "@/lib/utils";

export default function DatasetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { state } = useDatasetBundle(id);

  if (state.status === "loading") {
    return (
      <AppShell title="Loading dataset…" dataset={{ id, filename: "Loading…" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
          <div className="skeleton mb-6 h-10 w-72 rounded-lg" />
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-[var(--radius)]" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-72 rounded-[var(--radius)]" />
            <div className="skeleton h-72 rounded-[var(--radius)]" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (state.status === "error") {
    return (
      <AppShell title="Dataset" dataset={{ id, filename: "Dataset" }}>
        <div className="mx-auto w-full max-w-lg px-4 py-20 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--sem-crit-bg)] text-[var(--sem-crit)]">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Couldn&apos;t load this dataset</h2>
          <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
          <Link
            href="/data"
            className="mt-6 inline-flex rounded-[0.55rem] border border-border-strong bg-card px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-background-2"
          >
            Back to datasets
          </Link>
        </div>
      </AppShell>
    );
  }

  const bundle = state.data;

  return (
    <DatasetProvider value={bundle}>
      <AppShell
        title={bundle.filename}
        subtitle={`${formatInteger(bundle.rowCount)} rows · ${bundle.profile.columns.length} columns`}
        dataset={{ id: bundle.id, filename: bundle.filename }}
        actions={
          <Link
            href={`/d/${bundle.id}/story`}
            className="flex items-center gap-2 rounded-[0.55rem] bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)]"
          >
            <Play className="size-3.5" />
            <span className="hidden sm:inline">Present</span>
          </Link>
        }
      >
        {children}
      </AppShell>
    </DatasetProvider>
  );
}
