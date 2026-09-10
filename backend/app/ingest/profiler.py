"""Build the compact JSON profile for a loaded table, then assign semantic
roles heuristically (no LLM). This profile is the single source of truth that
feeds the auto-dashboard now and every LLM prompt later — it is intentionally
small and contains only schema + aggregate numbers, never raw rows.
"""

from __future__ import annotations

import re
from typing import Any

from ..util import jdate, jnum, quote_ident

# --- type categorization -------------------------------------------------

_NUMERIC_PREFIXES = (
    "TINYINT", "SMALLINT", "INTEGER", "BIGINT", "HUGEINT",
    "UTINYINT", "USMALLINT", "UINTEGER", "UBIGINT", "UHUGEINT",
    "FLOAT", "DOUBLE", "DECIMAL", "REAL", "NUMERIC",
)
_INTEGER_PREFIXES = (
    "TINYINT", "SMALLINT", "INTEGER", "BIGINT", "HUGEINT",
    "UTINYINT", "USMALLINT", "UINTEGER", "UBIGINT", "UHUGEINT",
)
_TEMPORAL_PREFIXES = ("DATE", "TIMESTAMP", "TIME")


def _category(dtype: str) -> str:
    u = str(dtype).upper()
    if u.startswith("BOOLEAN"):
        return "boolean"
    if any(u.startswith(p) for p in _TEMPORAL_PREFIXES):
        return "temporal"
    if any(u.startswith(p) for p in _NUMERIC_PREFIXES):
        return "numeric"
    return "string"


def _is_integer_type(dtype: str) -> bool:
    return str(dtype).upper().startswith(_INTEGER_PREFIXES)


# --- role heuristics -----------------------------------------------------

# Numeric columns whose *name* looks like an identifier are excluded from
# measures (you don't sum an order id or a zip code).
_ID_NAME_RE = re.compile(
    r"(^id$)|(_id$)|(^id[_-])|(uuid)|(guid)|(zip)|(postal)|(phone)"
    r"|(ssn)|(latitude)|(longitude)|(_code$)|(^code$)",
    re.IGNORECASE,
)

# Measures whose name suggests a headline business metric get picked first as
# the "main" measure driving the auto-dashboard. Tier 0 (monetary/outcome
# metrics) beats tier 1 (counts/quantities), which beats everything else, so a
# "revenue" column is chosen over "units" when both are present.
_MEASURE_PREF_TIERS = (
    re.compile(r"(revenue|sales|amount|profit|margin|gmv|spend|price|cost|value|total)", re.I),
    re.compile(r"(qty|quantity|units|count)", re.I),
)

# Aggregation semantics: what a measure *represents* decides how to aggregate it.
# Summing an index/rating/percentage is meaningless even though the arithmetic
# works ("Total Sentiment 124.2K" on a 0-100 scale is a bug). So sums are
# reserved for additive quantities; bounded/index-like measures get avg/min/max.
_ADDITIVE_NAME_RE = re.compile(
    r"(revenue|sales|amount|profit|income|expense|cost|spend|budget|gmv|turnover"
    r"|units|qty|quantity|count|volume|orders|sum|total)",
    re.IGNORECASE,
)
_BOUNDED_NAME_RE = re.compile(
    r"(rate|ratio|pct|percent|score|index|rating|age|level|grade|share"
    r"|probability|avg|average|mean|temperature|latitude|longitude|\bpc\b)",
    re.IGNORECASE,
)


def _aggregation_kind(name: str, mn, mx) -> str:
    """Classify how a numeric measure should be aggregated.

    Returns "additive" (sum is meaningful), or "bounded" (prefer avg/min/max —
    covers indices, ratings, rates, and clearly-proportional 0..1 columns).
    Ambiguity resolves to "bounded", because a wrong sum is a visible bug while
    a missing sum still leaves a sensible average.
    """
    if _BOUNDED_NAME_RE.search(name):
        return "bounded"
    # A column bounded within [0, 1] is almost certainly a proportion/rate.
    if mn is not None and mx is not None and mn >= 0 and mx <= 1:
        return "bounded"
    if _ADDITIVE_NAME_RE.search(name):
        return "additive"
    return "bounded"


def profile_table(con, table_name: str) -> dict[str, Any]:
    """Return the full profile dict for ``table_name`` on connection ``con``."""
    t = quote_ident(table_name)
    row_count = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]

    columns: list[dict[str, Any]] = []
    for name, dtype, *_ in con.execute(f"DESCRIBE {t}").fetchall():
        columns.append(_profile_column(con, t, name, dtype, row_count))

    roles = _assign_roles(columns, row_count)
    return {"row_count": row_count, "columns": columns, "roles": roles}


