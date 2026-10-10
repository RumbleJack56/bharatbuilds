"""Exploratory analysis of Delhi's recorded waterlogging, as pure stages. No I/O.

Input rows: the Traffic Police lists in the Flood Control Order 2025 (data/raw/fco_rows.csv, from scripts/parse_fco.py)
            and the PWD road inventory (data/raw/pwd_roads.json). Stage order, each reading the results before it:
validate -> profile -> places -> days -> roads -> ownership -> pilot -> insights
Every insight carries its evidence and one pre-written action. Text is fixed here, with numbers filled in. No model writes it.
"""
import difflib
import re
from collections import Counter, defaultdict

from . import stats

SIXTY_FT_M = 18.29
STOP = re.compile(r"\b(road|rd|marg|marge|mg|street|st|lane|path|chowk|the|of|no|and|via|near|at|to|side|towards|opp|opposite)\b")
MONSOON = (6, 7, 8, 9)
ORDINARY_DAY_PLACES = 3


# ---- names ---------------------------------------------------------------------------------------------------------
def road_key(s: str) -> str:
    s = re.sub(r"\(.*?\)", " ", (s or "").lower().replace("&", " and "))
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\bm b\b", "mb", s)
    s = re.sub(r"\bg t k\b|\bgt karnal\b|\bgt k\b", "gtk", s)
    return " ".join(STOP.sub(" ", s).split())


def place_key(text: str) -> str:
    toks = [t for t in re.sub(r"[^a-z0-9 ]+", " ", (text or "").lower()).split() if not STOP.fullmatch(t)]
    return " ".join(sorted(set(toks))[:8])


def clean(s: str) -> str:
    """Printable ASCII only, single spaces: the PDF text layer carries phone and fax glyphs and wide column gaps."""
    return " ".join(re.sub(r"[^\x20-\x7E]", " ", s or "").split())


def dates_of(row: dict) -> list[str]:
    return [d for d in row.get("dates", "").split(";") if d]


# ---- stages --------------------------------------------------------------------------------------------------------
def validate(rows: list[dict]) -> dict:
    """What is wrong with the table itself. Every item is a finding, not an error to hide."""
    by_list: dict[str, list[int]] = defaultdict(list)
    for r in rows:
        by_list[r["list"]].append(int(r["row_no"]))
    gaps = {k: sorted(set(range(1, max(v) + 1)) - set(v)) for k, v in by_list.items()}
    dups = {k: sorted(n for n, c in Counter(v).items() if c > 1) for k, v in by_list.items()}
    cross = Counter((r["list"], d[:4]) for r in rows for d in dates_of(r))
    l22 = [d for r in rows if r["list"] == "2022" for d in dates_of(r)]
    return {"list_2022_first_date": min(l22) if l22 else None, "rows": len(rows), "rows_without_dates": [(r["list"], int(r["row_no"])) for r in rows if not dates_of(r)],
            "rows_without_place": sum(1 for r in rows if not r["col2"]), "numbering_gaps": gaps, "duplicate_numbers": dups,
            "date_years_by_list": {f"{k[0]}:{k[1]}": v for k, v in sorted(cross.items())},
            "date_span": [min(d for r in rows for d in dates_of(r)), max(d for r in rows for d in dates_of(r))]}


def profile(rows: list[dict]) -> dict:
    per_row = [len(dates_of(r)) for r in rows if dates_of(r)]
    months = Counter(int(d[5:7]) for r in rows for d in dates_of(r))
    years = Counter(d[:4] for r in rows for d in dates_of(r))
    total = sum(months.values())
    return {"location_dates": total, "dates_per_row": dict(sorted(Counter(per_row).items())),
            "rows_with_one_date_share": round(sum(1 for n in per_row if n == 1) / len(per_row), 3),
            "by_month": {m: months.get(m, 0) for m in range(1, 13)}, "by_year": dict(sorted(years.items())),
            "monsoon_share": round(sum(months.get(m, 0) for m in MONSOON) / total, 3),
            "july_share": round(months.get(7, 0) / total, 3)}


