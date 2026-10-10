"""Aggregate every signal per hotspot -> data/consolidated/{hotspots,signals}.json. Offline.

Inputs: data/raw/*  (fetch_sources.py, parse_fco.py)   data/sources/{hotspots,anchors,drain_points,documents}.csv (curated)
Run from rain-ready/:  python -m scripts.consolidate     then   python -m scripts.prepare_sources
"""
import csv
import json
import re
import sys
from pathlib import Path

from core import geo
from scripts import signals as sg

ROOT = Path(__file__).resolve().parent.parent
RAW, SRC, OUT = ROOT / "data" / "raw", ROOT / "data" / "sources", ROOT / "data" / "consolidated"
SIXTY_FT_M = 18.29
EXPOSURE_M = 200
SECTION_HALF_M = 100
PIN_HALF_M = 15
FACILITY = {"school", "college", "university", "kindergarten", "prep_school", "educational_institution", "hospital", "clinic",
            "doctors", "library"}
RULE = ("GNCTD notification 10.01.2012 vests roads of 60 ft or more with PWD (PWD reply in NGT OA 559/2022); SDMC affidavit "
        "to the NGT, Feb 2020: drains on those roads are PWD's (South Delhi statement, applied here by inference)")
KIND_PARAMS = {"saucer": (6.0, 0.8, 900.0), "other": (1.5, 0.85, 120.0)}     # catchment_ha, runoff_c, storage_m3: scenario defaults


def rows(name: str) -> list[dict]:
    return list(csv.DictReader((SRC / name).open(newline="")))


def js(name: str) -> dict:
    return json.loads((RAW / name).read_text())


def length(g: list[dict]) -> float:
    return sum(geo.haversine_m(a["lat"], a["lon"], b["lat"], b["lon"]) for a, b in zip(g, g[1:]))


