"""DuckDB-backed implementation of the MetadataStore interface."""

from __future__ import annotations

import json
from typing import Any, Optional

from ..db import Database, utcnow
from .base import ChatRecord, DatasetRecord, MetadataStore

_DATASET_COLS = "id, filename, table_name, row_count, uploaded_at, profile"
_CHAT_COLS = "id, dataset_id, question, sql, chart_type, created_at"


class DuckDBMetadataStore(MetadataStore):
    def __init__(self, db: Database):
        self.db = db

    # --- datasets ---------------------------------------------------------

    def create_dataset(
        self,
        dataset_id: str,
        filename: str,
        table_name: str,
        row_count: int,
        profile: dict[str, Any],
    ) -> DatasetRecord:
        now = utcnow()
        self.db.conn.execute(
            f"INSERT INTO datasets ({_DATASET_COLS}) VALUES (?, ?, ?, ?, ?, ?)",
            [dataset_id, filename, table_name, row_count, now, json.dumps(profile)],
        )
        return DatasetRecord(
            id=dataset_id,
            filename=filename,
            table_name=table_name,
            row_count=row_count,
            uploaded_at=now,
            profile=profile,
        )

    def get_dataset(self, dataset_id: str) -> Optional[DatasetRecord]:
        row = self.db.conn.execute(
            f"SELECT {_DATASET_COLS} FROM datasets WHERE id = ?", [dataset_id]
        ).fetchone()
        return self._row_to_dataset(row) if row else None

    def list_datasets(self) -> list[DatasetRecord]:
        rows = self.db.conn.execute(
            f"SELECT {_DATASET_COLS} FROM datasets ORDER BY uploaded_at DESC"
        ).fetchall()
        return [self._row_to_dataset(r) for r in rows]

    # --- chats (used from step 3) ----------------------------------------

    def add_chat(
        self,
        chat_id: str,
        dataset_id: str,
        question: str,
        sql: str,
        chart_type: str,
    ) -> ChatRecord:
        now = utcnow()
        self.db.conn.execute(
            f"INSERT INTO chats ({_CHAT_COLS}) VALUES (?, ?, ?, ?, ?, ?)",
            [chat_id, dataset_id, question, sql, chart_type, now],
        )
        return ChatRecord(chat_id, dataset_id, question, sql, chart_type, now)

    def list_chats(self, dataset_id: str) -> list[ChatRecord]:
        rows = self.db.conn.execute(
            f"SELECT {_CHAT_COLS} FROM chats WHERE dataset_id = ? ORDER BY created_at",
            [dataset_id],
        ).fetchall()
        return [ChatRecord(*r) for r in rows]

    # --- helpers ----------------------------------------------------------

    @staticmethod
    def _row_to_dataset(row: tuple) -> DatasetRecord:
        rid, filename, table_name, row_count, uploaded_at, profile = row
        # DuckDB returns JSON columns as strings.
        if isinstance(profile, str):
            profile = json.loads(profile)
        return DatasetRecord(
            id=rid,
            filename=filename,
            table_name=table_name,
            row_count=row_count,
            uploaded_at=uploaded_at,
            profile=profile or {},
        )
