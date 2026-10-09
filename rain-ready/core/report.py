"""Ward report from structured facts. Pure and deterministic. Every sentence is pre-written; no model text."""
import json
from datetime import datetime

from . import copy

TOP_N = 5


def build(facts: dict, ranked: list[dict], insight_list: list[dict], now: datetime) -> dict:
    names = {g["id"]: g["name"] for g in facts["agencies"]}
    by_agency: dict = {}
    for t in facts["tasks"]:
        if t["status"] not in ("open", "accepted"):
            continue
        row = by_agency.setdefault(t["agency_id"], {"agency_id": t["agency_id"], "agency_name": names.get(t["agency_id"], copy.NO_OWNER),
                                                    "open": 0, "overdue": 0})
        row["open"] += 1
        row["overdue"] += bool(t["due_at"] and datetime.fromisoformat(t["due_at"]) < now)
    levels: dict = {}
    for p in facts["pockets"]:
        levels.setdefault(p["level"], []).append(p["name"])
    held = sum(1 for r in facts["held_flags"] if any(f["level"] == "warn" for f in json.loads(r["flags"])))
    return {"title": "Rain-Ready ward report", "generated_at": now.isoformat(timespec="seconds"), "banner": copy.SCENARIO_BANNER,
            "range_note": copy.RANGE_NOTE,
            "tasks_by_agency": sorted(by_agency.values(), key=lambda r: r["agency_name"]),
            "held_reports": held, "top_drains": ranked[:TOP_N], "pockets_by_level": levels,
            "confirmed_cleans_7d": facts["confirmed_7d"], "insights": insight_list}


def to_markdown(r: dict) -> str:
    L = [f"# {r['title']}", "", f"Generated {r['generated_at']}.", "", f"> {r['banner']}", ""]
    L += ["## Open tasks by agency", ""]
    L += [f"- {a['agency_name']}: {a['open']} open, {a['overdue']} overdue" for a in r["tasks_by_agency"]] or ["- No open tasks."]
    L += ["", f"Reports held for review: {r['held_reports']}.", f"Cleans confirmed by a resident in the last 7 days: {r['confirmed_cleans_7d']}.", ""]
    L += ["## Top drains by fill time gained", "", f"{r['range_note']}", ""]
    L += [f"{i}. {d['name']} ({d['id']}): about {d['gain_h_low']} to {d['gain_h_high']} h gained if cleaned; "
          f"owner: {d['agency_name']}" for i, d in enumerate(r["top_drains"], 1)] or ["No drain would add fill time."]
    L += ["", "## Pockets by level", ""]
    for lvl in ("high", "elevated", "watch", "none"):
        if lvl in r["pockets_by_level"]:
            L.append(f"- {lvl}: {', '.join(r['pockets_by_level'][lvl])}")
    L += ["", "## Insights", ""]
    L += [f"- {i['text']} {i['why']}" for i in r["insights"]] or ["- No insights from the current rules."]
    return "\n".join(L) + "\n"
