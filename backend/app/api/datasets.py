"""Dataset endpoints: upload -> profile, list, get profile, get dashboard.

Everything in this router is local and offline — no network calls. (Groq
enters in step 3.)
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from ..dashboard import build_dashboard
from ..db import Database
from ..ingest import load_file, profile_table
from ..models.schemas import (
    Dashboard,
    DatasetSummary,
    IngestReport,
    Profile,
    UploadResponse,
)
from ..storage import MetadataStore

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


def _db(request: Request) -> Database:
    return request.app.state.db


def _store(request: Request) -> MetadataStore:
    return request.app.state.store


@router.post("/upload", response_model=UploadResponse, summary="Upload a CSV/Excel file")
async def upload_dataset(request: Request, file: UploadFile = File(...)) -> UploadResponse:
    """Load the file into DuckDB, profile it, persist the profile, and return
    the dataset id, the profile, and a report of anything that was coerced."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    db = _db(request)
    store = _store(request)

    # Persist the upload to a temp file so DuckDB / pandas can read from disk.
    # The temp file is deleted immediately after loading — row data lives only
    # in the local DuckDB file from that point on.
    suffix = Path(file.filename).suffix
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        result = load_file(db, tmp_path, file.filename)
        profile = profile_table(db.conn, result.table_name)
        store.create_dataset(
            result.dataset_id,
            file.filename,
            result.table_name,
            result.row_count,
            profile,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface a clean 400 to the client
        raise HTTPException(status_code=400, detail=f"Could not process file: {exc}") from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return UploadResponse(
        dataset_id=result.dataset_id,
        filename=file.filename,
        row_count=result.row_count,
        profile=Profile.model_validate(profile),
        ingest_report=IngestReport(entries=result.report),
    )


@router.get("", response_model=list[DatasetSummary], summary="List uploaded datasets")
async def list_datasets(request: Request) -> list[DatasetSummary]:
    records = _store(request).list_datasets()
    return [
        DatasetSummary(
            id=r.id,
            filename=r.filename,
            row_count=r.row_count,
            uploaded_at=r.uploaded_at.isoformat(),
        )
        for r in records
    ]


@router.get("/{dataset_id}", response_model=Profile, summary="Get a dataset's profile")
async def get_profile(request: Request, dataset_id: str) -> Profile:
    record = _store(request).get_dataset(dataset_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return Profile.model_validate(record.profile)


@router.get(
    "/{dataset_id}/dashboard",
    response_model=Dashboard,
    summary="Get the auto-generated dashboard (KPIs + charts)",
)
async def get_dashboard(request: Request, dataset_id: str) -> Dashboard:
    record = _store(request).get_dataset(dataset_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    dash = build_dashboard(_db(request), record)
    return Dashboard.model_validate(dash)
