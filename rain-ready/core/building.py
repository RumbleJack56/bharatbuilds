"""'My building' level from the caretaker's OWN answers (no terrain verdicts). Owner: dev#3.

Levels: HIGH_ATTENTION | ELEVATED | NO_SPECIFIC_FLAG.
NO_SPECIFIC_FLAG still receives the checklist when a warning is active, and is never shown as 'safe'.
"""
from __future__ import annotations


def building_level(
    basement: bool,
    entrance_below_road: bool,
    people_inside: bool,
    ramp_over_drain: bool,
    near_listed_hotspot_200m: bool,
) -> tuple[str, list[str]]:
    reasons: list[str] = []
    score = 0
    if basement:
        score += 2
        reasons.append("has_basement")
    if entrance_below_road:
        score += 1
        reasons.append("entrance_below_road")
    if ramp_over_drain:
        score += 1
        reasons.append("ramp_over_drain")
    if near_listed_hotspot_200m:
        score += 1
        reasons.append("near_listed_hotspot")
    if basement and people_inside:
        score += 1
        reasons.append("people_inside_basement")
        return "HIGH_ATTENTION", reasons  # a basement with people inside is never 'low', whatever else is true
    if score >= 4:
        return "HIGH_ATTENTION", reasons
    if score >= 2:
        return "ELEVATED", reasons
    return "NO_SPECIFIC_FLAG", reasons
