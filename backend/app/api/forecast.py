"""Forecast endpoint: project a measure forward and flag past anomalies.

The model (trend + seasonality) is fit locally; only the computed forecast and
anomaly summary are sent to Groq for phrasing.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..ai import GroqClient
from ..db import Database
from ..insights import build_forecast
from ..models.schemas import ForecastReport
from ..storage import MetadataStore

router = APIRouter(prefix="/api/datasets", tags=["forecast"])


@router.get(
    "/{dataset_id}/forecast",
    response_model=ForecastReport,
    summary="Forecast a measure over time, with prediction intervals and anomalies",
)
async def forecast(
    request: Request,
    dataset_id: str,
    measure: str | None = None,
    horizon: int | None = None,
) -> ForecastReport:
    store: MetadataStore = request.app.state.store
    db: Database = request.app.state.db
    groq: GroqClient = request.app.state.groq

    dataset = store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    report = build_forecast(db, groq, dataset, measure=measure, horizon=horizon)
    return ForecastReport.model_validate(report)
