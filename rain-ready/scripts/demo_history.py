"""Rehearsal history: 84 days of reports, routing, bounces, jobs and confirmations, made through the real API with the clock moved.
Gives the leaderboard, the silt estimates and the cleaning history something to show. It is REHEARSAL DATA: the database is marked
(`app_meta.data_mode = demo_history`) and every public page says so. Run via scripts/seed_db.py --demo."""
from datetime import timedelta

from app import clock
from scripts.demo_kit import Api

# drain positions (from data/seed.json); a report is placed a few metres off its drain
KBM, JHB, FIL, EPN, ORN = (28.6440, 77.18889), (28.64504, 77.19776), (28.65909, 77.20313), (28.64155, 77.17392), (28.63925, 77.18386)
CULVERT = (28.6456, 77.19564)
DAYS = 84


def build(client) -> dict:
    start = clock.now() - timedelta(days=DAYS)
    api = Api(client, now=clock.now)

    def at(day: float):
        clock.travel_to(start + timedelta(days=day, hours=9))

    log = []

    def step(day, what):
        log.append((day, what))

    at(0)
    plan = api.plan("admin-1", 5)
    step(0, f"Coordinator generates the pre-monsoon plan: {len(plan['created_task_ids'])} tasks")
    tasks = {t["asset_id"]: t["id"] for t in client.get("/api/tasks").json()["tasks"]}

    # PWD works quickly. Karol Bagh, Jhandewalan, Filmistan done in the first week.
    for asset, (lat, lon), acc_h, done_d, ok in (("DR-KBM-PUSA", KBM, 5, 2.5, True), ("DR-JHB-LINK", JHB, 20, 4, False), ("DR-FIL-RANI", FIL, 8, 3, True)):
        tid = tasks[asset]
        clock.travel_to(start + timedelta(hours=acc_h))
        api.accept("off-pwd", tid)
        at(done_d)
        api.complete("off-pwd", tid, "inlet and outlet cleared, photographed from the footpath", lat, lon)
        at(done_d + 1.5)
        api.confirm("res-2" if ok else "res-1", tid, ok, "clear and draining" if ok else "water still stands after rain")
        step(done_d, f"{asset}: accepted in {acc_h} h, done, {'confirmed' if ok else 'disputed'}")
        if not ok:                                              # rework: the agency takes it again, redoes it, a resident confirms
            at(done_d + 3)
            api.accept("off-pwd", tid)
            at(done_d + 4)
            api.complete("off-pwd", tid, "outlet pipe flushed and inlet re-cleared", lat, lon)
            at(done_d + 5.5)
            api.confirm("res-2", tid, True, "draining now")
            step(done_d + 4, f"{asset}: redone after the dispute, confirmed")

    # East Patel Nagar: PWD hands it back (1976 plan lists the Patel Road barrel under MCD); MCD takes it
    tid = tasks["DR-PRB-EPN"]
    at(1)
    api.bounce("off-pwd", tid, "listed under MCD drains in the 1976 master plan; ownership to be checked", "mcd")
    step(1, "PWD hands back the Patel Road barrel task with a reason; routed to MCD")
    clock.travel_to(start + timedelta(days=2, hours=15))
    api.accept("off-mcd", tid)
    at(7)
    api.complete("off-mcd", tid, "barrel inlet cleared", *EPN)
    at(8)
    api.confirm("res-1", tid, True, "clear")
    step(8, "MCD accepts in 30 h and finishes in 7 days; confirmed")

    # Old Rajinder Nagar: MCD is slow to accept and finishes after the due date
    tid = tasks["DR-DN-BAZ"]
    clock.travel_to(start + timedelta(days=2, hours=21))
    api.accept("off-mcd", tid)
    at(10.5)
    api.complete("off-mcd", tid, "ramp cleared and drain mouth opened", *ORN)
    at(12)
    api.confirm("res-2", tid, True, "water drains now")
    step(10.5, "MCD accepts after 3 days, finishes after 10 (late); confirmed")

    # Monsoon: new reports
    at(31)
    r = api.report("res-1", *KBM, "inlet at the metro station choked again after the first rain", off=(0.00004, 0.00002))
    step(31, f"Resident reports Karol Bagh again: linked {r['linked_asset']} at {r['distance_m']} m, task {r['task_id']}")
    clock.travel_to(start + timedelta(days=31, hours=14))
    api.accept("off-pwd", r["task_id"])
    at(33)
    api.complete("off-pwd", r["task_id"], "silt lifted from the inlet", *KBM)
    at(34)
    api.confirm("res-2", r["task_id"], True)

    at(45)
    r = api.report("res-2", *CULVERT, "water coming over the culvert grating", kind="overflow")
    step(45, f"Report at an unnamed culvert: {r['linked_asset']}, no owner found, task {r['task_id']}")
    at(47)
    api.assign("admin-1", r["task_id"], "mcd")
    step(47, "Coordinator assigns it to MCD pending ownership confirmation")
    clock.travel_to(start + timedelta(days=50, hours=9))
    api.accept("off-mcd", r["task_id"])                          # accepted, then not completed: it will show as overdue

    at(60)
    r = api.report("res-1", *FIL, "drain at the cinema crossing is blocked", off=(0.00003, -0.00004))
    clock.travel_to(start + timedelta(days=62, hours=19))
    api.accept("off-pwd", r["task_id"])
    at(66)
    api.complete("off-pwd", r["task_id"], "cleared, partially", *FIL)
    at(67)
    api.confirm("res-2", r["task_id"], False, "still standing water at the kerb")
    step(66, "Filmistan: accepted after 3 days, marked done, disputed by a resident; the dispute is still waiting for a redo")

    at(71)
    r = api.report("res-2", *JHB, "inlet near the roundabout is full of plastic", off=(0.00002, 0.00003))
    clock.travel_to(start + timedelta(days=71, hours=11))
    api.accept("off-pwd", r["task_id"])
    clock.travel_to(start + timedelta(days=71, hours=20))
    api.complete("off-pwd", r["task_id"], "cleared", *JHB)
    at(72)
    api.confirm("res-1", r["task_id"], True)

    at(80)
    held = api.report("res-2", *KBM, "water at the metro station", off=(0.032, 0.02))      # photo geotag about 3.9 km away
    step(80, f"Report whose photo was taken 3 to 4 km from the spot: held_for_review={held['held_for_review']}")
    if held["held_for_review"]:
        at(81)
        api.review("admin-1", held["incident"]["id"], "reject", "photo geotag far from the reported spot")

    at(83)
    r = api.report("res-1", *EPN, "water at the bus stand after the evening rain", off=(0.00004, 0.00005))
    step(83, f"New report today at East Patel Nagar: task {r['task_id']} open")

    clock.reset()
    return {"steps": log}
