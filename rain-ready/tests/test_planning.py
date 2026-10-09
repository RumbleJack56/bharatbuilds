from datetime import date

import pytest

from core import copy, planning


def test_silt_prior_grows_and_never_cleaned_is_a_year():
    t = date(2026, 10, 10)
    assert planning.silt_fraction(t, t) == 0
    assert planning.silt_fraction(None, t) == pytest.approx(0.5 * (1 - 2.718281828 ** (-365 / 75)), abs=1e-3)
    assert planning.silt_fraction(date(2026, 9, 10), t) < planning.silt_fraction(date(2026, 1, 1), t)


def test_gain_if_cleaned_positive_for_silted_linked_asset():
    pockets = [{"id": "p", "name": "p", "kind": "saucer", "catchment_ha": 6, "runoff_c": 0.8, "storage_m3": 900,
                "drain_mm_h": 25, "spills_to": None, "linked_asset_ids": ["a"]}]
    g = planning.gain_if_cleaned(pockets, {"a": 0.4}, "a")
    assert g["pocket_id"] == "p" and g["gain_h"] > 0
    assert planning.gain_if_cleaned(pockets, {"a": 0.0}, "a")["gain_h"] == 0


def test_rank_bumps_with_repeat_reports():
    assert planning.rank_score(1.0, 1) == 1.0 and planning.rank_score(1.0, 3) == 1.5


def test_banned_words():
    assert copy.banned_hits("this is safe, a guarantee") == ["safe", "guarantee"]
    for s in (copy.SCENARIO_BANNER, copy.DEMO_LOGIN, copy.NO_OWNER, copy.FIELD_RULE):
        assert not copy.banned_hits(s)


def test_fill_time_range_brackets_the_point_estimate_and_keeps_order(client):
    r = client.post("/api/simulate", json={"rain_mm_h": 35, "drain_state": "current", "at_h": 1}).json()
    inf = float("inf")
    for p in r["results"]:
        lo = p["time_to_fill_h_low"] if p["time_to_fill_h_low"] is not None else inf
        hi = p["time_to_fill_h_high"] if p["time_to_fill_h_high"] is not None else inf
        pt = p["time_to_fill_h"] if p["time_to_fill_h"] is not None else inf
        assert lo <= pt <= hi, p["id"]
    assert "range" in r["range_note"].lower() and not copy.banned_hits(r["range_note"])
    order = [p["id"] for p in r["results"]]
    base = client.post("/api/simulate", json={"rain_mm_h": 35, "drain_state": "current", "at_h": 1}).json()
    assert order == [p["id"] for p in base["results"]]
