"""Decision Copilot (Level 4: Decide) — "what should I do?"

Recommendations are the highest hallucination-risk surface in the product, so
each one here is *derived from a computed signal*, never conjured: it is built
from the deterministic candidate findings (concentration, decline, segment gaps,
outliers, weak segments) plus data-quality facts from the profile. Every
recommendation carries the number it rests on, an `impact` grade (from the size
of the signal) and a `confidence` grade (from how well the data supports it).

The LLM only rewords the computed recommendation and writes a short framing
summary — it introduces no new figure. Deterministic titles/rationales are the
fallback if the AI call fails.
"""

from __future__ import annotations

from typing import Any

from ..ai import GroqClient, GroqError
from ..ai.prompts import DECISION_SYSTEM, build_decision_user_prompt
from ..util import pretty, quote_ident
from .candidates import build_candidates

_MAX_RECOMMENDATIONS = 5
_IMPACT_W = {"high": 3, "medium": 2, "low": 1}
_CONF_W = {"high": 3, "medium": 2, "low": 1}


def build_decisions(db, groq: GroqClient, dataset) -> dict[str, Any]:
    con = db.cursor()
    t = quote_ident(dataset.table_name)
    profile = dataset.profile
    row_count = profile.get("row_count", 0)

    base: dict[str, Any] = {"dataset_id": dataset.id, "available": False}

    candidates = build_candidates(con, t, profile)
    recs: list[dict[str, Any]] = []
    for c in candidates:
        rec = _rec_from_candidate(c, row_count)
        if rec:
            recs.append(rec)
    recs += _data_quality_recs(profile, row_count)

    if not recs:
        return {**base, "reason": "No actionable signal was found in this dataset."}

    # priority = impact x confidence; keep the strongest, most-supported few.
    for r in recs:
        r["_priority"] = _IMPACT_W[r["impact"]] * _CONF_W[r["confidence"]]
    recs.sort(key=lambda r: r["_priority"], reverse=True)
    recs = recs[:_MAX_RECOMMENDATIONS]

    summary, recs, model = _phrase(groq, recs)

    for r in recs:
        r.pop("_priority", None)

    return {
        "dataset_id": dataset.id,
        "available": True,
        "reason": None,
        "summary": summary,
        "recommendations": recs,
        "model": model,
    }


# --- recommendation generators -------------------------------------------


def _rec_from_candidate(c, row_count: int) -> dict[str, Any] | None:
    """Turn a computed candidate finding into an actionable recommendation, or
    None if this finding doesn't warrant an action."""
    f = c.facts
    if c.kind == "pareto":
        share = f.get("top_share_pct") or 0
        if share < 35:
            return None
        dim, measure = f.get("dimension", ""), f.get("measure", "")
        return _mk(
            kind="concentration",
            title=f"Reduce concentration risk in {pretty(dim).lower()}",
            rationale=(
                f"'{f.get('top_value')}' accounts for {share}% of {pretty(measure).lower()}; "
                f"over-reliance on a single {pretty(dim).lower()} is a risk if it falters."
            ),
            evidence=c.metric,
            impact=_band(share, 60, 40),
            confidence=_conf_population(row_count),
        )

    if c.kind == "pop_change":
        change = f.get("change_pct") or 0
        measure, grain = f.get("measure", ""), f.get("grain", "period")
        if change <= -10:
            return _mk(
                kind="decline",
                title=f"Address the decline in {pretty(measure).lower()}",
                rationale=(
                    f"{pretty(measure)} fell {abs(change)}% from the previous {grain}; "
                    f"investigate the cause and act to reverse it."
                ),
                evidence=c.metric,
                impact=_band(abs(change), 25, 10),
                confidence=_conf_population(row_count),
            )
        if change >= 15:
            return _mk(
                kind="growth",
                title=f"Reinforce {pretty(measure).lower()} growth",
                rationale=(
                    f"{pretty(measure)} rose {change}% from the previous {grain}; "
                    f"identify what drove it and sustain the momentum."
                ),
                evidence=c.metric,
                impact=_band(abs(change), 30, 15),
                confidence=_conf_population(row_count),
            )
        return None

    if c.kind == "segment":
        diff = f.get("diff_pct") or 0
        measure, dim = f.get("measure", ""), f.get("dimension", "")
        if abs(diff) < 25:
            return None
        return _mk(
            kind="segment_gap",
            title=f"Lift {pretty(measure).lower()} in '{f.get('lowest')}'",
            rationale=(
                f"'{f.get('lowest')}' averages {f.get('lowest_avg')} for "
                f"{pretty(measure).lower()}, {abs(diff)}% below the leading "
                f"'{f.get('highest')}'; closing that gap is an opportunity."
            ),
            evidence=c.metric,
            impact=_band(abs(diff), 50, 25),
            confidence=_conf_sample(f.get("lowest_n") or 0),
        )

    if c.kind == "outliers":
        pct = f.get("outlier_pct") or 0
        measure = f.get("measure", "")
        if pct < 3:
            return None
        return _mk(
            kind="outliers",
            title=f"Review {pretty(measure).lower()} outliers",
            rationale=(
                f"{f.get('outlier_count')} records ({pct}%) fall outside the normal "
                f"range for {pretty(measure).lower()}; verify data quality or investigate."
            ),
            evidence=c.metric,
            impact=_band(pct, 10, 3),
            confidence="medium",
        )

    if c.kind == "bounded":
        seg = f.get("lowest_segment")
        measure = f.get("measure", "")
        if not seg:
            return None
        return _mk(
            kind="weak_segment",
            title=f"Focus on the weakest {pretty(measure).lower()} segment",
            rationale=(
                f"'{seg}' is lowest on {pretty(measure).lower()} at "
                f"{f.get('lowest_segment_avg')}; targeted improvement there would "
                f"raise the overall level."
            ),
            evidence=c.metric,
            impact="medium",
            confidence="medium",
        )

    return None


