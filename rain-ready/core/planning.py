"""Silt prior and 'fill time gained' ranking. Pure functions. Parameters are illustrative (SCOPE.md section 6)."""
from __future__ import annotations

import math
from dataclasses import replace
from datetime import date

from . import lowpoints as lp

D_EQ = 0.50              # silt fill fraction approaches this
TAU_DAYS = 75
NEVER_DAYS = 365
REF_RAIN_MM_H = 35.0
GAIN_CAP_H = 6.0
RANGE_FRAC = 0.25        # pocket size, catchment and drain capacity are each uncertain by this much


def silt_fraction(last_clean: date | None, today: date) -> float:
    days = NEVER_DAYS if last_clean is None else max(0, (today - last_clean).days)
    return D_EQ * (1 - math.exp(-days / TAU_DAYS))


def build_pockets(pockets: list[dict], asset_silt: dict[str, float], state: str = "current") -> list[lp.Pocket]:
    """pockets: dicts with Pocket fields + linked_asset_ids (list). state: clean | silted | current."""
    out = []
    for r in pockets:
        if state == "clean":
            s = 0.0
        elif state == "silted":
            s = lp.SILTED_PRESET_FRACTION
        else:
            s = max((asset_silt.get(a, 0.0) for a in r["linked_asset_ids"]), default=0.0)
        out.append(lp.Pocket(r["id"], r["name"], r["kind"], r["catchment_ha"], r["runoff_c"], r["storage_m3"],
                             r["drain_mm_h"], r["spills_to"], s))
    return out


def _ttf(results: list[dict]) -> dict[str, float | None]:
    return {r["id"]: r["time_to_fill_h"] for r in results}


def gain_if_cleaned(pockets: list[dict], asset_silt: dict[str, float], asset_id: str,
                    rain: float = REF_RAIN_MM_H) -> dict:
    """Hours of fill time gained across all pockets if `asset_id` were cleaned. Returns best pocket + gain."""
    before = _ttf(lp.simulate(build_pockets(pockets, asset_silt), rain))
    after = _ttf(lp.simulate(build_pockets(pockets, {**asset_silt, asset_id: 0.0}), rain))
    best_id, best = None, 0.0
    for pid, b in before.items():
        a = after[pid]
        b_h = GAIN_CAP_H if b is None else min(b, GAIN_CAP_H)
        a_h = GAIN_CAP_H if a is None else min(a, GAIN_CAP_H)
        if a_h - b_h > best:
            best_id, best = pid, a_h - b_h
    return {"pocket_id": best_id, "gain_h": round(best, 3)}


def rank_score(gain_h: float, reports: int) -> float:
    return round(gain_h * (1 + 0.25 * max(0, reports - 1)), 3)


def fill_time_range(pockets: list[lp.Pocket], rain: float, frac: float = RANGE_FRAC) -> dict[str, tuple[float | None, float | None]]:
    """(low_h, high_h) of time to fill per pocket. Low: catchment and storage and drain all 25% worse. High: all 25% better.
    None means no fill in that case. The point estimate always lies between the two."""
    def run(c: float, st: float, d: float) -> dict[str, float | None]:
        return _ttf(lp.simulate([replace(p, catchment_ha=p.catchment_ha * c, storage_m3=p.storage_m3 * st,
                                         drain_mm_h=p.drain_mm_h * d) for p in pockets], rain))
    worse, better = run(1 + frac, 1 - frac, 1 - frac), run(1 - frac, 1 + frac, 1 + frac)
    return {p.id: (worse[p.id], better[p.id]) for p in pockets}
