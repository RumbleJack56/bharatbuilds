"""Structured facts about the ward, read from the database. Feeds core/insights.py and core/report.py."""
from datetime import datetime, timedelta, timezone

from core import planning
from core import lowpoints as lp

from . import service


def ward_facts(db, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    silt = service.asset_silt(db)
    reports = {r["asset_id"]: r["n"] for r in db.execute(
        "SELECT asset_id, COUNT(*) n FROM incidents WHERE asset_id IS NOT NULL GROUP BY asset_id")}
    assets = [{**dict(r), "silt": silt[r["id"]], "report_count": reports.get(r["id"], 0)} for r in db.execute("SELECT * FROM assets")]
    rows = service.pocket_rows(db)
    by = {p["id"]: p for p in rows}
    pockets = []
    for r in lp.simulate(planning.build_pockets(rows, silt, "current"), planning.REF_RAIN_MM_H):
        p = by[r["id"]]
        pockets.append({"id": r["id"], "name": r["name"], "level": r["level"], "time_to_fill_h": r["time_to_fill_h"],
                        "linked_asset_ids": p["linked_asset_ids"], "data_source": p["data_source"],
                        "confidence": p["confidence"]})
    tasks = [dict(r) for r in db.execute("SELECT * FROM tasks")]
    bounced = {r["agency_id"]: r["n"] for r in db.execute(
        "SELECT agency_id, COUNT(*) n FROM task_events WHERE event='bounced' GROUP BY agency_id")}
    agencies = [{"id": r["id"], "name": r["name"], "bounced": bounced.get(r["id"], 0)} for r in db.execute("SELECT * FROM agencies")]
    held = [dict(r) for r in db.execute(
        "SELECT id, flags, review_decision FROM incidents WHERE flags IS NOT NULL AND review_decision IS NULL")]
    week = (now - timedelta(days=7)).isoformat(timespec="seconds")
    confirmed_7d = db.execute("SELECT COUNT(DISTINCT task_id) FROM task_events WHERE event='confirmed' AND at>=?", (week,)).fetchone()[0]
    return {"assets": assets, "pockets": pockets, "tasks": tasks, "agencies": agencies, "held_flags": held,
            "confirmed_7d": confirmed_7d, "generated_at": now.isoformat(timespec="seconds")}
