"""Low-point fill SCENARIO simulator. Pure functions, no I/O. Owner: dev#3 (logic reviewed by dev#4).

THIS IS A SCENARIO TOOL, NOT A FORECAST. Pocket geometry, catchments and storage volumes are hand-placed
illustrative parameters (30 m elevation data cannot locate street-level pockets). Output is relative
ordering and "what if" timing, shown with ranges and a banner. Never show it as a prediction or as depth.

Physics (CPHEEO rational-method style, see docs/Rain_Ready_System_Design.md section 3):
  effective rain      = max(0, C * rain_mm_h - D_eff)            [mm/h over the catchment]
  own inflow          = effective rain / 1000 * catchment_m2      [m3/h]
  D_eff               = D_design * (1 - min(0.9, 1.2 * silt_fraction))
  (silt_fraction = silt depth / design depth; capacity lost ~ 1.1-1.3 x that ratio)
Pockets form a spill forest: a full pocket passes its whole inflow to `spills_to`.
"""
from __future__ import annotations

from dataclasses import dataclass

SILT_LOSS_FACTOR = 1.2
MAX_CAPACITY_LOSS = 0.9
SILTED_PRESET_FRACTION = 0.25     # "silted" preset: 25% of design depth is silt (~30 cm in a 1.2 m drain)

# thresholds on time-to-fill, in hours
HIGH_H = 1.0
ELEVATED_H = 3.0


@dataclass
class Pocket:
    id: str
    name: str
    kind: str                    # underpass | saucer | low_lane | other
    catchment_ha: float
    runoff_c: float
    storage_m3: float
    drain_mm_h: float            # design drainage capacity expressed as mm/h over the catchment
    spills_to: str | None = None
    silt_fraction: float = 0.0   # filled in by the caller according to drain_state


def effective_capacity(drain_mm_h: float, silt_fraction: float) -> float:
    loss = min(MAX_CAPACITY_LOSS, SILT_LOSS_FACTOR * max(0.0, silt_fraction))
    return drain_mm_h * (1.0 - loss)


def own_inflow_m3_h(p: Pocket, rain_mm_h: float) -> float:
    net_mm_h = max(0.0, p.runoff_c * rain_mm_h - effective_capacity(p.drain_mm_h, p.silt_fraction))
    return net_mm_h / 1000.0 * p.catchment_ha * 10_000.0


def level(time_to_fill_h: float | None) -> str:
    if time_to_fill_h is None:
        return "none"          # no net inflow in this scenario
    if time_to_fill_h <= HIGH_H:
        return "high"
    if time_to_fill_h <= ELEVATED_H:
        return "elevated"
    return "watch"


def _validate(pockets: list[Pocket]) -> dict[str, Pocket]:
    by_id = {p.id: p for p in pockets}
    if len(by_id) != len(pockets):
        raise ValueError("duplicate pocket id")
    for p in pockets:
        if p.storage_m3 <= 0 or p.catchment_ha < 0 or not 0 <= p.runoff_c <= 1 or p.drain_mm_h < 0:
            raise ValueError(f"{p.id}: storage must be > 0, catchment >= 0, runoff_c in [0,1], drain >= 0")
        if p.spills_to is not None and p.spills_to not in by_id:
            raise ValueError(f"{p.id} spills to unknown pocket {p.spills_to}")
        seen, cur = set(), p
        while cur.spills_to is not None:       # cycle check
            if cur.id in seen:
                raise ValueError("spill cycle")
            seen.add(cur.id)
            cur = by_id[cur.spills_to]
    return by_id


def simulate(pockets: list[Pocket], rain_mm_h: float, at_h: float = 1.0) -> list[dict]:
    """Event-driven fill. Returns one dict per pocket, sorted by fill order (never-filling last).
    fill_pct_at is the fill percentage at time `at_h` hours after rain starts (for animation/scrubbing)."""
    if rain_mm_h < 0 or at_h < 0:
        raise ValueError("rain and time must be non-negative")
    by_id = _validate(pockets)
    own = {p.id: own_inflow_m3_h(p, rain_mm_h) for p in pockets}
    vol = {p.id: 0.0 for p in pockets}
    filled_at: dict[str, float] = {}
    vol_at: dict[str, float] = {}
    t = 0.0

    def inflows() -> dict[str, float]:
        """Total inflow now = own + outflow of full upstream pockets (full pocket passes its inflow on)."""
        total = dict(own)
        # process full pockets from upstream to downstream; repeat until stable (forest, so len(pockets) passes suffice)
        for _ in range(len(pockets)):
            new = dict(own)
            for p in pockets:
                if p.id in filled_at and p.spills_to is not None:
                    new[p.spills_to] += total[p.id]
            if new == total:
                break
            total = new
        return total

    while True:
        flow = inflows()
        candidates = []
        for p in pockets:
            if p.id in filled_at:
                continue
            if flow[p.id] > 1e-12:
                candidates.append(((p.storage_m3 - vol[p.id]) / flow[p.id], p.id))   # ties resolved by id (min over tuples)
        # record state at at_h if it falls in this stage
        stage_end = t + min(c[0] for c in candidates) if candidates else float("inf")
        if at_h >= t and at_h <= stage_end:
            for p in pockets:
                if p.id not in vol_at:
                    vol_at[p.id] = p.storage_m3 if p.id in filled_at else min(p.storage_m3, vol[p.id] + flow[p.id] * (at_h - t))
        if not candidates:
            break
        dt, first = min(candidates)
        for p in pockets:
            if p.id not in filled_at:
                vol[p.id] = min(p.storage_m3, vol[p.id] + flow[p.id] * dt)
        t += dt
        filled_at[first] = t
        # any pocket that reached storage at the same instant
        for p in pockets:
            if p.id not in filled_at and vol[p.id] >= p.storage_m3 - 1e-9:
                filled_at[p.id] = t
    for p in pockets:
        vol_at.setdefault(p.id, p.storage_m3 if p.id in filled_at else vol[p.id])

    out = []
    for p in pockets:
        ttf = filled_at.get(p.id)
        out.append({
            "id": p.id, "name": p.name, "kind": p.kind,
            "time_to_fill_h": None if ttf is None else round(ttf, 3),
            "level": level(ttf),
            "fill_pct_at": round(100.0 * vol_at[p.id] / p.storage_m3, 1) if p.storage_m3 > 0 else 100.0,
            "own_inflow_m3_h": round(own[p.id], 2),
            "effective_drain_mm_h": round(effective_capacity(p.drain_mm_h, p.silt_fraction), 2),
            "spills_to": p.spills_to,
        })
    out.sort(key=lambda r: (r["time_to_fill_h"] is None, r["time_to_fill_h"] or 0.0, r["id"]))
    for i, r in enumerate(out, 1):
        r["fill_order"] = i if r["time_to_fill_h"] is not None else None
    return out
