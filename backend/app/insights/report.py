"""Assemble the auto-insights narrative report.

Numbers are computed in Python (overview facts, ranked candidate findings,
caveat signals). Groq is asked only to phrase prose around those numbers. If
the AI call fails, deterministic fallback prose keeps the report working.
"""

from __future__ import annotations

from typing import Any

from ..ai import GroqClient, GroqError
from ..ai.prompts import INSIGHTS_SYSTEM, build_insights_user_prompt
from ..util import jdate, quote_ident, span_days
from .candidates import build_candidates


def build_insights(db, groq: GroqClient, dataset) -> dict[str, Any]:
    con = db.cursor()
    t = quote_ident(dataset.table_name)
    profile = dataset.profile

    overview_facts = _overview_facts(con, t, profile, dataset.filename)
    caveat_notes = _caveat_notes(profile)
    candidates = build_candidates(con, t, profile)

    payload = {
        "overview": overview_facts,
        "findings": [
            {"index": i, "description": c.description, "numbers": c.facts}
            for i, c in enumerate(candidates)
        ],
        "caveat_notes": caveat_notes,
    }

    prose, model = _phrase(groq, payload, candidates, caveat_notes)

    findings = []
    for i, c in enumerate(candidates):
        statement = c.description
        if i < len(prose.get("findings", [])):
            statement = prose["findings"][i].get("statement") or c.description
        findings.append(
            {"statement": statement, "metric": c.metric, "chart": c.chart, "kind": c.kind}
        )

    return {
        "dataset_id": dataset.id,
        "overview": prose.get("overview") or _fallback_overview(overview_facts),
        "overview_facts": overview_facts,
        "findings": findings,
        "what_it_indicates": prose.get("what_it_indicates")
        or "Taken together, the findings above summarize the strongest patterns in this data.",
        "caveats": prose.get("caveats") or caveat_notes,
        "model": model,
    }


# --- facts ---------------------------------------------------------------


def _overview_facts(con, t, profile, filename) -> dict[str, Any]:
    roles = profile.get("roles", {})
    by = {c["name"]: c for c in profile.get("columns", [])}
    row_count = profile.get("row_count", 0)

    facts: dict[str, Any] = {
        "filename": filename,
        "row_count": row_count,
        "column_count": len(profile.get("columns", [])),
    }

    date_col = roles.get("primary_date")
    if date_col:
        dq = quote_ident(date_col)
        lo, hi = con.execute(f"SELECT MIN({dq}), MAX({dq}) FROM {t}").fetchone()
        facts["time_period"] = {
            "column": date_col,
            "start": jdate(lo),
            "end": jdate(hi),
            "span_days": span_days(lo, hi),
        }

    facts["measures"] = [
        {"name": m, "aggregation": by[m].get("aggregation")}
        for m in roles.get("measures", [])
    ]
    facts["dimensions"] = [
        {"name": d, "distinct": by[d].get("distinct_count")}
        for d in roles.get("dimensions", [])
    ]

    dq_notes = []
    for col in profile.get("columns", []):
        if row_count and col["null_count"] > 0:
            pct = col["null_count"] / row_count * 100.0
            if pct >= 5:
                dq_notes.append({"column": col["name"], "null_pct": round(pct, 1)})
    facts["data_quality"] = dq_notes
    return facts


def _caveat_notes(profile: dict) -> list[str]:
    roles = profile.get("roles", {})
    row_count = profile.get("row_count", 0)
    numeric = [c for c in profile.get("columns", []) if c["category"] == "numeric"]

    notes: list[str] = []
    if not roles.get("primary_date"):
        notes.append("No date/time column is present, so trends over time cannot be analyzed.")
    if row_count and row_count < 30:
        notes.append(f"With only {row_count} rows, findings may not be statistically reliable.")
    if not any(c.get("aggregation") == "additive" for c in numeric):
        notes.append("No clearly additive measure was found, so totals may not be meaningful.")
    if not roles.get("dimensions"):
        notes.append("No low-cardinality dimensions are available for segment comparison.")
    notes.append(
        "This data is observational; the patterns shown are associations, not proven "
        "cause and effect."
    )
    notes.append("The analysis reflects only the columns present in this file.")
    return notes


# --- LLM phrasing --------------------------------------------------------


def _phrase(groq, payload, candidates, caveat_notes) -> tuple[dict[str, Any], str | None]:
    try:
        data, model = groq.complete_json(
            INSIGHTS_SYSTEM, build_insights_user_prompt(payload), max_tokens=1200
        )
        if not isinstance(data.get("findings"), list):
            data["findings"] = []
        if not isinstance(data.get("caveats"), list):
            data["caveats"] = caveat_notes
        return data, model
    except GroqError:
        # Deterministic fallback: use each candidate's own sentence.
        return (
            {
                "overview": None,
                "findings": [{"statement": c.description} for c in candidates],
                "what_it_indicates": None,
                "caveats": caveat_notes,
            },
            None,
        )


def _fallback_overview(facts: dict) -> str:
    parts = [
        f"This dataset ({facts.get('filename')}) has {facts.get('row_count')} rows "
        f"across {facts.get('column_count')} columns."
    ]
    tp = facts.get("time_period")
    if tp:
        parts.append(f"It spans {tp.get('start')} to {tp.get('end')}.")
    measures = [m["name"] for m in facts.get("measures", [])]
    if measures:
        parts.append(f"Measures: {', '.join(measures)}.")
    return " ".join(parts)
