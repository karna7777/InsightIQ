"""Investigation engine — "why did this metric change?"

Given an additive measure and a time column, this decomposes the change between
the two most recent periods into per-segment *contributions*: how much each
value of each dimension added to, or subtracted from, the overall change.
Contribution is exact and additive (it's just SUM(latest) - SUM(previous) per
segment), so the math is inspectable and the parts relate cleanly to the whole.

It then finds the single largest driver across all dimensions and drills one
level deeper — decomposing that driver's own change by another dimension — to
produce a small, ranked tree.

Consistent with the project's rule: every number here is computed in Python/SQL.
The LLM only narrates the computed tree; it never produces a figure of its own,
and deterministic fallback prose keeps the report working if the AI call fails.
"""

from __future__ import annotations

from typing import Any

from ..ai import GroqClient, GroqError
from ..ai.prompts import INVESTIGATION_SYSTEM, build_investigation_user_prompt
from ..util import jdate, pretty, quote_ident, round2, span_days

# How many segments to keep per dimension breakdown, and how many dimensions to
# break the change down by. Small on purpose — a driver list is a story, not a
# spreadsheet.
_TOP_SEGMENTS = 5
_MAX_DIMENSIONS = 4
_MIN_PREV_FOR_PCT = 1e-9
# When the gross movement (sum of |contributions|) exceeds this multiple of the
# net change, segments are largely offsetting each other — a small net masking
# big opposing swings. "Share of net change" is misleading in that case, so we
# flag it and narrate the churn instead.
_OFFSET_RATIO = 2.0


def _grain_for_span(days: int) -> str:
    """Bucket grain for period-over-period comparison, from the data's span."""
    if days >= 365 * 3:
        return "quarter"
    if days >= 120:
        return "month"
    if days >= 21:
        return "week"
    return "day"


def build_investigation(
    db, groq: GroqClient, dataset, measure: str | None = None
) -> dict[str, Any]:
    con = db.cursor()
    t = quote_ident(dataset.table_name)
    profile = dataset.profile
    roles = profile.get("roles", {})
    by = {c["name"]: c for c in profile.get("columns", [])}

    base: dict[str, Any] = {"dataset_id": dataset.id, "available": False}

    # --- eligibility: need a date column and an additive measure -----------
    date_col = roles.get("primary_date")
    if not date_col:
        return {**base, "reason": "No date/time column, so change over time cannot be computed."}

    measure = _resolve_measure(measure, roles, by)
    if not measure:
        return {
            **base,
            "reason": "No additive measure (e.g. revenue, units) was found to decompose.",
        }

    dq = quote_ident(date_col)
    mq = quote_ident(measure)

    # --- the two most recent periods ---------------------------------------
    lo, hi = con.execute(f"SELECT MIN({dq}), MAX({dq}) FROM {t}").fetchone()
    if lo is None or hi is None:
        return {**base, "reason": "The date column has no usable values."}
    grain = _grain_for_span(span_days(lo, hi))

    series = con.execute(
        f"SELECT date_trunc('{grain}', {dq}) AS b, SUM({mq}) AS v "
        f"FROM {t} WHERE {dq} IS NOT NULL GROUP BY 1 ORDER BY 1"
    ).fetchall()
    if len(series) < 2:
        return {
            **base,
            "reason": f"Only one {grain} of data is present, so there is no change to explain.",
        }

    (prev_b, prev_total), (last_b, last_total) = series[-2], series[-1]
    prev_total = float(prev_total or 0.0)
    last_total = float(last_total or 0.0)
    total_delta = last_total - prev_total
    total_delta_pct = (
        total_delta / prev_total * 100.0 if abs(prev_total) > _MIN_PREV_FOR_PCT else None
    )
    direction = "up" if total_delta > 0 else "down" if total_delta < 0 else "flat"

    # --- decompose the change by each dimension ----------------------------
    dimensions = roles.get("dimensions", [])[:_MAX_DIMENSIONS]
    breakdowns: list[dict[str, Any]] = []
    best: dict[str, Any] | None = None  # the single largest driver across dims

    for dim in dimensions:
        drivers, gross = _decompose(con, t, dq, mq, dim, grain, prev_b, last_b, total_delta)
        if not drivers:
            continue
        breakdowns.append(
            {
                "dimension": dim,
                "drivers": drivers,
                "gross": round2(gross),
                "offsetting": _is_offsetting(gross, total_delta),
            }
        )
        top = drivers[0]
        if best is None or abs(top["contribution"] or 0) > abs(best["contribution"] or 0):
            best = {**top, "dimension": dim}

    # --- drill one level into the biggest driver ---------------------------
    primary_driver = None
    if best is not None:
        primary_driver = dict(best)
        other_dims = [d for d in dimensions if d != best["dimension"]]
        if other_dims:
            children, _ = _decompose(
                con, t, dq, mq, other_dims[0], grain, prev_b, last_b,
                best["contribution"], filter_dim=best["dimension"], filter_val=best["segment"],
            )
            primary_driver["children"] = children

    # --- offsetting-churn signal (from the primary dimension) --------------
    primary_bd = next(
        (b for b in breakdowns if best and b["dimension"] == best["dimension"]), None
    )
    offsetting = bool(primary_bd and primary_bd["offsetting"])
    offsetting_detail = _offsetting_detail(primary_bd) if offsetting else None

    facts = {
        "measure": measure,
        "grain": grain,
        "previous_period": jdate(prev_b),
        "latest_period": jdate(last_b),
        "total_previous": round2(prev_total),
        "total_latest": round2(last_total),
        "total_delta": round2(total_delta),
        "total_delta_pct": round(total_delta_pct, 1) if total_delta_pct is not None else None,
        "direction": direction,
        "offsetting": offsetting,
        "offsetting_detail": offsetting_detail,
        "breakdowns": breakdowns,
        "primary_driver": primary_driver,
    }

    narrative, model = _narrate(groq, facts)

    return {
        "dataset_id": dataset.id,
        "available": True,
        "reason": None,
        **facts,
        "narrative": narrative,
        "model": model,
    }


