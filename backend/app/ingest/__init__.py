"""File ingestion: load CSV/Excel into DuckDB, then profile the result."""

from .loader import LoadResult, load_file
from .profiler import profile_table

__all__ = ["load_file", "LoadResult", "profile_table"]
