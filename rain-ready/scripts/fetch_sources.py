"""Fetch raw source snapshots into data/raw/. The only script here that uses the network. See docs/DATA.md.

  pwd_roads.json     PWD Delhi road inventory, road-level fields only (no contact fields)
  osm_roads.json     named highway ways in the pilot bbox (OpenStreetMap, ODbL)
  osm_drains.json    waterway drain/ditch/stream/canal and culverts
  osm_exposure.json  schools, colleges, clinics, hospitals, libraries
Run from rain-ready/:  python -m scripts.fetch_sources [--only pwd|osm]
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
UA = "rain-ready-hackathon/0.1 (github.com/RumbleJack56/bharatbuilds)"
SOUTH, WEST, NORTH, EAST = 28.632, 77.170, 28.662, 77.205         # pilot bbox, same as docs/DATA_SOURCES.md
MID = round((SOUTH + NORTH) / 2, 3)
CONTEXT = (28.630, 77.165, 28.670, 77.208)       # facilities: hotspots such as Anand Parbat sit just outside the pilot bbox
PWD = "https://www.pwddelhi.gov.in/api/maintenance/roads/search?page={p}&limit=100"
PWD_KEEP = ("asset_code", "road_name", "starting_point", "end_point", "via_point", "total_length_km",
            "no_of_lanes", "right_of_way_m", "status")
OVERPASS = ("https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter")
EDU = "school|college|university|kindergarten|prep_school|hospital|clinic|doctors|library"


def _get(url: str, data: bytes | None = None, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def pull_pwd() -> dict:
    roads, page = [], 1
    while True:
        d = _get(PWD.format(p=page), headers={"X-Requested-With": "XMLHttpRequest", "Accept": "application/json"})["data"]
        for r in d["roads"]:
            loc = r.get("location") or {}
            roads.append({**{k: r.get(k) for k in PWD_KEEP}, "division": loc.get("division")})
        if page >= d["pagination"]["total_pages"]:
            return {"source": PWD.split("?")[0], "count": len(roads), "roads": roads}
        page += 1
        time.sleep(0.5)


def overpass(body: str, out: str = "tags geom") -> dict:
    q = f"[out:json][timeout:80];({body});out {out};".encode()
    last = None
    for attempt in range(4):
        for ep in OVERPASS:
            try:
                return _get(ep, data=urllib.parse.urlencode({"data": q}).encode(), headers={"Accept": "application/json"})
            except Exception as e:                         # overloaded server: try the next mirror
                last = e
        time.sleep(15)
    raise RuntimeError(f"Overpass failed: {last}")


def pull_osm():
    """Yield (file name, document) one at a time so a failure later does not lose earlier pulls."""
    bb = lambda s, n: f"{s},{WEST},{n},{EAST}"            # noqa: E731
    whole = bb(SOUTH, NORTH)
    roads = {}
    cs, cw, cn, ce = CONTEXT
    cuts = [cs, round(cs + (cn - cs) / 3, 3), round(cs + 2 * (cn - cs) / 3, 3), cn]
    for s, n in zip(cuts, cuts[1:]):                      # slices: one query for the whole box times out
        for e in overpass(f'way["highway"]["name"]({s},{cw},{n},{ce});')["elements"]:
            roads[e["id"]] = e
    yield "osm_roads.json", {"elements": list(roads.values())}
    yield "osm_drains.json", overpass(f'way["waterway"~"drain|ditch|stream|canal"]({whole});way["tunnel"="culvert"]({whole});')
    ctx = ",".join(map(str, CONTEXT))
    yield "osm_exposure.json", overpass(f'nwr["amenity"~"^({EDU})$"]({ctx});nwr["office"="educational_institution"]({ctx});',
                                        out="tags center")


def pull_anchors() -> dict:
    """OSM elements named in data/sources/anchors.csv (node/way/relation ids), with centre or geometry."""
    import csv
    refs = {r["osm_ref"] for r in csv.DictReader((ROOT / "data" / "sources" / "anchors.csv").open(newline=""))}
    by = {k: sorted(int(r.split("/")[1]) for r in refs if r.startswith(k + "/")) for k in ("node", "way", "relation")}
    body = "".join(f"{k}(id:{','.join(map(str, ids))});" for k, ids in by.items() if ids)
    return overpass(body, out="tags center geom")


CONTACT_KEYS = {"phone", "mobile", "email", "fax", "website", "url"}


def strip_contact(doc: dict) -> dict:
    """Drop phone, email and website tags from OSM elements. Business contact details are not needed
    for drains or exposure counts and must not sit in a public repo."""
    for el in doc.get("elements", []):
        tags = el.get("tags")
        if tags:
            for k in [k for k in tags if k in CONTACT_KEYS or k.startswith("contact:")]:
                del tags[k]
    return doc


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=("pwd", "osm", "anchors"))
    only = ap.parse_args(argv).only
    RAW.mkdir(parents=True, exist_ok=True)

    def save(name: str, doc: dict) -> None:
        doc = {"fetched": date.today().isoformat(), "bbox": [SOUTH, WEST, NORTH, EAST], **strip_contact(doc)}
        (RAW / name).write_text(json.dumps(doc, separators=(",", ":")) + "\n")
        print(f"wrote data/raw/{name}", file=sys.stderr)

    failed = 0
    if only in (None, "pwd"):
        try:
            save("pwd_roads.json", pull_pwd())
        except Exception as e:
            failed += 1
            print(f"pwd_roads.json FAILED: {e}", file=sys.stderr)
    if only in (None, "osm"):
        try:
            for name, doc in pull_osm():
                save(name, doc)
        except Exception as e:
            failed += 1
            print(f"OSM pull stopped: {e}. Run again with --only osm; files already written are kept.", file=sys.stderr)
    if only in (None, "anchors"):
        try:
            save("osm_anchors.json", pull_anchors())
        except Exception as e:
            failed += 1
            print(f"osm_anchors.json FAILED: {e}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
