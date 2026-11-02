"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Compass,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { UploadZone } from "@/components/upload-zone";
import { RecentDatasets } from "@/components/recent-datasets";
import { Reveal } from "@/components/reveal";
import { uploadDataset } from "@/lib/api";

const LEVELS = [
  {
    icon: Compass,
    tone: "var(--accent-cyan)",
    level: "L1",
    title: "Understand",
    body: "Auto-profile every column — types, roles, distributions and the cleanup it took to load.",
  },
  {
    icon: Sparkles,
    tone: "var(--primary)",
    level: "L2",
    title: "Explain",
    body: "Dashboards, narrative insights and plain-English Q&A over your data, with the SQL shown.",
  },
  {
    icon: TrendingUp,
    tone: "var(--accent-blue)",
    level: "L3",
    title: "Predict",
    body: "Trend + seasonality forecasts with confidence bands and historical anomaly flags.",
  },
  {
    icon: Lightbulb,
    tone: "var(--sem-warn)",
    level: "L4",
    title: "Decide",
    body: "Root-cause investigation and ranked recommendations scored by impact × confidence.",
  },
];

export default function Workspace() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const upload = await uploadDataset(file);
      try {
        sessionStorage.setItem(`iq:name:${upload.dataset_id}`, upload.filename);
      } catch {}
      router.push(`/d/${upload.dataset_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <AppShell title="Workspace">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-[calc(var(--radius)+0.5rem)] border border-border bg-card px-6 py-14 shadow-[var(--shadow-sm)] sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
          <div className="relative mx-auto max-w-3xl text-center">
            <Reveal
              as="div"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-[var(--accent-bg)] px-3.5 py-1.5 font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-primary"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              AI Data Intelligence
            </Reveal>
            <Reveal as="h1" delay={80} className="text-5xl leading-[1.04] sm:text-6xl">
              Turn raw data
              <br />
              into <span className="italic text-primary">decisions</span>.
            </Reveal>
            <Reveal
              as="p"
              delay={180}
              className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-secondary-foreground"
            >
              Drop a CSV or Excel file. InsightIQ profiles it, builds dashboards and
              charts, explains what changed and what to do next — all computed right
              here on your machine.
            </Reveal>
            <Reveal delay={300} className="mx-auto mt-10 max-w-xl text-left">
              <UploadZone onFile={handleFile} busy={busy} />
              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--sem-crit)]/40 bg-[var(--sem-crit-bg)] px-4 py-3.5 text-sm">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--sem-crit)]" />
                  <div>
                    <div className="font-medium">Couldn&apos;t process that file</div>
                    <div className="mt-0.5 text-muted-foreground">{error}</div>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent datasets</h2>
            <Link
              href="/data"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <RecentDatasets limit={6} />
        </section>

        <section className="mt-14">
          <div className="mb-5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Four levels of intelligence
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((l) => {
              const Icon = l.icon;
              return (
                <div
                  key={l.level}
                  className="group relative overflow-hidden rounded-[var(--radius)] border border-border bg-card/50 p-5 transition-colors hover:border-border-strong"
                >
                  <div
                    className="grid size-10 place-items-center rounded-xl"
                    style={{ background: `color-mix(in oklab, ${l.tone} 16%, transparent)`, color: l.tone }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{l.level}</span>
                    <h3 className="text-base font-semibold tracking-tight">{l.title}</h3>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
