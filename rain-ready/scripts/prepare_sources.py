"""data/consolidated/hotspots.json -> data/sources/{drains.geojson,owners.csv,pockets.csv} for scripts/build_seed.py. Offline.

Every number in a pocket row traces to a signal in the consolidated card; scenario defaults say so in the note.
Run from rain-ready/:  python -m scripts.consolidate && python -m scripts.prepare_sources && python -m scripts.build_seed --out data/seed.candidate.json
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, CONS = ROOT / "data" / "sources", ROOT / "data" / "consolidated"
FCO_URL = "ifc.delhi.gov.in/sites/default/files/ifc/universal/fco_2025.pdf"


def years(dates: list[str]) -> str:
    out: dict[str, int] = {}
    for d in dates:
        out[d[:4]] = out.get(d[:4], 0) + 1
    return ", ".join(f"{y}: {n}" for y, n in sorted(out.items()))


def citation(h: dict) -> str:
    parts = []
    rows = h["waterlogging"]["rows"]
    if rows:
        pages = sorted({r["pdf_page"] for r in rows})
        sel = "; ".join(f"{r['list']} #{r['row_no']}" for r in rows)
        parts.append(f"Flood Control Order 2025, Dept of Revenue GNCTD ({FCO_URL}), Delhi Traffic Police waterlogging lists: rows {sel}, "
                     f"PDF pages {', '.join(map(str, pages))}")
    seen = set()
    for d in h["documents"]:
        if d["source"] not in seen and d["kind"] in ("waterlogging", "drain", "design", "ownership"):
            seen.add(d["source"])
            parts.append(d["source"].split(";")[0])
    parts.append("position from OpenStreetMap features named in the source text (ODbL)")
    return ". ".join(parts)


def note(h: dict, data_cut: float) -> str:
    p, w, e = h["position"], h["waterlogging"], h["exposure"]
    s = [h["note"].rstrip(".") + ".",
         f"Position about {p['radius_m']} m (grade {p['grade']}, {p['groups']} independent {'source phrase' if p['groups'] == 1 else 'source phrases'})."]
    if w["n_dates"]:
        n = w["n_dates"]
        s.append(f"Waterlogging recorded on {n} {'date' if n == 1 else 'dates'} (by year, {years(w['dates'])}); "
                 f"{w['on_ordinary_days']} on days when {int(data_cut)} or fewer places were listed citywide.")
    if h["coverage_gap"]:
        s.append("No Traffic Police list row covers this place: the lists record arterial roads, not interior lanes.")
    s.append(f"Drain capacity {h['design_mm_h']} mm/h is the 1976 design unit discharge of {h['design_cusec_per_acre']} cusec per acre; "
             "catchment, runoff coefficient and storage are scenario defaults for the kind, not measured.")
    nf = e.get("nearest_facility_m")
    s.append(f"Exposed assets = OSM schools, clinics, hospitals and libraries within {e['within_m']} m of the position"
             + (f" (nearest is {nf} m away)." if e["total"] == 0 and nf else "."))
    return " ".join(s)


def main() -> int:
    data = json.loads((CONS / "hotspots.json").read_text())
    got = data["meta"]["retrieved"]
    features, owners, pockets = [], [], []
    for d in data["drains"]:
        cite = d["citation_base"]
        if d["agency_id"]:
            cite += "; " + d["owner_source"].split(". ")[0]
        if d["data_source"] == "derived":
            cite += "; drain presence assumed, not observed"
        if d["data_source"] == "official" and d["id"].startswith(("DR-DN", "DR-PRB")):
            cite += "; I&FC Master Plan for drainage of the MCD and DDA area (1976), Karol Bagh Zone"
        features.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": d["geometry"]},
                         "properties": {"id": d["id"], "name": d["name"], "type": d["type"], "data_source": d["data_source"],
                                        "confidence": d["confidence"], "citation": cite, "note": d["note"]}})
        owners.append({"asset_id": d["id"], "agency_id": d["agency_id"] or "", "owner_source": d["owner_source"] or "none"})
    for h in data["hotspots"]:
        s = h["scenario"]
        pockets.append({"id": h["id"], "name": h["name"], "kind": h["kind"], "lat": h["position"]["lat"], "lon": h["position"]["lon"],
                        "catchment_ha": s["catchment_ha"], "runoff_c": s["runoff_c"], "storage_m3": s["storage_m3"],
                        "drain_mm_h": h["design_mm_h"], "spills_to": "", "linked_asset_ids": ";".join(h["linked_drains"]),
                        "exposed_assets": h["exposure"]["total"], "data_source": "official", "confidence": h["confidence"],
                        "note": note(h, data["meta"]["generated_from"]["ordinary_day_cut"]), "citation": citation(h)})
    (SRC / "drains.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features}, indent=1) + "\n")
    for name, cols, rows in (("owners.csv", ["asset_id", "agency_id", "owner_source"], owners), ("pockets.csv", list(pockets[0]), pockets)):
        with (SRC / name).open("w", newline="") as fh:
            w = csv.DictWriter(fh, cols, lineterminator="\n")
            w.writeheader()
            w.writerows(rows)
    print(f"wrote {len(features)} drain lines, {len(owners)} owner rows, {len(pockets)} pockets (retrieved {got})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
