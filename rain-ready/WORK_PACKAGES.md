# WORK_PACKAGES.md: how we work in parallel (seams, protocol, kickoff prompts)

`TASKS.md` says **what** each person builds. This file says **how** four people and four Claude sessions stay in sync. Quickstart:

```
cd rain-ready && make setup && make run      # server on :8010
make status                                  # PASS / TODO / FAIL per endpoint against openapi.yaml
make test                                    # 49 tests
```
`make status` is the shared progress board: a TODO that turns PASS means that endpoint matches the contract. Everyone runs it before pushing.

## 1. The seams (what is frozen and who may touch it)

| Seam | File | What it fixes | Producer | Consumers |
|---|---|---|---|---|
| S1 HTTP API | `openapi.yaml` | Every endpoint and JSON shape | dev#1 (owner) | dev#2/3/4 frontends, `scripts/status.py` |
| S2 Database | `schema.sql` | Tables and columns | dev#1 | all backends |
| S3 Pure logic | `core/*.py` | Scoring, closure levels, building level, low-point simulator, rain-capture rules, ledger hashing, safety copy, geo | dev#3 (scoring, building, geo, lowpoints), dev#1 (levels, ledger_hash), dev#4 (m4_rules, safety_copy) | all routers |
| S4 Seed data | `data/seed.json` | Assets, hotspots, pockets, demo building | dev#3 | `app/db.py` loader, all |
| S5 Ledger call | `app/ledger.py` `append(db, kind, ref_id, record, photo_sha256)` | One way to write the hash chain | dev#1 | every router that writes |
| S6 Photo storage | `app/storage.py` `save_photo(data: bytes, ext: str) -> key`, `photo_url(key) -> str` | Local or S3 behind two functions | dev#1 | `reports.py`, `jobs.py`, `media.py` |
| S7 Triage | `ai/triage.py` `triage_photo(image_bytes: bytes, category: str) -> dict` (shape = `Triage` in openapi) | Bedrock or manual fallback | dev#1 | `reports.py` |
| S8 Web shared layer | `web/js/api.js`, `nav.js`, `css/app.css` | fetch wrapper (adds `X-User-Id`, mock-on-404), header/footer, styles | dev#2 | every page by every dev |
| S9 Safety text | `core/safety_copy.py` | All safety and alert copy, en + hi | dev#4 | API returns it; frontends render it; `alerts.py` sends it |
| S10 Simulator inputs | `lowpoints` table + `core/lowpoints.py` | Pocket parameters and the fill model | dev#3 | `routers/lowpoints.py`, `dev#2` page |

**Rule of change:** any dev may edit a seam file, but only in a small commit that touches just that file (plus its tests), pushed immediately, with the reason in the commit message and a heads-up to its consumers; run `make test && make status` first. Everything inside a package is private and can change freely.
**Rule of unblock:** never wait. Backend owners push a **stub** router returning contract-valid example JSON within the first 45 minutes. Frontend uses live endpoints where they exist and `web/mock/` fixtures (mock-on-404) where they do not.

## 2. Kickoff prompt: dev#1 (Ujjwal), Platform + backend
> You are dev#1 on Rain-Ready. Read CLAUDE.md, PROJECT.md, TASKS.md section 1, this file's section 1, openapi.yaml, schema.sql, core/levels.py and app/routers/map.py (the reference router pattern). Only edit files owned by dev#1. First: add the LICENSE and push stub routers for reports, jobs, evidence, media and /api/alerts/telegram (contract-valid JSON; alerts returns 401 without the ops key), then prepare the AWS deployment (EC2 + docker compose + Caddy with sslip.io HTTPS + S3 + IAM role) and give me exact commands; wait for me to run console steps. Then implement storage, reports, jobs/evidence, triage, alerts in TASKS order, running `make test && make status` after each. Safety text comes only from core/safety_copy.py.

## 3. Kickoff prompt: dev#2 (Aarush), Frontend core
> You are dev#2 on Rain-Ready. Read CLAUDE.md, PROJECT.md (sections 3, 5, 6), TASKS.md section 2 and openapi.yaml. Only edit web files owned by dev#2. First build web/js/api.js, nav.js, css/app.css and mock fixtures, then lowpoints.html (the flagship: it can use the live /api/lowpoints and /api/lowpoints/simulate endpoints right now), then map.html, report.html, task.html, ops.html. Render all safety text, banners and footers exactly as the API returns them; never write your own. The simulator page must always show the "Scenario, not a forecast" banner.

