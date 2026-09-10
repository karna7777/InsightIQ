"""DuckDB connection management.

DuckDB is the whole storage layer: it holds the uploaded row data AND the app's
own metadata, in one persisted file. No external services to start.

Table layout:
  - Metadata tables ``datasets`` and ``chats`` (created here) hold app state.
  - Each uploaded file lands in its own ``ds_<id>`` table, kept separate from
    the metadata tables. All analytical queries run against these.

Concurrency / read-only note (relevant from step 3 onward):
  We deliberately keep a SINGLE read-write connection to the file for the whole
  process. DuckDB takes a write lock on the file, so opening a *second* handle
  in read-only mode against the same file is awkward and not worth it. When we
  execute untrusted, LLM-generated SQL in step 3, the safety boundary is:
    (a) a fresh ``conn.cursor()`` off this shared connection for isolation, and
    (b) the fail-fast validation chain (column allowlist, single SELECT/WITH
        only, table allowlist, EXPLAIN bind-check, injected LIMIT).
  We do NOT rely on a separate read-only file handle. Do not reintroduce one.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import duckdb


class Database:
    """Owns the process-wide DuckDB connection and ensures schema exists."""

    def __init__(self, db_path: str):
        self.path = db_path
        # Ensure the parent directory (e.g. backend/data/) exists.
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(db_path)
        self._init_metadata()

    def _init_metadata(self) -> None:
        # datasets: one row per uploaded file. `profile` is the JSON schema
        # profile that later feeds every LLM prompt.
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS datasets (
                id          VARCHAR PRIMARY KEY,
                filename    VARCHAR,
                table_name  VARCHAR,
                row_count   BIGINT,
                uploaded_at TIMESTAMP,
                profile     JSON
            )
            """
        )
        # chats: defined now, written from step 3 (text-to-SQL). Kept here so
        # the metadata schema is complete and the storage interface is stable.
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chats (
                id         VARCHAR PRIMARY KEY,
                dataset_id VARCHAR,
                question   VARCHAR,
                sql        VARCHAR,
                chart_type VARCHAR,
                created_at TIMESTAMP
            )
            """
        )

    def cursor(self) -> duckdb.DuckDBPyConnection:
        """A fresh cursor sharing this connection's catalog.

        Used for query isolation (each analytical query gets its own cursor).
        In step 3 this is where untrusted SQL runs, gated by the validation
        chain — see the module docstring.
        """
        return self.conn.cursor()

    def close(self) -> None:
        self.conn.close()


def utcnow() -> datetime:
    """Timezone-aware UTC now (datetime.utcnow() is deprecated)."""
    return datetime.now(timezone.utc)
