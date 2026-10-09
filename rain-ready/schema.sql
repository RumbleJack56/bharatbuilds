-- FROZEN CONTRACT. Change only via a PR that also updates openapi.yaml and pings the group. Owner: P1.
-- SQLite. Timestamps are ISO-8601 UTC strings. JSON columns are TEXT.
-- Anonymous users: the browser generates a UUID kept in localStorage and sends it as X-User-Id. No accounts.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);                                   -- e.g. key='storm' -> {"active":true,"level":"warning","source":"IMD orange","set_at":"..."}

CREATE TABLE IF NOT EXISTS assets (  -- hand-digitised drains/inlets/underpasses/pumps. WRITE: P4 (seed). READ: all
  id TEXT PRIMARY KEY,               -- e.g. DR-RN-007
  type TEXT NOT NULL CHECK (type IN ('drain_segment','inlet','underpass','pump_station')),
  name TEXT NOT NULL,
  lat REAL NOT NULL, lon REAL NOT NULL,
  geom_json TEXT,                    -- optional GeoJSON for line assets
  owner TEXT NOT NULL DEFAULT 'DISPUTED',   -- PWD | MCD | IFC | NDMC | DISPUTED
  covered INTEGER NOT NULL DEFAULT 0,
  hotspot_listed INTEGER NOT NULL DEFAULT 0,
  standing_water_last_monsoon INTEGER NOT NULL DEFAULT 0,
  source_near_m REAL NOT NULL DEFAULT 1000000,
  consequence REAL NOT NULL DEFAULT 0.2,
  silt_measured REAL, silt_measured_on TEXT,
  last_confirmed_clean TEXT,         -- set ONLY when a job reaches level >= 2
  data_source TEXT NOT NULL DEFAULT 'placeholder',   -- placeholder | field | inquiry_report | news
  confidence TEXT NOT NULL DEFAULT 'low',
  note TEXT
);

CREATE TABLE IF NOT EXISTS hotspots ( -- named known hotspots / underpasses (watch list). WRITE: P4 (seed). READ: all
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL,   -- underpass | low_colony | other
  lat REAL NOT NULL, lon REAL NOT NULL,
  data_source TEXT NOT NULL, year INTEGER, note TEXT
);

CREATE TABLE IF NOT EXISTS reports (  -- WRITE: P2
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket TEXT NOT NULL UNIQUE,       -- RR-000123
  created_at TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('blocked_drain','waterlogged_road','open_manhole','live_wire','basement_water','other')),
  lat REAL NOT NULL, lon REAL NOT NULL, accuracy_m REAL,
  location_verified INTEGER NOT NULL DEFAULT 0,   -- 0 when manual pin / GPS denied
  client_ts TEXT,
  photo_key TEXT, photo_phash TEXT, photo_sha256 TEXT,
  note TEXT,
  user_id TEXT NOT NULL, user_role TEXT NOT NULL DEFAULT 'resident',   -- resident | staff
  cluster_id INTEGER,
  asset_id TEXT,                     -- nearest asset within 50 m, else NULL
  triage_json TEXT,                  -- Bedrock output or {"mode":"manual"}; NEVER a scoring input
  status TEXT NOT NULL DEFAULT 'reported'   -- reported | unverified | corroborated
);

CREATE TABLE IF NOT EXISTS jobs (     -- one cleaning job per asset visit. WRITE: P2 (and P1 /ops creates)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  created_at TEXT NOT NULL,
  trigger TEXT NOT NULL,             -- p1_storm | p2_inspection | report | manual
  score_snapshot REAL,
  level INTEGER NOT NULL DEFAULT 0,  -- 0..3 (see core/levels.py)
  status TEXT NOT NULL DEFAULT 'CLAIMED',   -- CLAIMED | FLAGGED | EVIDENCE_SUBMITTED | CONFIRMED | AUDITED
  note TEXT
);

CREATE TABLE IF NOT EXISTS evidence ( -- WRITE: P2
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  phase TEXT NOT NULL CHECK (phase IN ('before','after','bank','confirm','audit')),
  role TEXT NOT NULL CHECK (role IN ('crew','resident','staff')),
  user_id TEXT NOT NULL,
  lat REAL NOT NULL, lon REAL NOT NULL, accuracy_m REAL,
  client_ts TEXT, server_ts TEXT NOT NULL,
  photo_key TEXT NOT NULL, photo_phash TEXT, photo_sha256 TEXT,
  flags_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS buildings ( -- WRITE: P4
  code TEXT PRIMARY KEY,             -- unguessable, e.g. 8 chars [a-z0-9]
  name TEXT NOT NULL,
  lat REAL, lon REAL,
  declared_use TEXT, declared_exits INTEGER,
  basement INTEGER NOT NULL, entrance_below_road INTEGER NOT NULL,
  people_inside INTEGER NOT NULL, ramp_over_drain INTEGER NOT NULL,
  near_listed_hotspot_200m INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL, reasons_json TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, last_ack_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS acks (     -- caretaker acknowledged the checklist for a warning. WRITE: P4
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_code TEXT NOT NULL REFERENCES buildings(code),
  warning_set_at TEXT NOT NULL, at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger (   -- append-only hash chain. WRITE: P1 only, via app/ledger.py
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prev_hash TEXT NOT NULL, hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,                -- report | evidence | job_level | storm | building_ack
  ref_id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  photo_sha256 TEXT,
  server_ts TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_cluster ON reports(category, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_job ON evidence(job_id);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON ledger(kind, ref_id);
