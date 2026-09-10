"""AI integration (Groq via the OpenAI-compatible API).

This is the ONLY part of the app that touches the network, and it sends only
the schema profile and locally-computed aggregate numbers — never raw rows.
"""

from .groq_client import GroqClient, GroqError

__all__ = ["GroqClient", "GroqError"]
