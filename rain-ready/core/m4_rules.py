"""Rain Capture planner: store / detain / recharge decision rules. Pure function, no I/O.

EXPERIMENTAL. Thresholds are taken from CGWB / CGWA / IS 15797 as summarised in
docs/Rain_Ready_System_Design.md section 5.2, set to the strictest where sources conflict.
NOT reviewed by a hydrogeologist. NOT for construction. The result always shows which rule decided it.
Water-table depth is an INPUT (user-entered or a labelled preset); we never assert a real plot's depth here.
"""
from __future__ import annotations

import math

BANNER = ("Experimental. Rules from CGWB / CGWA / IS 15797 summarised by the team, not reviewed by a "
          "hydrogeologist. Not for construction. Water-table depth is as entered, not verified.")

DESIGN_STORM_MM = 25.0
ANNUAL_RAIN_MM = 775.0
VOID_FRACTION = 0.35
CAPTURE_EFFICIENCY = 0.85          # first-flush and overflow losses [inf], chosen to match the doc's 55-60 m3/yr example
PIT_DEPTH_M = 2.5
DRAINDOWN_PASS_H = 24.0
DRAINDOWN_HARD_H = 48.0
CLOGGING_FACTOR = 0.5              # measured infiltration is halved for clogging (rule 7)

# Soil -> infiltration mm/h. Illustrative values chosen to reproduce the design doc's worked example
# (100 m2 roof: ~17 h sandy loam, ~41 h loam, >80 h clay loam). Replace with a measured pit test.
SOIL_MM_H = {"sandy_loam": 25.6, "loam": 10.6, "clay_loam": 5.4}


def drawdown_hours(storm_m3: float, infiltration_mm_h: float, base_side_m: float, depth_m: float = PIT_DEPTH_M) -> float:
    wetted_m2 = base_side_m ** 2 + 4 * base_side_m * (depth_m / 2.0)
    k_m_h = infiltration_mm_h * CLOGGING_FACTOR / 1000.0
    return storm_m3 / (k_m_h * wetted_m2)


