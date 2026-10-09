"""Scoring, building level, geo. Owner: dev#3."""
from datetime import date, timedelta

from core import building, geo, scoring

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




# ---- geo ----
def test_haversine_known_distance():
    d = geo.haversine_m(28.6139, 77.2090, 28.6139, 77.2190)  # ~0.01 deg lon at Delhi lat ~ 980 m
    assert 900 < d < 1050