# --- helpers -------------------------------------------------------------


def _resolve_measure(measure, roles, by) -> str | None:
    """Pick the measure to investigate: the requested one if additive, else the
    main measure if additive, else the first additive measure available."""
    def is_additive(name: str) -> bool:
        col = by.get(name)
        return bool(col) and col.get("aggregation") == "additive"

    if measure and is_additive(measure):
        return measure
    main = roles.get("main_measure")
    if main and is_additive(main):
        return main
    for m in roles.get("measures", []):
        if is_additive(m):
            return m
    return None


def _is_offsetting(gross: float, net: float) -> bool:
    """True when opposing segment movements largely cancel out (gross >> net)."""
    if gross <= _MIN_PREV_FOR_PCT:
        return False
    return gross > _OFFSET_RATIO * abs(net)


def _offsetting_detail(breakdown: dict[str, Any] | None) -> dict[str, Any] | None:
    """The biggest gainer and biggest loser within a breakdown, for narration."""
    if not breakdown:
        return None
    drivers = breakdown["drivers"]
    gains = [d for d in drivers if (d["contribution"] or 0) > 0]
    losses = [d for d in drivers if (d["contribution"] or 0) < 0]
    if not gains or not losses:
        return None
    top_gain = max(gains, key=lambda d: d["contribution"])
    top_loss = min(losses, key=lambda d: d["contribution"])
    return {
        "dimension": breakdown["dimension"],
        "top_gain": {"segment": top_gain["segment"], "contribution": top_gain["contribution"]},
        "top_loss": {"segment": top_loss["segment"], "contribution": top_loss["contribution"]},
    }