## 4. Kickoff prompt: dev#3, Simulator, data, buildings
> You are dev#3 on Rain-Ready. Read CLAUDE.md, PROJECT.md, TASKS.md section 3, openapi.yaml, schema.sql, core/lowpoints.py, core/building.py, app/routers/map.py and app/routers/lowpoints.py. Only edit files owned by dev#3. First implement app/routers/buildings.py to the contract with tests, then improve the pocket and asset data in data/seed.json (label every change; never invent facts), then the pages building.html, b.html and verify.html using web/js/api.js. Keep tests/test_lowpoints_api.py green; it pins the demo values.

## 5. Kickoff prompt: dev#4, Rules, copy, content, demo
> You are dev#4 on Rain-Ready. Read CLAUDE.md, PROJECT.md, TASKS.md section 4, openapi.yaml, core/m4_rules.py, core/safety_copy.py and app/routers/capture.py / replay.py. Only edit files owned by dev#4. First add the Telegram alert strings (en/hi) to core/safety_copy.py with tests so dev#1 can send them, then capture.html and replay.html, then the fact-check list and the video script. Never invent facts, statistics or coordinates. Safety text is pre-written, never LLM-generated; the rain-capture planner always shows its Experimental banner and the rule id.

## 6. Integration protocol

**Checkpoints** (H0 = when the group starts; adjust to the real clock once the deadline time is known): see `TASKS.md` section 0 (SP0 to SP5). Freeze = deadline minus 6 h. Record and edit in the following 3 h. Submit at deadline minus 2 h.

**Git etiquette** (disjoint directories means almost no conflicts):
- `git pull --rebase` before pushing. Small commits prefixed `[dev#1]` to `[dev#4]` to `main`, at least every 2 hours. No long-lived branches.
- Seam files change only as described above. If two people need conflicting changes to the same seam, dev#1 decides.
- Never commit `.env`, `var/`, `.venv`, credentials, or other people's code without a credit in `README.md`.
- The repo is judged on history: do not rewrite it. No force-push. Keep the repo private until the team makes it public before submission.

**Working with four AI sessions on one repo:**
1. Every session starts by reading `CLAUDE.md`, `PROJECT.md`, `TASKS.md` and pasting its kickoff prompt.
2. Tell your Claude "only edit files under <your paths>". If it proposes a change elsewhere, ask it to write a note for the owner instead.
3. Run `make test && make status` after every meaningful change. If your change turns another owner's PASS into FAIL, you broke a seam: fix or revert.
4. Do not let a session refactor, rename or "tidy" shared files. Use field names exactly as in `openapi.yaml` and `schema.sql`.
5. Prefer asking the owner over guessing. A two-line message beats an hour of drift.

## 7. Demo data and roles
- **Re-run the demo values on the recording day.** Silt estimates use today's date, so "current" values for assets with a cleaning date drift. `tests/test_lowpoints_api.py` pins the LP-RN-1 values (stable because `DR-RN-001` has never been cleaned); other pockets may move.
- Seed edits (`data/seed.json`) only reach a fresh DB: run `make reset` and restart the server.
- A seeded job `1` exists for asset `DR-RN-001` (open `task.html?id=1`).
- Ops key: `OPS_KEY` from `.env` (default `demo` locally; change on the server).
- Demo building: code `demo0001` ("Demo Library (FICTIONAL building)"), answers give `HIGH_ATTENTION`.
- Assets `DR-RN-001..005`, `DR-KB-006..007`, `UP-DEMO-1`; `DR-RN-004` is already confirmed (shows a low score). Pockets `LP-RN-1..3`, `LP-UP-1`, `LP-KB-1`; `LP-RN-1` is linked to `DR-RN-001`, so confirming that drain is the demo's "loop" moment.
- Roles in the demo are teammates (labelled on screen): crew = one phone, confirming resident = another phone in a different browser profile so it has a different `X-User-Id`; the Telegram alert goes to a teammate's phone.

## 8. Submission checklist (dev#1 drives, everyone checks)
- [ ] All four checked in on the hackathon page; WeMakeDevs account + AWS Builder Center profile for each; student verification started.
- [ ] Public GitHub repo (flipped from private in time to test signed-out); `LICENSE`; `README.md` with run steps, limits, data provenance, credits and licences, **AI tools used** (exact: Claude Code, Bedrock model if live).
- [ ] Git history shows work from the event window; no old-project code.
- [ ] Live URL works on mobile data from a signed-out device.
- [ ] Video <= 3:00, on YouTube (public or unlisted), opens signed-out, **shows the AWS console and the live URL**, shows every feature we claim.
- [ ] Writeup: problem, build, where AWS fits, AI tools, limits.
- [ ] Optional: blog on AWS Builder Center linked in the submission.
- [ ] Submit once per team on the hackathon's own form, before the deadline on the schedule page. Save the confirmation.
- [ ] Stop the EC2 instance after judging.