def places(rows: list[dict]) -> list[dict]:
    """One record per place: rows with the same road and the same place words are merged across lists."""
    merged: dict[str, dict] = {}
    for r in rows:
        ds = dates_of(r)
        if not ds:
            continue
        full = r["text"][len(r["col1"]):].strip() if r["text"].startswith(r["col1"]) else r["col2"]
        key = road_key(r["col1"]) + "|" + place_key(clean(full) or clean(r["col2"]))
        p = merged.setdefault(key, {"key": key, "road": clean(r["col1"]), "place": (clean(full) or clean(r["col2"]))[:90],
                                    "dates": set(), "rows": []})
        p["dates"].update(ds)
        p["rows"].append({"list": r["list"], "row_no": int(r["row_no"]), "pdf_page": int(r["pdf_page"])})
    out = []
    for p in merged.values():
        ds = sorted(p["dates"])
        out.append({**p, "dates": ds, "n_dates": len(ds), "years": sorted({d[:4] for d in ds}), "n_lists": len({x["list"] for x in p["rows"]})})
    return sorted(out, key=lambda p: (-p["n_dates"], p["key"]))


def days(rows: list[dict]) -> dict:
    """How widespread each day was: the number of listed places that day. Few places on a day means an ordinary rain day."""
    per: dict[str, set] = defaultdict(set)
    for r in rows:
        for d in dates_of(r):
            per[d].add((r["list"], int(r["row_no"])))
    n = {d: len(s) for d, s in per.items()}
    sizes = list(n.values())
    return {"counts": n, "n_days": len(n), "median_places": stats.median(sizes), "singleton_days": sum(1 for s in sizes if s == 1),
            "top5_share": round(stats.share_top(sizes, 5), 3), "top10_share": round(stats.share_top(sizes, 10), 3),
            "busiest": sorted(((c, d) for d, c in n.items()), reverse=True)[:5]}


def roads(place_list: list[dict]) -> dict:
    by: dict[str, dict] = {}
    for p in place_list:
        k = road_key(p["road"])
        b = by.setdefault(k, {"road": p["road"], "places": 0, "location_dates": 0})
        b["places"] += 1
        b["location_dates"] += p["n_dates"]
    vals = [b["location_dates"] for b in by.values()]
    top = sorted(by.values(), key=lambda b: -b["location_dates"])
    return {"n_roads": len(by), "top": top[:10], "top10_share": round(stats.share_top(vals, 10), 3), "gini": round(stats.gini(vals), 3),
            "top1_share": round(stats.share_top(vals, 1), 3)}


def match_ownership(place_list: list[dict], pwd: list[dict]) -> list[dict]:
    """Attach a PWD inventory road to each place by road name (exact, then close spelling).
    Owner by the 60 ft rule. A place whose road is not found stays unresolved: public data cannot name its owner."""
    idx: dict[str, list[dict]] = defaultdict(list)
    for r in pwd:
        idx[road_key(r["road_name"])].append(r)
    keys = list(idx)
    out = []
    for p in place_list:
        k = road_key(p["road"])
        how, hit = "none", None
        if k and k in idx:
            how, hit = "exact", k
        elif k:
            c = difflib.get_close_matches(k, keys, n=1, cutoff=0.88)
            if c:
                how, hit = "close", c[0]
        cands = idx[hit] if hit else []
        owners = {"pwd" if (c["right_of_way_m"] or 0) >= SIXTY_FT_M else "mcd" for c in cands}
        agency = owners.pop() if len(owners) == 1 else None       # same-named roads that disagree stay unresolved
        row = max(cands, key=lambda r: r["right_of_way_m"] or 0) if cands else None
        if len(owners) > 0 or (cands and agency is None):
            how = "ambiguous"
        out.append({**p, "match": how, "n_candidates": len(cands), "pwd_code": row["asset_code"] if row and agency else None,
                    "right_of_way_m": row["right_of_way_m"] if row and agency else None, "agency_id": agency})
    return out


def chronic(owned: list[dict], min_years: int = 3) -> list[dict]:
    return [p for p in owned if len({d[:4] for d in p["dates"]}) >= min_years]