def _data_quality_recs(profile: dict, row_count: int) -> list[dict[str, Any]]:
    if not row_count:
        return []
    out: list[dict[str, Any]] = []
    for col in profile.get("columns", []):
        null_pct = col["null_count"] / row_count * 100.0
        if null_pct >= 15:
            out.append(
                _mk(
                    kind="data_quality",
                    title=f"Improve data capture for {pretty(col['name']).lower()}",
                    rationale=(
                        f"{round(null_pct, 1)}% of '{col['name']}' is missing, which "
                        f"limits how reliably it can be analyzed."
                    ),
                    evidence={
                        "label": f"{pretty(col['name'])} missing",
                        "value": round(null_pct, 1),
                        "format": "percent",
                    },
                    impact=_band(null_pct, 40, 15),
                    confidence="high",
                )
            )
    return out[:2]  # don't let data-quality notes crowd out business actions


# --- helpers -------------------------------------------------------------


def _mk(*, kind, title, rationale, evidence, impact, confidence) -> dict[str, Any]:
    return {
        "kind": kind,
        "title": title,
        "rationale": rationale,
        "evidence": evidence,
        "impact": impact,
        "confidence": confidence,
    }


def _band(value: float, high_at: float, med_at: float) -> str:
    v = abs(value)
    if v >= high_at:
        return "high"
    if v >= med_at:
        return "medium"
    return "low"


def _conf_population(row_count: int) -> str:
    """Confidence for a whole-population aggregate — high unless the data is tiny."""
    if row_count >= 100:
        return "high"
    if row_count >= 30:
        return "medium"
    return "low"


def _conf_sample(n: int) -> str:
    """Confidence for a per-segment signal, from its supporting row count."""
    if n >= 30:
        return "high"
    if n >= 10:
        return "medium"
    return "low"


# --- LLM phrasing --------------------------------------------------------


def _phrase(groq, recs) -> tuple[str | None, list[dict], str | None]:
    payload = {
        "recommendations": [
            {
                "title": r["title"],
                "rationale": r["rationale"],
                "evidence": r["evidence"],
                "impact": r["impact"],
                "confidence": r["confidence"],
            }
            for r in recs
        ]
    }
    try:
        data, model = groq.complete_json(
            DECISION_SYSTEM, build_decision_user_prompt(payload), max_tokens=900
        )
        phrased = data.get("recommendations")
        if isinstance(phrased, list):
            for i, r in enumerate(recs):
                if i < len(phrased) and isinstance(phrased[i], dict):
                    r["title"] = str(phrased[i].get("title") or r["title"]).strip()
                    r["rationale"] = str(phrased[i].get("rationale") or r["rationale"]).strip()
        summary = str(data.get("summary") or "").strip() or _fallback_summary(recs)
        return summary, recs, model
    except GroqError:
        return _fallback_summary(recs), recs, None


def _fallback_summary(recs: list[dict]) -> str:
    if not recs:
        return "No actionable recommendations were found."
    top = recs[0]
    n = len(recs)
    return (
        f"{n} recommended action{'s' if n != 1 else ''}, ranked by impact and confidence. "
        f"The highest priority: {top['title'].lower()}."
    )
