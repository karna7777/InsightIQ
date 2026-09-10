"""Ask Groq to turn a question into a single DuckDB SELECT (as JSON)."""

from __future__ import annotations

from typing import Any

from .groq_client import GroqClient
from .prompts import build_sql_system_prompt, build_sql_user_prompt


def generate_sql(
    groq: GroqClient,
    profile: dict[str, Any],
    table_name: str,
    question: str,
    prior_error: str | None = None,
) -> dict[str, Any]:
    """Return {sql, reasoning, columns_used, model}."""
    system = build_sql_system_prompt(profile, table_name)
    user = build_sql_user_prompt(question, prior_error)
    data, model = groq.complete_json(system, user, max_tokens=800)

    columns = data.get("columns_used") or []
    if not isinstance(columns, list):
        columns = []
    return {
        "sql": str(data.get("sql", "")).strip(),
        "reasoning": str(data.get("reasoning", "")).strip(),
        "columns_used": [str(c) for c in columns],
        "model": model,
    }
