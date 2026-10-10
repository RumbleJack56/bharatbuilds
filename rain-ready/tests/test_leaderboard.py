from datetime import datetime, timedelta, timezone

from core import leaderboard as lb

T0 = datetime(2026, 9, 1, 8, 0, tzinfo=timezone.utc)
AG = [{"id": "pwd", "name": "PWD"}, {"id": "mcd", "name": "MCD"}, {"id": "ifc", "name": "I&FC"}]


def iso(h):
    return (T0 + timedelta(hours=h)).isoformat(timespec="seconds")


def make(tid, agency, status, events, due_h=168):
    return {"id": tid, "agency_id": agency, "status": status, "created_at": iso(0), "due_at": iso(due_h)}, \
           [{"id": tid * 100 + i, "task_id": tid, "event": e, "agency_id": ag, "at": iso(h)} for i, (e, ag, h) in enumerate(events)]


def run(items, now_h=400):
    tasks, events = [], []
    for t, e in items:
        tasks.append(t)
        events += e
    return lb.build(AG, tasks, events, T0 + timedelta(hours=now_h), 7)


def test_fast_verified_agency_outranks_a_slow_one():
    items = []
    for i in range(1, 4):      # PWD: accepted in 5 h, done in 30 h, confirmed
        items.append(make(i, "pwd", "confirmed", [("created", "pwd", 0), ("accepted", "pwd", 5), ("completed", "pwd", 30), ("confirmed", "pwd", 40)]))
    for i in range(4, 7):      # MCD: accepted in 90 h, done in 200 h (late), one disputed
        items.append(make(i, "mcd", "confirmed" if i < 6 else "disputed",
                          [("created", "mcd", 0), ("accepted", "mcd", 90), ("completed", "mcd", 200), ("confirmed" if i < 6 else "disputed", "mcd", 210)]))
    r = lb.build(AG, [t for t, _ in items], [e for _, es in items for e in es], T0 + timedelta(hours=400), 7)
    rows = {a["agency_id"]: a for a in r["agencies"]}
    assert rows["pwd"]["rank"] == 1 and rows["mcd"]["rank"] == 2 and rows["pwd"]["score"] > rows["mcd"]["score"]
    assert rows["pwd"]["components"] == {"response": 1.0, "delivery": 1.0, "verified": 1.0, "timeliness": None}
    assert rows["mcd"]["components"]["response"] == 0.0 and rows["mcd"]["components"]["verified"] == 0.67
    assert rows["pwd"]["median_hours_to_accept"] == 5 and rows["mcd"]["inputs"]["disputed"] == 1


def test_a_bounce_is_not_held_against_the_agency_and_the_receiver_gets_the_task():
    t, e = make(1, "mcd", "accepted", [("created", "pwd", 0), ("bounced", "pwd", 3), ("reassigned", "mcd", 3), ("accepted", "mcd", 10)])
    r = {a["agency_id"]: a for a in run([(t, e)])["agencies"]}
    assert r["pwd"]["inputs"]["handed_back"] == 1 and r["pwd"]["components"]["response"] is None     # nothing eligible
    assert r["mcd"]["inputs"]["received"] == 1 and r["mcd"]["inputs"]["accepted_in_48h"] == 1


def test_fewer_than_three_tasks_gets_no_rank_and_unowned_tasks_are_shown_apart():
    a = make(1, "ifc", "open", [("created", "ifc", 0), ("accepted", "ifc", 2)])
    b = make(2, None, "open", [("created", None, 0)])
    r = run([a, b])
    ifc = next(x for x in r["agencies"] if x["agency_id"] == "ifc")
    assert ifc["rank"] is None and ifc["ranked"] is False and ifc["score"] is None
    assert r["unassigned"]["tasks"] == 1 and r["unassigned"]["oldest_days"] > 16


def test_open_task_past_due_lowers_timeliness():
    items = [make(i, "pwd", "open", [("created", "pwd", 0)], due_h=24 * (1 if i == 1 else 30)) for i in (1, 2, 3)]
    row = next(a for a in run(items)["agencies"] if a["agency_id"] == "pwd")
    assert row["inputs"]["overdue_now"] == 1 and row["components"]["timeliness"] == 0.67


def test_weights_sum_to_one():
    assert abs(sum(lb.WEIGHTS.values()) - 1) < 1e-9


def test_a_task_still_inside_its_window_is_not_a_miss():
    items = [make(i, "pwd", "confirmed", [("created", "pwd", 0), ("accepted", "pwd", 4), ("completed", "pwd", 20), ("confirmed", "pwd", 30)]) for i in (1, 2, 3)]
    items.append(make(4, "pwd", "open", [("created", "pwd", 390)]))            # arrived 10 h before 'now' (hour 400)
    row = next(a for a in run(items)["agencies"] if a["agency_id"] == "pwd")
    assert row["inputs"]["still_in_window"] == 1 and row["components"]["response"] == 1.0 and row["inputs"]["received"] == 4


def test_a_redone_job_adds_a_second_verdict():
    t, e = make(1, "pwd", "confirmed", [("created", "pwd", 0), ("accepted", "pwd", 3), ("completed", "pwd", 20), ("disputed", "pwd", 30),
                                        ("accepted", "pwd", 40), ("completed", "pwd", 60), ("confirmed", "pwd", 70)])
    row = next(a for a in run([(t, e)])["agencies"] if a["agency_id"] == "pwd")
    assert row["inputs"]["confirmed"] == 1 and row["inputs"]["disputed"] == 1 and row["components"]["verified"] == 0.5


def test_an_accepted_task_past_its_window_is_a_miss_but_not_before():
    late = make(1, "mcd", "accepted", [("created", "mcd", 0), ("accepted", "mcd", 2)], due_h=168)
    early = make(2, "mcd", "accepted", [("created", "mcd", 300), ("accepted", "mcd", 302)], due_h=168 + 300)
    row = next(a for a in run([late, early], now_h=400)["agencies"] if a["agency_id"] == "mcd")
    assert row["inputs"]["late_open"] == 1 and row["components"]["delivery"] == 0.0
