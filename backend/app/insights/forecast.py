"""Forecasting + time-series anomaly detection (Level 3: Predict).

A dependency-light forecaster (numpy only — statsmodels lags pandas 3 / numpy 2):
it aggregates the measure into a period series, fits an additive
**trend + seasonality** decomposition, and projects a horizon with
residual-based prediction intervals. In-sample points whose residual exceeds a
few standard deviations are flagged as anomalies.

Consistent with the project rule: every figure — the fit, the forecast, the
intervals, the anomaly bounds — is computed here in Python. The LLM only
narrates the computed result, with deterministic fallback prose on AI failure.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from ..ai import GroqClient, GroqError
from ..ai.prompts import FORECAST_SYSTEM, build_forecast_user_prompt
from ..util import jdate, pretty, quote_ident, round2, span_days
from .investigation import _grain_for_span

# Minimum periods to attempt a forecast, seasonal cycle length per grain, and a
# sensible default horizon per grain.
_MIN_POINTS = 6
_SEASON = {"day": 7, "week": 52, "month": 12, "quarter": 4}
_HORIZON = {"day": 14, "week": 8, "month": 6, "quarter": 4}
_Z = 1.96          # ~95% prediction interval
_ANOMALY_K = 2.5   # residual z-score beyond which a point is anomalous


def build_forecast(
    db, groq: GroqClient, dataset, measure: str | None = None, horizon: int | None = None
) -> dict[str, Any]:
    con = db.cursor()
    t = quote_ident(dataset.table_name)
    profile = dataset.profile
    roles = profile.get("roles", {})
    by = {c["name"]: c for c in profile.get("columns", [])}

    base: dict[str, Any] = {"dataset_id": dataset.id, "available": False}

    date_col = roles.get("primary_date")
    if not date_col:
        return {**base, "reason": "No date/time column, so values over time cannot be forecast."}

    measure = measure if (measure and measure in by) else roles.get("main_measure")
    if not measure or by.get(measure, {}).get("category") != "numeric":
        return {**base, "reason": "No numeric measure was found to forecast."}

    # Additive measures are summed per period; bounded ones (rates/indices) are
    # averaged — summing them across a period would be meaningless.
    agg = "SUM" if by[measure].get("aggregation") == "additive" else "AVG"
    additive = agg == "SUM"

    dq, mq = quote_ident(date_col), quote_ident(measure)
    lo, hi = con.execute(f"SELECT MIN({dq}), MAX({dq}) FROM {t}").fetchone()
    if lo is None or hi is None:
        return {**base, "reason": "The date column has no usable values."}
    grain = _grain_for_span(span_days(lo, hi))

    rows = con.execute(
        f"SELECT date_trunc('{grain}', {dq}) AS b, {agg}({mq}) AS v "
        f"FROM {t} WHERE {dq} IS NOT NULL AND {mq} IS NOT NULL GROUP BY 1 ORDER BY 1"
    ).fetchall()
    periods = [b for b, _ in rows]
    y = np.array([float(v) for _, v in rows], dtype=float)
    n = len(y)
    if n < _MIN_POINTS:
        return {
            **base,
            "reason": f"Only {n} {grain}(s) of data; at least {_MIN_POINTS} are needed to forecast.",
        }

    h = horizon if (horizon and horizon > 0) else _HORIZON.get(grain, 6)
    h = min(h, 60)

    fit = _fit_and_forecast(y, n, grain, h, clamp_nonneg=additive)

    history = _history(periods, y, fit["fitted"], fit["resid_std"])
    forecast = _forecast_points(periods, grain, fit, h, clamp_nonneg=additive)
    anomaly_count = sum(1 for pt in history if pt["anomaly"])

    facts = {
        "measure": measure,
        "grain": grain,
        "method": fit["method"],
        "seasonal": fit["seasonal"],
        "history_periods": n,
        "horizon": h,
        "last_actual": {"period": jdate(periods[-1]), "value": round2(float(y[-1]))},
        "forecast": [
            {"period": p["period"], "value": p["value"], "lower": p["lower"], "upper": p["upper"]}
            for p in forecast
        ],
        "trend_per_period": round2(fit["slope"]),
        "anomaly_count": anomaly_count,
        "anomalies": [
            {"period": pt["period"], "value": pt["value"], "expected": pt["expected"]}
            for pt in history if pt["anomaly"]
        ][:5],
    }

    narrative, model = _narrate(groq, facts)

    return {
        "dataset_id": dataset.id,
        "available": True,
        "reason": None,
        "measure": measure,
        "grain": grain,
        "method": fit["method"],
        "seasonal": fit["seasonal"],
        "horizon": h,
        "history": history,
        "forecast": forecast,
        "anomaly_count": anomaly_count,
        "narrative": narrative,
        "model": model,
    }


# --- the model -----------------------------------------------------------


def _fit_and_forecast(y, n, grain, h, clamp_nonneg) -> dict[str, Any]:
    """Additive trend + seasonality fit. Returns fit arrays and parameters."""
    x = np.arange(n, dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    trend = intercept + slope * x
    detrended = y - trend

    season = _SEASON.get(grain, 0)
    seasonal_index = None
    if season and n >= 2 * season:
        idx = np.arange(n) % season
        seasonal_index = np.array(
            [detrended[idx == k].mean() if np.any(idx == k) else 0.0 for k in range(season)]
        )
        seasonal_index -= seasonal_index.mean()  # center so it doesn't shift the level
        seasonal = seasonal_index[np.arange(n) % season]
        method = f"linear trend + {_season_name(grain)} seasonality"
    else:
        seasonal = np.zeros(n)
        method = "linear trend"

    fitted = trend + seasonal
    resid = y - fitted
    resid_std = float(np.std(resid, ddof=1)) if n > 2 else 0.0

    return {
        "slope": float(slope),
        "intercept": float(intercept),
        "seasonal_index": seasonal_index,
        "season": season,
        "seasonal": seasonal_index is not None,
        "fitted": fitted,
        "resid_std": resid_std,
        "method": method,
        "n": n,
    }


def _forecast_points(periods, grain, fit, h, clamp_nonneg) -> list[dict[str, Any]]:
    n = fit["n"]
    out: list[dict[str, Any]] = []
    for step in range(1, h + 1):
        i = n + step - 1
        point = fit["intercept"] + fit["slope"] * i
        if fit["seasonal_index"] is not None:
            point += fit["seasonal_index"][i % fit["season"]]
        # Interval widens with the square root of the horizon (uncertainty
        # compounds the further out we project).
        band = _Z * fit["resid_std"] * math.sqrt(step)
        lower, upper = point - band, point + band
        if clamp_nonneg:
            point = max(point, 0.0)
            lower = max(lower, 0.0)
        out.append(
            {
                "period": jdate(_advance(periods[-1], grain, step)),
                "value": round2(point),
                "lower": round2(lower),
                "upper": round2(upper),
            }
        )
    return out


def _history(periods, y, fitted, resid_std) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, period in enumerate(periods):
        actual = float(y[i])
        expected = float(fitted[i])
        anomaly = resid_std > 0 and abs(actual - expected) > _ANOMALY_K * resid_std
        out.append(
            {
                "period": jdate(period),
                "value": round2(actual),
                "expected": round2(expected),
                "anomaly": bool(anomaly),
            }
        )
    return out


# --- helpers -------------------------------------------------------------


def _season_name(grain: str) -> str:
    return {"day": "weekly", "week": "yearly", "month": "yearly", "quarter": "yearly"}.get(
        grain, "seasonal"
    )


def _advance(period, grain, step):
    """Advance a period value by `step` grains. Works on date/datetime; falls
    back to returning a labelled offset if the value isn't a datetime."""
    from datetime import date, datetime, timedelta

    if not isinstance(period, (date, datetime)):
        return f"+{step} {grain}"
    if grain == "day":
        return period + timedelta(days=step)
    if grain == "week":
        return period + timedelta(weeks=step)
    if grain == "month":
        month = period.month - 1 + step
        year = period.year + month // 12
        return period.replace(year=year, month=month % 12 + 1, day=1)
    if grain == "quarter":
        month = period.month - 1 + 3 * step
        year = period.year + month // 12
        return period.replace(year=year, month=month % 12 + 1, day=1)
    return period + timedelta(days=step)


