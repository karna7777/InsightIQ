"""Have Groq phrase a one-line takeaway around already-computed numbers.

The model is given only the compact aggregate summary (never raw rows) and is
instructed to use only those numbers. If the call fails, we fall back to a
deterministic sentence so a takeaway never blocks the answer.
"""

from __future__ import annotations

from typing import Any

from .groq_client import GroqClient, GroqError
from .prompts import TAKEAWAY_SYSTEM, build_takeaway_user_prompt


def phrase_takeaway(groq: GroqClient, summary: dict[str, Any]) -> str:
    try:
        data, _ = groq.complete_json(
            TAKEAWAY_SYSTEM, build_takeaway_user_prompt(summary), max_tokens=200
        )
        text = str(data.get("takeaway", "")).strip()
        return text or _fallback(summary)
    except GroqError:
        return _fallback(summary)


def _fallback(summary: dict[str, Any]) -> str:
    n = summary.get("row_count", 0)
    return f"The query returned {n} row{'s' if n != 1 else ''}."
