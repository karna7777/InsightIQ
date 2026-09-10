"""Build an auto-dashboard from a dataset profile.

Everything here is derived deterministically from the profile's semantic roles;
the LLM is NOT involved. KPI values and chart data are computed with real
DuckDB aggregate queries against the ``ds_<id>`` table.

Output shape is frontend-ready (Recharts, step 2):
  KPI  -> {label, value, format}
  chart-> {id, type, title, x_key, y_key, x_label, y_label, data:[{x,y}|{x,series..}]}
"""

from __future__ import annotations

from typing import Any

from ..db import Database
from ..storage import DatasetRecord
from ..util import jdate, jnum, pretty, quote_ident, span_days

_MAX_KPIS = 6
_BREAKDOWN_CAP = 12   # bars before we roll the tail into "Other"
_TOPN = 10


def build_dashboard(db: Database, dataset: DatasetRecord) -> dict[str, Any]:
    con = db.cursor()
    t = quote_ident(dataset.table_name)
    profile = dataset.profile
    roles = profile.get("roles", {})
    row_count = profile.get("row_count", 0)

    kpis = _build_kpis(con, t, roles, profile, row_count)
    charts = _build_charts(con, t, roles, profile)

    return {"dataset_id": dataset.id, "kpis": kpis, "charts": charts}


# --- KPI cards -----------------------------------------------------------


def _agg_kind(profile: dict, measure: str) -> str:
    """Aggregation kind for a measure, from the profile ('additive'|'bounded')."""
    for col in profile.get("columns", []):
        if col["name"] == measure:
            return col.get("aggregation", "bounded")
    return "bounded"


def _build_kpis(con, t: str, roles: dict, profile: dict, row_count: int) -> list[dict]:
    kpis: list[dict] = [
        {"label": "Records", "value": row_count, "format": "integer"}
    ]

    main = roles.get("main_measure")
    primary_date = roles.get("primary_date")

    for measure in roles.get("measures", [])[:3]:
        q = quote_ident(measure)
        is_main = measure == main
        if _agg_kind(profile, measure) == "additive":
            # Summing is meaningful. Total always; add Average for the headline.
            total, avg = con.execute(f"SELECT SUM({q}), AVG({q}) FROM {t}").fetchone()
            kpis.append({"label": f"Total {pretty(measure)}", "value": jnum(total), "format": "number"})
            if is_main:
                kpis.append({"label": f"Avg {pretty(measure)}", "value": jnum(avg), "format": "number"})
        else:
            # Bounded/index/rating: sum is meaningless. Average; for the headline
            # also min/max, and the latest value if there's a time column.
            avg, mn, mx = con.execute(f"SELECT AVG({q}), MIN({q}), MAX({q}) FROM {t}").fetchone()
            kpis.append({"label": f"Avg {pretty(measure)}", "value": jnum(avg), "format": "number"})
            if is_main:
                kpis.append({"label": f"Min {pretty(measure)}", "value": jnum(mn), "format": "number"})
                kpis.append({"label": f"Max {pretty(measure)}", "value": jnum(mx), "format": "number"})
                latest = _latest_value(con, t, q, primary_date)
                if latest is not None:
                    kpis.append({"label": f"Latest {pretty(measure)}", "value": jnum(latest), "format": "number"})

    primary_dim = roles.get("primary_dimension")
    if primary_dim:
        q = quote_ident(primary_dim)
        distinct = con.execute(f"SELECT COUNT(DISTINCT {q}) FROM {t}").fetchone()[0]
        kpis.append(
            {"label": f"Distinct {pretty(primary_dim)}", "value": distinct, "format": "integer"}
        )

    return kpis[:_MAX_KPIS]


def _latest_value(con, t: str, measure_q: str, date_col: str | None):
    """Most-recent non-null value of a measure by the primary date, or None."""
    if not date_col:
        return None
    d = quote_ident(date_col)
    row = con.execute(
        f"SELECT {measure_q} FROM {t} "
        f"WHERE {measure_q} IS NOT NULL AND {d} IS NOT NULL "
        f"ORDER BY {d} DESC LIMIT 1"
    ).fetchone()
    return row[0] if row else None


# --- charts --------------------------------------------------------------


def _build_charts(con, t: str, roles: dict, profile: dict) -> list[dict]:
    charts: list[dict] = []
    main = roles.get("main_measure")
    primary_date = roles.get("primary_date")
    primary_dim = roles.get("primary_dimension")
    dimensions = roles.get("dimensions", [])

    # 1. Time series of the main measure.
    if primary_date and main:
        ts = _time_series(con, t, primary_date, main)
        if ts:
            charts.append(ts)

    # 2. Breakdown of the main measure by the primary dimension.
    if primary_dim and main:
        charts.append(_breakdown(con, t, primary_dim, main))

    # 3. Top-N ranking by a *different* dimension when one exists.
    other = [d for d in dimensions if d != primary_dim]
    if main and other:
        charts.append(_topn(con, t, other[0], main))

    # Fallbacks so an all-numeric or tiny dataset still shows something.
    if not charts:
        scatter = _scatter(con, t, roles)
        if scatter:
            charts.append(scatter)
    if not charts:
        charts.append(_table_preview(con, t, profile))

    return charts


