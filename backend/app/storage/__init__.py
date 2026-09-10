"""Metadata storage, kept behind a clean interface so the backing store
(currently DuckDB) can be swapped for a document database later without
touching the API, ingest, or dashboard code."""

from .base import ChatRecord, DatasetRecord, MetadataStore
from .duckdb_store import DuckDBMetadataStore

__all__ = [
    "MetadataStore",
    "DatasetRecord",
    "ChatRecord",
    "DuckDBMetadataStore",
]
