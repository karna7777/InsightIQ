"""Decision Copilot endpoint: "what should I do?"

Recommendations are derived from computed evidence (candidate findings +
data-quality facts), each with an impact and confidence grade. Only the computed
recommendation stubs are sent to Groq to sharpen the wording.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..ai import GroqClient
from ..db import Database
from ..insights import build_decisions
from ..models.schemas import DecisionReport
from ..storage import MetadataStore

router = APIRouter(prefix="/api/datasets", tags=["decisions"])


@router.get(
    "/{dataset_id}/recommendations",
    response_model=DecisionReport,
    summary="Recommended actions, ranked by impact x confidence",
)
async def recommendations(request: Request, dataset_id: str) -> DecisionReport:
    store: MetadataStore = request.app.state.store
    db: Database = request.app.state.db
    groq: GroqClient = request.app.state.groq

    dataset = store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    report = build_decisions(db, groq, dataset)
    return DecisionReport.model_validate(report)