def element_point(e: dict) -> tuple[float, float]:
    if e["type"] == "node":
        return e["lat"], e["lon"]
    if e["type"] == "way":
        return sg.point_at(e["geometry"], length(e["geometry"]) / 2)
    b = e["bounds"]
    return (b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2


def owner(code: str, pwd: dict) -> tuple[str | None, str]:
    r = pwd.get(code)
    if r is None:
        raise SystemExit(f"{code}: not in data/raw/pwd_roads.json")
    row = r["right_of_way_m"] or 0
    src = f"PWD road inventory {code} '{r['road_name']}' ({r['division']}), Right of Way {row} m"
    if row >= SIXTY_FT_M:
        return "pwd", f"{src}, 60 ft or more. {RULE}"
    return "mcd", f"{src}, under 60 ft: drains on narrower roads are MCD's (same SDMC affidavit)"


def place(d: dict, pos: dict, roads: list[dict], culverts: dict, got: str) -> dict:
    """One drain point: where it is, how it was placed, how far it is from the hotspot position."""
    hot = (pos["lat"], pos["lon"])
    if d["method"] == "osm_line":
        g = culverts[int(d["arg1"])]
        lat, lon = sg.point_at(g, length(g) / 2)
        line = [[p["lon"], p["lat"]] for p in g]
        cite = f"OpenStreetMap way/{d['arg1']} (ODbL), waterway=drain tunnel=culvert, retrieved {got}"
        src = "osm"
    else:
        cands = [w for w in roads if re.search(d["arg1"], w["tags"]["name"])]
        if d["method"] == "road_end":                    # end of the named road chain: north or south vertex
            ends = [(p["lat"], p["lon"], w) for w in cands for p in w["geometry"]]
            la, lo, w = max(ends, key=lambda t: t[0]) if d["arg2"] == "north" else min(ends, key=lambda t: t[0])
            s = sg.locate(w["geometry"], la, lo)[1]
            half, near = PIN_HALF_M, w
            lat, lon = la, lo
        else:                                            # nearest point of the named road to the hotspot position
            near = min(cands, key=lambda w: sg.locate(w["geometry"], *hot)[0])
            s = sg.locate(near["geometry"], *hot)[1]
            half = SECTION_HALF_M
            lat, lon = sg.point_at(near["geometry"], s)
        line = sg.section(near["geometry"], s, half)
        cite = f"OpenStreetMap way/{near['id']} (road line, ODbL, retrieved {got})"
        src = "official" if d["id"].startswith(("DR-PRB", "DR-DN")) else "derived"
    return {"id": d["id"], "name": d["name"], "type": "drain_segment", "method": d["method"], "lat": round(lat, 6), "lon": round(lon, 6),
            "distance_m": round(geo.haversine_m(lat, lon, *hot)), "geometry": line, "data_source": src, "confidence": d["confidence"],
            "citation_base": cite, "note": d["note"], "hotspot": d["hotspot"], "links_pocket": d["links_pocket"] == "yes", "pwd_code": d["pwd_code"], "agency_id": d["agency_id"],
            "owner_source": d["owner_source"]}


def checks(roads: list[dict], culverts: dict) -> dict:
    """Does the 1976 description of the drains agree with the geometry we have? Each check states both numbers."""
    baz = [w for w in roads if w["tags"]["name"] == "Bazaar Marg"]
    pts = [p for w in baz for p in w["geometry"]]
    south = min(pts, key=lambda p: p["lat"])
    north = max(pts, key=lambda p: p["lat"])
    shankar = [w for w in roads if w["tags"]["name"] == "Shankar Road"]
    pusa = [w for w in roads if w["tags"]["name"] == "Pusa Road"]
    gap_s = min(sg.locate(w["geometry"], south["lat"], south["lon"])[0] for w in shankar)
    gap_n = min(sg.locate(w["geometry"], north["lat"], north["lon"])[0] for w in pusa)
    baz_m = sum(length(w["geometry"]) for w in baz)
    a, c = culverts[553844981], culverts[77881906]
    aw = min(a, key=lambda p: p["lon"])
    ae = max(a, key=lambda p: p["lon"])
    cs = min(c, key=lambda p: p["lat"])
    chain = (geo.haversine_m(north["lat"], north["lon"], aw["lat"], aw["lon"]) + length(a)
             + geo.haversine_m(ae["lat"], ae["lon"], cs["lat"], cs["lon"]) + length(c))
    patel = sum(length(w["geometry"]) for w in roads if w["tags"]["name"] == "Patel Road")
    pct = lambda got, doc: round(100 * (got - doc) / doc)                      # noqa: E731
    chain_pts = [[south["lat"], south["lon"]], [north["lat"], north["lon"]], [aw["lat"], aw["lon"]], [ae["lat"], ae["lon"]],
                 [cs["lat"], cs["lon"]], [max(c, key=lambda p: p["lat"])["lat"], max(c, key=lambda p: p["lat"])["lon"]]]
    return {"daryai_chain": chain_pts, "list": [
        {"id": "origin-to-pusa", "claim": "Daryai Nallah flows 800 m through Rajinder Nagar from near Shankar Road to the Pusa Road crossing",
         "measured": f"Bazaar Marg is {baz_m:.0f} m; its north end is {gap_n:.0f} m from Pusa Road and its south end {gap_s:.0f} m from Shankar Road",
         "documented_m": 800, "measured_m": round(baz_m + gap_s), "difference_pct": pct(baz_m + gap_s, 800),
         "rule": "within 25%", "holds": abs(pct(baz_m + gap_s, 800)) <= 25},
        {"id": "karol-bagh-run", "claim": "then flows 3,000 m through Karol Bagh and Sarai Rohilla",
         "measured": "path from the Pusa Road crossing through the three OSM culvert pieces (straight links between them)",
         "documented_m": 3000, "measured_m": round(chain), "difference_pct": pct(chain, 3000),
         "rule": "within 25%", "holds": abs(pct(chain, 3000)) <= 25},
        {"id": "patel-barrel", "claim": "Patel Road barrel runs 2,000 m along Patel Road", "measured": f"OSM Patel Road is {patel:.0f} m long in the extract",
         "documented_m": 2000, "measured_m": round(patel), "difference_pct": pct(patel, 2000),
         "rule": "road at least as long as the barrel", "holds": patel >= 2000}]}


def main() -> int:
    pwd = {r["asset_code"]: r for r in js("pwd_roads.json")["roads"]}
    osm, got = js("osm_roads.json"), js("osm_roads.json")["fetched"]
    roads = osm["elements"]
    culverts = {e["id"]: e["geometry"] for e in js("osm_drains.json")["elements"]}
    fco = list(csv.DictReader((RAW / "fco_rows.csv").open(newline="")))
    fco_by = {(r["list"], int(r["row_no"])): r for r in fco}
    day_n = sg.day_counts(fco)
    ordinary_cut = sg.median(list(day_n.values()))
    per_row = [len(r["dates"].split(";")) for r in fco if r["dates"]]
    elems = {f"{e['type']}/{e['id']}": e for e in js("osm_anchors.json")["elements"]}
    facilities = [(e.get("lat") or e["center"]["lat"], e.get("lon") or e["center"]["lon"], e["tags"].get("amenity") or e["tags"].get("office"))
                  for e in js("osm_exposure.json")["elements"]]
    docs = {d["id"]: d for d in rows("documents.csv")}
    out, cards = [], {}
    for h in rows("hotspots.csv"):
        anchors = []
        for a in (r for r in rows("anchors.csv") if r["hotspot_id"] == h["id"]):
            lat, lon = element_point(elems[a["osm_ref"]])
            anchors.append({"ref": a["osm_ref"], "group": a["group"], "role": a["role"], "weight": float(a["weight"]), "phrase": a["phrase"],
                            "lat": round(lat, 6), "lon": round(lon, 6)})
        pos = sg.estimate_position(anchors)
        for a in anchors:
            a["dist_m"] = round(geo.haversine_m(pos["lat"], pos["lon"], a["lat"], a["lon"]))
        sel = [tuple(x.split(":")) for x in h["fco_rows"].split(";") if x]
        used = [fco_by[(lst, int(n))] for lst, n in sel]
        dates = sorted({d for r in used for d in r["dates"].split(";") if d})
        years = sorted({d[:4] for d in dates})
        hdocs = [dict(docs[i], id=i) for i in h["docs"].split(";") if i]
        fac, nearest = {}, None
        for la, lo, kind in facilities:
            if kind not in FACILITY:
                continue
            dist = geo.haversine_m(pos["lat"], pos["lon"], la, lo)
            nearest = dist if nearest is None else min(nearest, dist)
            if dist <= EXPOSURE_M:
                fac[kind] = fac.get(kind, 0) + 1
        eras = set(years) | {d["year"] for d in hdocs if d["kind"] == "waterlogging"}
        ordinary = [d for d in dates if day_n.get(d, 0) <= ordinary_cut]
        comp = {"recurrence": round(sg.percentile_rank(len(dates), per_row), 2) if dates else 0.0,
                "persistence": round(min(len(eras), 4) / 4, 2),
                "ordinary_days": round(len(ordinary) / len(dates), 2) if dates else 0.0,
                "exposure": round(min(sum(fac.values()), 6) / 6, 2)}
        if used:                                          # a place no list covers is not ranked on lists
            cards[h["id"]] = comp
        mm = round(sg.design_mm_h(float(h["design_cusec_per_acre"])), 1)
        origins = {"fco-2025"} if dates else set()
        origins |= {d["origin"] for d in hdocs if d["kind"] == "waterlogging"}
        conf = "medium" if len(origins) >= 2 or (len(dates) >= 5 and len(years) >= 2) else "low"
        out.append({"id": h["id"], "name": h["name"], "kind": h["kind"], "position": {**pos, "anchors": anchors},
                    "waterlogging": {"rows": [{"list": r["list"], "row_no": int(r["row_no"]), "pdf_page": int(r["pdf_page"]), "road": r["col1"],
                                               "place": r["col2"], "dates": r["dates"].split(";")} for r in used],
                                     "dates": dates, "years": years, "n_dates": len(dates), "on_ordinary_days": len(ordinary),
                                     "busiest_day": max(((day_n[d], d) for d in dates), default=None)},
                    "documents": hdocs, "exposure": {"within_m": EXPOSURE_M, "by_type": fac, "total": sum(fac.values()),
                                 "nearest_facility_m": round(nearest) if nearest is not None else None},
                    "components": comp, "design_mm_h": mm, "design_cusec_per_acre": float(h["design_cusec_per_acre"]),
                    "confidence": conf, "coverage_gap": not used, "note": h["note"],
                    "scenario": dict(zip(("catchment_ha", "runoff_c", "storage_m3"), KIND_PARAMS[h["kind"]]))})
    by_id = {c["id"]: c for c in out}
    drains = []
    for d in rows("drain_points.csv"):
        pos = by_id[d["hotspot"]]["position"] if d["hotspot"] else {"lat": 28.65, "lon": 77.19}
        if d["arg2"].startswith("@"):
            pos = by_id[d["arg2"][1:]]["position"]
        p = place(d, pos, roads, culverts, got)
        if d["pwd_code"]:
            p["agency_id"], p["owner_source"] = owner(d["pwd_code"], pwd)
        if p["hotspot"] and p["distance_m"] > 400:
            raise SystemExit(f"{p['id']}: {p['distance_m']} m from {p['hotspot']}; fix the curated row")
        drains.append(p)
    stab = sg.rank_stability(cards)
    for c in out:
        c["index"] = None if c["coverage_gap"] else sg.index(c["components"])
        c["rank"] = stab.get(c["id"])
        c["drains"] = [x["id"] for x in drains if x["hotspot"] == c["id"]]
        c["linked_drains"] = [x["id"] for x in drains if x["hotspot"] == c["id"] and x["links_pocket"]]
    chk = checks(roads, culverts)
    meta = {"generated_from": {"fco_rows": len(fco), "fco_location_dates": sum(day_n.values()), "fco_days": len(day_n),
                               "ordinary_day_cut": ordinary_cut, "busiest_days": sorted(((n, d) for d, n in day_n.items()), reverse=True)[:5]},
            "checks": chk["list"], "daryai_chain": chk["daryai_chain"], "weights": sg.WEIGHTS, "retrieved": got}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "hotspots.json").write_text(json.dumps({"hotspots": out, "drains": drains, "meta": meta}, indent=1) + "\n")
    for c in sorted(out, key=lambda c: c["rank"]["rank"] if c["rank"] else 99):
        p = c["position"]
        r = c["rank"] or {"rank": "-", "best": "-", "worst": "-"}
        print(f"#{r['rank']} {c['id']:<8} idx={c['index'] if c['index'] is not None else 'n/a':>5} pos ±{p['radius_m']:>4} m grade {p['grade']} ({p['groups']} witnesses) "
              f"dates={c['waterlogging']['n_dates']:>2} fac={c['exposure']['total']} conf={c['confidence']}  rank range {r['best']}-{r['worst']}",
              file=sys.stderr)
    for d in drains:
        print(f"  {d['id']:<12} {d['distance_m']:>4} m from {d['hotspot'] or '-':<8} owner={d['agency_id'] or 'none'}", file=sys.stderr)
    for k in meta["checks"]:
        print(f"  check {k['id']}: documented {k['documented_m']} m, measured {k['measured_m']} m ({k['difference_pct']:+d}%)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
