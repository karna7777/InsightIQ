"""Auto-insights: deterministic candidate findings + narrative phrasing.

Every number is computed in Python here; the LLM only writes prose around the
numbers it is handed and never produces a figure of its own.
"""

from .decisions import build_decisions
from .forecast import build_forecast
from .investigation import build_investigation
from .report import build_insights

__all__ = ["build_insights", "build_investigation", "build_forecast", "build_decisions"]
