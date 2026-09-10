"""SQL validation: the fail-fast boundary for untrusted, LLM-generated SQL."""

from .validation import SQLValidationError, validate_and_prepare

__all__ = ["validate_and_prepare", "SQLValidationError"]
