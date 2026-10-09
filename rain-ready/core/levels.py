"""Evidence-backed closure levels (L0..L3) and soft flags. Pure functions. Owner: dev#1 (logic reviewed by dev#4).

A contractor's own photos can NEVER make an asset 'confirmed'. Independent confirmation (L2) is the control.
Soft flags are advisory: they are shown to reviewers and can withhold L1, but they are defeatable and we say so.

evidence item (dict): phase in {before, after, bank, confirm, audit}, role in {crew, resident, staff},
user_id, lat, lon, accuracy_m, server_ts (datetime), phash (hex str | None)
"""
from __future__ import annotations

from .geo import haversine_m

MAX_DIST_M = 50.0
MAX_ACCURACY_M = 100.0
PHASH_DUP_HAMMING = 6

STATUS_BY_LEVEL = {
    0: "CLAIMED",
    1: "EVIDENCE_SUBMITTED",
    2: "CONFIRMED",
    3: "AUDITED",
}


def hamming_hex(a: str, b: str) -> int:
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def evidence_flags(ev: dict, asset_lat: float, asset_lon: float, other_hashes: list[str]) -> list[str]:
    flags: list[str] = []
    d = haversine_m(ev["lat"], ev["lon"], asset_lat, asset_lon)
    acc = ev.get("accuracy_m") or 0.0
    if d > MAX_DIST_M + acc:
        flags.append("far_from_asset")
    if acc > MAX_ACCURACY_M:
        flags.append("low_gps_accuracy")
    if ev.get("phash"):
        for h in other_hashes:
            if h and hamming_hex(ev["phash"], h) <= PHASH_DUP_HAMMING:
                flags.append("duplicate_photo")
                break
    else:
        flags.append("no_photo_hash")
    return flags


HARD_FLAGS = {"far_from_asset", "duplicate_photo"}


def compute_level(evidence: list[dict]) -> tuple[int, str, list[str]]:
    """evidence items must carry a 'flags' list (from evidence_flags). Returns (level, status, notes)."""
    notes: list[str] = []
    by_phase: dict[str, list[dict]] = {}
    for e in evidence:
        by_phase.setdefault(e["phase"], []).append(e)

    def clean(items):  # items without hard flags
        return [i for i in items if not (set(i.get("flags", [])) & HARD_FLAGS)]

    crew_ok = all(clean([i for i in by_phase.get(p, []) if i["role"] == "crew"]) for p in ("before", "after", "bank"))
    crew_has = all([i for i in by_phase.get(p, []) if i["role"] == "crew"] for p in ("before", "after", "bank"))
    if not crew_has:
        return 0, STATUS_BY_LEVEL[0], ["need before, after and bank (5 m either side) photos from crew"]
    if not crew_ok:
        return 0, "FLAGGED", ["crew evidence has hard flags (far from asset or duplicate photo)"]

    crew_users = {i["user_id"] for p in ("before", "after", "bank") for i in by_phase[p] if i["role"] == "crew"}
    level = 1
    confirmers = [
        i for i in clean(by_phase.get("confirm", []))
        if i["role"] == "resident" and i["user_id"] not in crew_users
    ]
    if confirmers:
        level = 2
    else:
        notes.append("awaiting independent confirmation by a different person")
    if level == 2 and clean(by_phase.get("audit", [])):
        level = 3
    return level, STATUS_BY_LEVEL[level], notes