# --- narration -----------------------------------------------------------


def _narrate(groq: GroqClient, facts: dict[str, Any]) -> tuple[str | None, str | None]:
    try:
        data, model = groq.complete_json(
            FORECAST_SYSTEM, build_forecast_user_prompt(facts), max_tokens=500
        )
        text = str(data.get("narrative", "")).strip()
        return (text or _fallback(facts)), model
    except GroqError:
        return _fallback(facts), None


def _fallback(facts: dict[str, Any]) -> str:
    measure = pretty(facts["measure"])
    grain = facts["grain"]
    fc = facts["forecast"]
    parts = []
    if fc:
        last = facts["last_actual"]["value"]
        end = fc[-1]
        trend_word = "rise" if facts["trend_per_period"] > 0 else "decline" if facts["trend_per_period"] < 0 else "hold steady"
        parts.append(
            f"{measure} is projected to {trend_word} to about {end['value']} by "
            f"{end['period']} (range {end['lower']}–{end['upper']}), from {last} most recently, "
            f"over the next {facts['horizon']} {grain}(s)."
        )
    if facts["seasonal"]:
        parts.append(f"The fit accounts for {_season_name(grain)} seasonality.")
    if facts["anomaly_count"]:
        parts.append(
            f"{facts['anomaly_count']} past {grain}(s) were statistical anomalies "
            f"(well outside the expected range)."
        )
    return " ".join(parts) or f"{measure} forecast computed over {facts['horizon']} {grain}(s)."
