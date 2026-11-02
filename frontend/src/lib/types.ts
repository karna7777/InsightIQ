// TypeScript mirrors of the backend Pydantic response models
// (backend/app/models/schemas.py). Kept in sync by hand for step 2.

export interface ColumnProfile {
  name: string;
  type: string;
  category: "numeric" | "temporal" | "string" | "boolean";
  null_count: number;
  distinct_count?: number | null;
  stats?: Record<string, unknown> | null;
  top_values?: { value: string; count: number }[] | null;
  aggregation?: "additive" | "bounded" | null; // numeric only
}

export interface Roles {
  primary_date?: string | null;
  measures: string[];
  dimensions: string[];
  main_measure?: string | null;
  primary_dimension?: string | null;
}

export interface Profile {
  row_count: number;
  columns: ColumnProfile[];
  roles: Roles;
}

export interface CoercionEntry {
  column?: string | null;
  action: string; // coerced | dropped_rows | recovered
  from_type?: string | null;
  to_type?: string | null;
  note: string;
}

export interface IngestReport {
  entries: CoercionEntry[];
}

export interface UploadResponse {
  dataset_id: string;
  filename: string;
  row_count: number;
  profile: Profile;
  ingest_report: IngestReport;
}

export interface DatasetSummary {
  id: string;
  filename: string;
  row_count: number;
  uploaded_at: string;
}

export interface KpiCard {
  label: string;
  value: number | null;
  format: string; // integer | number
}

export type ChartType = "line" | "bar" | "scatter" | "table" | "kpi";

export interface ChartSpec {
  id: string;
  type: ChartType;
  title: string;
  x_key?: string | null;
  y_key?: string | null;
  x_label?: string | null;
  y_label?: string | null;
  data: Record<string, unknown>[];
}

export interface Dashboard {
  dataset_id: string;
  kpis: KpiCard[];
  charts: ChartSpec[];
}

export interface InsightFinding {
  statement: string;
  metric: KpiCard;
  chart?: ChartSpec | null;
  kind: string;
}

export interface InsightReport {
  dataset_id: string;
  overview: string;
  overview_facts: Record<string, unknown>;
  findings: InsightFinding[];
  what_it_indicates: string;
  caveats: string[];
  model?: string | null;
}

export interface ChatResponse {
  question: string;
  sql?: string | null;
  reasoning?: string | null;
  columns_used?: string[];
  model?: string | null;
  row_count?: number | null;
  chart?: ChartSpec | null;
  kpi?: KpiCard | null;
  takeaway?: string | null;
  error?: string | null;
}

// --- investigation ("why did it change?") — mirrors backend schemas ------

export interface InvestigationDriver {
  dimension: string;
  segment: string;
  previous?: number | null;
  latest?: number | null;
  contribution?: number | null; // latest - previous for the segment
  contribution_pct?: number | null; // share of the change it rolls into
  delta_pct?: number | null; // the segment's own % change
  children: InvestigationDriver[];
}

export interface DimensionBreakdown {
  dimension: string;
  drivers: InvestigationDriver[];
  gross?: number | null;
  offsetting: boolean;
}

export interface OffsettingDetail {
  dimension: string;
  top_gain: { segment: string; contribution: number };
  top_loss: { segment: string; contribution: number };
}

export interface InvestigationReport {
  dataset_id: string;
  available: boolean;
  reason?: string | null;
  measure?: string | null;
  grain?: string | null;
  previous_period?: string | null;
  latest_period?: string | null;
  total_previous?: number | null;
  total_latest?: number | null;
  total_delta?: number | null;
  total_delta_pct?: number | null;
  direction?: "up" | "down" | "flat" | null;
  offsetting: boolean;
  offsetting_detail?: OffsettingDetail | null;
  breakdowns: DimensionBreakdown[];
  primary_driver?: InvestigationDriver | null;
  narrative?: string | null;
  model?: string | null;
}

// --- forecast + anomaly -------------------------------------------------

export interface HistoryPoint {
  period: string;
  value?: number | null;
  expected?: number | null;
  anomaly: boolean;
}

export interface ForecastPoint {
  period: string;
  value?: number | null;
  lower?: number | null;
  upper?: number | null;
}

export interface ForecastReport {
  dataset_id: string;
  available: boolean;
  reason?: string | null;
  measure?: string | null;
  grain?: string | null;
  method?: string | null;
  seasonal: boolean;
  horizon?: number | null;
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  anomaly_count: number;
  narrative?: string | null;
  model?: string | null;
}

// --- decision copilot ---------------------------------------------------

export type Grade = "high" | "medium" | "low";

export interface Recommendation {
  kind: string;
  title: string;
  rationale: string;
  evidence: KpiCard;
  impact: Grade;
  confidence: Grade;
}

export interface DecisionReport {
  dataset_id: string;
  available: boolean;
  reason?: string | null;
  summary?: string | null;
  recommendations: Recommendation[];
  model?: string | null;
}
