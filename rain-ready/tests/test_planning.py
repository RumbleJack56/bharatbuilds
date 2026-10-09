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
