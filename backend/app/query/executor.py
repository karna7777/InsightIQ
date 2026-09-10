"""Execute a validated query on a DuckDB cursor and classify result columns.

Runs on a fresh cursor off the shared connection (see db.py). The SQL is a
validated single SELECT, so nothing can mutate data here.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any


def execute_query(cursor, sql: str) -> tuple[list[str], list[str], list[tuple]]:
    """Return (column_names, column_categories, rows).

    Categories ("numeric" | "temporal" | "string") are inferred from the actual
    values so chart selection can key off result shape.
    """
    cursor.execute(sql)
    names = [d[0] for d in cursor.description]
    rows = cursor.fetchall()
    categories = [_classify([r[i] for r in rows]) for i in range(len(names))]
    return names, categories, rows


def _classify(values: list[Any]) -> str:
    for v in values:
        if v is None:
            continue
        if isinstance(v, (datetime, date)):
            return "temporal"
        if isinstance(v, bool):
            return "string"
        if isinstance(v, (int, float, Decimal)):
            return "numeric"
        return "string"
    return "string"  # all-null column
