"""Seed gate. Every row says where it came from; real data needs a citation. Pure, no I/O except the CLI."""
import json
import sys

from . import geo

SOURCES = ("placeholder", "hypothetical", "osm", "field", "official", "derived")
UNCITED_OK = ("placeholder", "hypothetical")        # these are labelled as not real, so no citation is needed
CONFIDENCE = ("low", "medium", "high")
TABLES = ("agencies", "users", "assets", "pockets", "sites")


def _where(table: str, row: dict, i: int) -> str:
    return f"{table}[{row.get('id', i)}]"


def validate(seed: dict) -> list[str]:
    errs: list[str] = []
    for t in TABLES:
        if not isinstance(seed.get(t), list):
            errs.append(f"{t}: missing or not a list")
    if errs:
        return errs
    ids: dict[str, set] = {}
    for t in TABLES:
        seen: set = set()
        for i, r in enumerate(seed[t]):
            if r.get("id") in seen:
                errs.append(f"{_where(t, r, i)}: duplicate id")
            seen.add(r.get("id"))
        ids[t] = seen
    for t in ("assets", "pockets", "sites"):
        for i, r in enumerate(seed[t]):
            w = _where(t, r, i)
            src = r.get("data_source")
            if src not in SOURCES:
                errs.append(f"{w}: data_source must be one of {', '.join(SOURCES)}")
            if t != "sites" and r.get("confidence") not in CONFIDENCE:
                errs.append(f"{w}: confidence must be one of {', '.join(CONFIDENCE)}")
            if src in SOURCES and src not in UNCITED_OK and not r.get("citation"):
                errs.append(f"{w}: data_source {src} needs a citation")
            lat, lon = r.get("lat"), r.get("lon")
            if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or not geo.in_ncr(lat, lon):
                errs.append(f"{w}: coordinates missing or outside the Delhi-NCR box")
    for i, r in enumerate(seed["assets"]):
        w = _where("assets", r, i)
        if not r.get("owner_source"):
            errs.append(f"{w}: owner_source is required (a citation, or 'none' / 'disputed')")
        if r.get("agency_id") is not None and r["agency_id"] not in ids["agencies"]:
            errs.append(f"{w}: unknown agency_id {r['agency_id']}")
    for i, r in enumerate(seed["pockets"]):
        w = _where("pockets", r, i)
        for a in r.get("linked_asset_ids", []):
            if a not in ids["assets"]:
                errs.append(f"{w}: linked_asset_ids has unknown asset {a}")
        if r.get("spills_to") is not None and r["spills_to"] not in ids["pockets"]:
            errs.append(f"{w}: spills_to unknown pocket {r['spills_to']}")
    for i, r in enumerate(seed["users"]):
        if r.get("agency_id") is not None and r["agency_id"] not in ids["agencies"]:
            errs.append(f"{_where('users', r, i)}: unknown agency_id {r['agency_id']}")
    return errs


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "data/seed.json"
    problems = validate(json.load(open(path)))
    print("\n".join(problems) if problems else f"{path}: ok")
    sys.exit(1 if problems else 0)
