"""Thin Groq client over the OpenAI SDK.

Only outbound network call in the whole app. Uses temperature 0 and JSON
response format for deterministic, parseable output, and falls back from the
primary model to the configured fallback model on error.
"""

from __future__ import annotations

import json
import re
from typing import Any

from openai import OpenAI

from ..config import Settings


class GroqError(RuntimeError):
    """Raised when all configured models fail or no API key is set."""


class GroqClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._models = [settings.groq_model, settings.groq_fallback_model]
        self._client: OpenAI | None = None

    def _get_client(self) -> OpenAI:
        if not self._settings.groq_api_key:
            raise GroqError(
                "GROQ_API_KEY is not set. Add it to backend/.env and restart the server."
            )
        if self._client is None:
            self._client = OpenAI(
                api_key=self._settings.groq_api_key,
                base_url=self._settings.groq_base_url,
                timeout=45.0,
            )
        return self._client

    def complete_json(
        self, system: str, user: str, max_tokens: int = 1024
    ) -> tuple[dict[str, Any], str]:
        """Return (parsed_json, model_used). Tries each model until one works."""
        client = self._get_client()
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        last_error: Exception | None = None
        for model in self._models:
            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"},
                )
                content = resp.choices[0].message.content or "{}"
                return _parse_json(content), model
            except Exception as exc:  # noqa: BLE001 — try the next model
                last_error = exc
        raise GroqError(f"All Groq models failed. Last error: {last_error}")


def _parse_json(content: str) -> dict[str, Any]:
    """Parse a JSON object, tolerating stray code fences or prose around it."""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise GroqError("Model did not return valid JSON.")
