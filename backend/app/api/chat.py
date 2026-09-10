"""Chat endpoint: question -> SQL -> validate -> execute -> chart + takeaway.

The generated SQL is ALWAYS returned to the client (even on failure) — showing
it is a product feature, not a debug aid. The validation chain is the security
boundary for the untrusted, model-written SQL.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request

from ..ai import GroqClient, GroqError
from ..ai.takeaway import phrase_takeaway
from ..ai.text_to_sql import generate_sql
from ..config import get_settings
from ..db import Database
from ..models.schemas import ChartSpec, ChatRequest, ChatResponse, KpiCard
from ..query import execute_query, select_result_chart, summarize_result
from ..sql import SQLValidationError, validate_and_prepare
from ..storage import MetadataStore

router = APIRouter(prefix="/api/datasets", tags=["chat"])

_MAX_ATTEMPTS = 2  # one initial try + one retry with the error fed back


@router.post("/{dataset_id}/chat", response_model=ChatResponse, summary="Ask a question")
async def ask(request: Request, dataset_id: str, body: ChatRequest) -> ChatResponse:
    store: MetadataStore = request.app.state.store
    db: Database = request.app.state.db
    groq: GroqClient = request.app.state.groq

    dataset = store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty.")

    return _run(db, store, groq, dataset, question)


def _run(db, store, groq, dataset, question: str) -> ChatResponse:
    profile = dataset.profile
    table = dataset.table_name
    allowed = {table}
    cursor = db.cursor()
    row_limit = get_settings().query_row_limit

    prior_error: str | None = None
    for attempt in range(_MAX_ATTEMPTS):
        # 1. generate
        try:
            gen = generate_sql(groq, profile, table, question, prior_error)
        except GroqError as exc:
            return ChatResponse(question=question, error=f"AI request failed: {exc}")

        sql = gen["sql"]
        base = dict(
            question=question,
            sql=sql,
            reasoning=gen["reasoning"] or None,
            columns_used=gen["columns_used"],
            model=gen["model"],
        )

        # 2. validate (retry once on a retryable stage: bad column or bind error)
        try:
            prepared = validate_and_prepare(
                sql, profile, allowed, gen["columns_used"], cursor, row_limit
            )
        except SQLValidationError as exc:
            if exc.retryable and attempt + 1 < _MAX_ATTEMPTS:
                prior_error = str(exc)
                continue
            return ChatResponse(**base, error=str(exc))

        # 3. execute
        try:
            names, cats, rows = execute_query(cursor, prepared)
        except Exception as exc:  # noqa: BLE001
            return ChatResponse(**{**base, "sql": prepared}, error=f"Execution failed: {exc}")

        # 4. chart (deterministic) + 5. takeaway (LLM phrases the numbers)
        chart, kpi = select_result_chart(names, cats, rows)
        summary = summarize_result(question, names, rows, chart, kpi)
        takeaway = phrase_takeaway(groq, summary)
        chart_type = "kpi" if kpi else (chart["type"] if chart else "table")

        store.add_chat(uuid.uuid4().hex[:12], dataset.id, question, prepared, chart_type)

        return ChatResponse(
            **{**base, "sql": prepared},
            row_count=len(rows),
            chart=ChartSpec.model_validate(chart) if chart else None,
            kpi=KpiCard.model_validate(kpi) if kpi else None,
            takeaway=takeaway,
        )

    # Loop always returns inside; this is unreachable.
    return ChatResponse(question=question, error="Could not produce a valid query.")
