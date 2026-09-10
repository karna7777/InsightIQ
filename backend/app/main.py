"""FastAPI application entrypoint.

Run locally with:
    uvicorn app.main:app --reload --port 8000
then open http://127.0.0.1:8000/docs
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ai import GroqClient
from .api import chat, datasets, decisions, forecast, insights, investigate
from .config import get_settings
from .db import Database
from .storage import DuckDBMetadataStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    db = Database(settings.db_path)
    app.state.db = db
    # Metadata goes through the swappable store interface, never DuckDB directly.
    app.state.store = DuckDBMetadataStore(db)
    # Groq client (lazy — no network until a chat request; no key needed to boot).
    app.state.groq = GroqClient(settings)
    try:
        yield
    finally:
        db.close()


settings = get_settings()

app = FastAPI(
    title="InsightIQ",
    description=(
        "Local-only AI dashboard generator. Upload a CSV/Excel file and get an "
        "auto-generated dashboard. Step 1: upload -> profile -> auto-dashboard."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(chat.router)
app.include_router(insights.router)
app.include_router(investigate.router)
app.include_router(forecast.router)
app.include_router(decisions.router)


@app.get("/health", tags=["meta"], summary="Liveness check")
async def health() -> dict[str, str]:
    return {"status": "ok"}
