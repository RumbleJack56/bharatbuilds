"""Scenario projections for a pocket: runoff, how much of its drain is used, silt, and time to fill.
Pure. THIS IS A SCENARIO TOOL, NOT A FORECAST: pocket size, catchment and drain capacity are parameters, shown with ranges."""
from datetime import date, timedelta

from . import lowpoints as lp
from . import planning

RAINS = tuple(sorted({20.0, planning.REF_RAIN_MM_H, 35.0, 50.0}))   # mm/h, Delhi short-burst scenarios; the reference rain is used everywhere else
HORIZONS = (0, 30, 60, 90)         # days from today with no cleaning in between


def silt_at(last_clean: date | None, today: date, horizon_days: int) -> float:
    """Silt fraction `horizon_days` from today if the drain is not cleaned. 'Never on record' stays at the prior."""
    return planning.silt_fraction(last_clean, today + timedelta(days=horizon_days))


def silt_curve(days: tuple[int, ...] = (0, 15, 30, 60, 90, 120, 180)) -> list[dict]:
    """Silt fraction by days since a confirmed clean (the model's own curve, the same for every drain)."""
    t = date(2000, 1, 1)
    return [{"days": d, "silt_fraction": round(planning.silt_fraction(t, t + timedelta(days=d)), 3)} for d in days]


def project(pockets: list[dict], last_clean: dict[str, date | None], today: date,
            rains: tuple[float, ...] = RAINS, horizons: tuple[int, ...] = HORIZONS) -> list[dict]:
    """One entry per (rain, horizon) with a row for every pocket. `pockets` are service.pocket_rows dicts."""
    out = []
    for h in horizons:
        silt = {a: silt_at(c, today, h) for a, c in last_clean.items()}
        for rain in rains:
            built = planning.build_pockets(pockets, silt, "current")
            sim = {r["id"]: r for r in lp.simulate(built, rain)}
            rng = planning.fill_time_range(built, rain)
            rows = []
            for p, b in zip(pockets, built):
                r = sim[p["id"]]
                demand = p["runoff_c"] * rain                                  # mm/h of runoff the catchment sends to the drain
                cap = r["effective_drain_mm_h"]
                area_m2 = p["catchment_ha"] * 10_000
                rows.append({"id": p["id"], "name": p["name"], "level": r["level"], "time_to_fill_h": r["time_to_fill_h"],
                             "time_to_fill_h_low": rng[p["id"]][0], "time_to_fill_h_high": rng[p["id"]][1],
                             "silt_fraction": round(b.silt_fraction, 3), "capacity_mm_h": cap, "runoff_mm_h": round(demand, 2),
                             "utilisation_pct": round(100 * demand / cap) if cap > 0 else None,
                             "runoff_m3_h": round(demand / 1000 * area_m2, 1), "excess_m3_h": r["own_inflow_m3_h"],
                             "storage_m3": p["storage_m3"], "spills_to": p["spills_to"]})
            out.append({"rain_mm_h": rain, "horizon_days": h, "pockets": rows})
    return out
