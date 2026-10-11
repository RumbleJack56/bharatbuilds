# Seeding the database

How the database is built, how to check it, and how to rebuild it on a laptop or a server.
The database is SQLite. Every row comes from a file in the repo, so a rebuild is repeatable.

## 1. What goes in

| Layer | Tables | Rows | From | Loaded by |
|---|---|---|---|---|
| Operating data | `agencies`, `users`, `assets`, `pockets`, `sites` | 4, 5, 9, 6, 3 | `data/seed.json` (built from `data/sources/`, see `docs/DATA.md`) | `app/db.py` `seed()` |
| Delhi evidence | `ref_roads`, `ref_waterlog_events`, `ref_places`, `eda_insights` | 1,297 / 1,100 / 616 / 7 | `data/raw/pwd_roads.json`, `data/raw/fco_rows.csv`, `data/consolidated/eda.json` | `app/reference.py` |
| Activity | `incidents`, `tasks`, `task_events` | 0 clean | residents and agencies through the API | the app |
| Rehearsal history (optional) | the activity tables, plus `app_meta.data_mode = demo_history` | 6 reports, 10 tasks, 41 events | `scripts/demo_history.py`, through the API with a moved clock | `scripts/seed_db.py --demo` |

Two rules protect the data. The seed validator (`core/seedcheck.py`) refuses a seed with a missing citation, an unknown owner, a drain outside
Delhi or a duplicate id. Reference tables load only when empty, so a restart never doubles them.

## 2. Build it

| You want | Command | Result |
|---|---|---|
| The product database, no history | `make seed FORCE=1` | `var/rainready.db`: seed and evidence, no tasks or reports |
| A demo database with history | `make demo-db` | `var/rainready.db` with 84 days of rehearsal activity, marked as rehearsal. **Overwrites without asking**: back up first (section 5) |
| A database at another path | `python -m scripts.seed_db --db var/demo.db [--demo]` | same, elsewhere. Refuses to overwrite without `--force` |
| The old placeholder set (UI work) | `SEED_PATH=data/seed.placeholder.json make run` | the 8 placeholder drains |

Then start the server on it: `make run`, or `DB_PATH=var/demo.db make run` for a database at another path.

## 3. Check it

```
make verify-db                    # var/rainready.db
make verify-db DB=var/demo.db
```
26 checks on a clean database, 25 on one with rehearsal history. Read only: the API checks run on a temporary copy.

| Group | Checks |
|---|---|
| Structure | all 13 tables, SQLite integrity, foreign keys |
| Seed | every seed id present in all five tables; pockets link only to known drains; every drain has an owner source; every real-source row has a citation |
| Evidence | `ref_roads` equals the PWD snapshot; events equal the parsed lists; places and insights equal `eda.json`; chronic places flagged |
| Mode | says whether it holds rehearsal history; a clean database must have no tasks or reports |
| Backend | health and no router errors; `/api/map`, `/api/city/summary`, `/api/actions`, `/api/leaderboard`, `/api/projection`, `/board` answer and agree with the tables |

A failure names the check. Typical causes:

| Failing check | Cause | Fix |
|---|---|---|
| schema: all tables present | database made before v4 | rebuild: `make seed FORCE=1` |
| seed rows in assets | database holds the placeholder drains | rebuild |
| ref_places matches eda.json | `make eda` was rerun after seeding | rebuild so the table matches |
| clean database has no tasks or reports | reports were made on it | expected for a used database; not an error for a demo |

## 4. What happens at server start

`init_db()` runs the schema (`CREATE TABLE IF NOT EXISTS`, plus additive columns), seeds the operating data only when `agencies` is empty, then fills
each empty reference table. So starting the server on a database made by an older version adds the new tables and the evidence, but it **keeps
its old drains**. That is why an old database needs a rebuild, not a restart.

## 5. Rebuild safely

1. Back up what is there: `python -c "import sqlite3; s=sqlite3.connect('var/rainready.db'); s.backup(sqlite3.connect('var/backup.db'))"`. This copies the write-ahead log too; copying the `.db` file alone can miss recent rows.
2. Stop the server.
3. `make seed FORCE=1` (or `make demo-db`).
4. `make verify-db`.
5. Start the server.

`make reset` removes the database, photos and WAL files; the next start seeds a fresh one from `SEED_PATH` and the evidence files.

## 6. Change the data

| Change | Edit | Then |
|---|---|---|
| A drain, owner or pocket | `data/sources/{drain_points,hotspots,anchors,documents}.csv` | `python -m scripts.consolidate && python -m scripts.prepare_sources && python -m scripts.build_seed`, then `make seedcheck`, then rebuild the database |
| The Delhi records | refresh `data/raw/` (`docs/DATA.md` step 1 and 2) | `make eda`, then rebuild |
| Capture sites | `data/sources/base.json` | `python -m scripts.build_seed`, rebuild |

`make test` fails if `data/seed.json` has a placeholder row, a missing citation or a broken link, so a bad edit is caught before it is seeded.

## 7. On the server (EC2, Docker)

The server is in Aarush's AWS account (ap-south-1, Elastic IP and key in `PLAN.md` section 7). Whoever holds the SSH key does this. The key is not in the repo.
Not run from the author's machine. Only committed files ship, so commit first.

```
# 1. from the repo root: upload the committed tree (the server .env and var/ are kept)
git archive --format=tar HEAD:rain-ready | ssh -i rain-ready/rainready.pem ec2-user@<elastic-ip> 'tar -x -C bharatbuilds/rain-ready'

# 2. on the server
ssh -i rain-ready/rainready.pem ec2-user@<elastic-ip>
cd bharatbuilds/rain-ready
cp var/rainready.db var/backup-$(date +%Y%m%d-%H%M).db        # or take the hourly copy in s3://<bucket>/backup/
docker compose stop app
docker compose build app
docker compose run --rm app python -m scripts.seed_db --force --db /app/var/rainready.db     # add --demo for rehearsal history
docker compose run --rm app python -m scripts.verify_db --db /app/var/rainready.db
docker compose up -d app
curl -s https://<ip-with-dashes>.sslip.io/api/health && curl -s https://<ip-with-dashes>.sslip.io/api/city/summary | head -c 300
```
Step 2 replaces every report, task and photo reference on the server. With `STORAGE=s3` the photos stay in the bucket but the rows that point to them go.
The database already holds one test report outside the ward (`PLAN.md`); a rebuild clears it.
`/board` and `/api/leaderboard` say "Rehearsal data" whenever the database is marked `demo_history`, so a real deployment never shows that note unless it was built with `--demo`.

## 8. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `/api/city/summary` shows 0 places | reference tables empty because `data/consolidated/eda.json` was missing at first start | run `make eda`, rebuild |
| Reports link to no drain | the database still has placeholder drains, or the pin is far from the real ones | `GET /api/map`; the link radius is 150 m |
| "photo reused" hold on a demo report | the same picture sent twice | use a new photo; `scripts/demo_flow.py` makes one per run |
| `seed.json is not valid` at start | an edit broke a citation or id | `make seedcheck` names the row |
| Leaderboard shows nobody ranked | fewer than 3 tasks per agency | expected on a clean database |
