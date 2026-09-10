"""Investigation endpoint: "why did this metric change?"

Decomposes the change in an additive measure between the two most recent periods
into per-segment contributions, ranks the drivers, and drills into the biggest.
Numbers are computed locally; only the computed decomposition is sent to Groq to
phrase the explanation.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..ai import GroqClient
from ..db import Database
from ..insights import build_investigation
from ..models.schemas import InvestigationReport
from ..storage import MetadataStore

router = APIRouter(prefix="/api/datasets", tags=["investigation"])


@router.get(
    "/{dataset_id}/investigate",
    response_model=InvestigationReport,
    summary="Explain why a measure changed (contribution analysis)",
)
async def investigate(
    request: Request, dataset_id: str, measure: str | None = None
) -> InvestigationReport:
    store: MetadataStore = request.app.state.store
    db: Database = request.app.state.db
    groq: GroqClient = request.app.state.groq

    dataset = store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    report = build_investigation(db, groq, dataset, measure=measure)
    return InvestigationReport.model_validate(report)
