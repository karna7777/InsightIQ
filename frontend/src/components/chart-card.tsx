"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAxisLabel, formatNumber } from "@/lib/utils";
import type { ChartSpec } from "@/lib/types";

const DEFAULT_HEIGHT = 260;

// Chart colors are read from CSS variables so they re-theme with light/dark
// automatically (see globals.css --viz-*).
const SERIES = "var(--viz-series)";
const GRID = "var(--viz-grid)";
const AXIS = "var(--viz-axis)";
const MUTED = "var(--viz-muted)";

const axisTick = { fill: MUTED, fontSize: 11 };

export function ChartCard({
  chart,
  bare = false,
  height = DEFAULT_HEIGHT,
}: {
  chart: ChartSpec;
  bare?: boolean;
  height?: number;
}) {
  // Render only after mount: Recharts measures the DOM, so we skip the SSR pass
  // (avoids width(0) warnings and hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // `bare`: no Card wrapper, for embedding inside another card (e.g. a finding)
  // or as a hero chart on a Story Mode slide (with a taller `height`).
  if (bare) {
    return (
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">{chart.title}</div>
        <div style={{ width: "100%", height }}>
          {mounted && <ChartBody chart={chart} />}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chart.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height }}>
          {mounted && <ChartBody chart={chart} />}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartBody({ chart }: { chart: ChartSpec }) {
  if (chart.type === "table") return <TableChart chart={chart} />;
  if (chart.type === "scatter") return <ScatterPlot chart={chart} />;
  if (chart.type === "bar") return <BarPlot chart={chart} />;
  return <LinePlot chart={chart} />;
}

// --- tooltip -------------------------------------------------------------

interface TooltipProps {
  active?: boolean;
  payload?: { payload: Record<string, unknown> }[];
  xLabel?: string | null;
  yLabel?: string | null;
}

function VizTooltip({ active, payload, xLabel, yLabel }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">
        {xLabel || "x"}:{" "}
        <span className="text-foreground">{formatAxisLabel(row.x)}</span>
      </div>
      <div className="text-muted-foreground">
        {yLabel || "y"}:{" "}
        <span className="font-medium text-foreground tabular-nums">
          {formatNumber(row.y as number)}
        </span>
      </div>
    </div>
  );
}

// --- charts --------------------------------------------------------------

function LinePlot({ chart }: { chart: ChartSpec }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chart.data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="x"
          tick={axisTick}
          tickFormatter={formatAxisLabel}
          axisLine={{ stroke: AXIS }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={axisTick}
          tickFormatter={(v) => formatNumber(v as number)}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: AXIS, strokeWidth: 1 }}
          content={<VizTooltip xLabel={chart.x_label} yLabel={chart.y_label} />}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke={SERIES}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarPlot({ chart }: { chart: ChartSpec }) {
  const many = chart.data.length > 6;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chart.data}
        margin={{ top: 8, right: 16, bottom: many ? 28 : 4, left: 4 }}
        barCategoryGap="22%"
      >
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="x"
          tick={axisTick}
          tickFormatter={formatAxisLabel}
          axisLine={{ stroke: AXIS }}
          tickLine={false}
          interval={0}
          angle={many ? -25 : 0}
          textAnchor={many ? "end" : "middle"}
          height={many ? 48 : 24}
        />
        <YAxis
          tick={axisTick}
          tickFormatter={(v) => formatNumber(v as number)}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }}
          content={<VizTooltip xLabel={chart.x_label} yLabel={chart.y_label} />}
        />
        <Bar dataKey="y" fill={SERIES} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ScatterPlot({ chart }: { chart: ChartSpec }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis
          type="number"
          dataKey="x"
          name={chart.x_label ?? "x"}
          tick={axisTick}
          tickFormatter={(v) => formatNumber(v as number)}
          axisLine={{ stroke: AXIS }}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={chart.y_label ?? "y"}
          tick={axisTick}
          tickFormatter={(v) => formatNumber(v as number)}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: AXIS, strokeWidth: 1 }}
          content={<VizTooltip xLabel={chart.x_label} yLabel={chart.y_label} />}
        />
        <Scatter data={chart.data} fill={SERIES} fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function TableChart({ chart }: { chart: ChartSpec }) {
  const cols = chart.data.length ? Object.keys(chart.data[0]) : [];
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            {cols.map((c) => (
              <th key={c} className="px-2 py-1.5 font-medium text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.data.map((row, i) => (
            <tr key={i} className="border-b border-border/60">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1.5 tabular-nums">
                  {formatAxisLabel(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
