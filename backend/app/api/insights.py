"""Auto-insights endpoint: a narrative report volunteered from the data.

Numbers are computed locally; only aggregates are sent to Groq for phrasing.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..ai import GroqClient
from ..db import Database
from ..insights import build_insights
from ..models.schemas import InsightReport
from ..storage import MetadataStore

router = APIRouter(prefix="/api/datasets", tags=["insights"])


@router.get(
    "/{dataset_id}/insights",
    response_model=InsightReport,
    summary="Auto-generated narrative insights report",
)
async def get_insights(request: Request, dataset_id: str) -> InsightReport:
    store: MetadataStore = request.app.state.store
    db: Database = request.app.state.db
    groq: GroqClient = request.app.state.groq

    dataset = store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    report = build_insights(db, groq, dataset)
    return InsightReport.model_validate(report)
