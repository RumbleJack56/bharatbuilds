# CLAUDE.md: context for every Claude session on this repo

Read this first, then `PROJECT.md` (what and why), then your tasks in `TASKS.md` and the how-we-work rules in `WORK_PACKAGES.md`. Do not start coding before you have read all four.

## What this is (3 lines)
**Rain-Ready**: a mobile website that (1) shows which low points in a flood-prone Delhi ward fill first as rain increases and how un-cleaned drains make it worse, (2) keeps a tamper-evident record of whether drains were really cleaned (confirmed by an independent second person), and (3) gives basement caretakers a pre-written checklist when an official warning is active. Plus a small experimental rain-capture planner. Pilot: Old Rajinder Nagar / Karol Bagh, Delhi.
Built in about one day for WeMakeDevs x AWS "Environmental Hacks" (track **Heat and Water**), judged only from a 3-minute YouTube video plus a public repo.
It is a **scenario and evidence tool**. It is **not** a flood forecast, not a depth map, not an official warning system.

## Who you are working for
A team of four: **dev#1 Ujjwal, dev#2 Aarush, dev#3 and dev#4 (names to be filled in by the team)**. Each person has a Claude session. **You are one of those sessions.** Ask your person which dev they are if they have not said, then work only from that dev's tasks in `TASKS.md`.

## The three seams (the only things shared between people)
1. `openapi.yaml`: every HTTP endpoint and response shape. The frontend builds to it; the backends implement it.
2. `schema.sql`: every table and column.
3. `core/`: pure functions (no I/O, no framework). Signatures are stable and covered by `tests/`.
Everything else is private to its owner. **Seam files are the one exception to "edit only your own files":** any dev may change `openapi.yaml`, `schema.sql` or a `core/` signature, but only in a small commit that touches just that file (plus its tests), pulled and pushed immediately, with the reason in the commit message and a message to the other devs. Run `make test && make status` first.

## Ownership (edit only your own files)
| Owner | Files |
|---|---|
| **dev#1** Platform + backend | `app/main.py db.py config.py auth.py ledger.py storage.py` `app/routers/ops.py reports.py jobs.py media.py alerts.py` `ai/**` `core/levels.py core/ledger_hash.py` `schema.sql openapi.yaml` `scripts/status.py scripts/flow.py` `deploy/** Makefile Dockerfile docker-compose.yml Caddyfile .dockerignore .env.example .gitignore requirements.txt LICENSE CLAUDE.md WORK_PACKAGES.md TASKS.md` (edit only your own rows of TASKS.md) `tests/test_reports.py test_jobs.py test_levels.py test_ledger.py`; in `docs/implementation-rough-idea.md` only section 14 (AWS runbook) |
| **dev#2** Frontend core | `web/index.html` `web/js/api.js` `web/js/nav.js` `web/css/**` `web/mock/**` and the pages `map.html lowpoints.html report.html task.html ops.html` with their `web/js/<page>.js` |
| **dev#3** Simulator, data, buildings | `core/lowpoints.py scoring.py building.py geo.py` `app/routers/map.py lowpoints.py buildings.py` `data/seed.json` `tests/test_core.py test_lowpoints.py test_lowpoints_api.py test_buildings.py` and the pages `building.html b.html verify.html` with their `web/js/<page>.js` |
| **dev#4** Rules, content, demo | `core/m4_rules.py core/safety_copy.py` `app/routers/capture.py replay.py` `data/capture_presets.json data/replay_2024.json` `scripts/build_replay.py` `tests/test_m4.py tests/test_copy.py` `evidence/** docs/**` (except section 14 above) `PROJECT.md` `README.md` (whole file; dev#1 only adds `LICENSE`) and the pages `capture.html replay.html` with their `web/js/<page>.js` |
Nobody edits another dev's file (except seam files, above). In `TASKS.md` tick only your own rows. If you need a change in someone else's file, write it as a note in your commit message or message them.

## How a router works (copy `app/routers/map.py`)
A file in `app/routers/` that exposes `router = APIRouter(prefix="/api")` is picked up automatically. It reads SQLite via `db=Depends(get_db)`, calls pure functions in `core/`, and returns the shape in `openapi.yaml`. A router that fails to import is skipped and listed in `/api/health`, so a half-finished router never takes down the demo.
After any write that matters (a report, evidence, a job level change, a building acknowledgement, a storm switch, an alert) call `app.ledger.append(db, kind, ref_id, record, photo_sha256)`. Never write the `ledger` table any other way.

