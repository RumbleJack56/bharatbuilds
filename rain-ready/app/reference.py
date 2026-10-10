"""Delhi evidence base: load the PWD road inventory, the waterlogging events and the EDA output into the database.
Runs from init_db when the tables are empty. Sources are the files the pipeline writes (see docs/DATA.md, docs/EDA.md and docs/SEEDING.md)."""
import csv
import json
from pathlib import Path

from core import eda

from .db import now_iso

ROOT = Path(__file__).resolve().parent.parent
RAW, CONS = ROOT / "data" / "raw", ROOT / "data" / "consolidated"


def _count(con, table: str) -> int:
    return con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def load(con) -> dict:
    """Idempotent: each table is filled once, only when empty and its source file exists."""
    done = {}
    if _count(con, "ref_roads") == 0 and (RAW / "pwd_roads.json").exists():
        roads = json.loads((RAW / "pwd_roads.json").read_text())["roads"]
        con.executemany("INSERT OR REPLACE INTO ref_roads VALUES(?,?,?,?,?,?,?,?,?,?)",
                        [(r["asset_code"], r["road_name"], r["starting_point"], r["end_point"], r["total_length_km"], r["no_of_lanes"],
                          r["right_of_way_m"], r["division"], r["status"], eda.road_key(r["road_name"])) for r in roads])
        done["ref_roads"] = len(roads)
    if _count(con, "ref_waterlog_events") == 0 and (RAW / "fco_rows.csv").exists():
        n = 0
        for r in csv.DictReader((RAW / "fco_rows.csv").open(newline="")):
            full = r["text"][len(r["col1"]):].strip() if r["text"].startswith(r["col1"]) else r["col2"]
            key = eda.road_key(r["col1"]) + "|" + eda.place_key(eda.clean(full) or eda.clean(r["col2"]))
            for d in eda.dates_of(r):
                con.execute("INSERT INTO ref_waterlog_events(list_year,row_no,event_date,road,place,pdf_page,place_key) VALUES(?,?,?,?,?,?,?)",
                            (r["list"], int(r["row_no"]), d, eda.clean(r["col1"]), eda.clean(full or r["col2"])[:120], int(r["pdf_page"]), key))
                n += 1
        done["ref_waterlog_events"] = n
    if (CONS / "eda.json").exists():
        d = json.loads((CONS / "eda.json").read_text())
        if _count(con, "ref_places") == 0:
            chronic = {p["key"] for p in d["chronic"]}
            con.executemany("INSERT OR REPLACE INTO ref_places VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            [(p["key"], p["road"], p["place"], p["n_dates"], len(p["years"]), json.dumps(p["years"]), p["dates"][0], p["dates"][-1],
                              json.dumps(p["rows"]), p["match"], p["pwd_code"], p["right_of_way_m"], p["agency_id"], int(p["key"] in chronic))
                             for p in d["places"]])
            done["ref_places"] = len(d["places"])
        if _count(con, "eda_insights") == 0:
            con.executemany("INSERT OR REPLACE INTO eda_insights VALUES(?,?,?,?,?,?,?,?,?)",
                            [(i["id"], i["kind"], i["priority"], i["text"], i["why"], json.dumps(i["evidence"], default=list),
                              i["action"]["type"], i["action"]["text"], now_iso()) for i in d["insights"]])
            done["eda_insights"] = len(d["insights"])
    return done