def ownership_summary(owned: list[dict]) -> dict:
    ld = sum(p["n_dates"] for p in owned)
    by = Counter()
    for p in owned:
        by[p["agency_id"] or "unresolved"] += p["n_dates"]
    return {"location_dates": ld, "by_agency": {k: v for k, v in by.items()},
            "resolved_share": round(1 - by.get("unresolved", 0) / ld, 3) if ld else 0.0,
            "places_unresolved": sum(1 for p in owned if p["agency_id"] is None)}


def pilot_context(cards: list[dict], place_list: list[dict], day_counts: dict[str, int], median_places: float) -> list[dict]:
    pop = [p["n_dates"] for p in place_list]
    out = []
    for c in cards:
        ds = c["waterlogging"]["dates"]
        out.append({"id": c["id"], "short": c.get("short", c["name"]), "n_dates": len(ds),
                    "recurrence_percentile": round(stats.percentile_rank(len(ds), pop), 2) if ds else None,
                    "share_with_as_many": round(max(0.01, sum(1 for n in pop if n >= len(ds)) / len(pop)), 2) if ds else None,
                    "ordinary_day_dates": sum(1 for d in ds if day_counts.get(d, 0) <= max(median_places, ORDINARY_DAY_PLACES)),
                    "coverage_gap": not ds})
    return out


# ---- insights and actions ------------------------------------------------------------------------------------------
def _pct(x: float) -> str:
    return f"{round(100 * x)}%"


