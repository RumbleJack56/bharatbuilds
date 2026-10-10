"""Agency leaderboard from the task event log. Pure and deterministic. The formula is public (see METHOD) and every input is shown.
Agency level only: no officer, contractor or resident is named. A task with no owner is shown apart and never scored."""
from datetime import datetime

from .stats import median

WEIGHTS = {"response": 0.30, "delivery": 0.30, "verified": 0.25, "timeliness": 0.15}
RESPONSE_H = 48
MIN_TASKS = 3
ARRIVAL = ("created", "assigned", "reassigned")

METHOD = {
    "score": "0 to 100 = weighted share of four measures. A measure with no data yet is left out and the others are re-weighted.",
    "measures": {
        "response": f"Tasks accepted within {RESPONSE_H} hours of reaching the agency, out of tasks it did not hand back as a wrong owner and that have had {RESPONSE_H} hours. Weight {WEIGHTS['response']:.0%}.",
        "delivery": "Tasks completed within their due window, out of tasks completed plus accepted tasks now past their window. Weight " + f"{WEIGHTS['delivery']:.0%}.",
        "verified": "Verdicts from a different resident: confirmed out of confirmed plus disputed. A job redone after a dispute adds a new verdict. Weight " + f"{WEIGHTS['verified']:.0%}.",
        "timeliness": "Open tasks not past their due date. Weight " + f"{WEIGHTS['timeliness']:.0%}.",
    },
    "not_scored": ["Tasks handed back as a wrong owner (shown, not penalised: it is a finding about the owner record)",
                   "Tasks with no owner found (shown apart: no agency can accept them)", "Anything about who did the work: no person is named"],
    "minimum": f"An agency with fewer than {MIN_TASKS} tasks is shown without a rank.",
}


def _hours(a: str, b: str) -> float:
    return (datetime.fromisoformat(b) - datetime.fromisoformat(a)).total_seconds() / 3600


def agency_row(aid: str, name: str, tasks: list[dict], events: dict[int, list[dict]], now: datetime, due_days: int) -> dict:
    """Counts only what has had time to happen: a task still inside its 48 h response window, or not yet due, is not a miss."""
    received, acc, acc48, done, ontime, late_open, ok, bad, bounced, waiting = [], [], 0, 0, 0, 0, 0, 0, 0, 0
    to_accept, to_done = [], []
    for t in tasks:
        ev = events.get(t["id"], [])
        arr = next((e for e in ev if e["event"] in ARRIVAL and e["agency_id"] == aid), None)
        if not arr:
            continue
        received.append(t)
        age_h = _hours(arr["at"], now.isoformat(timespec="seconds"))
        handed_back = any(e["event"] == "bounced" and e["agency_id"] == aid for e in ev)
        bounced += handed_back
        a = next((e for e in ev if e["event"] == "accepted" and e["agency_id"] == aid and e["id"] > arr["id"]), None)
        if a:
            h = _hours(arr["at"], a["at"])
            acc.append(t)
            to_accept.append(h)
            acc48 += h <= RESPONSE_H
        elif not handed_back and age_h <= RESPONSE_H:
            waiting += 1                                           # still inside its response window
        c = next((e for e in ev if e["event"] == "completed" and e["agency_id"] == aid and e["id"] > arr["id"]), None)
        if c:
            h = _hours(arr["at"], c["at"])
            done += 1
            to_done.append(h)
            ontime += h <= due_days * 24
        elif a and age_h > due_days * 24:
            late_open += 1                                         # accepted, past its window, not done
        first_done = c["id"] if c else None
        for e in ev:                                               # a redone job adds a second verdict
            if first_done and e["id"] > first_done and e["agency_id"] == aid and e["event"] in ("confirmed", "disputed"):
                ok += e["event"] == "confirmed"
                bad += e["event"] == "disputed"
    mine = [t for t in tasks if t["agency_id"] == aid]
    open_now = [t for t in mine if t["status"] in ("open", "accepted")]
    overdue = [t for t in open_now if t["due_at"] and datetime.fromisoformat(t["due_at"]) < now]
    eligible = len(received) - bounced - waiting
    comp = {"response": acc48 / eligible if eligible > 0 else None,
            "delivery": ontime / (done + late_open) if done + late_open else None,
            "verified": ok / (ok + bad) if ok + bad else None,
            "timeliness": 1 - len(overdue) / len(open_now) if open_now else None}
    have = {k: v for k, v in comp.items() if v is not None}
    score = round(100 * sum(WEIGHTS[k] * v for k, v in have.items()) / sum(WEIGHTS[k] for k in have), 1) if have else None
    ranked = score is not None and len(received) >= MIN_TASKS
    return {"agency_id": aid, "agency_name": name, "score": score if ranked else None, "ranked": ranked,
            "components": {k: round(v, 2) if v is not None else None for k, v in comp.items()},
            "inputs": {"received": len(received), "handed_back": bounced, "still_in_window": waiting, "accepted": len(acc),
                       "accepted_in_48h": acc48, "completed": done, "completed_in_window": ontime, "late_open": late_open,
                       "confirmed": ok, "disputed": bad, "open_now": len(open_now), "overdue_now": len(overdue)},
            "median_hours_to_accept": round(median(to_accept), 1) if to_accept else None,
            "median_hours_to_complete": round(median(to_done), 1) if to_done else None}


def build(agencies: list[dict], tasks: list[dict], events: list[dict], now: datetime, due_days: int) -> dict:
    ev: dict[int, list[dict]] = {}
    for e in sorted(events, key=lambda e: e["id"]):
        ev.setdefault(e["task_id"], []).append(e)
    rows = [agency_row(a["id"], a["name"], tasks, ev, now, due_days) for a in agencies]
    rows.sort(key=lambda r: (not r["ranked"], -(r["score"] or 0), r["median_hours_to_accept"] if r["median_hours_to_accept"] is not None else 1e9, r["agency_id"]))
    place = 0
    for r in rows:
        place += 1 if r["ranked"] else 0
        r["rank"] = place if r["ranked"] else None
    unowned = [t for t in tasks if t["agency_id"] is None and t["status"] in ("open", "accepted", "rejected")]
    ages = [(now - datetime.fromisoformat(t["created_at"])).total_seconds() / 86400 for t in unowned]
    return {"agencies": rows, "unassigned": {"tasks": len(unowned), "oldest_days": round(max(ages), 1) if ages else None,
                                              "median_days": round(median(ages), 1) if ages else None},
            "method": METHOD}
