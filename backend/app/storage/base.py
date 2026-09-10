"""Abstract metadata store interface.

The rest of the app depends only on this interface, never on DuckDB directly
for metadata. Swapping in a document database later means writing one new
implementation of ``MetadataStore`` and changing a single wiring line in
``main.py`` — nothing else.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional


@dataclass
class DatasetRecord:
    id: str
    filename: str
    table_name: str
    row_count: int
    uploaded_at: datetime
    profile: dict[str, Any]


@dataclass
class ChatRecord:
    id: str
    dataset_id: str
    question: str
    sql: str
    chart_type: str
    created_at: datetime


class MetadataStore(ABC):
    """CRUD boundary for app metadata (datasets and chat history)."""

    @abstractmethod
    def create_dataset(
        self,
        dataset_id: str,
        filename: str,
        table_name: str,
        row_count: int,
        profile: dict[str, Any],
    ) -> DatasetRecord:
        ...

    @abstractmethod
    def get_dataset(self, dataset_id: str) -> Optional[DatasetRecord]:
        ...

    @abstractmethod
    def list_datasets(self) -> list[DatasetRecord]:
        ...

    # Chat methods: interface defined now, exercised from step 3.
    @abstractmethod
    def add_chat(
        self,
        chat_id: str,
        dataset_id: str,
        question: str,
        sql: str,
        chart_type: str,
    ) -> ChatRecord:
        ...

    @abstractmethod
    def list_chats(self, dataset_id: str) -> list[ChatRecord]:
        ...