def _profile_column(con, t: str, name: str, dtype: str, row_count: int) -> dict[str, Any]:
    cat = _category(dtype)
    q = quote_ident(name)
    non_null = con.execute(f"SELECT COUNT({q}) FROM {t}").fetchone()[0]
    col: dict[str, Any] = {
        "name": name,
        "type": str(dtype),
        "category": cat,
        "null_count": row_count - non_null,
    }

    if cat == "numeric":
        mn, mx, mean, std, distinct = con.execute(
            f"SELECT MIN({q}), MAX({q}), AVG({q}), STDDEV_SAMP({q}), "
            f"COUNT(DISTINCT {q}) FROM {t}"
        ).fetchone()
        col["distinct_count"] = distinct
        col["stats"] = {
            "min": jnum(mn),
            "max": jnum(mx),
            "mean": jnum(mean),
            "std": jnum(std),
        }
        # How this measure should be aggregated in KPIs (see _aggregation_kind).
        col["aggregation"] = _aggregation_kind(name, mn, mx)
    elif cat == "temporal":
        mn, mx = con.execute(f"SELECT MIN({q}), MAX({q}) FROM {t}").fetchone()
        col["stats"] = {"min": jdate(mn), "max": jdate(mx)}
    else:  # string or boolean
        distinct = con.execute(
            f"SELECT COUNT(DISTINCT {q}) FROM {t}"
        ).fetchone()[0]
        col["distinct_count"] = distinct
        tops = con.execute(
            f"SELECT CAST({q} AS VARCHAR) AS v, COUNT(*) AS c FROM {t} "
            f"WHERE {q} IS NOT NULL GROUP BY 1 ORDER BY c DESC LIMIT 5"
        ).fetchall()
        col["top_values"] = [{"value": v, "count": c} for v, c in tops]

    return col


def _assign_roles(columns: list[dict], row_count: int) -> dict[str, Any]:
    by_name = {c["name"]: c for c in columns}

    # primary_date: temporal column with the most non-null coverage.
    temporal = [c for c in columns if c["category"] == "temporal"]
    primary_date = None
    if temporal:
        primary_date = max(
            temporal, key=lambda c: row_count - c["null_count"]
        )["name"]

    # measures: numeric, not identifier-like, not a near-unique integer key.
    measures = [
        c["name"]
        for c in columns
        if c["category"] == "numeric" and not _is_id_like(c, row_count)
    ]

    # dimensions: low-cardinality strings/booleans, not constant, not unique.
    threshold = max(50, int(row_count * 0.05)) if row_count else 50
    dimensions = []
    for c in columns:
        if c["category"] not in ("string", "boolean"):
            continue
        distinct = c.get("distinct_count", 0) or 0
        if distinct <= 1:
            continue  # constant column carries no signal
        if distinct <= threshold and distinct < row_count:
            dimensions.append(c["name"])

    return {
        "primary_date": primary_date,
        "measures": measures,
        "dimensions": dimensions,
        "main_measure": _pick_main_measure(measures),
        "primary_dimension": _pick_main_dimension(dimensions, by_name),
    }


def _is_id_like(col: dict, row_count: int) -> bool:
    if _ID_NAME_RE.search(col["name"]):
        return True
    distinct = col.get("distinct_count", 0) or 0
    # near-unique integer -> it's a key, not a measure
    if row_count and _is_integer_type(col["type"]) and distinct >= 0.95 * row_count:
        return True
    return False


def _pick_main_measure(measures: list[str]) -> str | None:
    if not measures:
        return None

    def tier(name: str) -> int:
        for i, pattern in enumerate(_MEASURE_PREF_TIERS):
            if pattern.search(name):
                return i
        return len(_MEASURE_PREF_TIERS)

    # Stable sort by tier keeps original column order within a tier.
    return sorted(measures, key=tier)[0]


def _pick_main_dimension(dimensions: list[str], by_name: dict) -> str | None:
    if not dimensions:
        return None

    # Prefer a moderate number of distinct values (~8 is ideal for a bar chart);
    # avoids near-binary flags and very high-cardinality columns.
    def score(name: str) -> float:
        distinct = by_name[name].get("distinct_count", 0) or 0
        if distinct <= 0:
            return float("inf")
        return abs(distinct - 8)

    return min(dimensions, key=score)
