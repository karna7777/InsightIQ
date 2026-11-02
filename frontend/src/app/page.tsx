import Link from "next/link";
import {
  ArrowRight,
  Compass,
  FileSpreadsheet,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroDashboard } from "@/components/landing/hero-dashboard";
import { DataFlowBg } from "@/components/landing/data-flow-bg";
import { FeatureExplorer } from "@/components/landing/feature-explorer";
import { ScrollScene } from "@/components/landing/scroll-scene";
import { PrivacyArchitecture } from "@/components/landing/privacy-architecture";
import { Magnetic } from "@/components/landing/magnetic";
import { Tilt } from "@/components/landing/tilt";
import { FadeIn } from "@/components/landing/reveal-motion";

const LOOP = [
  { icon: Compass, n: "01", t: "Understand", b: "Auto-profile every column — types, roles, distributions and the cleanup it took to load." },
  { icon: Sparkles, n: "02", t: "Explain", b: "Dashboards, narrative insights and plain-English Q&A, always with the SQL shown." },
  { icon: TrendingUp, n: "03", t: "Predict", b: "Trend and seasonality forecasts with honest prediction intervals and anomaly flags." },
  { icon: Target, n: "04", t: "Decide", b: "Root-cause analysis and recommendations ranked by impact and confidence." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow mb-4 flex items-center gap-2">{children}</div>;
}

export default function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <LandingNav />

      {/* ============================ HERO ============================ */}
      <section className="relative px-5 pb-20 pt-28 sm:px-8 sm:pt-36">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-bg opacity-[0.5]" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* left — editorial */}
          <div>
            <FadeIn>
              <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                AI data intelligence
              </span>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h1 className="mt-6 text-[2.7rem] leading-[1.05] sm:text-6xl">
                Your data has a story.
                <br />
                Find <span className="italic text-primary">what matters</span>.
              </h1>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-secondary-foreground">
                Turn spreadsheets into meaningful insights. Explore patterns, understand performance, uncover root
                causes and make confident decisions — computed on your machine.
              </p>
            </FadeIn>
            <FadeIn delay={0.24}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Magnetic className="inline-block">
                  <Link
                    href="/app"
                    className="group inline-flex items-center gap-2 rounded-[0.55rem] bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)]"
                  >
                    Launch InsightIQ
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Magnetic>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-[0.55rem] border border-border-strong bg-card px-5 py-3 text-sm font-medium transition-colors hover:border-primary/45 hover:bg-background-2"
                >
                  Explore the platform
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.32}>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="size-3.5 text-primary" /> CSV &amp; Excel
                </span>
                <span className="hidden h-3 w-px bg-border-strong sm:block" />
                <span className="flex items-center gap-1.5">
                  <Lock className="size-3.5 text-primary" /> Local-first processing
                </span>
                <span className="hidden h-3 w-px bg-border-strong sm:block" />
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> AI-powered analytics
                </span>
              </div>
            </FadeIn>
          </div>

          {/* right — dashboard preview + data-flow backdrop */}
          <FadeIn delay={0.2} className="relative">
            <div aria-hidden className="pointer-events-none absolute -inset-10 -z-10 opacity-70">
              <DataFlowBg className="size-full" />
            </div>
            <Tilt max={6}>
              <HeroDashboard />
            </Tilt>
          </FadeIn>
        </div>
      </section>

      {/* ===================== CREDIBILITY STRIP ===================== */}
      <section className="border-y border-border bg-background-2/60 px-5 py-6 sm:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 text-sm sm:grid-cols-3">
          {[
            { t: "Spreadsheets in, answers out", b: "Upload CSV or Excel — profiled and charted automatically." },
            { t: "Computed, not guessed", b: "Every figure is calculated with SQL; the AI only explains it." },
            { t: "Runs on your machine", b: "Data is processed locally in an in-process DuckDB engine." },
          ].map((c) => (
            <div key={c.t} className="flex items-start gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <div className="font-semibold text-foreground">{c.t}</div>
                <div className="mt-0.5 text-[0.82rem] text-muted-foreground">{c.b}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================== FEATURE EXPLORER ====================== */}
      <section id="features" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <FadeIn className="mb-12 max-w-2xl">
            <Eyebrow>
              <span className="size-1.5 rounded-full bg-primary" /> Capabilities
            </Eyebrow>
            <h2 className="text-3xl sm:text-[2.6rem]">Five ways to read your data</h2>
            <p className="mt-4 text-lg leading-relaxed text-secondary-foreground">
              One workspace, from first chart to final recommendation. Select a capability to see it in action.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <FeatureExplorer />
          </FadeIn>
        </div>
      </section>

      {/* ============== PRODUCT MORPH — pinned scroll scene ============== */}
      <div className="border-t border-border bg-background-2/50">
        <ScrollScene />
      </div>

      {/* ========================= THE LOOP ========================= */}
      <section id="loop" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <FadeIn className="mb-12 max-w-2xl">
            <Eyebrow>
              <span className="size-1.5 rounded-full bg-primary" /> The loop
            </Eyebrow>
            <h2 className="text-3xl sm:text-[2.6rem]">Four levels of intelligence</h2>
            <p className="mt-4 text-lg leading-relaxed text-secondary-foreground">
              InsightIQ moves with you up the ladder — from understanding what happened to deciding what to do next.
            </p>
          </FadeIn>
          <div className="border-t border-border">
            {LOOP.map((l, i) => {
              const Icon = l.icon;
              return (
                <FadeIn key={l.n} delay={i * 0.05}>
                  <div className="group grid grid-cols-[3rem_1fr] items-start gap-5 border-b border-border py-8 sm:grid-cols-[7rem_1fr] sm:gap-10 sm:py-10">
                    <div className="font-display text-4xl font-semibold leading-none text-border-strong transition-colors duration-500 group-hover:text-primary sm:text-[4.5rem]">
                      {l.n}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-[0.5rem] bg-[var(--accent-bg)] text-primary">
                          <Icon className="size-[1.05rem]" />
                        </span>
                        <h3 className="text-xl font-semibold sm:text-2xl">{l.t}</h3>
                      </div>
                      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">{l.b}</p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== PRIVACY / ARCHITECTURE ==================== */}
      <section className="border-t border-border bg-background-2/50 px-5 py-24 sm:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <FadeIn className="max-w-2xl">
            <Eyebrow>
              <span className="size-1.5 rounded-full bg-primary" /> Privacy &amp; architecture
            </Eyebrow>
            <h2 className="text-3xl sm:text-[2.4rem]">Your data is processed on your machine</h2>
            <p className="mt-4 text-lg leading-relaxed text-secondary-foreground">
              Files load into an in-process DuckDB engine and every number is computed locally with SQL. The AI step
              sees only compact, aggregated summaries — enough to phrase the explanation, never your raw rows.
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-10">
            <PrivacyArchitecture />
          </FadeIn>

          <FadeIn>
            <ul className="mt-10 grid gap-x-8 gap-y-3 border-t border-border pt-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                "In-process DuckDB — no external database",
                "CSV & Excel supported out of the box",
                "Figures computed locally and traceable to SQL",
                "AI used only to narrate, on aggregated inputs",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-secondary-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* ========================= FINAL CTA ========================= */}
      <section className="px-5 py-28 sm:px-8">
        <FadeIn>
          <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[calc(var(--radius)+0.6rem)] border border-border bg-card px-6 py-16 text-center shadow-[var(--shadow-lg)] sm:px-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-[0.45]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl sm:text-[2.7rem]">
                Ready to discover what your data is telling you?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-secondary-foreground">
                Bring your spreadsheets. Leave with meaningful insights.
              </p>
              <Magnetic strength={0.4} className="mt-8 inline-block">
                <Link
                  href="/app"
                  className="group inline-flex items-center gap-2 rounded-[0.55rem] bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)]"
                >
                  Launch InsightIQ
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ========================== FOOTER ========================== */}
      <footer className="border-t border-border px-5 py-12 sm:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="InsightIQ home">
              <span className="grid size-8 place-items-center rounded-[0.5rem] bg-primary text-primary-foreground">
                <span className="font-display text-sm font-bold">iQ</span>
              </span>
              <span className="font-display text-[1.1rem] font-semibold">
                Insight<span className="text-primary">IQ</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              An AI data intelligence workspace. Upload a spreadsheet, understand it, and decide what to do next.
            </p>
          </div>
          {[
            { h: "Product", links: [["Features", "#features"], ["How it works", "#how"], ["The loop", "#loop"], ["Launch app", "/app"]] },
            { h: "Capabilities", links: [["Dashboards", "#features"], ["Root cause", "#features"], ["Forecasting", "#features"], ["Q&A", "#features"]] },
            { h: "Technology", links: [["Local-first", "#"], ["DuckDB engine", "#"], ["Computed with SQL", "#"]] },
          ].map((col) => (
            <div key={col.h}>
              <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">{col.h}</div>
              <ul className="mt-3 space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-secondary-foreground transition-colors hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} InsightIQ. Processed locally, explained with AI.</span>
          <span className="font-mono tracking-wide">Built with Next.js · DuckDB · FastAPI</span>
        </div>
      </footer>
    </div>
  );
}
