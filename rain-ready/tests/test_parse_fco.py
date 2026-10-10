from scripts import parse_fco

PAGE_2022 = """Flood Control Order, 2025       Page 54 of 146
        COMPILED LIST OF WATER LOGGING LOCATIONS
            OBSERVED IN THE YEAR 2022
  S. No.     Name of Road         Specific Location             Date         Frequency
    1.       Pusa Road            Karol Bagh Metro Station      09.07.2023
                                                                22.07.2024
    2.       Rani Jhansi Marg     Filmistan                     23.05.2022
    3.       Ring Road            At merging point of           30.06.2022
                                  Barapullah Flyover
"""
PAGE_2023 = """        COMPILED LIST OF WATER LOGGING LOCATIONS
            OBSERVED IN THE YEAR 2023
    1.       New Rohtak Road      Near Gali No.10, Anand Parbat 18.03.2023
                                  at the foot of Flyover        15.07.2024
"""


def test_rows_dates_and_multiline_cells():
    rows = parse_fco.parse([PAGE_2022, PAGE_2023])
    by = {(r["list"], r["row_no"]): r for r in rows}
    assert len(rows) == 4
    assert by[("2022", 1)]["dates"] == "2023-07-09;2024-07-22"          # a date's own year, not the list's year
    assert by[("2022", 1)]["col1"] == "Pusa Road" and by[("2022", 1)]["col2"].startswith("Karol Bagh")
    assert by[("2022", 3)]["dates"] == "2022-06-30" and "Barapullah" in by[("2022", 3)]["text"]
    assert by[("2023", 1)]["dates"] == "2023-03-18;2024-07-15"
    assert by[("2023", 1)]["pdf_page"] == 2


def test_an_impossible_date_is_dropped():
    assert parse_fco.iso(("31", "02", "2023")) is None
    assert parse_fco.iso(("09", "07", "2023")) == "2023-07-09"
