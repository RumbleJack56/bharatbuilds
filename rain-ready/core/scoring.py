"""Drain vulnerability score and tiers. Pure functions. Owner: dev#3.

Design notes (see docs/Rain_Ready_Adversarial_Review.md item 12):
- Unmeasured silt must NOT mean zero silt: we use a time-since-confirmed-clean prior.
- Rain gates the MODE (storm_mode_active), it is not a multiplier. A multiplier made P1 unreachable.
- Photo/triage severity is never an input. Weights are hypotheses, editable here.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

D_EQ = 0.50                 # prior: silt fill fraction approaches this
TAU_DAYS = 75               # prior: growth time constant (untested, editable)
FRESH_DAYS = 90             # measured silt older than this is replaced by the prior
NEVER_CLEANED_DAYS = 365    # "never confirmed clean" is treated as one year

WEIGHTS = {"silt": 0.25, "age": 0.20, "history": 0.20, "reports": 0.15, "sources": 0.10, "consequence": 0.10}

P1_MIN_V = 0.55
P2_MIN_V = 0.75
WATCH_MIN_V = 0.40


@dataclass
class AssetState:
    hotspot_listed: bool = False
    standing_water_last_monsoon: bool = False
    source_near_m: float = 1e9           # distance to market / garbage point / construction
    consequence: float = 0.2             # 1 underpass/hospital/basements/arterial, 0.5 collector, 0.2 other
    last_confirmed_clean: date | None = None   # only L2+ confirmations should set this
    silt_measured: float | None = None   # 0..1 fraction of design depth, from a dry-weather photo
    silt_measured_on: date | None = None


def _days_since_clean(a: AssetState, today: date) -> int:
    if a.last_confirmed_clean is None:
        return NEVER_CLEANED_DAYS
    return max(0, (today - a.last_confirmed_clean).days)


def silt_fill(a: AssetState, today: date) -> tuple[float, str]:
    """Returns (fill_fraction, basis) where basis is 'measured' or 'estimated'."""
    if a.silt_measured is not None and a.silt_measured_on is not None:
        if (today - a.silt_measured_on).days <= FRESH_DAYS:
            return a.silt_measured, "measured"
    days = _days_since_clean(a, today)
    return D_EQ * (1 - math.exp(-days / TAU_DAYS)), "estimated"


def vulnerability(a: AssetState, today: date, trusted_report_clusters: int = 0) -> tuple[float, str, dict]:
    """Returns (V in 0..1, basis, components) so the UI can show *why*."""
    fill, basis = silt_fill(a, today)
    cycle = 120 if a.hotspot_listed else 365
    comp = {
        "silt": min(1.0, fill / D_EQ),
        "age": min(1.0, _days_since_clean(a, today) / cycle),
        "history": 1.0 if a.hotspot_listed else (0.6 if a.standing_water_last_monsoon else 0.0),
        "reports": min(1.0, trusted_report_clusters / 3),
        "sources": 1.0 if a.source_near_m <= 100 else (0.5 if a.source_near_m <= 250 else 0.0),
        "consequence": a.consequence,
    }
    v = sum(WEIGHTS[k] * comp[k] for k in WEIGHTS)
    return round(v, 4), basis, comp


def tier(v: float, storm_mode_active: bool) -> str:
    if storm_mode_active and v >= P1_MIN_V:
        return "P1"
    if v >= P2_MIN_V:
        return "P2"
    if v >= WATCH_MIN_V:
        return "WATCH"
    return "NONE"
