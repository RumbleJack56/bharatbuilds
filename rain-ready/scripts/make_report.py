"""data/consolidated + raw snapshots -> docs/data-report.html (self-contained) and data/consolidated/signals.json.

The page is scripts/report_template.html with the data inlined. Findings text is computed here from the cards.
Run from rain-ready/:  python -m scripts.make_report [--fragment PATH]   (fragment: no doctype, for the Artifact publish)
"""
import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW, CONS = ROOT / "data" / "raw", ROOT / "data" / "consolidated"
BOUNDS = {"s": 28.630, "n": 28.671, "w": 77.165, "e": 77.208}
SHORT = {"LP-KBM": "Karol Bagh Metro", "LP-JHB": "Dayal Chowk / Jhandewalan", "LP-FIL": "Filmistan", "LP-ANP": "Anand Parbat",
         "LP-EPN": "East Patel Nagar", "LP-ORN": "Old Rajinder Nagar"}
DRAIN_CLASS = {"osm_line": "real", "road_end": "inferred", "road_nearest": "assumed"}

REGISTRY = [
    {"id": "S1", "name": "Flood Control Order 2025, Traffic Police waterlogging lists 2022 to 2024", "kind": "document",
     "source": "ifc.delhi.gov.in, fco_2025.pdf, 146 pages", "used": "recurrence, day severity, years active",
     "limit": "Arterial roads and junctions only. No coordinates, no agency. Row numbering gaps in 2022 (#98) and 2024 (#58, #145)."},
    {"id": "S2", "name": "I&FC Flood Control Wing, master plan for storm water drainage of the MCD and DDA area (1976)", "kind": "document",
     "source": "ifc.delhi.gov.in, inline-files/mcd.docx", "used": "named drains and their routes, design discharge, places named as waterlogged",
     "limit": "Fifty years old. Routes are described in words. Drain names and layouts may have changed."},
    {"id": "S3", "name": "2024 Old Rajinder Nagar inquiry and High Court reporting", "kind": "document",
     "source": "Tribune India, The Week/PTI, Verdictum", "used": "Old Rajinder Nagar low point, barrel from Shankar Road, ownership statements",
     "limit": "Press reports of official findings. The exact low point and the drain's owner are not stated."},
    {"id": "S4", "name": "OpenStreetMap roads, stations, junctions, facilities", "kind": "geodata", "source": "Overpass API, ODbL",
     "used": "position anchors, road geometry, exposure counts", "limit": "Names vary between sources. No roadside drains are mapped."},
    {"id": "S5", "name": "OpenStreetMap drain lines", "kind": "geodata", "source": "Overpass API, ODbL",
     "used": "three real culvert lines", "limit": "Three unnamed lines in 1,100 hectares. Not a network."},
    {"id": "S6", "name": "PWD Delhi road inventory", "kind": "register", "source": "pwddelhi.gov.in road search API, 1,297 roads",
     "used": "Right of Way per road, owner by the 60 ft rule", "limit": "Names spelled differently from OSM. No geometry. Road ownership, not drain ownership."},
    {"id": "S7", "name": "CGWB year book 2019-20 and India-WRIS station data 2024", "kind": "measurement",
     "source": "cgwb.gov.in, indiawris.gov.in", "used": "water table near the pilot (rain-capture sites)",
     "limit": "Karol Bagh tehsil has no monitoring well. Nearest is Pusa (NRL) piezometer, 2.2 to 2.6 km away."},
    {"id": "S8", "name": "State Election Commission ward summary, delimitation 2022", "kind": "register", "source": "sec.delhi.gov.in",
     "used": "ward context: Rajinder Nagar is ward 141, population 62,224", "limit": "Ward boundaries for 2022 are published as map PDFs only."},
    {"id": "N1", "name": "Copernicus GLO-30 elevation", "kind": "tested, not used", "source": "AWS Open Data",
     "used": "nothing", "limit": "Only 2 of 6 recorded waterlogging points sit below their surroundings. The model includes buildings and flyovers."},
    {"id": "N2", "name": "Delhi storm drain or sewer layer on OpenCity", "kind": "tested, not available", "source": "data.opencity.in",
     "used": "nothing", "limit": "Drain datasets exist for Pune, Bengaluru, Chennai and Hyderabad. None for Delhi."},
    {"id": "N3", "name": "SoilGrids soil texture", "kind": "tested, not available", "source": "rest.isric.org",
     "used": "nothing", "limit": "Returns no value for built-up cells in Delhi."},
    {"id": "N4", "name": "Flood Control Order 2026", "kind": "tested, not available", "source": "ifc.delhi.gov.in",
     "used": "nothing", "limit": "The page lists no PDF in its static HTML. Needs a browser session."},
]


