"""Build data/seed.json from files in data/sources/. No network. See docs/DATA.md.

  data/sources/*.geojson   drain lines -> one asset point each (midpoint along the line)
  data/sources/owners.csv  asset_id,agency_id,owner_source   (who owns which asset, with its citation)
  data/sources/pockets.csv waterlogging pockets
  data/sources/base.json   agencies, users, sites (optional; defaults to those in the current seed.json)
Run from rain-ready/:  python -m scripts.build_seed [--src data/sources] [--out data/seed.json]
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

from core import geo, seedcheck

ROOT = Path(__file__).resolve().parent.parent
POCKET_NUMBERS = ("lat", "lon", "catchment_ha", "runoff_c", "storage_m3", "drain_mm_h")


def midpoint(coords: list[list[float]]) -> tuple[float, float]:
    """Point halfway along a polyline of [lon, lat] vertices."""
    legs = [geo.haversine_m(a[1], a[0], b[1], b[0]) for a, b in zip(coords, coords[1:])]
    half, run = sum(legs) / 2, 0.0
    for (a, b), d in zip(zip(coords, coords[1:]), legs):
        if d and run + d >= half:
            f = (half - run) / d
            return a[1] + f * (b[1] - a[1]), a[0] + f * (b[0] - a[0])
        run += d
    return coords[0][1], coords[0][0]


def _lines(geom: dict) -> list[list[list[float]]]:
    if geom["type"] == "LineString":
        return [geom["coordinates"]]
    if geom["type"] == "MultiLineString":
        return geom["coordinates"]
    return []


def read_drains(path: Path) -> list[dict]:
    """GeoJSON drain lines to asset rows. Properties: id, name, type, citation, confidence, data_source."""
    out = []
    for i, f in enumerate(json.loads(path.read_text()).get("features", [])):
        lines = _lines(f.get("geometry") or {})
        if not lines:
            continue
        longest = max(lines, key=lambda c: sum(geo.haversine_m(a[1], a[0], b[1], b[0]) for a, b in zip(c, c[1:])))
        lat, lon = midpoint(longest)
        p = f.get("properties") or {}
        raw = str(p.get("id") or p.get("@id") or f"{path.stem}-{i:04d}")
        out.append({"id": re.sub(r"[^A-Za-z0-9_.-]+", "-", raw), "type": p.get("type", "drain_segment"),
                    "name": p.get("name") or "Unnamed drain", "lat": round(lat, 6), "lon": round(lon, 6),
                    "agency_id": None, "owner_source": "none", "last_confirmed_clean": None,
                    "data_source": p.get("data_source", "osm"), "confidence": p.get("confidence", "low"),
                    "citation": p.get("citation") or "", "note": p.get("note")})
    return out


def read_owners(path: Path) -> dict[str, dict]:
    with path.open(newline="") as fh:
        return {r["asset_id"]: {"agency_id": r.get("agency_id") or None, "owner_source": r.get("owner_source") or "none"}
                for r in csv.DictReader(fh)}


def read_pockets(path: Path) -> list[dict]:
    out = []
    with path.open(newline="") as fh:
        for r in csv.DictReader(fh):
            row = {k: (float(v) if k in POCKET_NUMBERS else v) for k, v in r.items() if v != ""}
            row["linked_asset_ids"] = [a for a in re.split(r"[;|]", row.get("linked_asset_ids", "")) if a]
            row["exposed_assets"] = int(float(row.get("exposed_assets", 0)))
            row.setdefault("spills_to", None)
            out.append(row)
    return out


def build(src: Path, base: dict) -> dict:
    assets = [a for f in sorted(src.glob("*.geojson")) for a in read_drains(f)]
    if (src / "owners.csv").exists():
        owners = read_owners(src / "owners.csv")
        for a in assets:
            a.update(owners.get(a["id"], {}))
    pockets = read_pockets(src / "pockets.csv") if (src / "pockets.csv").exists() else []
    seed = {k: base.get(k, []) for k in ("agencies", "users", "sites")}
    seed["_readme"] = base.get("_readme", "Built by scripts/build_seed.py from data/sources/.")
    return {"_readme": seed.pop("_readme"), **seed, "assets": assets, "pockets": pockets}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "data" / "sources"))
    ap.add_argument("--out", default=str(ROOT / "data" / "seed.json"))
    a = ap.parse_args(argv)
    src, out = Path(a.src), Path(a.out)
    base_path = src / "base.json" if (src / "base.json").exists() else ROOT / "data" / "seed.json"
    seed = build(src, json.loads(base_path.read_text()))
    problems = seedcheck.validate(seed)
    if problems:
        print("not written:\n" + "\n".join(problems), file=sys.stderr)
        return 1
    out.write_text(json.dumps(seed, indent=1) + "\n")
    print(f"wrote {out}: {len(seed['assets'])} assets, {len(seed['pockets'])} pockets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
