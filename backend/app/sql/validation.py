"""Validate untrusted, LLM-generated SQL before it runs.

Mandatory, fail-fast, in this order (per spec):
  1. Every column the model claims to use must exist in the profile.
  2. Single statement; SELECT or WITH only; no DDL/DML/file functions.
  3. Every referenced table must be in the session allowlist.
  4. DuckDB EXPLAIN as a dry-run bind check.
  5. Inject a LIMIT if none is present.

Stages 1 and 4 are *retryable* (the model can plausibly fix a bad column name
or a bind error if we feed the error back). Stages 2 and 3 are hard security
rejects — we never coach the model to get around them.

Belt-and-suspenders: the caller also runs this on a fresh cursor, and the SQL
is a single SELECT, so even a validation miss cannot mutate data. Identifiers
are compared case-insensitively; we never trust names as instructions.
"""

from __future__ import annotations

import re
from typing import Any

# Keywords that must never appear as statements/clauses (word-boundary matched,
# so identifiers like "update_time" are unaffected).
_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|create|alter|truncate|replace|attach|detach"
    r"|copy|pragma|install|load|set|reset|call|prepare|execute|vacuum|analyze"
    r"|export|import|grant|revoke|checkpoint)\b",
    re.IGNORECASE,
)
# File / external readers and catalog probes that could exfiltrate or escape.
_FORBIDDEN_FUNCS = re.compile(
    r"\b(read_csv|read_csv_auto|read_parquet|parquet_scan|read_json|read_json_auto"
    r"|read_ndjson|read_text|read_blob|glob|sniff_csv)\s*\(",
    re.IGNORECASE,
)
_FORBIDDEN_REFS = re.compile(
    r"\b(information_schema|pg_catalog|pg_|duckdb_|sqlite_|pragma_)",
    re.IGNORECASE,
)
# Table names introduced after FROM / JOIN.
_TABLE_REF = re.compile(
    r'\b(?:from|join)\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))',
    re.IGNORECASE,
)
# CTE names introduced by WITH ... AS ( ... ).
_CTE_NAME = re.compile(
    r'\b(?:with|,)\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s+as\s*\(',
    re.IGNORECASE,
)
_LIMIT = re.compile(r"\blimit\b", re.IGNORECASE)


class SQLValidationError(Exception):
    def __init__(self, message: str, *, stage: str, retryable: bool):
        super().__init__(message)
        self.stage = stage
        self.retryable = retryable


def validate_and_prepare(
    sql: str,
    profile: dict[str, Any],
    allowed_tables: set[str],
    claimed_columns: list[str],
    cursor,
    row_limit: int,
) -> str:
    """Run the full chain; return the execution-ready SQL (with LIMIT)."""
    sql = (sql or "").strip().rstrip(";").strip()
    if not sql:
        raise SQLValidationError("Model returned an empty query.", stage="empty", retryable=True)

    scan = _strip_literals(sql)  # SQL with string/identifier contents removed

    _check_columns(claimed_columns, profile)              # 1 (retryable)
    _check_single_select(sql, scan)                        # 2 (hard)
    _check_forbidden(scan)                                 # 2 (hard)
    _check_tables(scan, allowed_tables)                    # 3 (hard)
    _explain(cursor, sql)                                  # 4 (retryable)
    return _inject_limit(sql, row_limit)                   # 5


# --- stage 1: columns exist ---------------------------------------------


def _check_columns(claimed: list[str], profile: dict) -> None:
    real = {c["name"].lower() for c in profile.get("columns", [])}
    unknown = [c for c in (claimed or []) if c.lower() not in real]
    if unknown:
        raise SQLValidationError(
            f"These columns do not exist: {unknown}. Valid columns: "
            f"{sorted(c['name'] for c in profile.get('columns', []))}.",
            stage="columns",
            retryable=True,
        )


# --- stage 2: single read-only statement --------------------------------


def _check_single_select(sql: str, scan: str) -> None:
    if ";" in scan:
        raise SQLValidationError(
            "Only a single statement is allowed.", stage="single_statement", retryable=False
        )
    head = scan.lstrip().lstrip("(").lstrip()[:6].lower()
    if not (head.startswith("select") or head.startswith("with")):
        raise SQLValidationError(
            "Only SELECT (or WITH ... SELECT) queries are allowed.",
            stage="not_select",
            retryable=False,
        )


def _check_forbidden(scan: str) -> None:
    m = _FORBIDDEN.search(scan)
    if m:
        raise SQLValidationError(
            f"Forbidden keyword '{m.group(1)}' is not allowed.",
            stage="forbidden_keyword",
            retryable=False,
        )
    if _FORBIDDEN_FUNCS.search(scan):
        raise SQLValidationError(
            "File/external table functions are not allowed.",
            stage="forbidden_function",
            retryable=False,
        )
    if _FORBIDDEN_REFS.search(scan):
        raise SQLValidationError(
            "Catalog/system schema references are not allowed.",
            stage="forbidden_reference",
            retryable=False,
        )


# --- stage 3: table allowlist -------------------------------------------


def _check_tables(scan: str, allowed_tables: set[str]) -> None:
    allowed = {t.lower() for t in allowed_tables}
    ctes = {
        (a or b).lower()
        for a, b in _CTE_NAME.findall(scan)
        if (a or b)
    }
    for a, b in _TABLE_REF.findall(scan):
        name = (a or b).lower()
        if name in allowed or name in ctes:
            continue
        raise SQLValidationError(
            f"Query references table '{a or b}', which is not allowed for this dataset.",
            stage="table_allowlist",
            retryable=False,
        )


# --- stage 4: bind check via EXPLAIN ------------------------------------


def _explain(cursor, sql: str) -> None:
    try:
        cursor.execute(f"EXPLAIN {sql}")
        cursor.fetchall()
    except Exception as exc:  # noqa: BLE001
        raise SQLValidationError(
            f"Query failed to bind: {exc}", stage="explain", retryable=True
        ) from exc


# --- stage 5: inject a LIMIT --------------------------------------------


def _inject_limit(sql: str, row_limit: int) -> str:
    if _LIMIT.search(_strip_literals(sql)):
        return sql  # a LIMIT is already present; trust it
    # Wrap so the cap applies to the whole result, WITH/ORDER BY included.
    return f"SELECT * FROM (\n{sql}\n) AS _capped LIMIT {int(row_limit)}"


# --- helpers ------------------------------------------------------------


def _strip_literals(sql: str) -> str:
    """Blank out the *contents* of quoted identifiers and string literals.

    Keyword/table scanning then can't be fooled by a column literally named
    'drop table' or a string 'read_csv(...)'.
    """
    out: list[str] = []
    i, n = 0, len(sql)
    while i < n:
        ch = sql[i]
        if ch in ("'", '"'):
            quote = ch
            out.append(quote)
            i += 1
            while i < n:
                if sql[i] == quote:
                    if i + 1 < n and sql[i + 1] == quote:  # escaped quote
                        i += 2
                        continue
                    out.append(quote)
                    i += 1
                    break
                i += 1  # drop the content character
            continue
        out.append(ch)
        i += 1
    return "".join(out)
