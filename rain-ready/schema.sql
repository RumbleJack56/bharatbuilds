-- Rain-Ready schema v3 (SQLite). Task history lives in task_events; that table is the accountability record.
CREATE TABLE IF NOT EXISTS agencies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL            -- drain_owner | water | other
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('resident','official','admin')),
  agency_id TEXT REFERENCES agencies(id)
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
  agency_id TEXT REFERENCES agencies(id),                                -- NULL = no owner found
  owner_source TEXT NOT NULL DEFAULT 'none',                             -- citation or 'none' / 'disputed'
  last_confirmed_clean TEXT,
  data_source TEXT NOT NULL DEFAULT 'placeholder', confidence TEXT NOT NULL DEFAULT 'low', note TEXT
);
CREATE TABLE IF NOT EXISTS pockets (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
  catchment_ha REAL NOT NULL, runoff_c REAL NOT NULL, storage_m3 REAL NOT NULL, drain_mm_h REAL NOT NULL,
  spills_to TEXT REFERENCES pockets(id), linked_asset_ids TEXT NOT NULL DEFAULT '[]',
  exposed_assets INTEGER NOT NULL DEFAULT 0,                             -- placeholder count of basements/shops inside
  data_source TEXT NOT NULL DEFAULT 'placeholder', confidence TEXT NOT NULL DEFAULT 'low', note TEXT
);
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
  lat REAL NOT NULL, lon REAL NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('blocked_drain','standing_water','overflow','other')),
  note TEXT, photo_key TEXT, ai_json TEXT, photo_hash TEXT, flags TEXT, accuracy_m REAL,
  asset_id TEXT REFERENCES assets(id), pocket_id TEXT REFERENCES pockets(id), task_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id TEXT NOT NULL REFERENCES assets(id),
  pocket_id TEXT REFERENCES pockets(id), agency_id TEXT REFERENCES agencies(id),
  action TEXT NOT NULL DEFAULT 'clean',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','accepted','rejected','done','confirmed','disputed')),
  gain_h REAL NOT NULL DEFAULT 0, report_count INTEGER NOT NULL DEFAULT 0, rank_score REAL NOT NULL DEFAULT 0,
  done_by TEXT, due_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id),
  actor_id TEXT, event TEXT NOT NULL, note TEXT, photo_key TEXT, photo_hash TEXT, flags TEXT, agency_id TEXT, at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
  roof_m2 REAL NOT NULL, water_table_m REAL, water_table_verified INTEGER NOT NULL DEFAULT 0,
  soil TEXT, in_floodplain INTEGER NOT NULL DEFAULT 0, wash_runoff INTEGER NOT NULL DEFAULT 0,
  nearest_septic_m REAL, data_source TEXT NOT NULL DEFAULT 'hypothetical'
);
CREATE INDEX IF NOT EXISTS idx_tasks_agency ON tasks(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_events_task ON task_events(task_id);