def insights(res: dict) -> list[dict]:
    """Fixed sentences with numbers filled in. Each has evidence (counts, row references) and one action."""
    p, d, r, o, v = res["profile"], res["days"], res["roads"], res["ownership"], res["validate"]
    ch = res["chronic"]
    out = [
        {"id": "season", "kind": "season", "priority": 1,
         "text": f"{_pct(p['monsoon_share'])} of the {p['location_dates']:,} recorded location-dates fall between June and September; July alone holds {_pct(p['july_share'])}.",
         "why": "Cleaning that finishes after the first heavy July rain misses most of the recorded events.",
         "evidence": {"by_month": p["by_month"], "location_dates": p["location_dates"]},
         "action": {"type": "schedule", "agency_id": None,
                    "text": "Finish the inspection and cleaning round for every place on the chronic list by the end of May, and record each job in the action list so residents can confirm it."}},
        {"id": "heavy-tail", "kind": "severity", "priority": 2,
         "text": f"Five days hold {_pct(d['top5_share'])} of all listings. The median day lists {int(d['median_places'])} places, and {d['singleton_days']} of {d['n_days']} days list one.",
         "why": "Most listings come from a few extreme days. A place listed on an ordinary day is failing at modest rain.",
         "evidence": {"busiest_days": d["busiest"], "median_places": d["median_places"], "n_days": d["n_days"]},
         "action": {"type": "prioritise", "agency_id": None,
                    "text": "Rank places by listings on ordinary days first. Keep extreme-day response (pumps, diversions) separate from drain cleaning."}},
        {"id": "chronic", "kind": "recurrence", "priority": 1,
         "text": f"{len(ch)} places were listed in three or more different years. {_pct(sum(c['n_dates'] for c in ch) / p['location_dates'])} of all location-dates fall on them, "
                 f"and {_pct(p['rows_with_one_date_share'])} of listed rows have a single date.",
         "why": "Repeat failures at the same place point to a drain that is not being kept clear, not to bad luck.",
         "evidence": {"places": [{"road": c["road"], "place": c["place"], "dates": c["n_dates"], "years": c["years"], "rows": c["rows"],
                                  "agency_id": c["agency_id"], "pwd_code": c["pwd_code"]} for c in ch[:12]]},
         "action": {"type": "inspect", "agency_id": None,
                    "text": "Inspect the inlets and the connecting drain at each chronic place before the monsoon and photograph the result. Route each place to the owner shown, or to the coordinator when none is found."}},
        {"id": "corridors", "kind": "concentration", "priority": 3,
         "text": f"The 10 busiest roads hold {_pct(r['top10_share'])} of location-dates out of {r['n_roads']} listed roads. {r['top'][0]['road']} alone holds {_pct(r['top1_share'])}.",
         "why": "A long corridor needs a corridor-level review, since fixing single points leaves the rest of its run unchanged.",
         "evidence": {"top_roads": r["top"]},
         "action": {"type": "coordinate", "agency_id": None,
                    "text": "Ask the owners along each top corridor for one joint inspection plan, with one named contact per segment."}},
        {"id": "owner-gap", "kind": "ownership", "priority": 1,
         "text": f"Only {_pct(o['resolved_share'])} of location-dates sit on a road that can be matched to the PWD inventory by name. "
                 f"{o['places_unresolved']} places have no owner that public records can assign.",
         "why": "A task with no owner has nobody to accept it. The 2012 notification and the 2020 affidavit assign drains by road width, and that needs the road to be known.",
         "evidence": {"by_agency_location_dates": o["by_agency"], "places_unresolved": o["places_unresolved"]},
         "action": {"type": "clarify_owner", "agency_id": None,
                    "text": "Ask MCD, PWD and I&FC to name the owner for each unresolved recurring place, and publish the answer with its source."}},
        {"id": "data-quality", "kind": "quality", "priority": 4,
         "text": f"The 2022 list carries dates from {(v['list_2022_first_date'] or v['date_span'][0])[:4]} onward and the three lists miss {sum(len(x) for x in v['numbering_gaps'].values())} row numbers. "
                 f"{len(v['rows_without_dates'])} row has no date and {v['rows_without_place']} rows have no place text.",
         "why": "Counts are close but not exact. The lists record places that disrupted traffic, so interior lanes are missing.",
         "evidence": {"numbering_gaps": v["numbering_gaps"], "date_years_by_list": v["date_years_by_list"]},
         "action": {"type": "note", "agency_id": None,
                    "text": "Read every count as at least that many. Add resident reports for places the lists do not cover."}},
    ]
    if res.get("pilot"):
        listed = [c for c in res["pilot"] if c["n_dates"]]
        top = sorted(listed, key=lambda c: -c["n_dates"])[:2]
        gap = [c["short"] for c in res["pilot"] if c["coverage_gap"]]
        out.append({"id": "pilot", "kind": "context", "priority": 1,
                    "text": "In the pilot ward, " + " and ".join(f"{c['short']} ({c['n_dates']} dates; {_pct(c['share_with_as_many'])} of Delhi's listed places have as many)" for c in top)
                            + " recur most." + (f" {', '.join(gap)} is in no list." if gap else ""),
                    "why": "The pilot places are not unusual among Delhi's recurring places, so the ward plan applies the same rules the city needs.",
                    "evidence": {"pilot": res["pilot"]},
                    "action": {"type": "plan", "agency_id": None,
                               "text": "Work the ward action plan in order. Places no list covers enter through resident reports."}})
    return sorted(out, key=lambda i: (i["priority"], i["id"]))


def place_actions(owned: list[dict], limit: int = 15) -> list[dict]:
    """One routed action per chronic or repeat place. Ordered by dates, then years."""
    pick = sorted(chronic(owned, 2), key=lambda p: (-len(p["years"]), -p["n_dates"], p["key"]))[:limit]
    out = []
    for p in pick:
        where = f"{p['road']}, {p['place']}"
        if p["agency_id"]:
            routed = (f"Route to {p['agency_id'].upper()}: a road of this name in the PWD inventory ({p['pwd_code']}) has a Right of Way of "
                      f"{p['right_of_way_m']} m. Matched by name; the segment is not verified.")
        else:
            routed = "No owner found from public records: send to the ward coordinator to resolve."
        out.append({"key": p["key"], "road": p["road"], "place": p["place"], "agency_id": p["agency_id"], "pwd_code": p["pwd_code"],
                    "n_dates": p["n_dates"], "years": p["years"], "rows": p["rows"],
                    "text": f"{where}: listed on {p['n_dates']} dates in {len(p['years'])} years. {routed}"})
    return out
