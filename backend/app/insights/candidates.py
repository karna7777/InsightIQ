"""Compute candidate insights deterministically, then rank them.

Candidate generators (all numbers from DuckDB aggregates — safe to send on):
  - period-over-period change per additive measure
  - Pareto contribution (top segment share of a measure)
  - segment comparison (highest vs lowest average, size-weighted)
  - IQR outliers on the main measure
  - bounded-measure summary (avg/range + weakest segment)

Ranking weights raw effect size by a sample-size factor so a big swing built on
a handful of rows doesn't outrank a solid, well-supported one.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..util import jdate, pretty, quote_ident, round2


@dataclass
class Candidate:
    kind: str
    score: float
    metric: dict[str, Any]           # {label, value, format} for display
    facts: dict[str, Any]            # the numbers (for the LLM + detail)
    description: str                 # deterministic sentence (LLM fallback)
    chart: dict[str, Any] | None = None


def _size_weight(n: int) -> float:
    """0..1 confidence factor: full weight around ~30+ supporting rows."""
    if n <= 0:
        return 0.0
    return min(1.0, n / 30.0)


def build_candidates(con, t: str, profile: dict) -> list[Candidate]:
    """Return the strongest, diversified handful of candidate findings.

    ``t`` is the already-quoted table name.
    """
    roles = profile.get("roles", {})
    by = {c["name"]: c for c in profile.get("columns", [])}
    row_count = profile.get("row_count", 0)

    cands: list[Candidate] = []
    cands += _pop_change(con, t, roles, by, row_count)
    cands += _pareto(con, t, roles, by, row_count)
    cands += _segment_compare(con, t, roles, by, row_count)
    cands += _outliers(con, t, roles, by, row_count)
    cands += _bounded_summary(con, t, roles, by, row_count)

    cands.sort(key=lambda c: c.score, reverse=True)
    return _diversify(cands, limit=5)


def _diversify(cands: list[Candidate], limit: int) -> list[Candidate]:
    """Take the top `limit`, but avoid more than two of any single kind."""
    picked: list[Candidate] = []
    kind_count: dict[str, int] = {}
    for c in cands:
        if len(picked) >= limit:
            break
        if kind_count.get(c.kind, 0) >= 2:
            continue
        picked.append(c)
        kind_count[c.kind] = kind_count.get(c.kind, 0) + 1
    # If diversity left us short, top up with whatever remains.
    if len(picked) < min(limit, len(cands)):
        for c in cands:
            if c not in picked:
                picked.append(c)
            if len(picked) >= limit:
                break
    return picked


# --- generators ----------------------------------------------------------


def _grain_for_span(days: int) -> str:
    if days >= 60:
        return "month"
    if days >= 14:
        return "week"
    return "day"


def _pop_change(con, t, roles, by, row_count) -> list[Candidate]:
    date_col = roles.get("primary_date")
    if not date_col:
        return []
    additive = [m for m in roles.get("measures", []) if by[m].get("aggregation") == "additive"]
    if not additive:
        return []

    dq = quote_ident(date_col)
    lo, hi = con.execute(f"SELECT MIN({dq}), MAX({dq}) FROM {t}").fetchone()
    if lo is None or hi is None:
        return []
    from ..util import span_days
    grain = _grain_for_span(span_days(lo, hi))

    out: list[Candidate] = []
    for measure in additive[:2]:
        mq = quote_ident(measure)
        rows = con.execute(
            f"SELECT date_trunc('{grain}', {dq}) AS b, SUM({mq}) AS v "
            f"FROM {t} WHERE {dq} IS NOT NULL GROUP BY 1 ORDER BY 1"
        ).fetchall()
        if len(rows) < 2:
            continue
        (prev_b, prev_v), (last_b, last_v) = rows[-2], rows[-1]
        if not prev_v:
            continue
        change = (last_v - prev_v) / prev_v * 100.0
        out.append(
            Candidate(
                kind="pop_change",
                score=min(abs(change), 200) / 100.0,  # trend uses the full series
                metric={
                    "label": f"{pretty(measure)} ({grain}-over-{grain})",
                    "value": round(change, 1),
                    "format": "percent",
                },
                facts={
                    "measure": measure, "grain": grain,
                    "previous_period": jdate(prev_b), "previous_value": round2(prev_v),
                    "latest_period": jdate(last_b), "latest_value": round2(last_v),
                    "change_pct": round(change, 1),
                },
                description=(
                    f"{pretty(measure)} {'rose' if change >= 0 else 'fell'} "
                    f"{abs(change):.1f}% from the previous {grain} ({round2(prev_v)}) "
                    f"to the latest {grain} ({round2(last_v)})."
                ),
                chart=_line_chart(con, t, date_col, measure, grain),
            )
        )
    return out


def _pareto(con, t, roles, by, row_count) -> list[Candidate]:
    measure = roles.get("main_measure")
    dim = roles.get("primary_dimension")
    if not measure or not dim or by[measure].get("aggregation") != "additive":
        return []
    mq, dq = quote_ident(measure), quote_ident(dim)
    rows = con.execute(
        f"SELECT {dq} AS k, SUM({mq}) AS v FROM {t} WHERE {dq} IS NOT NULL "
        f"GROUP BY 1 ORDER BY v DESC NULLS LAST"
    ).fetchall()
    total = sum((v or 0) for _, v in rows)
    if not rows or total <= 0:
        return []
    top_k, top_v = rows[0]
    share = (top_v or 0) / total * 100.0
    top3 = sum((v or 0) for _, v in rows[:3]) / total * 100.0
    return [
        Candidate(
            kind="pareto",
            score=share / 100.0,
            metric={
                "label": f"Top {pretty(dim)} share of {pretty(measure)}",
                "value": round(share, 1),
                "format": "percent",
            },
            facts={
                "measure": measure, "dimension": dim, "top_value": str(top_k),
                "top_amount": round2(top_v), "top_share_pct": round(share, 1),
                "top3_share_pct": round(top3, 1), "total": round2(total),
                "n_segments": len(rows),
            },
            description=(
                f"'{top_k}' is the largest {pretty(dim).lower()} for "
                f"{pretty(measure).lower()} at {round2(top_v)} ({share:.1f}% of the "
                f"{round2(total)} total); the top 3 together are {top3:.1f}%."
            ),
            chart=_bar_chart(con, t, dim, measure, agg="SUM"),
        )
    ]


def _segment_compare(con, t, roles, by, row_count) -> list[Candidate]:
    measure = roles.get("main_measure")
    if not measure:
        return []
    min_n = max(5, int(0.02 * row_count))
    out: list[Candidate] = []
    for dim in roles.get("dimensions", [])[:2]:
        mq, dq = quote_ident(measure), quote_ident(dim)
        rows = con.execute(
            f"SELECT {dq} AS k, AVG({mq}) AS a, COUNT(*) AS n FROM {t} "
            f"WHERE {dq} IS NOT NULL AND {mq} IS NOT NULL "
            f"GROUP BY 1 HAVING COUNT(*) >= {min_n} ORDER BY a DESC"
        ).fetchall()
        if len(rows) < 2:
            continue
        (hk, ha, hn), (lk, la, ln) = rows[0], rows[-1]
        if not la:
            continue
        diff = (ha - la) / abs(la) * 100.0
        weight = _size_weight(min(hn, ln))
        out.append(
            Candidate(
                kind="segment",
                score=min(abs(diff), 200) / 100.0 * weight,
                metric={
                    "label": f"{pretty(measure)}: {hk} vs {lk}",
                    "value": round(diff, 1),
                    "format": "percent",
                },
                facts={
                    "measure": measure, "dimension": dim,
                    "highest": str(hk), "highest_avg": round2(ha), "highest_n": hn,
                    "lowest": str(lk), "lowest_avg": round2(la), "lowest_n": ln,
                    "diff_pct": round(diff, 1),
                },
                description=(
                    f"On average, '{hk}' has the highest {pretty(measure).lower()} "
                    f"({round2(ha)}), {abs(diff):.1f}% "
                    f"{'above' if diff >= 0 else 'below'} the lowest '{lk}' ({round2(la)})."
                ),
                chart=_bar_chart(con, t, dim, measure, agg="AVG"),
            )
        )
    return out


def _outliers(con, t, roles, by, row_count) -> list[Candidate]:
    measures = roles.get("measures", [])
    measure = roles.get("main_measure") or (measures[0] if measures else None)
    if not measure or not row_count:
        return []
    mq = quote_ident(measure)
    q1, q3 = con.execute(
        f"SELECT quantile_cont({mq}, 0.25), quantile_cont({mq}, 0.75) FROM {t}"
    ).fetchone()
    if q1 is None or q3 is None:
        return []
    iqr = q3 - q1
    if iqr <= 0:
        return []
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    count, mx = con.execute(
        f"SELECT COUNT(*), MAX({mq}) FROM {t} WHERE {mq} < ? OR {mq} > ?", [lo, hi]
    ).fetchone()
    if not count:
        return []
    pct = count / row_count * 100.0
    return [
        Candidate(
            kind="outliers",
            score=min(pct, 50) / 50.0 * 0.6,
            metric={"label": f"{pretty(measure)} outliers", "value": count, "format": "integer"},
            facts={
                "measure": measure, "outlier_count": count, "outlier_pct": round(pct, 1),
                "lower_bound": round2(lo), "upper_bound": round2(hi), "max_value": round2(mx),
            },
            description=(
                f"{count} record(s) ({pct:.1f}%) are statistical outliers on "
                f"{pretty(measure).lower()}, outside the {round2(lo)}–{round2(hi)} IQR range "
                f"(max {round2(mx)})."
            ),
        )
    ]


def _bounded_summary(con, t, roles, by, row_count) -> list[Candidate]:
    bounded = [m for m in roles.get("measures", []) if by[m].get("aggregation") == "bounded"]
    if not bounded:
        return []
    measure = bounded[0]
    mq = quote_ident(measure)
    avg, mn, mx = con.execute(f"SELECT AVG({mq}), MIN({mq}), MAX({mq}) FROM {t}").fetchone()
    if avg is None:
        return []
    facts = {"measure": measure, "average": round2(avg), "min": round2(mn), "max": round2(mx)}
    desc = f"{pretty(measure)} averages {round2(avg)} (range {round2(mn)}–{round2(mx)})."
    chart = None
    dim = roles.get("primary_dimension")
    if dim:
        dq = quote_ident(dim)
        min_n = max(5, int(0.02 * row_count))
        rows = con.execute(
            f"SELECT {dq} AS k, AVG({mq}) AS a FROM {t} "
            f"WHERE {dq} IS NOT NULL AND {mq} IS NOT NULL "
            f"GROUP BY 1 HAVING COUNT(*) >= {min_n} ORDER BY a ASC"
        ).fetchall()
        if rows:
            lk, la = rows[0]
            facts["lowest_segment"] = str(lk)
            facts["lowest_segment_avg"] = round2(la)
            desc += f" '{lk}' is lowest at {round2(la)}."
            chart = _bar_chart(con, t, dim, measure, agg="AVG")
    return [
        Candidate(
            kind="bounded",
            score=0.5,
            metric={"label": f"Avg {pretty(measure)}", "value": round2(avg), "format": "number"},
            facts=facts,
            description=desc,
            chart=chart,
        )
    ]


# --- chart builders ------------------------------------------------------


def _line_chart(con, t, date_col, measure, grain) -> dict:
    dq, mq = quote_ident(date_col), quote_ident(measure)
    rows = con.execute(
        f"SELECT date_trunc('{grain}', {dq}) AS b, SUM({mq}) AS v "
        f"FROM {t} WHERE {dq} IS NOT NULL GROUP BY 1 ORDER BY 1"
    ).fetchall()
    return {
        "id": f"ins-line-{measure}",
        "type": "line",
        "title": f"{pretty(measure)} over time",
        "x_key": "x", "y_key": "y",
        "x_label": pretty(date_col), "y_label": pretty(measure),
        "data": [{"x": jdate(b), "y": round2(v)} for b, v in rows],
    }


def _bar_chart(con, t, dim, measure, agg: str) -> dict:
    dq, mq = quote_ident(dim), quote_ident(measure)
    rows = con.execute(
        f"SELECT {dq} AS k, {agg}({mq}) AS v FROM {t} WHERE {dq} IS NOT NULL "
        f"GROUP BY 1 ORDER BY v DESC NULLS LAST LIMIT 12"
    ).fetchall()
    prefix = "Average " if agg == "AVG" else ""
    return {
        "id": f"ins-bar-{agg.lower()}-{dim}-{measure}",
        "type": "bar",
        "title": f"{prefix}{pretty(measure)} by {pretty(dim)}",
        "x_key": "x", "y_key": "y",
        "x_label": pretty(dim), "y_label": pretty(measure),
        "data": [{"x": str(k), "y": round2(v)} for k, v in rows],
    }
