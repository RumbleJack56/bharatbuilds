from scripts import prepare_sources as ps


def card(**over):
    base = {"note": "Place named in the FCO.", "position": {"radius_m": 30, "grade": "A", "groups": 2},
            "waterlogging": {"n_dates": 2, "dates": ["2023-07-09", "2024-07-22"], "on_ordinary_days": 0},
            "coverage_gap": False, "design_mm_h": 17.6, "design_cusec_per_acre": 0.7,
            "exposure": {"within_m": 200, "total": 0, "nearest_facility_m": 838}}
    base.update(over)
    return base


def test_years_counts_dates_by_year():
    assert ps.years(["2022-05-23", "2022-06-30", "2023-07-08"]) == "2022: 2, 2023: 1"


def test_note_states_what_is_measured_and_what_is_a_default():
    n = ps.note(card(), 3)
    assert "2 dates (by year, 2023: 1, 2024: 1)" in n and "3 or fewer places" in n
    assert "17.6 mm/h is the 1976 design unit discharge" in n and "not measured" in n
    assert "nearest is 838 m away" in n                                  # zero exposure is not read as 'nothing nearby'


def test_note_says_when_no_list_covers_the_place_and_uses_singular():
    n = ps.note(card(coverage_gap=True, position={"radius_m": 40, "grade": "C", "groups": 1},
                     waterlogging={"n_dates": 1, "dates": ["2024-08-13"], "on_ordinary_days": 0}), 3)
    assert "1 date (" in n and "1 independent source phrase)" in n and "interior lanes" in n
