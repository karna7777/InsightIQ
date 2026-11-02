"use client";

import { useMemo, useState } from "react";
import { Calendar, Hash, Search, ToggleLeft, Type } from "lucide-react";
import { PageIntro } from "@/components/shell/page-intro";
import { Badge } from "@/components/ui/badge";
import { useDataset } from "@/lib/dataset-context";
import { cn, formatInteger, formatNumber, pretty } from "@/lib/utils";
import type { ColumnProfile } from "@/lib/types";

type Filter = "all" | "numeric" | "temporal" | "string";

const CAT_ICON = {
  numeric: Hash,
  temporal: Calendar,
  string: Type,
  boolean: ToggleLeft,
} as const;

export default function ExplorePage() {
  const { profile } = useDataset();
  const { roles } = profile;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  function roleOf(name: string): { label: string; tone: "accent" | "good" | "warn" | "muted" } | null {
    if (name === roles.primary_date) return { label: "date", tone: "accent" };
    if (name === roles.main_measure) return { label: "main measure", tone: "good" };
    if (roles.measures.includes(name)) return { label: "measure", tone: "good" };
    if (name === roles.primary_dimension) return { label: "key dimension", tone: "warn" };
    if (roles.dimensions.includes(name)) return { label: "dimension", tone: "warn" };
    return null;
  }

  const rows = profile.row_count || 1;
  const columns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profile.columns.filter((c) => {
      const cat = c.category === "boolean" ? "string" : c.category;
      if (filter !== "all" && cat !== filter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [profile.columns, query, filter]);

  const counts = useMemo(() => {
    const c = { numeric: 0, temporal: 0, string: 0 };
    for (const col of profile.columns) {
      if (col.category === "numeric") c.numeric += 1;
      else if (col.category === "temporal") c.temporal += 1;
      else c.string += 1;
    }
    return c;
  }, [profile.columns]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <PageIntro
        eyebrow="Explore"
        title="Data explorer"
        lead="The schema InsightIQ inferred — column types, semantic roles, missing values and per-column distributions."
      />

      {/* summary stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Rows" value={formatInteger(profile.row_count)} />
        <MiniStat label="Columns" value={String(profile.columns.length)} />
        <MiniStat label="Measures" value={String(roles.measures.length)} accent="var(--sem-good)" />
        <MiniStat label="Dimensions" value={String(roles.dimensions.length)} accent="var(--sem-warn)" />
      </div>

      {/* controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search columns…"
            className="h-9 w-full rounded-full border border-border bg-card/60 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ["all", `All ${profile.columns.length}`],
              ["numeric", `Numeric ${counts.numeric}`],
              ["temporal", `Date ${counts.temporal}`],
              ["string", `Text ${counts.string}`],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "border-primary/60 bg-primary/12 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* schema table */}
      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Column</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 text-right font-semibold">Missing</th>
                <th className="px-4 py-3 text-right font-semibold">Distinct</th>
                <th className="px-4 py-3 font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((c) => {
                const Icon = CAT_ICON[c.category] ?? Type;
                const nullPct = (c.null_count / rows) * 100;
                const role = roleOf(c.name);
                return (
                  <tr
                    key={c.name}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-foreground/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{pretty(c.name)}</span>
                      </div>
                      <div className="mt-0.5 pl-[1.375rem] font-mono text-[0.68rem] text-muted-foreground">{c.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{c.type}</span>
                      {c.category === "numeric" && c.aggregation && (
                        <span className="ml-2 text-[0.68rem] text-muted-foreground">({c.aggregation})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {role ? <Badge tone={role.tone}>{role.label}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <NullMeter pct={nullPct} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-secondary-foreground">
                      {c.distinct_count != null ? formatInteger(c.distinct_count) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <ColumnSummary col={c} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {columns.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">No columns match.</p>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card/50 px-4 py-3">
      <div className="text-[0.66rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

function NullMeter({ pct }: { pct: number }) {
  const tone = pct >= 15 ? "var(--sem-crit)" : pct > 0 ? "var(--sem-warn)" : "var(--sem-good)";
  return (
    <div className="inline-flex items-center gap-2">
      <span className="tabular-nums" style={{ color: pct > 0 ? tone : "var(--muted-foreground)" }}>
        {pct === 0 ? "0%" : `${pct.toFixed(pct < 1 ? 1 : 0)}%`}
      </span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-foreground/10">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: tone }} />
      </span>
    </div>
  );
}

function ColumnSummary({ col }: { col: ColumnProfile }) {
  if (col.category === "numeric" && col.stats) {
    const s = col.stats as Record<string, number | null>;
    return (
      <span className="font-mono">
        min {formatNumber(s.min)} · avg {formatNumber(s.mean)} · max {formatNumber(s.max)}
      </span>
    );
  }
  if (col.category === "temporal" && col.stats) {
    const s = col.stats as Record<string, string | null>;
    return (
      <span className="font-mono">
        {String(s.min ?? "").slice(0, 10)} → {String(s.max ?? "").slice(0, 10)}
      </span>
    );
  }
  if (col.top_values?.length) {
    return (
      <span className="flex flex-wrap gap-1">
        {col.top_values.slice(0, 3).map((t, i) => (
          <span key={i} className="rounded bg-foreground/8 px-1.5 py-0.5 text-[0.68rem]">
            {t.value} <span className="text-muted-foreground tabular-nums">{formatInteger(t.count)}</span>
          </span>
        ))}
      </span>
    );
  }
  return <span>—</span>;
}
