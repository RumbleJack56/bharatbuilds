import math

import pytest

from core import geo
from scripts import consolidate, signals as sg

ROAD = [{"lat": 28.640 + i * 0.002, "lon": 77.19} for i in range(6)]       # straight, about 1.1 km, running north
PWD = {"RD-1": {"road_name": "Wide Road", "division": "Div A", "right_of_way_m": 27.44},
       "RD-2": {"road_name": "Narrow Road", "division": "Div B", "right_of_way_m": 12.0}}


def test_locate_gives_distance_to_the_line_and_arc_length():
    d, s = sg.locate(ROAD, 28.645, 77.1903)
    assert 25 < d < 35
    assert abs(s - geo.haversine_m(28.640, 77.19, 28.645, 77.19)) < 5


def test_section_is_centred_and_clipped_to_the_way():
    mid = sg.section(ROAD, 550.0, 100)
    length = sum(geo.haversine_m(a[1], a[0], b[1], b[0]) for a, b in zip(mid, mid[1:]))
    assert 195 < length < 205
    assert sg.section(ROAD, 0.0, 100)[0] == [77.19, 28.640]


def test_geometric_median_ignores_one_far_outlier_better_than_a_mean():
    pts = [(28.6400, 77.1900), (28.6401, 77.1901), (28.6399, 77.1899), (28.6700, 77.2300)]
    lat, lon = sg.geometric_median(pts, [1, 1, 1, 1])
    assert geo.haversine_m(lat, lon, 28.6400, 77.1900) < 30                 # the mean would sit about 1.2 km away


def test_group_weight_is_split_so_nine_tagged_ways_are_one_witness():
    near = [{"lat": 28.6400, "lon": 77.1900, "group": "junction", "weight": 3.0}] * 9
    far = [{"lat": 28.6420, "lon": 77.1920, "group": "station", "weight": 2.0}]
    p = sg.estimate_position(near + far)
    assert p["groups"] == 2
    assert geo.haversine_m(p["lat"], p["lon"], 28.6400, 77.1900) < geo.haversine_m(p["lat"], p["lon"], 28.6420, 77.1920)
    assert p["grade"] == "B" and 150 < p["radius_m"] < 200                 # about 300 m apart: the spread is not hidden


def test_a_single_witness_is_never_graded_above_c_and_radius_has_a_floor():
    p = sg.estimate_position([{"lat": 28.64, "lon": 77.19, "group": "only", "weight": 2.0}])
    assert p["grade"] == "C" and p["radius_m"] == 30


def test_two_witnesses_close_together_grade_a():
    p = sg.estimate_position([{"lat": 28.64000, "lon": 77.19000, "group": "a", "weight": 2},
                              {"lat": 28.64020, "lon": 77.19020, "group": "b", "weight": 2}])
    assert p["grade"] == "A" and p["radius_m"] <= 75


def test_design_discharge_in_mm_per_hour():
    assert sg.design_mm_h(0.7) == pytest.approx(17.6, abs=0.1)             # the 1976 Karol Bagh Zone design standard
    assert sg.design_mm_h(0.6) == pytest.approx(15.1, abs=0.1)


def test_mid_rank_percentile_puts_a_common_value_in_the_middle():
    pop = [1] * 7 + [2] * 2 + [10]
    assert sg.percentile_rank(1, pop) == pytest.approx(0.35)
    assert sg.percentile_rank(10, pop) == pytest.approx(0.95)
    assert sg.percentile_rank(5, []) == 0.0


def test_day_counts_count_locations_not_dates():
    rows = [{"list": "2022", "row_no": 1, "dates": "2022-06-30;2023-07-09"}, {"list": "2022", "row_no": 2, "dates": "2022-06-30"},
            {"list": "2023", "row_no": 1, "dates": "2022-06-30"}]
    assert sg.day_counts(rows) == {"2022-06-30": 3, "2023-07-09": 1}


def test_rank_stability_is_deterministic_and_reports_a_range():
    cards = {"a": {"recurrence": 1, "persistence": 1, "ordinary_days": 1, "exposure": 1},
             "b": {"recurrence": 0.1, "persistence": 0.1, "ordinary_days": 0.1, "exposure": 0.1}}
    r = sg.rank_stability(cards, draws=50)
    assert r["a"]["rank"] == 1 and r["a"]["worst"] == 1 and r["b"]["best"] == 2
    assert r == sg.rank_stability(cards, draws=50)


def test_owner_follows_the_sixty_foot_rule_and_fails_on_an_unknown_code():
    assert consolidate.owner("RD-1", PWD)[0] == "pwd"
    assert consolidate.owner("RD-2", PWD)[0] == "mcd"
    with pytest.raises(SystemExit):
        consolidate.owner("RD-404", PWD)
    assert math.isclose(18.29, consolidate.SIXTY_FT_M)
