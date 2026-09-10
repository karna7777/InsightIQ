"""Load an uploaded CSV/Excel file into a DuckDB table, coping with messy
real-world files, and report what had to be coerced or dropped.

Strategy:
  1. Load the raw file into a staging table (``stg_<id>``). CSV goes through
     DuckDB's sniffer with full-file type inference; Excel goes through pandas.
  2. Run a cleanup pass over VARCHAR columns: currency/thousands-formatted text
     (``$1,234.00``) becomes a real number; date-like text becomes a timestamp.
  3. Materialize the cleaned result as the final ``ds_<id>`` table and drop the
     staging table.
  4. Return a coercion report so the API can tell the user exactly what changed.

Guardrail on numeric coercion: we only convert text→number when the column
actually contains a currency symbol or thousands separator somewhere. That
avoids mangling identifier-like text (e.g. zip codes "00123" or phone numbers)
that merely looks numeric.
"""

from __future__ import annotations

import csv as pycsv
import uuid
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..db import Database
from ..util import quote_ident

# Matches optional sign, optional currency symbol, digits with optional
# thousands commas, optional decimal part. Used to decide if a text column is
# really a formatted number.
_MONEY_RE = r"^\s*[-+]?[$€£¥₹]?\s*[0-9][0-9,]*(\.[0-9]+)?\s*$"
# Characters we strip before casting a money-like string to DOUBLE.
_MONEY_STRIP = r"[$€£¥₹, ]"

CSV_EXTS = {".csv", ".tsv", ".txt"}
EXCEL_EXTS = {".xlsx", ".xls", ".xlsm"}

# Delimiter candidates, tried when DuckDB's own sniffer can't lock onto a
# dialect (usually because of junk rows above the header).
_DELIM_CANDIDATES = [",", ";", "\t", "|"]


@dataclass
class LoadResult:
    dataset_id: str
    table_name: str
    row_count: int
    report: list[dict[str, Any]] = field(default_factory=list)


def load_file(db: Database, file_path: str, original_filename: str) -> LoadResult:
    ext = Path(original_filename).suffix.lower()
    dataset_id = uuid.uuid4().hex[:12]
    table_name = f"ds_{dataset_id}"
    staging = f"stg_{dataset_id}"
    con = db.conn
    report: list[dict[str, Any]] = []

    try:
        if ext in CSV_EXTS:
            _load_csv(con, staging, file_path, report)
        elif ext in EXCEL_EXTS:
            _load_excel(con, staging, file_path, report)
        else:
            raise ValueError(
                f"Unsupported file type '{ext}'. Upload a CSV or Excel file."
            )

        _clean_into_final(con, staging, table_name, report)
    finally:
        con.execute(f'DROP TABLE IF EXISTS {quote_ident(staging)}')

    row_count = con.execute(
        f"SELECT COUNT(*) FROM {quote_ident(table_name)}"
    ).fetchone()[0]
    return LoadResult(dataset_id, table_name, row_count, report)


# --- raw loading ---------------------------------------------------------


def _load_csv(con, staging: str, path: str, report: list) -> None:
    tbl = quote_ident(staging)
    # First pass: strict, full-file inference so types are trustworthy. DuckDB's
    # sniffer handles clean files and mild junk on its own.
    try:
        con.execute(
            f"CREATE TABLE {tbl} AS "
            f"SELECT * FROM read_csv_auto(?, sample_size=-1)",
            [path],
        )
        return
    except Exception as exc:  # noqa: BLE001 — recover below
        con.execute(f"DROP TABLE IF EXISTS {tbl}")
        first_error = exc

    # Second pass: the sniffer failed — most often because of junk rows above
    # the real header (a title line, an export note). Detect the delimiter and
    # header offset ourselves, then let pandas (far more tolerant of malformed
    # CSVs than DuckDB's sniffer) parse from the header down. The resulting
    # frame is registered into DuckDB, then the normal cleanup pass runs.
    import pandas as pd

    delim, skip = _detect_delim_and_skip(path)
    df = pd.read_csv(
        path,
        skiprows=skip,
        sep=delim,
        engine="python",
        on_bad_lines="skip",
    )
    df.columns = [str(c) for c in df.columns]
    _register_df(con, staging, df)

    if skip > 0:
        report.append(
            {
                "column": None,
                "action": "dropped_rows",
                "note": f"Skipped {skip} junk line(s) above the header row.",
            }
        )
    report.append(
        {
            "column": None,
            "action": "recovered",
            "note": (
                "DuckDB could not auto-detect the CSV dialect "
                f"({type(first_error).__name__}); re-parsed with pandas "
                f"(delimiter={delim!r}). Some malformed rows may have been skipped."
            ),
        }
    )


