# CLAUDE.md: context for every Claude session on this repo

Read this first, then `PROJECT.md` (what and why), then your section of `WORK_PACKAGES.md` (what you build). Do not start coding before you have read all three.

## What this is (3 lines)
**Rain-Ready**: a mobile website for pre-monsoon drain readiness and basement preparedness in Indian cities (pilot: Old Rajinder Nagar / Karol Bagh, Delhi). Built in about one day for WeMakeDevs x AWS "Environmental Hacks" (track: **Heat and Water**), judged only from a 3-minute YouTube video plus a public repo.
It is an **evidence layer** (tamper-evident record, independent confirmation) and a **preparedness checklist**. It is **not** a flood forecast, not a depth map, not an official warning system.

## Who you are working for
A team of four (P1..P4). Right now two people are building in parallel, see `TASKS.md`: **dev#1 = Ujjwal = P1 Platform + P2 Backend**; **dev#2 = Aarush = P3 Frontend + the buildings router, seed data and safety copy from P4**. Each person has a Claude session. **You are one of those sessions.** Ask your person which dev they are if they have not said, then work only from that person's task list in `TASKS.md`.

## The three seams (the only things shared between people)
1. `openapi.yaml`: every HTTP endpoint and response shape. Frontend builds to it, backends implement it.
2. `schema.sql`: every table and column.
3. `core/`: pure functions (no I/O, no framework). Signatures are stable; behaviour is covered by `tests/test_core.py`.
Everything else is private to its owner. If you need a change to a seam: edit the seam file, run `make test && make status`, say so in the commit message, and tell the person who owns it.

## Ownership (edit only your own files)
| Owner | Files |
|---|---|
| **P1 Platform** | `app/main.py` `app/db.py` `app/config.py` `app/auth.py` `app/ledger.py` `app/routers/ops.py` `core/ledger_hash.py` `schema.sql` `openapi.yaml` `scripts/` `deploy/` `Makefile` `Dockerfile` `docker-compose.yml` `Caddyfile` `CLAUDE.md` |
| **P2 Backend** | `app/routers/reports.py` `app/routers/jobs.py` `app/routers/media.py` `app/storage.py` `ai/` `core/levels.py` `tests/test_reports.py` `tests/test_jobs.py` |
| **P3 Frontend** | `web/**` (all of it) |
| **P4 Logic, data, content** | `core/scoring.py` `core/building.py` `core/geo.py` `core/safety_copy.py` `app/routers/map.py` `app/routers/buildings.py` `data/**` `evidence/**` `docs/**` `tests/test_core.py` `tests/test_buildings.py` |
If you need something in another person's file, do not edit it. Write the request as a note in the commit or message the owner.

## How a router works (copy `app/routers/map.py`)
A file in `app/routers/` that exposes `router = APIRouter(prefix="/api")` is picked up automatically. It reads SQLite via `db=Depends(get_db)`, calls pure functions in `core/`, and returns the shape in `openapi.yaml`. A router that fails to import is skipped and listed in `/api/health`, so a half-finished router never takes down the demo.
After any write that matters (a report, evidence, a job level change, a building acknowledgement) call `app.ledger.append(db, kind, ref_id, record, photo_sha256)`. Never write the `ledger` table any other way.

## Commands
```
make setup     # once: venv + deps
make run       # server on http://localhost:8010 (reload)
make test      # unit tests
make status    # PASS / TODO / FAIL per endpoint vs openapi.yaml. Run before every push.
make reset     # wipe local DB + photos; re-seeds on next start
```

## Hard rules (these protect the project; do not "improve" them away)
1. **All safety text is pre-written** in `core/safety_copy.py`. **No LLM generates, rewrites or translates any checklist, warning, hazard text or disclaimer.** The only LLM use in the product is photo triage (`ai/triage.py`), whose output is display and routing only.
2. **Banned words in user-facing strings:** the bare word "safe", "guarantee", "desilted", "removed", "cm deep". `tests/test_core.py` checks this. Never show a green tick, a rating or "safe". The status words are `CLAIMED`, `EVIDENCE_SUBMITTED`, `CONFIRMED`, `AUDITED`, `FLAGGED`. "Confirmed" is only ever used when a different person independently confirmed.
3. **Every alert-like screen carries the footer** (`safety_copy.FOOTER`): "Unofficial preparedness checklist. Official warnings: IMD / NDMA Sachet." The API returns it; render it.
4. **Triage output never feeds the score.** Scoring uses time-since-confirmed-clean, listings, owner-reported data and trusted report clusters only (`core/scoring.py`).
5. **No terrain or address-level "low pocket" verdicts.** The building level comes from the caretaker's own answers plus listed hotspots within 200 m.
6. **Never name people, contractors or officers.** Public board is ward-level and aggregate only. No tonnage.
7. **Field-safety:** nothing in the product asks anyone to open a manhole, enter a drain, or measure in or after rain (`safety_copy.FIELD_RULES`).
8. **Be honest in data labels.** Every seeded asset has `data_source` and `confidence`. Placeholders are labelled placeholders. Do not invent facts, sources, statistics or coordinates. If you do not know, write "unknown" or "verify".
9. **Don't call live third-party APIs from the demo path.** Everything demoed runs from our DB and cached files.

## Hackathon rules that bind the code (from wemakedevs.org/aws/rules)
- Repo must be **public**; **git history must match the event dates** (Oct 8 to 11). Commit as you go from today; never squash history away, never import an old project. Anything not written by us needs a credit and a licence in `README.md`.
- The **demo video must show AWS** (console and the deployed URL), not just name it. Must be on YouTube, under 3 minutes.
- The writeup must **list the AI tools used**. (Claude Code, Bedrock if live. Be exact.)
- Judged on what the video shows. A feature not in the video does not exist. One working feature beats five almost-working ones.

## Style
Python 3.12, FastAPI, SQLite (stdlib `sqlite3`), pydantic v2. Plain HTML + vanilla JS modules for the web, no build step, MapLibre from CDN pinned to a fixed version. Small functions, type hints on public functions, comments only for non-obvious "why". Keep files under ~300 lines. Hardcoding is fine for the MVP when labelled (see PROJECT.md section 8).

## Git
`git pull --rebase` before every push. Commit small and often to `main` (at least every 2 hours). Prefix commits with your role, e.g. `[P2] reports: cluster by 50 m / 24 h`. Do not force-push. Do not commit `.env`, `var/`, or `.venv`. Seam files (`openapi.yaml`, `schema.sql`, `core/*`) change only with a note in the commit message.

## When unsure
Prefer the smallest thing that makes the golden path in `PROJECT.md` section 6 work on the live URL. Ask your human before adding a feature. If a rule above seems to block you, say so; do not silently route around it.
