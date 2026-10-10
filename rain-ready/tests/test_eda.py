from core import eda, stats


def row(lst, no, road, place, dates, page=60):
    return {"list": lst, "row_no": str(no), "pdf_page": str(page), "col1": road, "col2": place, "dates": ";".join(dates),
            "text": f"{road} {place}"}


ROWS = [row("2022", 1, "Pusa Road", "Karol Bagh Metro Station", ["2022-07-01", "2023-07-09", "2024-07-22"]),
        row("2023", 4, "PUSA Road", "Karol Bagh  Metro Station", ["2023-07-09"]),                 # same place, other list, other spelling
        row("2022", 2, "Ring Road", "Dhaula Kuan Loop", ["2022-06-30"]),
        row("2023", 5, "Unknown Marg", "Nowhere", ["2023-07-09", "2023-07-10"]),
        row("2024", 9, "Ring Road", "Dhaula Kuan Loop", ["2024-06-28"])]
PWD = [{"asset_code": "RD-1", "road_name": "Pusa Road", "right_of_way_m": 27.44},
       {"asset_code": "RD-2", "road_name": "Ring Road", "right_of_way_m": 30.0},
       {"asset_code": "RD-3", "road_name": "Ring Road", "right_of_way_m": 12.0}]       # same name, different owner by the 60 ft rule


def test_places_merge_by_road_and_place_words_across_lists():
    ps = eda.places(ROWS)
    pusa = next(p for p in ps if p["road"].lower().startswith("pusa"))
    assert pusa["n_dates"] == 3 and pusa["n_lists"] == 2 and len(pusa["rows"]) == 2
    assert len(ps) == 3


def test_profile_shares_and_validate_findings():
    p = eda.profile(ROWS)
    assert p["location_dates"] == 8 and p["monsoon_share"] == 1.0 and p["by_month"][7] == 6
    v = eda.validate(ROWS)
    assert v["numbering_gaps"]["2022"] == []                 # rows 1 and 2
    assert v["numbering_gaps"]["2023"] == [1, 2, 3]


def test_days_counts_places_per_day():
    d = eda.days(ROWS)
    assert d["counts"]["2023-07-09"] == 3 and d["n_days"] == 6 and d["busiest"][0] == (3, "2023-07-09")


def test_ownership_rule_and_ambiguity_stays_unresolved():
    owned = {p["road"]: p for p in eda.match_ownership(eda.places(ROWS), PWD)}
    assert owned["Pusa Road"]["agency_id"] == "pwd" and owned["Pusa Road"]["pwd_code"] == "RD-1"
    assert owned["Ring Road"]["agency_id"] is None and owned["Ring Road"]["match"] == "ambiguous"
    assert owned["Unknown Marg"]["agency_id"] is None and owned["Unknown Marg"]["match"] == "none"
    s = eda.ownership_summary(list(owned.values()))
    assert s["by_agency"] == {"pwd": 3, "unresolved": 4} and s["places_unresolved"] == 2


def test_chronic_needs_dates_in_three_years():
    owned = eda.match_ownership(eda.places(ROWS), PWD)
    assert [p["road"] for p in eda.chronic(owned)] == ["Pusa Road"]


def test_clean_drops_glyphs_and_gaps():
    assert eda.clean("Khanpur   T-Point \U0001F5B7\U0001F5B7 both") == "Khanpur T-Point both"


def test_stats_helpers():
    assert stats.share_top([5, 3, 2], 1) == 0.5 and stats.median([3, 1, 2]) == 2
    assert stats.gini([1, 1, 1, 1]) == 0.0 and stats.gini([0, 0, 0, 10]) > 0.7
