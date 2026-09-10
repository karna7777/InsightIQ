"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadZone } from "@/components/upload-zone";
import { DashboardView } from "@/components/dashboard-view";
import { Reveal } from "@/components/reveal";
import { getDashboard, uploadDataset } from "@/lib/api";
import type { Dashboard, UploadResponse } from "@/lib/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; upload: UploadResponse; dashboard: Dashboard };

export default function Home() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleFile(file: File) {
    setState({ status: "loading" });
    try {
      const upload = await uploadDataset(file);
      const dashboard = await getDashboard(upload.dataset_id);
      setState({ status: "ready", upload, dashboard });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  const busy = state.status === "loading";
  const ready = state.status === "ready";

  return (
    <div
      className={
        ready
          ? "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6"
          : "mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 sm:px-8"
      }
    >
      {/* minimal top bar — just the wordmark and theme control */}
      <header className="flex items-center justify-between">
        <span className="text-lg font-medium tracking-tight">
          Insight<span className="text-primary">IQ</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="flex-1">
        {ready ? (
          <div className="mt-6">
            <DashboardView
              upload={state.upload}
              dashboard={state.dashboard}
              onReset={() => setState({ status: "idle" })}
            />
          </div>
        ) : (
          <div className="mx-auto flex min-h-[78vh] max-w-3xl flex-col justify-center py-12">
            <Reveal
              as="p"
              className="mb-6 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"
            >
              AI data intelligence
            </Reveal>

            <Reveal as="h1" delay={80} className="text-5xl leading-[1.05] sm:text-6xl">
              Turn a spreadsheet
              <br />
              into a story.
            </Reveal>

            <Reveal
              as="p"
              delay={180}
              className="mt-7 max-w-xl text-lg leading-relaxed text-secondary-foreground"
            >
              Drop a CSV or Excel file. InsightIQ profiles it, builds the KPI cards
              and charts automatically, then narrates what actually matters — with
              every number computed right here on your machine.
            </Reveal>

            <Reveal delay={300} className="mt-12">
              <UploadZone onFile={handleFile} busy={busy} />
            </Reveal>

            {state.status === "error" && (
              <div className="mt-5 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--sem-crit)]/30 bg-[var(--sem-crit-bg)] px-4 py-3.5 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--sem-crit)]" />
                <div>
                  <div className="font-medium">Couldn&apos;t process that file</div>
                  <div className="mt-0.5 text-muted-foreground">{state.message}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-border pt-5 text-center text-xs tracking-wide text-muted-foreground">
        Runs entirely on your machine · data never leaves this device
      </footer>
    </div>
  );
}