def _decompose(
    con, t, dq, mq, dim, grain, prev_b, last_b, parent_delta,
    filter_dim: str | None = None, filter_val: str | None = None,
) -> tuple[list[dict[str, Any]], float]:
    """Per-segment contribution of `dim` to the change from prev_b to last_b.

    `contribution` = SUM(latest) - SUM(previous) for the segment. `share` is the
    segment's contribution as a percentage of `parent_delta` (the change it rolls
    up into) — positive when the segment moved the same way as the total.
    Optionally restricted to a single value of another dimension (the drill).
    """
    ddim = quote_ident(dim)
    where = [f"{ddim} IS NOT NULL", f"{dq} IS NOT NULL"]
    params: list[Any] = [last_b, prev_b]  # CASE order: latest then previous
    filter_clause = ""
    if filter_dim is not None and filter_val is not None:
        filter_clause = f" AND {quote_ident(filter_dim)} = ?"

    sql = (
        f"SELECT CAST({ddim} AS VARCHAR) AS seg, "
        f"SUM(CASE WHEN date_trunc('{grain}', {dq}) = ? THEN {mq} ELSE 0 END) AS last_v, "
        f"SUM(CASE WHEN date_trunc('{grain}', {dq}) = ? THEN {mq} ELSE 0 END) AS prev_v "
        f"FROM {t} WHERE {' AND '.join(where)}"
        f"{filter_clause} "
        f"AND date_trunc('{grain}', {dq}) IN (?, ?) "
        f"GROUP BY 1"
    )
    # params: CASE(last, prev), [optional filter_val], IN(prev, last)
    if filter_clause:
        params.append(filter_val)
    params += [prev_b, last_b]

    rows = con.execute(sql, params).fetchall()
    drivers: list[dict[str, Any]] = []
    for seg, last_v, prev_v in rows:
        last_v = float(last_v or 0.0)
        prev_v = float(prev_v or 0.0)
        contribution = last_v - prev_v
        if contribution == 0 and last_v == 0 and prev_v == 0:
            continue
        delta_pct = (
            contribution / prev_v * 100.0 if abs(prev_v) > _MIN_PREV_FOR_PCT else None
        )
        share = (
            contribution / parent_delta * 100.0
            if parent_delta and abs(parent_delta) > _MIN_PREV_FOR_PCT
            else None
        )
        drivers.append(
            {
                "dimension": dim,
                "segment": str(seg),
                "previous": round2(prev_v),
                "latest": round2(last_v),
                "contribution": round2(contribution),
                "contribution_pct": round(share, 1) if share is not None else None,
                "delta_pct": round(delta_pct, 1) if delta_pct is not None else None,
                "children": [],
            }
        )

    # Gross movement across ALL segments (before truncation) — powers the
    # offsetting signal: how much moved, regardless of whether it netted out.
    gross = sum(abs(d["contribution"] or 0) for d in drivers)
    drivers.sort(key=lambda d: abs(d["contribution"] or 0), reverse=True)
    return drivers[:_TOP_SEGMENTS], gross


# --- narration -----------------------------------------------------------


def _narrate(groq: GroqClient, facts: dict[str, Any]) -> tuple[str | None, str | None]:
    try:
        data, model = groq.complete_json(
            INVESTIGATION_SYSTEM, build_investigation_user_prompt(facts), max_tokens=500
        )
        text = str(data.get("narrative", "")).strip()
        return (text or _fallback(facts)), model
    except GroqError:
        return _fallback(facts), None


def _fallback(facts: dict[str, Any]) -> str:
    measure = pretty(facts["measure"])
    grain = facts["grain"]
    verb = {"up": "rose", "down": "fell", "flat": "was roughly flat"}[facts["direction"]]
    pct = facts.get("total_delta_pct")
    change = f" {abs(pct):.1f}%" if pct is not None else ""
    parts = [
        f"{measure} {verb}{change} from the previous {grain} "
        f"({facts['total_previous']}) to the latest ({facts['total_latest']})."
    ]

    detail = facts.get("offsetting_detail")
    if facts.get("offsetting") and detail:
        # Net change masks large opposing swings — narrate the churn, not a
        # single "driver", since share-of-net percentages are misleading here.
        tg, tl = detail["top_gain"], detail["top_loss"]
        parts.append(
            f"That small net change masks large offsetting movements by "
            f"{pretty(detail['dimension']).lower()}: '{tg['segment']}' rose by "
            f"{tg['contribution']} while '{tl['segment']}' fell by {abs(tl['contribution'])}."
        )
        return " ".join(parts)

    pd = facts.get("primary_driver")
    if pd:
        share = pd.get("contribution_pct")
        share_txt = f" ({abs(share):.0f}% of the change)" if share is not None else ""
        parts.append(
            f"The largest driver was '{pd['segment']}' by {pretty(pd['dimension']).lower()}, "
            f"contributing {pd['contribution']}{share_txt}."
        )
        kids = pd.get("children") or []
        if kids:
            k = kids[0]
            parts.append(
                f"Within it, '{k['segment']}' by {pretty(k['dimension']).lower()} "
                f"accounts for the most ({k['contribution']})."
            )
    return " ".join(parts)
