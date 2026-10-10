# Data: seed format, validator, build script

`data/seed.json` fills a fresh database. Edits reach only a new DB: run `make reset`, then restart the server.

## Format
Top-level lists: `agencies`, `users`, `assets` (drains), `pockets`, `sites`.

| Table | Required fields |
|---|---|
| assets | `id`, `type`, `name`, `lat`, `lon`, `agency_id` (or null), `owner_source`, `data_source`, `confidence`, optional `last_confirmed_clean`, `citation` |
| pockets | `id`, `name`, `kind`, `lat`, `lon`, `catchment_ha`, `runoff_c`, `storage_m3`, `drain_mm_h`, `linked_asset_ids`, `data_source`, `confidence`, optional `spills_to`, `citation` |
| sites | `id`, `name`, `lat`, `lon`, `roof_m2`, `data_source`, plus fields in `schema.sql` |

## Validator (`core/seedcheck.py`)
Runs on every seed (`app/db.py`) and with `make seedcheck`. It fails when:
- an id is duplicated in a table;
- `data_source` is not one of `placeholder`, `hypothetical`, `osm`, `field`, `official`, `derived`;
- `confidence` (assets, pockets) is not `low`, `medium` or `high`;
- a row with a real source (`osm`, `field`, `official`, `derived`) has no `citation`;
- an asset has no `owner_source`, or an `agency_id` that does not exist;
- a coordinate is missing or outside the Delhi-NCR box;
- a pocket links to an unknown asset or spills to an unknown pocket.

## Building a seed from sources (`scripts/build_seed.py`, no network)
Put files in `data/sources/`:
- `*.geojson`: drain lines (LineString or MultiLineString). Each becomes one asset at the midpoint of its longest line. Properties read: `id`, `name`, `type`, `citation`, `confidence`, `data_source` (default `osm`), `note`.
- `owners.csv`: `asset_id,agency_id,owner_source`. Without a row, an asset has no owner ("No owner found").
- `pockets.csv`: pocket fields; `linked_asset_ids` separated by `;`.
- `base.json` (optional): `agencies`, `users`, `sites`. Default: the current `seed.json`.

Run `python -m scripts.build_seed` from `rain-ready/`. It refuses to write when the validator fails. Review every row before you commit.

## Real-data pipeline (B7)
Raw snapshots and curated tables go in; a seed, a consolidated card per place and a report come out. Only step 1 uses the network.

| Step | Command | Writes |
|---|---|---|
| 1 | `python -m scripts.fetch_sources` (`--only pwd\|osm\|anchors`; Overpass often fails, rerun) | `data/raw/pwd_roads.json`, `osm_roads.json`, `osm_drains.json`, `osm_exposure.json`, `osm_anchors.json` |
| 2 | `python -m scripts.parse_fco path/to/fco_2025.pdf` (needs `pdftotext`) | `data/raw/fco_rows.csv`: every row of the 2022, 2023 and 2024 lists with its dates and PDF page |
| 3 | edit `data/sources/{hotspots,anchors,drain_points,documents}.csv` by hand | the curated claims; each row cites a PDF page, an OSM id or a quoted document |
| 4 | `python -m scripts.consolidate` | `data/consolidated/hotspots.json`: position with radius and grade, dates, day severity, drains, owner, exposure, index, rank stability, and the three route checks |
| 5 | `python -m scripts.prepare_sources`, then `python -m scripts.build_seed --out data/seed.candidate.json`, then `make seedcheck` | `data/sources/{drains.geojson,owners.csv,pockets.csv}`, the candidate seed |
| 6 | `python -m scripts.make_report` | `docs/data-report.html` and `data/consolidated/signals.json` |

How a point is placed (`scripts/signals.py`, tested):
- **Position**: each source phrase names an OSM feature (`anchors.csv`). The weighted geometric median of those features is the position; the radius is the weighted spread (30 m floor); grade A needs two independent groups within 75 m, B within 200 m, C otherwise. A group's weight is split among its members, so nine tagged ways of one junction count once.
- **Drain point**: `drain_points.csv` names a method: `osm_line` (a real OSM line), `road_end` (the end of a named road), `road_nearest` (the nearest point of a named road to the place). A point more than 400 m from its place stops the build.
- **Owner**: from `pwd_code` by the 60 ft rule (`consolidate.owner`), else the curated agency and source text. A code not in the inventory stops the build.
- **Drain capacity**: `drain_mm_h` is the 1976 design unit discharge converted from cusec per acre (0.7 gives 17.6 mm/h). Catchment, runoff coefficient and storage stay scenario defaults and the pocket note says so.
- **Linked drains**: only the primary drain of a pocket is linked. A pocket's drainage is limited by its worst linked drain, so linking two would make cleaning either one worth 0 h in the simulator.

`data/seed.json` is this pipeline's output (the candidate was promoted; tests use `data/seed.placeholder.json` through `SEED_PATH`). Do not commit `data/raw/pwd_roads.json` if the PWD API terms change; it holds no contact fields.

## Seed, database and EDA (v4)
- `data/seed.json` is the real seed (9 drains, 6 pockets, from the pipeline above). `data/seed.placeholder.json` is the old placeholder set: tests use it, and so can UI work (`SEED_PATH=data/seed.placeholder.json make run`). `app/config.py` reads `SEED_PATH`.
- `make eda` runs `scripts/run_eda.py` (stages in `core/eda.py`): validate, profile, places, days, roads, ownership, chronic, pilot, insights, actions. Output: `data/consolidated/eda.json`, `docs/EDA_RESULTS.md`, and `docs/eda-report.html` via `python -m scripts.make_eda_report`. Method and definitions: `docs/EDA.md`.
- Seeding, verification and deployment steps: `docs/SEEDING.md`.
- `make seed` builds `var/rainready.db`: schema, seed, and the Delhi evidence base (`ref_roads` 1,297 PWD roads, `ref_waterlog_events` 1,100, `ref_places`, `eda_insights`; loaded by `app/reference.py` when empty). `make demo-db` adds 84 days of rehearsal history through the API with a moved clock (`scripts/demo_history.py`) and marks the database `app_meta.data_mode = demo_history`, which every public page then says.
- A database made before this version keeps its old rows: `make reset` first, or run `scripts/seed_db.py --force --db <path>`.
- The clock: all time goes through `app/clock.py`. Only the rehearsal build and tests move it.
