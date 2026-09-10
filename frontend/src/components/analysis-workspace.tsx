"use client";

import { useMemo, useState } from "react";
import {
  Lightbulb,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { ForecastPanel } from "@/components/forecast-panel";
import { InsightsPanel } from "@/components/insights-panel";
import { InvestigationPanel } from "@/components/investigation-panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type TabKey = "insights" | "why" | "forecast" | "decide" | "ask";

// The intelligence loop, in order. "Ask" is an auxiliary tool, not a loop step,
// so it carries no step number.
const TABS: { key: TabKey; label: string; step?: number; icon: typeof Sparkles }[] = [
  { key: "insights", label: "What happened", step: 1, icon: Sparkles },
  { key: "why", label: "Why", step: 2, icon: Search },
  { key: "forecast", label: "What's next", step: 3, icon: TrendingUp },
  { key: "decide", label: "What to do", step: 4, icon: Lightbulb },
  { key: "ask", label: "Ask", icon: MessageSquare },
];

/**
 * Analytics Mode's cohesive intelligence workspace. One surface, five tabs that
 * mirror the product loop — Explain → Investigate → Predict → Decide (+ Ask).
 * Each panel lazily loads its endpoint on first visit and stays mounted so its
 * fetched state survives tab switches; guided cross-links move the user forward.
 */
export function AnalysisWorkspace({
  datasetId,
  profile,
}: {
  datasetId: string;
  profile: Profile;
}) {
  const [tab, setTab] = useState<TabKey>("insights");
  const [visited, setVisited] = useState<Set<TabKey>>(new Set(["insights"]));

  function go(next: TabKey) {
    setTab(next);
    setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
  }

  const { additiveMeasures, allMeasures } = useMemo(() => {
    const byName = new Map(profile.columns.map((c) => [c.name, c]));
    return {
      additiveMeasures: profile.roles.measures.filter(
        (m) => byName.get(m)?.aggregation === "additive",
      ),
      allMeasures: profile.roles.measures,
    };
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* tab bar */}
      <div
        role="tablist"
        aria-label="Analysis"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => go(t.key)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.step != null && (
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[0.6rem] font-semibold tabular-nums",
                    active ? "bg-primary text-primary-foreground" : "bg-foreground/10",
                  )}
                >
                  {t.step}
                </span>
              )}
              <Icon className="size-4" />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* panels — mounted once visited, hidden (not unmounted) when inactive */}
      <Pane active={tab === "insights"} visited={visited.has("insights")}>
        <InsightsPanel datasetId={datasetId} onInvestigate={() => go("why")} />
      </Pane>
      <Pane active={tab === "why"} visited={visited.has("why")}>
        <InvestigationPanel
          datasetId={datasetId}
          measures={additiveMeasures}
          onNext={() => go("forecast")}
        />
      </Pane>
      <Pane active={tab === "forecast"} visited={visited.has("forecast")}>
        <ForecastPanel
          datasetId={datasetId}
          measures={allMeasures}
          onNext={() => go("decide")}
        />
      </Pane>
      <Pane active={tab === "decide"} visited={visited.has("decide")}>
        <RecommendationsPanel datasetId={datasetId} />
      </Pane>
      <Pane active={tab === "ask"} visited={visited.has("ask")}>
        <ChatPanel datasetId={datasetId} />
      </Pane>
    </div>
  );
}

function Pane({
  active,
  visited,
  children,
}: {
  active: boolean;
  visited: boolean;
  children: React.ReactNode;
}) {
  if (!visited) return null;
  return <div className={active ? "" : "hidden"}>{children}</div>;
}
