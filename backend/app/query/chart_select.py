"""Deterministic chart selection from a result set (not the LLM).

Chosen from the shape of the result, per spec:
  date + one numeric              -> line
  one dimension + one numeric     -> bar (top-N + "Other" when many rows)
  two numerics                    -> scatter
  single row, single numeric      -> KPI
  anything else                   -> table

Also builds the compact, aggregate-only summary that the takeaway prompt is
given — for table results it deliberately omits values so no raw rows leave
the machine.
"""

from __future__ import annotations

from typing import Any

from ..util import jdate, jnum, pretty

_BAR_CAP = 12
_TAKEAWAY_POINTS = 30


def select_result_chart(
    names: list[str], cats: list[str], rows: list[tuple]
) -> tuple[dict | None, dict | None]:
    """Return (chart_spec, kpi). Exactly one is non-None."""
    n_rows = len(rows)
    n_cols = len(names)
    numeric = [i for i, c in enumerate(cats) if c == "numeric"]
    temporal = [i for i, c in enumerate(cats) if c == "temporal"]
    string = [i for i, c in enumerate(cats) if c == "string"]

    # single row, single numeric -> KPI
    if n_rows == 1 and n_cols == 1 and len(numeric) == 1:
        return None, {
            "label": pretty(names[0]),
            "value": jnum(rows[0][0]),
            "format": "number",
        }

    # date + one numeric -> line
    if n_cols == 2 and len(temporal) == 1 and len(numeric) == 1:
        ti, yi = temporal[0], numeric[0]
        ordered = sorted(rows, key=lambda r: (r[ti] is None, r[ti]))
        data = [{"x": jdate(r[ti]), "y": jnum(r[yi])} for r in ordered]
        return _spec("line", "result-line", f"{pretty(names[yi])} over time",
                     names[ti], names[yi], data), None

    # two numerics -> scatter
    if n_cols == 2 and len(numeric) == 2 and not temporal and not string:
        xi, yi = numeric
        data = [{"x": jnum(r[xi]), "y": jnum(r[yi])} for r in rows]
        return _spec("scatter", "result-scatter",
                     f"{pretty(names[yi])} vs {pretty(names[xi])}",
                     names[xi], names[yi], data), None

    # one dimension + one numeric -> bar (top-N + Other when many)
    if n_cols == 2 and len(string) == 1 and len(numeric) == 1:
        di, yi = string[0], numeric[0]
        pairs = [(str(r[di]) if r[di] is not None else "—", r[yi]) for r in rows]
        pairs.sort(key=lambda p: (p[1] is None, -(p[1] or 0)))
        data = _cap_with_other(pairs)
        return _spec("bar", "result-bar",
                     f"{pretty(names[yi])} by {pretty(names[di])}",
                     names[di], names[yi], data), None

    # anything else -> table
    data = [
        {names[i]: jdate(jnum(r[i])) for i in range(n_cols)}
        for r in rows
    ]
    return {"id": "result-table", "type": "table", "title": "Result", "data": data}, None


def summarize_result(
    question: str,
    names: list[str],
    rows: list[tuple],
    chart: dict | None,
    kpi: dict | None,
) -> dict[str, Any]:
    """Compact, aggregate-only summary for the takeaway prompt.

    Never includes raw row values for a table result — only the shape. Chart
    data (line/bar/scatter) and KPI values are already aggregates and are safe
    to include, capped.
    """
    summary: dict[str, Any] = {
        "question": question,
        "result_columns": names,
        "row_count": len(rows),
    }
    if kpi is not None:
        summary["value"] = {kpi["label"]: kpi["value"]}
    elif chart is not None and chart["type"] in ("line", "bar", "scatter"):
        summary["data_points"] = chart["data"][:_TAKEAWAY_POINTS]
    # table -> shape only, no values
    return summary


def _spec(chart_type, cid, title, x_col, y_col, data) -> dict:
    return {
        "id": cid,
        "type": chart_type,
        "title": title,
        "x_key": "x",
        "y_key": "y",
        "x_label": pretty(x_col),
        "y_label": pretty(y_col),
        "data": data,
    }


def _cap_with_other(pairs: list[tuple]) -> list[dict]:
    if len(pairs) <= _BAR_CAP:
        return [{"x": cat, "y": jnum(v)} for cat, v in pairs]
    head = pairs[: _BAR_CAP - 1]
    other = sum((v or 0) for _, v in pairs[_BAR_CAP - 1 :])
    data = [{"x": cat, "y": jnum(v)} for cat, v in head]
    data.append({"x": "Other", "y": jnum(other)})
    return data