## Commands
```
make setup     # once: venv + deps
make run       # server on http://localhost:8010 (reload)
make test      # unit and API tests (49 today)
make status    # PASS / TODO / FAIL per endpoint vs openapi.yaml. Run before every push.
make reset     # wipe local DB + photos, then RESTART the server: seed.json edits only apply to a fresh DB
```

## Hard rules (these protect the project; do not "improve" them away)
1. **All safety text is pre-written** in `core/safety_copy.py`. **No LLM generates, rewrites or translates any checklist, warning, hazard text, alert or disclaimer.** The only LLM use in the product is photo triage (`ai/triage.py`), whose output is display and routing only.
2. **Banned words in user-facing strings:** the bare word "safe", "guarantee", "desilted", "removed", "cm deep". Tests check this. Never show a green tick, a rating or "safe". Status words: `CLAIMED`, `EVIDENCE_SUBMITTED`, `CONFIRMED`, `AUDITED`, `FLAGGED`. "Confirmed" is only used when a different person independently confirmed.
3. **Footer on every alert-like screen** (`safety_copy.FOOTER`): "Unofficial preparedness checklist. Official warnings: IMD / NDMA Sachet." The API returns it; render it.
4. **The low-point simulator is a SCENARIO, never a forecast.** Always show its banner. Parameters (catchment, storage, drain capacity) are hand-placed and illustrative; show them. Never show depth in cm. Show time-to-fill as an approximate range or with "about", never as a countdown to a real event.
5. **The replay never claims the system "flagged" anything.** It shows real model numbers and a labelled hindsight reconstruction.
6. **The rain-capture planner is EXPERIMENTAL.** Always show its banner and the rule id that decided. Water-table depths in presets are assumptions until `water_table_verified` is true.
7. **Triage output never feeds the score or the simulator.** They use time-since-confirmed-clean, listings, trusted report clusters and the hand-placed parameters only.
8. **No terrain or address-level "low pocket" verdicts for a building.** Building level comes from the caretaker's own answers plus listed hotspots within 200 m.
9. **Telegram sends go to TEAM chats only** (env `TELEGRAM_CHAT_IDS`), pre-written text only. Not to real third parties until the legal read in `PROJECT.md` section 10 is done.
10. **Never name people, contractors or officers.** Public board is ward-level and aggregate. No tonnage.
11. **Field safety:** nothing in the product asks anyone to open a manhole, enter a drain, or measure in or after rain (`safety_copy.FIELD_RULES`).
12. **Be honest in data labels.** Every seeded row has `data_source` and `confidence`. Placeholders are labelled placeholders. Do not invent facts, sources, statistics or coordinates. If you do not know, write "unknown" or "verify".
13. **Don't call live third-party APIs from the demo path** (except the Telegram send, which must fail soft). Everything demoed runs from our DB and cached files.

## Hackathon rules that bind the code (from wemakedevs.org/aws/rules)
- Repo must be **public at submission** (private until then is fine); **git history must match the event dates** (Oct 8 to 11). Commit as you go; never squash history away; never import an old project. Anything not written by us needs a credit and a licence in `README.md`.
- The **demo video must show AWS** (console and the deployed URL), not just name it. On YouTube, under 3 minutes.
- The writeup must **list the AI tools used**.
- Judged on what the video shows. A feature not in the video does not exist. One working feature beats five almost-working ones.

## Style
Python 3.12, FastAPI, SQLite (stdlib `sqlite3`), pydantic v2. Plain HTML + vanilla JS modules for the web, no build step, MapLibre from CDN pinned to a fixed version. Small functions, type hints on public functions, comments only for non-obvious "why". Keep files under ~300 lines. Hardcoding is fine for the MVP when labelled (`PROJECT.md` section 9).

## Git
`git pull --rebase` before every push. Commit small and often to `main` (at least every 2 hours). Prefix commits with your dev id, e.g. `[dev#1] reports: cluster by 50 m / 24 h`. Do not force-push. Do not commit `.env`, `var/`, or `.venv`. Seam files change only with a note in the commit message.

## When unsure
Prefer the smallest thing that makes the golden path in `PROJECT.md` section 6 work on the live URL. Ask your human before adding a feature. If a rule above seems to block you, say so; do not silently route around it.
