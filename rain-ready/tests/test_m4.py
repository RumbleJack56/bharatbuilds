import pytest

from core import m4_rules as m4


def test_worked_example_100m2_roof_matches_design_doc():
    r = m4.plan(100, 12, soil="sandy_loam")
    assert r["capture"]["storm_volume_m3"] == pytest.approx(2.1, abs=0.05)
    assert 55 <= r["capture"]["annual_roof_capture_m3"] <= 60


def test_drawdown_reproduces_doc_example_for_1p5m_pit():
    # consistency check against the design doc's worked example, with the doc's 1.5 x 1.5 x 2.5 m pit
    storm = 100 * 0.025 * 0.85
    assert m4.drawdown_hours(storm, m4.SOIL_MM_H["sandy_loam"], 1.5) == pytest.approx(17, abs=1)
    assert m4.drawdown_hours(storm, m4.SOIL_MM_H["loam"], 1.5) == pytest.approx(41, abs=2)
    assert m4.drawdown_hours(storm, m4.SOIL_MM_H["clay_loam"], 1.5) > 80


def test_shallow_table_never_recharges():
    assert m4.plan(100, 2.0, soil="sandy_loam")["decision"] == "DETAIN_ONLY"
    r = m4.plan(100, 4.0, soil="sandy_loam")
    assert r["decision"] == "STORE_REUSE" and r["rule_id"] == "R2" and r["structure"] is None


def test_floodplain_overrides_depth():
    r = m4.plan(100, 20, soil="sandy_loam", in_floodplain=True)
    assert r["decision"] == "STORE_REUSE" and r["rule_id"] == "R8"


def test_deep_table_allows_pit_with_rule_id_and_structure():
    r = m4.plan(100, 12, soil="sandy_loam")
    assert r["decision"] == "PIT_TRENCH_SHAFT" and r["rule_id"] == "R4"
    assert r["structure"]["estimated_drawdown_h"] <= 24 and "first-flush" in r["first_flush"]


def test_very_deep_adds_bore():
    assert m4.plan(100, 18, soil="sandy_loam")["decision"] == "PIT_PLUS_RECHARGE_BORE"


def test_five_to_eight_m_is_roof_only_shallow_with_conflict_warning():
    r = m4.plan(100, 6, soil="sandy_loam")
    assert r["decision"] == "SHALLOW_PIT_ROOF_ONLY" and any("conflict" in w for w in r["warnings"])


def test_slow_soil_gets_tank_or_bore_not_a_pit():
    r = m4.plan(100, 12, soil="clay_loam")
    assert r["decision"] == "TANK_OR_BORE" and r["rule_id"] == "R7"


def test_septic_setback_rejects_pit():
    assert m4.plan(100, 12, soil="sandy_loam", nearest_septic_or_sewer_m=5)["rule_id"] == "R9"


def test_missing_data_is_reported_not_guessed():
    assert m4.plan(100, None)["decision"] == "NEEDS_DATA"
    assert m4.plan(100, 12)["decision"] == "NEEDS_DATA"


def test_unverified_water_table_is_always_flagged_and_banner_present():
    r = m4.plan(100, 12, soil="sandy_loam")
    assert any("not verified" in w for w in r["warnings"]) and "Not for construction" in r["banner"]
    assert not any("not verified" in w for w in m4.plan(100, 12, soil="sandy_loam", water_table_verified=True)["warnings"])


def test_road_runoff_warning():
    r = m4.plan(100, 12, soil="sandy_loam", has_vehicular_or_wash_runoff=True)
    assert any("Rule 10" in w for w in r["warnings"])


def test_input_guards():
    import pytest
    for bad in (dict(roof_m2=0), dict(roof_m2=100, water_table_m=-3), dict(roof_m2=100, infiltration_mm_h=0),
                dict(roof_m2=100, infiltration_mm_h=-5), dict(roof_m2=100, roof_runoff_c=0), dict(roof_m2=100, roof_runoff_c=5),
                dict(roof_m2=100, water_table_m=float("nan"))):
        roof = bad.pop("roof_m2")
        wt = bad.pop("water_table_m", 12)
        with pytest.raises(ValueError):
            m4.plan(roof, wt, **bad)