def plan(
    roof_m2: float,
    water_table_m: float | None,
    *,
    in_floodplain: bool = False,
    soil: str | None = None,
    infiltration_mm_h: float | None = None,
    has_vehicular_or_wash_runoff: bool = False,
    nearest_septic_or_sewer_m: float | None = None,
    poor_groundwater_quality: bool = False,
    roof_runoff_c: float = 0.85,
    water_table_verified: bool = False,
) -> dict:
    for name, v in (("roof_m2", roof_m2), ("water_table_m", water_table_m), ("infiltration_mm_h", infiltration_mm_h),
                    ("nearest_septic_or_sewer_m", nearest_septic_or_sewer_m)):
        if v is not None and (v != v or v in (float("inf"), float("-inf"))):
            raise ValueError(f"{name} must be a finite number")
    if roof_m2 <= 0:
        raise ValueError("roof_m2 must be positive")
    if water_table_m is not None and water_table_m < 0:
        raise ValueError("water_table_m must be >= 0")
    if infiltration_mm_h is not None and infiltration_mm_h <= 0:
        raise ValueError("infiltration_mm_h must be positive")
    if nearest_septic_or_sewer_m is not None and nearest_septic_or_sewer_m < 0:
        raise ValueError("nearest_septic_or_sewer_m must be >= 0")
    if not 0 < roof_runoff_c <= 1:
        raise ValueError("roof_runoff_c must be in (0, 1]")
    storm_m3 = roof_m2 * DESIGN_STORM_MM / 1000.0 * roof_runoff_c
    annual_m3 = roof_m2 * ANNUAL_RAIN_MM / 1000.0 * roof_runoff_c * CAPTURE_EFFICIENCY
    k = infiltration_mm_h if infiltration_mm_h is not None else SOIL_MM_H.get(soil or "")
    checks: list[dict] = []
    warnings: list[str] = []
    out = {
        "banner": BANNER,
        "inputs": {"roof_m2": roof_m2, "water_table_m": water_table_m, "water_table_verified": water_table_verified,
                   "in_floodplain": in_floodplain, "soil": soil, "infiltration_mm_h": k},
        "capture": {"design_storm_mm": DESIGN_STORM_MM, "storm_volume_m3": round(storm_m3, 2),
                    "annual_roof_capture_m3": round(annual_m3, 1)},
        "checks": checks, "warnings": warnings,
        "maintenance": ["Inspect before the monsoon, after the first heavy storm, and after the monsoon.",
                        "Certificate every 2 years. Raise an alert if no inspection in 12 months or drain-down exceeds 48 h."],
        "first_flush": "Roof catchment needs a first-flush diverter (at least 2 mm) and a silt-settling chamber before any storage or recharge.",
        "structure": None,
    }
    if not water_table_verified:
        warnings.append("Water-table depth is not verified for this plot. Read the CGWB depth band before relying on this.")

    def decide(decision: str, rule: str, reason: str, source: str):
        out.update({"decision": decision, "rule_id": rule, "reason": reason, "source": source})
        return out

    if has_vehicular_or_wash_runoff:
        warnings.append("Rule 10: road, parking, balcony or wash-area runoff must never go into bores. Only roof water is planned here.")
    if poor_groundwater_quality:
        warnings.append("Rule 12: poor local groundwater quality. Any recharge is a quantity benefit only; a quality piezometer is required.")
    if nearest_septic_or_sewer_m is not None:
        ok = nearest_septic_or_sewer_m >= 10
        checks.append({"rule_id": "R9", "name": "Setback from sewer / septic (default 10 m)", "pass": ok})

    if in_floodplain:
        return decide("STORE_REUSE", "R8", "Plot is in a flood-prone / floodplain polygon: no recharge structure; store and reuse.", "CGWA")
    if water_table_m is None:
        return decide("NEEDS_DATA", "-", "Water-table depth is required.", "-")
    if water_table_m < 3:
        return decide("DETAIN_ONLY", "R1", f"Water table {water_table_m:g} m is shallower than 3 m: no recharge; detain and release slowly.", "CGWB Master Plan 2020")
    if water_table_m < 5:
        return decide("STORE_REUSE", "R2", f"Water table {water_table_m:g} m is shallower than 5 m: no recharge structure; store roof water for non-potable reuse.", "CGWA / MoJS advisory, Mar 2023")
    if nearest_septic_or_sewer_m is not None and nearest_septic_or_sewer_m < 10:
        return decide("STORE_REUSE", "R9", "A sewer or septic tank is within 10 m: no pit here; store and reuse.", "CGWA; IS 15792")
    if k is None:
        warnings.append("Add a soil class or a measured infiltration (pit test) to size a pit.")
        base = "SHALLOW_PIT_ROOF_ONLY" if water_table_m < 8 else "PIT_TRENCH_SHAFT"
        return decide("NEEDS_DATA", "R7", f"Water table {water_table_m:g} m allows recharge in principle ({base}), but infiltration is unknown.", "[inf]")

    pit_vol = storm_m3 / VOID_FRACTION
    side = max(1.0, math.ceil(math.sqrt(pit_vol / PIT_DEPTH_M) * 2) / 2)      # round up to 0.5 m
    hours = drawdown_hours(storm_m3, k, side)
    out["structure"] = {"type": "pit", "base_side_m": side, "depth_m": PIT_DEPTH_M,
                        "void_storage_m3": round(side * side * PIT_DEPTH_M * VOID_FRACTION, 2),
                        "estimated_drawdown_h": round(hours, 1)}
    status = "pass" if hours <= DRAINDOWN_PASS_H else ("marginal" if hours <= DRAINDOWN_HARD_H else "fail")
    checks.append({"rule_id": "R13", "name": f"Drain-down {hours:.0f} h (pass <= {DRAINDOWN_PASS_H:.0f}, hard limit {DRAINDOWN_HARD_H:.0f})", "pass": status == "pass", "status": status})
    if status == "fail":
        out["structure"] = None
        return decide("TANK_OR_BORE", "R7", f"Estimated drain-down {hours:.0f} h exceeds the 48 h limit: a pit would stay full. Use a tank, a bore, or slow-release detention.", "[inf]; IS 15792")
    if status == "marginal":
        warnings.append("Drain-down is between 24 h and 48 h: needs an overflow path and slow-release design; confirm with a pit test.")
    if water_table_m < 8:
        warnings.append("Water table 5 to 8 m: sources conflict (CGWA 5 m, IS 15797 8 m). Shallow pit, roof water only, no injection bore.")
        return decide("SHALLOW_PIT_ROOF_ONLY", "R3", f"Water table {water_table_m:g} m: shallow pit or trench, roof water only.", "CGWA + IS 15797 [inf]")
    if water_table_m > 15:
        out["structure"]["type"] = "shaft_with_recharge_bore"
        warnings.append("Bore bottom must stay at least 5 m above the post-monsoon water level (rule 6).")
        return decide("PIT_PLUS_RECHARGE_BORE", "R5", f"Water table {water_table_m:g} m is deeper than 15 m: a recharge bore can be added to a shaft.", "CGWB manual")
    return decide("PIT_TRENCH_SHAFT", "R4", f"Water table {water_table_m:g} m is 8 m or deeper: pits, trenches and shafts are allowed for roof water.", "IS 15797:2008")
