"""Application configuration.

Every setting is read from an environment variable with a sensible local
default, so nothing (paths, ports, keys, CORS origins) is ever hardcoded
elsewhere in the app. A local ``.env`` file in the ``backend/`` directory is
loaded automatically if present.

Env vars:
  INSIGHTIQ_DB_PATH        path to the DuckDB file (default: backend/data/insightiq.duckdb)
  INSIGHTIQ_PORT           server port (default: 8000)
  INSIGHTIQ_CORS_ORIGINS   comma-separated allowed origins (default: http://localhost:3000)
  GROQ_API_KEY             Groq API key (unused until step 3; default: empty)
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/  (this file lives at backend/app/config.py)
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="INSIGHTIQ_",
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Reads INSIGHTIQ_DB_PATH thanks to env_prefix.
    db_path: str = Field(default=str(BACKEND_DIR / "data" / "insightiq.duckdb"))
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # GROQ_API_KEY has no INSIGHTIQ_ prefix, so bind it explicitly.
    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")

    # AI (step 3). Models are configurable but default to the spec's choices.
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fallback_model: str = "moonshotai/kimi-k2-instruct"

    # Safety cap on rows returned/executed for a chat query.
    query_row_limit: int = 500

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so env is read once per process."""
    return Settings()
