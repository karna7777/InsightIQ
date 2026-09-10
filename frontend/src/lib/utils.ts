import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's class-name combiner: conditional classes + Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact number formatting for KPI values and axis ticks (1.2K, 3.4M). */
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 10000) return compact.format(value);
  return plain.format(value);
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 100000) return compact.format(value);
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatKpi(value: number | null | undefined, fmt: string): string {
  if (fmt === "integer") return formatInteger(value);
  if (fmt === "percent") return formatPercent(value);
  return formatNumber(value);
}

/** Humanize a raw column name for display: order_amount -> Order Amount. */
export function pretty(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Axis-label formatter for the x values, which may be ISO date strings
 * (time series) or plain category strings (bar charts).
 */
export function formatAxisLabel(value: unknown): string {
  if (typeof value === "string") {
    // ISO timestamp -> short date
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (m) return `${m[2]}/${m[3]}/${m[1].slice(2)}`;
    return value.length > 16 ? value.slice(0, 15) + "…" : value;
  }
  if (typeof value === "number") return formatNumber(value);
  return String(value ?? "");
}
