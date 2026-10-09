"""Closure levels and flags. Owner: dev#1."""
from core import levels


# ---- closure levels ----
def ev(phase, role, user, lat=28.6425, lon=77.1855, ph="ff00", flags=None):
    return dict(phase=phase, role=role, user_id=user, lat=lat, lon=lon, accuracy_m=10, phash=ph, flags=flags or [])


def crew_set():
    return [ev("before", "crew", "c1", ph="0000"), ev("after", "crew", "c1", ph="ffff"), ev("bank", "crew", "c1", ph="f0f0")]


def test_crew_alone_is_l1_not_confirmed():
    lvl, status, _ = levels.compute_level(crew_set())
    assert (lvl, status) == (1, "EVIDENCE_SUBMITTED")


def test_independent_resident_confirms_l2():
    lvl, status, _ = levels.compute_level(crew_set() + [ev("confirm", "resident", "r9", ph="0ff0")])
    assert (lvl, status) == (2, "CONFIRMED")


def test_same_person_cannot_confirm_own_work():
    lvl, _, _ = levels.compute_level(crew_set() + [ev("confirm", "resident", "c1", ph="0ff0")])
    assert lvl == 1


def test_duplicate_photo_withholds_l1():
    items = crew_set()
    items[1]["flags"] = ["duplicate_photo"]
    lvl, status, _ = levels.compute_level(items)
    assert lvl == 0 and status == "FLAGGED"


def test_missing_bank_photo_is_l0():
    items = [e for e in crew_set() if e["phase"] != "bank"]
    assert levels.compute_level(items)[0] == 0


def test_flags_far_and_duplicate():
    e = ev("after", "crew", "c1", lat=28.6525, ph="ffff")
    flags = levels.evidence_flags(e, 28.6425, 77.1855, other_hashes=["fffe"])
    assert "far_from_asset" in flags and "duplicate_photo" in flags


