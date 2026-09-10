"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisLabel, formatNumber } from "@/lib/utils";
import type { ForecastReport } from "@/lib/types";

const SERIES = "var(--viz-series)";
const FORECAST = "var(--viz-forecast)";
const BAND = "var(--viz-band)";
const GRID = "var(--viz-grid)";
const AXIS = "var(--viz-axis)";
const MUTED = "var(--viz-muted)";
const CRIT = "var(--sem-crit)";

const axisTick = { fill: MUTED, fontSize: 11 };

interface Row {
  x: string;
  actual?: number | null;
  anomaly?: boolean;
  forecast?: number | null;
  ciBase?: number | null; // lower bound (invisible area base)
  ciSpan?: number | null; // upper - lower (visible band stacked on base)
}

function buildRows(report: ForecastReport): Row[] {
  const history: Row[] = report.history.map((h) => ({
    x: h.period,
    actual: h.value ?? null,
    anomaly: h.anomaly,
  }));
  // Bridge: the last actual point seeds the forecast line and band (zero width)
  // so both connect continuously to history instead of floating.
  if (history.length) {
    const last = history[history.length - 1];
    last.forecast = last.actual ?? null;
    last.ciBase = last.actual ?? null;
    last.ciSpan = 0;
  }
  const future: Row[] = report.forecast.map((f) => ({
    x: f.period,
    forecast: f.value ?? null,
    ciBase: f.lower ?? null,
    ciSpan:
      f.upper != null && f.lower != null ? Math.max(0, f.upper - f.lower) : null,
  }));
  return [...history, ...future];
}

export function ForecastChart({
  report,
  height = 300,
}: {
  report: ForecastReport;
  height?: number;
}) {
  const rows = buildRows(report);

  return (
    <div>
      <Legend />
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
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
                content={<ForecastTooltip />}
              />
              {/* confidence band = invisible base (lower) + visible span (upper-lower) */}
              <Area
                dataKey="ciBase"
                stackId="ci"
                stroke="none"
                fill="none"
                isAnimationActive={false}
                connectNulls
              />
              <Area
                dataKey="ciSpan"
                stackId="ci"
                stroke="none"
                fill={BAND}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={SERIES}
                strokeWidth={2}
                dot={renderAnomalyDot}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={FORECAST}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Draw a dot only on anomalous history points.
function renderAnomalyDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: Row;
}) {
  const { cx, cy, index, payload } = props;
  if (!payload?.anomaly || cx == null || cy == null) {
    return <g key={`nd-${index}`} />;
  }
  return (
    <circle
      key={`ad-${index}`}
      cx={cx}
      cy={cy}
      r={4.5}
      fill={CRIT}
      stroke="var(--card)"
      strokeWidth={1.5}
    />
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: Row }[];
}

function ForecastTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const isForecast = row.forecast != null && row.actual == null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{formatAxisLabel(row.x)}</div>
      {row.actual != null && (
        <div className="text-muted-foreground">
          Actual:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatNumber(row.actual)}
          </span>
          {row.anomaly && <span className="ml-1 text-[var(--sem-crit)]">anomaly</span>}
        </div>
      )}
      {isForecast && (
        <>
          <div className="text-muted-foreground">
            Forecast:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatNumber(row.forecast)}
            </span>
          </div>
          {row.ciBase != null && row.ciSpan != null && (
            <div className="text-muted-foreground tabular-nums">
              Range: {formatNumber(row.ciBase)} – {formatNumber(row.ciBase + row.ciSpan)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4" style={{ background: SERIES }} /> Actual
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t-2 border-dashed" style={{ borderColor: FORECAST }} />
        Forecast
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm" style={{ background: BAND }} /> 95% range
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: CRIT }} /> Anomaly
      </span>
    </div>
  );
}
