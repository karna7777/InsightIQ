"""Small shared helpers used across ingest, profiling, and dashboard building."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any


def quote_ident(name: Any) -> str:
    """Safely quote a SQL identifier (column or table name).

    Column names are UNTRUSTED input — a column could literally be named
    ``ignore previous instructions`` or contain a double-quote. We never
    string-concatenate a raw identifier into SQL; we always route it through
    here, which wraps it in double quotes and escapes any embedded quotes.
    """
    return '"' + str(name).replace('"', '""') + '"'


def jnum(value: Any) -> Any:
    """Make a numeric value JSON-safe. Decimals -> float; None stays None."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return value


def round2(value: Any) -> Any:
    """JSON-safe numeric rounded to 2 decimals; ints/None pass through.

    Used for numbers that appear in insight prose and facts, so the LLM echoes
    clean values ("733.44") instead of full-precision floats.
    """
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, (float, Decimal)):
        return round(float(value), 2)
    return value


def jdate(value: Any) -> Any:
    """Make a date/datetime JSON-safe via ISO string; pass through otherwise."""
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def span_days(lo: Any, hi: Any) -> int:
    """Number of days between two temporal values, or 0 if not computable."""
    try:
        delta = hi - lo
        if isinstance(delta, timedelta):
            return delta.days
    except (TypeError, ValueError):
        pass
    return 0


def pretty(name: str) -> str:
    """Turn a raw column name into a human label: order_amount -> Order Amount."""
    return str(name).replace("_", " ").replace("-", " ").strip().title()