def _time_series(con, t: str, date_col: str, measure: str) -> dict | None:
    q, m = quote_ident(date_col), quote_ident(measure)
    lo, hi = con.execute(f"SELECT MIN({q}), MAX({q}) FROM {t}").fetchone()
    if lo is None or hi is None:
        return None

    days = span_days(lo, hi)
    if days <= 60:
        grain = "day"
    elif days <= 730:
        grain = "week"
    elif days <= 366 * 5:
        grain = "month"
    else:
        grain = "quarter"

    rows = con.execute(
        f"SELECT date_trunc('{grain}', {q}) AS bucket, SUM({m}) AS value "
        f"FROM {t} WHERE {q} IS NOT NULL GROUP BY 1 ORDER BY 1"
    ).fetchall()
    return {
        "id": "timeseries",
        "type": "line",
        "title": f"{pretty(measure)} over time ({grain})",
        "x_key": "x",
        "y_key": "y",
        "x_label": pretty(date_col),
        "y_label": pretty(measure),
        "data": [{"x": jdate(b), "y": jnum(v)} for b, v in rows],
    }


def _breakdown(con, t: str, dim: str, measure: str) -> dict:
    q, m = quote_ident(dim), quote_ident(measure)
    rows = con.execute(
        f"SELECT CAST({q} AS VARCHAR) AS cat, SUM({m}) AS value "
        f"FROM {t} WHERE {q} IS NOT NULL GROUP BY 1 ORDER BY value DESC NULLS LAST"
    ).fetchall()
    data = _cap_with_other(rows)
    return {
        "id": "breakdown",
        "type": "bar",
        "title": f"{pretty(measure)} by {pretty(dim)}",
        "x_key": "x",
        "y_key": "y",
        "x_label": pretty(dim),
        "y_label": pretty(measure),
        "data": data,
    }


def _topn(con, t: str, dim: str, measure: str) -> dict:
    q, m = quote_ident(dim), quote_ident(measure)
    rows = con.execute(
        f"SELECT CAST({q} AS VARCHAR) AS cat, SUM({m}) AS value "
        f"FROM {t} WHERE {q} IS NOT NULL GROUP BY 1 "
        f"ORDER BY value DESC NULLS LAST LIMIT {_TOPN}"
    ).fetchall()
    return {
        "id": "topn",
        "type": "bar",
        "title": f"Top {pretty(dim)} by {pretty(measure)}",
        "x_key": "x",
        "y_key": "y",
        "x_label": pretty(dim),
        "y_label": pretty(measure),
        "data": [{"x": cat, "y": jnum(v)} for cat, v in rows],
    }


def _scatter(con, t: str, roles: dict) -> dict | None:
    measures = roles.get("measures", [])
    if len(measures) < 2:
        return None
    xcol, ycol = measures[0], measures[1]
    qx, qy = quote_ident(xcol), quote_ident(ycol)
    rows = con.execute(
        f"SELECT {qx}, {qy} FROM {t} "
        f"WHERE {qx} IS NOT NULL AND {qy} IS NOT NULL LIMIT 2000"
    ).fetchall()
    return {
        "id": "scatter",
        "type": "scatter",
        "title": f"{pretty(ycol)} vs {pretty(xcol)}",
        "x_key": "x",
        "y_key": "y",
        "x_label": pretty(xcol),
        "y_label": pretty(ycol),
        "data": [{"x": jnum(x), "y": jnum(y)} for x, y in rows],
    }


def _table_preview(con, t: str, profile: dict) -> dict:
    names = [c["name"] for c in profile.get("columns", [])][:6]
    if not names:
        return {"id": "table", "type": "table", "title": "Preview", "data": []}
    cols = ", ".join(quote_ident(n) for n in names)
    rows = con.execute(f"SELECT {cols} FROM {t} LIMIT 20").fetchall()
    data = [{n: jdate(jnum(v)) for n, v in zip(names, r)} for r in rows]
    return {
        "id": "table",
        "type": "table",
        "title": "Data preview",
        "data": data,
    }


def _cap_with_other(rows: list[tuple]) -> list[dict]:
    """Keep the top categories; roll the remaining tail into an 'Other' bar."""
    if len(rows) <= _BREAKDOWN_CAP:
        return [{"x": cat, "y": jnum(v)} for cat, v in rows]
    head = rows[: _BREAKDOWN_CAP - 1]
    tail = rows[_BREAKDOWN_CAP - 1 :]
    other_total = sum((v or 0) for _, v in tail)
    data = [{"x": cat, "y": jnum(v)} for cat, v in head]
    data.append({"x": "Other", "y": jnum(other_total)})
    return data
