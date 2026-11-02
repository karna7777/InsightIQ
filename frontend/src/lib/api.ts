import type {
  ChatResponse,
  Dashboard,
  DatasetSummary,
  DecisionReport,
  ForecastReport,
  InsightReport,
  InvestigationReport,
  Profile,
  UploadResponse,
} from "./types";

// Backend base URL. Configurable so nothing is hardcoded; defaults to the
// local FastAPI server from step 1.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://127.0.0.1:8000";

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    return JSON.stringify(body);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

/** Upload a CSV/Excel file; returns the dataset id, profile, and ingest report. */
export async function uploadDataset(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/datasets/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** List every uploaded dataset (most recent first). */
export async function listDatasets(): Promise<DatasetSummary[]> {
  const res = await fetch(`${API_BASE}/api/datasets`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Fetch a dataset's schema profile (columns, roles, stats). */
export async function getProfile(datasetId: string): Promise<Profile> {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Fetch the auto-generated dashboard (KPIs + charts) for a dataset. */
export async function getDashboard(datasetId: string): Promise<Dashboard> {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/dashboard`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Fetch the auto-generated narrative insights report for a dataset. */
export async function getInsights(datasetId: string): Promise<InsightReport> {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/insights`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Explain why a measure changed: contribution decomposition + drivers. */
export async function getInvestigation(
  datasetId: string,
  measure?: string,
): Promise<InvestigationReport> {
  const q = measure ? `?measure=${encodeURIComponent(measure)}` : "";
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/investigate${q}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Forecast a measure forward with prediction intervals + past anomalies. */
export async function getForecast(
  datasetId: string,
  measure?: string,
  horizon?: number,
): Promise<ForecastReport> {
  const params = new URLSearchParams();
  if (measure) params.set("measure", measure);
  if (horizon) params.set("horizon", String(horizon));
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/datasets/${datasetId}/forecast${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Recommended actions, ranked by impact x confidence, each with evidence. */
export async function getRecommendations(datasetId: string): Promise<DecisionReport> {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/recommendations`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Ask a plain-English question; returns SQL + chart + takeaway (or an error). */
export async function askQuestion(
  datasetId: string,
  question: string,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
