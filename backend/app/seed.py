"""Demo-dataset seeding.

A freshly deployed InsightIQ starts with an empty DuckDB file, so a first-time
visitor to a hosted link would see an empty library and have nothing to click
into. To give them something to explore immediately, we load a couple of small
sample datasets on startup — the same ingest path a real upload takes, so the
dashboards, insights, forecasts and Q&A all work on them for real.

Idempotent: a demo is loaded only if a dataset with its display name isn't
already present, so restarts (and a persisted DB) never create duplicates.
Seeding is best-effort — any failure is logged and skipped, never fatal to boot.
Disable entirely with INSIGHTIQ_SEED_DEMO=false.
"""

from __future__ import annotations

import logging
from pathlib import Path

from .db import Database
from .ingest import load_file, profile_table
from .storage import MetadataStore

log = logging.getLogger("insightiq.seed")

# CSVs bundled with the backend package (committed; the DuckDB file is not).
SEED_DIR = Path(__file__).resolve().parent / "seed_data"

# (source file in seed_data/, display name shown in the app). The source name
# keeps its extension so the loader can detect the file type; the display name
# is what the visitor sees in the library and command palette.
_SEED_DATASETS: list[tuple[str, str]] = [
    ("sales_sample.csv", "Retail sales (demo).csv"),
    ("ts_demo.csv", "Daily revenue — time series (demo).csv"),
]


def seed_demo_datasets(db: Database, store: MetadataStore) -> int:
    """Load any missing demo datasets. Returns how many were newly loaded."""
    existing = {r.filename for r in store.list_datasets()}
    loaded = 0
    for source, display in _SEED_DATASETS:
        if display in existing:
            continue
        path = SEED_DIR / source
        if not path.exists():
            log.warning("demo seed skipped — sample file not found: %s", path)
            continue
        try:
            result = load_file(db, str(path), source)
            profile = profile_table(db.conn, result.table_name)
            store.create_dataset(
                result.dataset_id,
                display,
                result.table_name,
                result.row_count,
                profile,
            )
            loaded += 1
            log.info("seeded demo dataset %r (%d rows)", display, result.row_count)
        except Exception:  # noqa: BLE001 — seeding must never break startup
            log.exception("failed to seed demo dataset from %s", source)
    return loaded