def _detect_delim_and_skip(path: str) -> tuple[str, int]:
    """Find the most likely delimiter and how many leading lines to skip.

    Reads a small window of lines, and for each candidate delimiter finds the
    modal field count. The header is the first line whose field count matches
    that mode and is followed by another matching line; everything above it is
    junk to skip. Picks the delimiter with the most consistent body.
    """
    with open(path, "r", encoding="utf-8", errors="replace", newline="") as fh:
        lines = [fh.readline().rstrip("\r\n") for _ in range(50)]
    lines = [ln for ln in lines if ln != ""]

    best_delim, best_skip, best_score = ",", 0, -1
    for delim in _DELIM_CANDIDATES:
        # Quote-aware field counting: a delimiter inside a quoted value (e.g.
        # "$1,234.00") must not inflate the count, or header detection breaks.
        counts = _field_counts(lines, delim)
        multi = [c for c in counts if c > 1]
        if not multi:
            continue
        modal = Counter(multi).most_common(1)[0][0]
        skip = None
        for i, c in enumerate(counts):
            nxt_ok = i + 1 >= len(counts) or counts[i + 1] == modal
            if c == modal and nxt_ok:
                skip = i
                break
        if skip is None:
            continue
        score = sum(1 for c in counts[skip:] if c == modal)
        if score > best_score:
            best_delim, best_skip, best_score = delim, skip, score

    return best_delim, best_skip


def _field_counts(lines: list[str], delim: str) -> list[int]:
    """Field count per line under ``delim``, respecting CSV quoting."""
    try:
        return [len(row) for row in pycsv.reader(lines, delimiter=delim)]
    except pycsv.Error:
        return [len(ln.split(delim)) for ln in lines]


def _load_excel(con, staging: str, path: str, report: list) -> None:
    import pandas as pd

    df = pd.read_excel(path)  # first sheet
    before = len(df)
    # Drop fully-empty rows (common junk in exported spreadsheets).
    df = df.dropna(how="all")
    dropped = before - len(df)
    if dropped:
        report.append(
            {
                "column": None,
                "action": "dropped_rows",
                "note": f"Dropped {dropped} fully-empty row(s) from the sheet.",
            }
        )
    # Normalize column names to strings (Excel can yield ints / NaN headers).
    df.columns = [str(c) for c in df.columns]
    _register_df(con, staging, df)


def _register_df(con, staging: str, df) -> None:
    """Materialize a pandas DataFrame into the staging table via DuckDB."""
    con.register("df_ingest_tmp", df)
    try:
        con.execute(
            f"CREATE TABLE {quote_ident(staging)} AS SELECT * FROM df_ingest_tmp"
        )
    finally:
        con.unregister("df_ingest_tmp")


# --- cleanup pass --------------------------------------------------------


def _clean_into_final(con, staging: str, final: str, report: list) -> None:
    cols = con.execute(f"DESCRIBE {quote_ident(staging)}").fetchall()
    select_exprs: list[str] = []
    for name, dtype, *_ in cols:
        q = quote_ident(name)
        if str(dtype).upper().startswith("VARCHAR"):
            expr = _clean_varchar_expr(con, staging, name, q, report)
            select_exprs.append(f"{expr} AS {q}")
        else:
            select_exprs.append(q)

    con.execute(
        f"CREATE TABLE {quote_ident(final)} AS "
        f"SELECT {', '.join(select_exprs)} FROM {quote_ident(staging)}"
    )


def _clean_varchar_expr(con, staging: str, name: str, q: str, report: list) -> str:
    """Decide how (if at all) to coerce a VARCHAR column; return a SQL expr."""
    tbl = quote_ident(staging)
    non_null = con.execute(
        f"SELECT COUNT({q}) FROM {tbl}"
    ).fetchone()[0]
    if not non_null:
        return q  # all-null column, nothing to coerce

    # --- currency / thousands-formatted numbers ---
    money_like = con.execute(
        f"SELECT COUNT(*) FROM {tbl} "
        f"WHERE {q} IS NOT NULL AND regexp_matches(CAST({q} AS VARCHAR), ?)",
        [_MONEY_RE],
    ).fetchone()[0]
    has_symbol = con.execute(
        f"SELECT COUNT(*) FROM {tbl} "
        f"WHERE {q} IS NOT NULL AND regexp_matches(CAST({q} AS VARCHAR), ?)",
        [r"[$€£¥₹,]"],
    ).fetchone()[0]
    if money_like / non_null >= 0.9 and has_symbol > 0:
        report.append(
            {
                "column": name,
                "action": "coerced",
                "from_type": "VARCHAR",
                "to_type": "DOUBLE",
                "note": "Stripped currency/thousands formatting and parsed as number.",
            }
        )
        return f"TRY_CAST(regexp_replace(TRIM({q}), '{_MONEY_STRIP}', '', 'g') AS DOUBLE)"

    # --- date/timestamp-like text (that the CSV sniffer left as text) ---
    date_like = con.execute(
        f"SELECT COUNT(TRY_CAST({q} AS TIMESTAMP)) FROM {tbl} WHERE {q} IS NOT NULL"
    ).fetchone()[0]
    if date_like / non_null >= 0.9:
        report.append(
            {
                "column": name,
                "action": "coerced",
                "from_type": "VARCHAR",
                "to_type": "TIMESTAMP",
                "note": "Parsed text values as timestamps.",
            }
        )
        return f"TRY_CAST({q} AS TIMESTAMP)"

    return q