def roads_payload() -> list[dict]:
    keep = {"primary", "secondary", "tertiary", "residential", "unclassified", "living_street", "service"}
    out = []
    for w in json.loads((RAW / "osm_roads.json").read_text())["elements"]:
        if w["tags"].get("highway") in keep and w.get("geometry"):
            out.append({"k": w["tags"]["highway"], "n": w["tags"]["name"],
                        "c": [[round(p["lat"], 5), round(p["lon"], 5)] for p in w["geometry"]]})
    return out


def day_counts() -> dict[str, int]:
    from scripts import signals
    return signals.day_counts(list(csv.DictReader((RAW / "fco_rows.csv").open(newline=""))))


def findings(data: dict, days: dict) -> list[str]:
    hs = [h for h in data["hotspots"] if not h["coverage_gap"]]
    n_dates = sum(h["waterlogging"]["n_dates"] for h in hs)
    both = [SHORT[h["id"]] for h in data["hotspots"] if any(d["id"] in ("D76-ANP", "D76-FIL") for d in h["documents"])]
    top = sorted(hs, key=lambda h: h["rank"]["rank"])
    stable = [SHORT[h["id"]] for h in top if h["rank"]["best"] == h["rank"]["worst"]]
    real = [d for d in data["drains"] if d["method"] == "osm_line"]
    chk = {c["id"]: c for c in data["meta"]["checks"]}
    return [
        f"Five places in the Traffic Police lists recur: {n_dates} location-dates over 2022 to 2024. "
        f"{' and '.join(both)} were also named as waterlogged in the 1976 drainage plan, almost fifty years apart.",
        f"Each drain point says how it was placed. {len(real)} are real OpenStreetMap lines, "
        f"{sum(1 for d in data['drains'] if d['method'] == 'road_end' or d['id'].startswith('DR-PRB') or d['id'].startswith('DR-DN'))} follow "
        f"a drain route described in the 1976 plan, and {sum(1 for d in data['drains'] if d['data_source'] == 'derived')} are roadside drains that are assumed.",
        f"The 1976 route description agrees with the geometry: {chk['origin-to-pusa']['documented_m']} m documented against "
        f"{chk['origin-to-pusa']['measured_m']} m measured from Shankar Road to the Pusa Road crossing, and {chk['karol-bagh-run']['documented_m']:,} m "
        f"against {chk['karol-bagh-run']['measured_m']:,} m through the three OSM culvert lines. This is consistency, not proof that the culverts are that drain.",
        "Old Rajinder Nagar is in no list. The lists record arterial roads and junctions, so the place that motivated the product has no "
        "recurrence record and is shown apart from the ranking.",
        (f"Among the ranked places, {', '.join(stable)} keeps the same rank under every weighting tried. "
         "The order of the other four changes when the weights change, so read them as one group."),
        "The data cannot show how silted a drain is, how deep water gets, or where it will flood next. No public record of cleaning exists, "
        "so silt in the app starts as a prior and changes only with confirmed jobs.",
    ]


def payload() -> dict:
    data = json.loads((CONS / "hotspots.json").read_text())
    days = day_counts()
    for h in data["hotspots"]:
        h["short"] = SHORT[h["id"]]
        h["day_counts"] = {d: days.get(d, 0) for d in h["waterlogging"]["dates"]}
        h["documents"] = [{k: d[k] for k in ("id", "kind", "year", "quote", "source")} for d in h["documents"]]
    for d in data["drains"]:
        d["class"] = "inferred" if d["id"].startswith("DR-DN") else "documented" if d["id"].startswith("DR-PRB") else DRAIN_CLASS.get(d["method"], "assumed")
        d["geometry"] = [[round(la, 5), round(lo, 5)] for lo, la in d["geometry"]]
    return {"bounds": BOUNDS, "roads": roads_payload(), "hotspots": data["hotspots"], "drains": data["drains"], "meta": data["meta"],
            "days": days, "registry": REGISTRY, "findings": findings(data, days)}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fragment", help="also write the page without doctype or head, for the Artifact publish")
    a = ap.parse_args(argv)
    p = payload()
    (CONS / "signals.json").write_text(json.dumps({"registry": REGISTRY, "checks": p["meta"]["checks"], "weights": p["meta"]["weights"]}, indent=1) + "\n")
    tpl = (Path(__file__).parent / "report_template.html").read_text()
    body = tpl.replace("/*DATA*/null", json.dumps(p, separators=(",", ":")))
    head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
    (ROOT / "docs" / "data-report.html").write_text(head + body + "\n</body></html>\n")
    if a.fragment:
        Path(a.fragment).write_text(body)
    print(f"wrote docs/data-report.html ({len(body) // 1024} KB)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
