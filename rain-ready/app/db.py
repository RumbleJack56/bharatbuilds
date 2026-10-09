"""SQLite access, schema and seed bootstrap. Routers use `db=Depends(get_db)`; rows behave like dicts."""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from . import config

ROOT = Path(__file__).resolve().parent.parent
_con: sqlite3.Connection | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: str | None = None) -> sqlite3.Connection:
    path = path or config.DB_PATH
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    return con


def get_db() -> sqlite3.Connection:
    global _con
    if _con is None:
        _con = connect()
    return _con


def reset_connection() -> None:
    """For tests: drop the cached connection so the next get_db() reopens config.DB_PATH."""
    global _con
    if _con is not None:
        _con.close()
    _con = None


def _insert(con, table: str, row: dict) -> None:
    row = {k: (json.dumps(v) if isinstance(v, (list, dict)) else v) for k, v in row.items()}
    con.execute(f"INSERT OR REPLACE INTO {table}({','.join(row)}) VALUES({','.join('?' * len(row))})", list(row.values()))


def init_db() -> None:
    con = get_db()
    con.executescript((ROOT / "schema.sql").read_text())
    _add_missing_columns(con)
    if con.execute("SELECT COUNT(*) FROM agencies").fetchone()[0] == 0:
        seed(con)
    con.commit()


ADDED = {"incidents": {"photo_hash": "TEXT", "flags": "TEXT", "accuracy_m": "REAL", "reviewed_by": "TEXT",
                       "reviewed_at": "TEXT", "review_decision": "TEXT", "review_note": "TEXT"},
         "task_events": {"photo_hash": "TEXT", "flags": "TEXT"}}


def _add_missing_columns(con: sqlite3.Connection) -> None:
    """Databases made before a column existed get it added; no data is lost."""
    for table, cols in ADDED.items():
        have = {r["name"] for r in con.execute(f"PRAGMA table_info({table})")}
        for name, typ in cols.items():
            if name not in have:
                con.execute(f"ALTER TABLE {table} ADD COLUMN {name} {typ}")


def seed(con: sqlite3.Connection) -> None:
    data = json.loads((ROOT / "data" / "seed.json").read_text())
    for table in ("agencies", "users", "assets", "pockets", "sites"):
        for row in data[table]:
            _insert(con, table, row)
