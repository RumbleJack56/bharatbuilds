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
