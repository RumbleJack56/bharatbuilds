import pytest

from core import lowpoints as lp


def P(id, ha=2.0, c=0.8, v=400.0, d=25.0, to=None, silt=0.0, kind="saucer"):
    return lp.Pocket(id, id, kind, ha, c, v, d, to, silt)


def by_id(res):
    return {r["id"]: r for r in res}


def test_no_net_inflow_means_no_fill():
    # 0.8 * 25 = 20 mm/h < 25 mm/h capacity: the drain copes in this scenario
    r = by_id(lp.simulate([P("a")], rain_mm_h=25))
    assert r["a"]["time_to_fill_h"] is None and r["a"]["level"] == "none" and r["a"]["fill_order"] is None


def test_hand_checked_example_matches_docs():
    # 2 ha, C .8, 400 m3, D 25: at 40 mm/h net = 7 mm/h -> 140 m3/h -> 2.857 h
    assert by_id(lp.simulate([P("a")], 40))["a"]["time_to_fill_h"] == pytest.approx(2.857, abs=0.01)
    # at 80 mm/h net = 39 mm/h -> 780 m3/h -> 0.513 h
    assert by_id(lp.simulate([P("a")], 80))["a"]["time_to_fill_h"] == pytest.approx(0.513, abs=0.01)


def test_silt_fills_faster_than_clean():
    clean = by_id(lp.simulate([P("a")], 60))["a"]["time_to_fill_h"]
    silted = by_id(lp.simulate([P("a", silt=lp.SILTED_PRESET_FRACTION)], 60))["a"]["time_to_fill_h"]
    assert silted < clean


def test_heavier_rain_fills_faster_monotonic():
    ts = [by_id(lp.simulate([P("a")], r))["a"]["time_to_fill_h"] for r in (40, 60, 80, 100)]
    assert ts == sorted(ts, reverse=True)


def test_spill_downstream_fills_after_upstream_and_gets_extra_inflow():
    up, down = P("up", ha=1.0, v=50.0), P("down", ha=1.0, v=300.0)
    up.spills_to = "down"
    solo = by_id(lp.simulate([P("down", ha=1.0, v=300.0)], 80))["down"]["time_to_fill_h"]
    both = by_id(lp.simulate([up, down], 80))
    assert both["up"]["time_to_fill_h"] < both["down"]["time_to_fill_h"]
    assert both["down"]["time_to_fill_h"] < solo            # spill adds inflow
    assert both["up"]["fill_order"] == 1 and both["down"]["fill_order"] == 2


def test_unfillable_pockets_sorted_last():
    res = lp.simulate([P("never", ha=1.0, d=100.0), P("fills")], 60)
    assert [r["id"] for r in res] == ["fills", "never"]


def test_fill_pct_at_time_is_monotonic_and_capped():
    pct = [by_id(lp.simulate([P("a")], 80, at_h=t))["a"]["fill_pct_at"] for t in (0, 0.25, 0.5, 1.0)]
    assert pct[0] == 0.0 and pct == sorted(pct) and pct[-1] == 100.0


def test_levels():
    assert lp.level(None) == "none" and lp.level(0.5) == "high" and lp.level(2.0) == "elevated" and lp.level(5.0) == "watch"


def test_bad_graphs_rejected():
    a, b = P("a", to="b"), P("b", to="a")
    with pytest.raises(ValueError):
        lp.simulate([a, b], 60)
    with pytest.raises(ValueError):
        lp.simulate([P("a", to="ghost")], 60)


def test_no_banned_words_in_planner_and_scenario_text():
    import re
    from core import m4_rules, safety_copy
    r = m4_rules.plan(600, 12, soil="sandy_loam", has_vehicular_or_wash_runoff=True, poor_groundwater_quality=True)
    texts = [r["banner"], r["reason"], r["first_flush"], *r["warnings"], *r["maintenance"], *(c["name"] for c in r["checks"])]
    for t in texts:
        assert not safety_copy.BANNED.search(t), t


def test_invalid_pocket_parameters_rejected():
    with pytest.raises(ValueError):
        lp.simulate([P("a", v=-5.0)], 60)
    with pytest.raises(ValueError):
        lp.simulate([P("a", v=0.0)], 60)


def test_ties_break_by_id():
    res = lp.simulate([P("b"), P("a")], 80)
    assert [r["id"] for r in res] == ["a", "b"] and [r["fill_order"] for r in res] == [1, 2]
