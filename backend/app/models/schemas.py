"""API response models. These give FastAPI's /docs real, readable schemas.

Nested numeric/stat structures vary by column type, so a few fields are typed
loosely (dict / Any) on purpose — the envelope is what matters for the client.
"""

from __future__ import annotations

from typing import Any, Optional, Union

from pydantic import BaseModel


# --- profile -------------------------------------------------------------


class ColumnProfile(BaseModel):
    name: str
    type: str
    category: str  # numeric | temporal | string | boolean
    null_count: int
    distinct_count: Optional[int] = None
    stats: Optional[dict[str, Any]] = None
    top_values: Optional[list[dict[str, Any]]] = None
    aggregation: Optional[str] = None  # numeric only: "additive" | "bounded"


class Roles(BaseModel):
    primary_date: Optional[str] = None
    measures: list[str] = []
    dimensions: list[str] = []
    main_measure: Optional[str] = None
    primary_dimension: Optional[str] = None


class Profile(BaseModel):
    row_count: int
    columns: list[ColumnProfile]
    roles: Roles


# --- ingest report -------------------------------------------------------


class CoercionEntry(BaseModel):
    column: Optional[str] = None
    action: str  # coerced | dropped_rows | recovered
    from_type: Optional[str] = None
    to_type: Optional[str] = None
    note: str


class IngestReport(BaseModel):
    entries: list[CoercionEntry] = []


# --- upload / datasets ---------------------------------------------------


class UploadResponse(BaseModel):
    dataset_id: str
    filename: str
    row_count: int
    profile: Profile
    ingest_report: IngestReport


class DatasetSummary(BaseModel):
    id: str
    filename: str
    row_count: int
    uploaded_at: str


# --- dashboard -----------------------------------------------------------


class KpiCard(BaseModel):
    label: str
    value: Optional[Union[int, float]] = None
    format: str  # integer | number


class ChartSpec(BaseModel):
    id: str
    type: str  # line | bar | scatter | table | kpi
    title: str
    x_key: Optional[str] = None
    y_key: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    data: list[dict[str, Any]] = []


class Dashboard(BaseModel):
    dataset_id: str
    kpis: list[KpiCard]
    charts: list[ChartSpec]


# --- chat (step 3) -------------------------------------------------------


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    question: str
    # The generated SQL is always returned and displayed — transparency is a
    # product feature. Present even when the query ultimately failed.
    sql: Optional[str] = None
    reasoning: Optional[str] = None
    columns_used: list[str] = []
    model: Optional[str] = None
    row_count: Optional[int] = None
    chart: Optional[ChartSpec] = None
    kpi: Optional[KpiCard] = None
    takeaway: Optional[str] = None
    # Set when the pipeline could not answer; the UI shows this alongside `sql`.
    error: Optional[str] = None


# --- auto-insights (step 4) ---------------------------------------------


class InsightFinding(BaseModel):
    statement: str
    metric: KpiCard
    chart: Optional[ChartSpec] = None
    kind: str


class InsightReport(BaseModel):
    dataset_id: str
    overview: str
    overview_facts: dict[str, Any]
    findings: list[InsightFinding]
    what_it_indicates: str
    caveats: list[str]
    model: Optional[str] = None


# --- investigation ("why did it change?") -------------------------------


class InvestigationDriver(BaseModel):
    dimension: str
    segment: str
    previous: Optional[float] = None
    latest: Optional[float] = None
    contribution: Optional[float] = None       # latest - previous for the segment
    contribution_pct: Optional[float] = None   # share of the change it rolls into
    delta_pct: Optional[float] = None          # the segment's own % change
    children: list["InvestigationDriver"] = []


class DimensionBreakdown(BaseModel):
    dimension: str
    drivers: list[InvestigationDriver]
    gross: Optional[float] = None       # sum of |contributions| across all segments
    offsetting: bool = False            # gross >> net: opposing swings cancel out


class InvestigationReport(BaseModel):
    dataset_id: str
    available: bool
    reason: Optional[str] = None  # why not available, when available is False
    measure: Optional[str] = None
    grain: Optional[str] = None
    previous_period: Optional[str] = None
    latest_period: Optional[str] = None
    total_previous: Optional[float] = None
    total_latest: Optional[float] = None
    total_delta: Optional[float] = None
    total_delta_pct: Optional[float] = None
    direction: Optional[str] = None  # up | down | flat
    offsetting: bool = False  # net change hides large opposing movements
    offsetting_detail: Optional[dict[str, Any]] = None  # {dimension, top_gain, top_loss}
    breakdowns: list[DimensionBreakdown] = []
    primary_driver: Optional[InvestigationDriver] = None
    narrative: Optional[str] = None
    model: Optional[str] = None


# --- forecast + anomaly (Level 3: Predict) ------------------------------


class HistoryPoint(BaseModel):
    period: str
    value: Optional[float] = None
    expected: Optional[float] = None  # the model's fitted value
    anomaly: bool = False


class ForecastPoint(BaseModel):
    period: str
    value: Optional[float] = None
    lower: Optional[float] = None  # prediction-interval bounds (~95%)
    upper: Optional[float] = None


class ForecastReport(BaseModel):
    dataset_id: str
    available: bool
    reason: Optional[str] = None
    measure: Optional[str] = None
    grain: Optional[str] = None
    method: Optional[str] = None  # e.g. "linear trend + yearly seasonality"
    seasonal: bool = False
    horizon: Optional[int] = None
    history: list[HistoryPoint] = []
    forecast: list[ForecastPoint] = []
    anomaly_count: int = 0
    narrative: Optional[str] = None
    model: Optional[str] = None


# --- decision copilot (Level 4: Decide) ---------------------------------


class Recommendation(BaseModel):
    kind: str
    title: str
    rationale: str
    evidence: KpiCard          # the computed number the recommendation rests on
    impact: str                # high | medium | low
    confidence: str            # high | medium | low


class DecisionReport(BaseModel):
    dataset_id: str
    available: bool
    reason: Optional[str] = None
    summary: Optional[str] = None
    recommendations: list[Recommendation] = []
    model: Optional[str] = None
