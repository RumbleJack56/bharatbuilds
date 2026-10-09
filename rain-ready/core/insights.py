"""Rule-based insights from structured facts. Pure. Text is pre-written here; no model writes it.
Each insight: {id, text, why, evidence}. Facts only, about agencies and assets: no advice, no named people."""
from datetime import date, datetime

OVERDUE_DAYS = 3          # a task this far past its due date is called out
UNCLEAN_DAYS = 60         # a top-pocket drain not confirmed clean for this long (or never)
BOUNCE_MIN = 3            # an agency that bounced at least this many tasks away
SILT_MIN = 0.25           # estimated silt fraction counted as silted
URGENT = ("high", "elevated")


def _label(row: dict) -> str:
    return " (placeholder data)" if row.get("data_source") == "placeholder" else ""


def _days(since: datetime, now: datetime) -> int:
    return (now - since).days


def build(facts: dict, now: datetime) -> list[dict]:
    assets = {a["id"]: a for a in facts["assets"]}
    live = {t["asset_id"] for t in facts["tasks"] if t["status"] in ("open", "accepted", "done", "disputed")}
    out: list[dict] = []

    for a in facts["assets"]:                                            # 1. reports but no owner
        if a["agency_id"] is None and a["report_count"] > 0:
            out.append({"id": f"no-owner:{a['id']}",
                        "text": f"{a['report_count']} report(s) near {a['name']}, and no owner was found for this drain{_label(a)}.",
                        "why": "A drain with no owner has nobody to accept the task.",
                        "evidence": {"asset_id": a["id"], "reports": a["report_count"], "owner_source": a["owner_source"],
                                     "data_source": a["data_source"]}})

    for g in facts["agencies"]:                                          # 2. many bounced tasks
        if g["bounced"] >= BOUNCE_MIN:
            out.append({"id": f"bounces:{g['id']}",
                        "text": f"{g['name']} sent {g['bounced']} tasks back as not its asset.",
                        "why": "Repeated bounces suggest the owner data for these drains needs a check.",
                        "evidence": {"agency_id": g["id"], "bounced": g["bounced"]}})

    for p in facts["pockets"]:                                           # 3. silted, unassigned drain in an urgent pocket
        if p["level"] not in URGENT:
            continue
        cands = [assets[i] for i in p["linked_asset_ids"] if i in assets]
        if not cands:
            continue
        worst = max(cands, key=lambda a: a["silt"])
        if worst["silt"] >= SILT_MIN and worst["id"] not in live:
            out.append({"id": f"silted-unassigned:{p['id']}",
                        "text": (f"{p['name']} fills in about {p['time_to_fill_h']} h in the reference scenario, and its most silted "
                                 f"linked drain ({worst['name']}, silt estimate {round(worst['silt'] * 100)}%) has no open task"
                                 f"{_label(p)}."),
                        "why": "Cleaning the most silted linked drain adds the most fill time here.",
                        "evidence": {"pocket_id": p["id"], "asset_id": worst["id"], "silt_estimate": round(worst["silt"], 3),
                                     "time_to_fill_h": p["time_to_fill_h"], "data_source": p["data_source"]}})

    for t in facts["tasks"]:                                             # 4. overdue tasks
        if t["status"] in ("open", "accepted") and t["due_at"]:
            late = _days(datetime.fromisoformat(t["due_at"]), now)
            if late > OVERDUE_DAYS:
                a = assets.get(t["asset_id"], {})
                out.append({"id": f"overdue:{t['id']}",
                            "text": f"Task {t['id']} for {a.get('name', t['asset_id'])} is {late} days past its due date{_label(a)}.",
                            "why": "The task is still " + t["status"] + ".",
                            "evidence": {"task_id": t["id"], "days_overdue": late, "agency_id": t["agency_id"],
                                         "status": t["status"]}})

    urgent = [p for p in facts["pockets"] if p["level"] in URGENT]       # 5. top pocket drain not cleaned for long
    if urgent:
        top = min(urgent, key=lambda p: p["time_to_fill_h"])
        for aid in top["linked_asset_ids"]:
            a = assets.get(aid)
            if not a:
                continue
            clean = a["last_confirmed_clean"]
            age = None if clean is None else (now.date() - date.fromisoformat(clean)).days
            if age is None or age > UNCLEAN_DAYS:
                since = "has no confirmed clean on record" if age is None else f"was last confirmed clean {age} days ago"
                out.append({"id": f"unclean:{aid}",
                            "text": f"{a['name']} drains the fastest-filling pocket ({top['name']}) and {since}{_label(a)}.",
                            "why": "Silt estimates grow with the days since the last confirmed clean.",
                            "evidence": {"asset_id": aid, "pocket_id": top["id"], "days_since_clean": age,
                                         "data_source": a["data_source"]}})
    return out
