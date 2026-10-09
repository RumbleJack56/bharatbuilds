import re
from datetime import date, timedelta

from core import building, geo, ledger_hash, levels, safety_copy, scoring

TODAY = date(2026, 10, 10)


def A(**k):
    return scoring.AssetState(**k)


# ---- scoring: the original formula could never fire P1; these tests pin the fix ----
def test_p1_is_reachable_for_never_cleaned_hotspot_underpass():
    v, basis, _ = scoring.vulnerability(A(hotspot_listed=True, source_near_m=200, consequence=1.0), TODAY)
    assert v >= 0.75 and basis == "estimated"
    assert scoring.tier(v, storm_mode_active=True) == "P1"


def test_recently_cleaned_ordinary_drain_never_alerts():
    a = A(last_confirmed_clean=TODAY - timedelta(days=30), consequence=0.5)
    v, _, _ = scoring.vulnerability(a, TODAY)
    assert v < 0.2
    assert scoring.tier(v, True) == "NONE" and scoring.tier(v, False) == "NONE"


def test_unmeasured_silt_is_not_zero():
    fill, basis = scoring.silt_fill(A(), TODAY)
    assert fill > 0.4 and basis == "estimated"


def test_stale_measurement_falls_back_to_prior():
    a = A(silt_measured=0.0, silt_measured_on=TODAY - timedelta(days=200), last_confirmed_clean=None)
    assert scoring.silt_fill(a, TODAY)[1] == "estimated"


def test_fresh_measurement_is_used():
    a = A(silt_measured=0.3, silt_measured_on=TODAY - timedelta(days=5))
    assert scoring.silt_fill(a, TODAY) == (0.3, "measured")


def test_tiers_without_storm():
    assert scoring.tier(0.8, False) == "P2"
    assert scoring.tier(0.5, False) == "WATCH"
    assert scoring.tier(0.5, True) == "WATCH"
    assert scoring.tier(0.6, True) == "P1"


# ---- building level ----
def test_basement_with_people_is_never_low():
    lvl, _ = building.building_level(True, False, True, False, False)
    assert lvl == "HIGH_ATTENTION"


def test_no_flags():
    assert building.building_level(False, False, False, False, False)[0] == "NO_SPECIFIC_FLAG"


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


# ---- ledger ----
def _chain(n=3):
    out, prev = [], ledger_hash.GENESIS
    for i in range(n):
        rec = {"kind": "x", "i": i}
        h = ledger_hash.entry_hash(prev, rec, None)
        out.append(dict(prev_hash=prev, hash=h, record=rec, photo_sha256=None))
        prev = h
    return out


def test_ledger_verifies_and_detects_tamper():
    c = _chain()
    assert ledger_hash.verify_chain(c) == (True, None)
    c[1]["record"]["i"] = 99
    assert ledger_hash.verify_chain(c) == (False, 1)


# ---- safety copy ----
def test_no_banned_words_in_any_user_facing_string():
    for s in safety_copy.all_strings():
        assert not safety_copy.BANNED.search(s), s


def test_every_message_carries_footer_and_both_languages():
    for lvl in ("HIGH_ATTENTION", "ELEVATED", "NO_SPECIFIC_FLAG"):
        for lang in ("en", "hi"):
            for storm in (True, False):
                m = safety_copy.building_message(lvl, lang, storm)
                assert m["footer"] == safety_copy.FOOTER[lang] and m["items"]


# ---- geo ----
def test_haversine_known_distance():
    d = geo.haversine_m(28.6139, 77.2090, 28.6139, 77.2190)  # ~0.01 deg lon at Delhi lat ~ 980 m
    assert 900 < d < 1050
