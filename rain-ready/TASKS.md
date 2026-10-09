# TASKS.md: task board for dev#1 and dev#2

| Id | Person | Packages (see `WORK_PACKAGES.md`) |
|---|---|---|
| **dev#1** | **Ujjwal** | P1 Platform + P2 Backend: AWS deploy, ledger, reports, jobs/evidence, storage, triage, end-to-end test |
| **dev#2** | **Aarush** | P3 Frontend + the P4 parts that touch the UI: all of `web/`, `buildings` router, seed data, safety copy |
| unassigned | Taher / Sarthak, or whoever is free | Content that needs no code: video, writeup, blog, interviews, field photos, fact checks (section 4) |

The split follows the seams, so the two of you never edit the same file and neither blocks the other. Task ids are `D1-xx` (dev#1) and `D2-xx` (dev#2). Tick the box in your own section when done.

## 0. Who may edit what (disjoint)

| dev#1 (Ujjwal) edits | dev#2 (Aarush) edits |
|---|---|
| `app/main.py db.py config.py auth.py ledger.py` | `web/**` (everything) |
| `app/routers/ops.py reports.py jobs.py media.py` | `app/routers/buildings.py` `app/routers/map.py` |
| `app/storage.py` `ai/**` | `core/building.py scoring.py geo.py safety_copy.py` |
| `core/levels.py core/ledger_hash.py` | `data/**` `evidence/**` |
| `schema.sql` `openapi.yaml` `scripts/**` `Makefile` `Dockerfile` `docker-compose.yml` `Caddyfile` `CLAUDE.md` `deploy/**` | `tests/test_buildings.py` `tests/test_core.py` |
| `tests/test_reports.py` `tests/test_jobs.py` | `docs/**` (research notes) |
Shared and frozen: `openapi.yaml`, `schema.sql`, `core/*`. A change there needs a line in the commit message and a message to the other person. dev#1 merges if you both need the same seam change.

## 1. Sync points (the only moments you must talk)

| # | When | What | Who tells whom |
|---|---|---|---|
| **SP0** | Start | Both pull, run `make setup && make run && make status && make test`. Confirm the table above | both |
| **SP1** | About 45 min in | dev#1 pushes **stub** routers (`reports`, `jobs`, `media`). `make status` shows no FAIL for them. dev#2 flips `api.js` from mocks to the live server | dev#1 -> dev#2 |
| **SP2** | About H3 | dev#1 posts the **public HTTPS URL**. dev#2 tests camera + GPS on a real phone against it | dev#1 -> dev#2 |
| **SP3** | About H9 | A real photo from a phone shows as a report on the map (reports real + `report.html` + `map.html`) | both |
| **SP4** | About H16 | `scripts/flow.py` green on the live host and the golden path (PROJECT.md section 6) works by hand | both |
| **SP5** | Freeze | Deadline minus 6 h. Only recording bugs get fixed | both |

Never wait for the other person: dev#2 builds on mocks until SP1; dev#1 builds on curl/tests until the UI exists.

---

## 2. dev#1 (Ujjwal): Platform + Backend

Kickoff prompt for your Claude is in `WORK_PACKAGES.md` sections 2 and 3. Do the tasks in this order; D1-02 first because it unblocks dev#2.

| Id | Task | Files | Depends on | Est. | Done when |
|---|---|---|---|---|---|
| [x] D1-01 | Repo is public with the skeleton on `main`; add MIT `LICENSE`; confirm Aarush can push | repo | none | 10 min | Both can `git pull` / `git push` |
| [ ] D1-02 | **Stub routers** for `/api/reports` (GET/POST), `/api/jobs` (GET/POST), `/api/jobs/{id}`, `/api/jobs/{id}/evidence`, `/media/{key}` returning contract-valid example JSON | `app/routers/reports.py jobs.py media.py` | none | 30 min | `make status` has no FAIL; push; tell dev#2 (SP1) |
| [ ] D1-03 | **AWS**: account, `ap-south-1`, private S3 bucket, IAM role (S3 + Bedrock), EC2 `t3.small` + Elastic IP + security group, Docker, `.env` with `DOMAIN=<ip-with-dashes>.sslip.io`, first deploy. Runbook: `docs/implementation-rough-idea.md` section 14 | `deploy/`, `.env` (not committed) | none | 60-90 min | HTTPS URL opens on a phone; post it (SP2) |
| [ ] D1-04 | **Bedrock go/no-go**: enable a Claude model, list inference profiles, test one image call from the instance. Put the model id in `.env` | `.env` | D1-03 | 20 min | Result stated to the group; `TRIAGE_MODE` set |
| [ ] D1-05 | `app/storage.py`: `save_photo(data, ext) -> key`, `photo_url(key)`; local default, S3 when `STORAGE=s3` | `app/storage.py` | none | 30 min | Round-trip works locally and against the bucket |
| [ ] D1-06 | `GET /media/{key}`: stream local or 302 to a pre-signed URL | `app/routers/media.py` | D1-05 | 20 min | A saved photo opens in a browser |
| [ ] D1-07 | `POST /api/reports` for real: validate (NCR, size, image), phash + sha256, nearest asset within 50 m, ticket, triage call, `hazard_text` for wire/manhole, `forward_text`, footer, `ledger.append` | `app/routers/reports.py` | D1-05 | 90 min | `make status` P2 report rows PASS with real data |
| [ ] D1-08 | Clustering (50 m, 24 h, `corroborated` at >= 2 users or staff), per-user daily cap, coarse public `GET /api/reports` | `app/routers/reports.py` | D1-07 | 45 min | Two users' reports become one `corroborated` cluster |
| [ ] D1-09 | `ai/triage.py`: manual fallback by default; Bedrock Converse path, strict JSON, temp 0, 5 s timeout, never asks for advice | `ai/triage.py` | D1-04 | 60 min | Works with `TRIAGE_MODE=manual` and (if go) `bedrock` |
| [ ] D1-10 | Jobs: `POST/GET /api/jobs`, `GET /api/jobs/{id}` | `app/routers/jobs.py` | D1-02 | 45 min | Job list/detail match the contract |
| [ ] D1-11 | **Evidence**: phase/role rules, flags via `core.levels`, `compute_level`, update job, set `assets.last_confirmed_clean` at level >= 2, ledger entries | `app/routers/jobs.py` | D1-10, D1-05 | 90 min | Duplicate photo or far pin -> `FLAGGED`; same person cannot confirm; L2 changes the asset score |
| [ ] D1-12 | Tests with `TestClient` + temp `DB_PATH`: report happy path, wire hazard text, duplicate flagged, self-confirm blocked, L2 sets date, ledger chain still verifies | `tests/test_reports.py test_jobs.py` | D1-07, D1-11 | 60 min | `make test` green |
| [ ] D1-13 | `scripts/flow.py`: end-to-end smoke (report -> job -> 3 crew photos -> resident confirm -> assert L2 + date -> ledger verify -> storm on/off) | `scripts/flow.py` | D1-11 | 45 min | Green locally and on the live host |
| [ ] D1-14 | Abuse limits: 8 MB cap, per-IP and per-`X-User-Id` rate limit on POSTs | `app/main.py` | none | 30 min | A 20 MB upload is rejected |
| [ ] D1-15 | Backups: hourly DB copy to S3; AMI snapshot before recording | `deploy/` | D1-03 | 30 min | Snapshot exists |
| [ ] D1-16 | Stretch: nightly ledger head to an Object-Lock S3 bucket; shown in the video | `scripts/anchor.py` | D1-03 | 45 min | A file appears in S3 |
| [ ] D1-17 | Submission logistics with the team (section 4, S-01 to S-05) | n/a | n/a | n/a | Form submitted before the deadline |

**dev#1 definition of done:** public URL; all P1 and P2 rows of `make status` PASS on the live host; `scripts/flow.py` green on the live host; backup and AMI exist.

---

## 3. dev#2 (Aarush): Frontend + buildings + data

Kickoff prompts are in `WORK_PACKAGES.md` sections 4 and 5. Start with D2-01, which makes every page work before any backend exists.

| Id | Task | Files | Depends on | Est. | Done when |
|---|---|---|---|---|---|
| [ ] D2-01 | `web/js/api.js`: `get/post/postForm`, adds `X-User-Id` (UUID in localStorage), **on 404 returns the fixture** from `web/mock/*.json`; build the fixtures from the examples in `openapi.yaml` | `web/js/api.js web/mock/*.json` | none | 40 min | Any page runs with only static files |
| [ ] D2-02 | **`map.html`**: MapLibre (pinned `maplibre-gl@4.7.1`), assets by tier with text labels (colour-blind-safe, grey for None, never green), hotspots, reports, storm banner, board numbers, popup with name/owner/basis/last-confirmed/components/data_source | `web/map.html web/js/map.js` | D2-01 | 90 min | Live `/api/map` renders on a phone |
| [ ] D2-03 | `app/routers/buildings.py`: `POST /api/buildings`, `GET /api/buildings/{code}?lang=`, `POST .../ack`, `GET /api/public/b/{code}` per the contract (copy the pattern in `map.py`) | `app/routers/buildings.py` | none | 75 min | The 2 building rows of `make status` PASS |
| [ ] D2-04 | `tests/test_buildings.py`: basement with people never `NO_SPECIFIC_FLAG`; placard has no lat/lon and no rating; storm on/off changes `message.items`; ack writes a ledger entry | `tests/test_buildings.py` | D2-03 | 30 min | `make test` green |
| [ ] D2-05 | **`building.html`**: 4 questions + consent + en/hi toggle; render `message` from the API exactly; save code on device; Acknowledge when a warning is active; link to placard | `web/building.html web/js/building.js` | D2-01 (mock), D2-03 (live) | 75 min | Hindi checklist shows; Acknowledge works |
| [ ] D2-06 | **`b.html?code=`** public placard: shows `info_only` prominently, no colour rating, no coordinates | `web/b.html` | D2-01 | 30 min | `/b.html?code=demo0001` renders |
| [ ] D2-07 | **`report.html`**: category buttons, `capture="environment"`, geolocation with accuracy, manual pin fallback (`location_verified=false`), offline queue + retry; success shows ticket, `hazard_text` first when present, `forward_text` with copy | `web/report.html web/js/report.js` | D2-01 | 105 min | Real photo from a phone creates a report (after SP1/SP2) |
| [ ] D2-08 | **`task.html?id=`**: stepper for crew (before / after / bank), Confirm for a different resident, flags in plain words, per-evidence ledger link | `web/task.html web/js/task.js` | D2-01 | 90 min | L1 -> L2 works across two devices |
| [ ] D2-09 | **`ops.html`**: ops key prompt (sessionStorage), drill switch with source text, create job from asset, P1/P2 list, board | `web/ops.html web/js/ops.js` | D2-01 | 60 min | Switch flips banner and tiers on `map.html` |
| [ ] D2-10 | **`verify.html?id=`**: chain result with `proves / does_not_prove` text | `web/verify.html` | D2-01 | 30 min | Shows PASS; fails after a DB row is edited |
| [ ] D2-11 | Seed data: replace placeholders with 20-40 real drains/inlets/underpasses near the pilot ward (QGIS / geojson.io / satellite); set `data_source: field`; check hotspot coordinates. Follow `FIELD_RULES` | `data/seed.json` | none (needs map time or a field visit) | 90 min | No `placeholder` left on assets used in the demo |
| [ ] D2-12 | Safety copy review: Hindi by a native speaker, English by someone with disaster-management judgement; keep banned-words test green | `core/safety_copy.py` | none | 30 min | Reviewer name recorded in the commit message |
| [ ] D2-13 | Polish: loading/error states, 360 px width, no horizontal scroll, large tap targets, light theme; **stranger test**: someone outside the team completes report and building flows unaided in under 2 minutes | `web/**` | all pages | 60 min | Stranger test passed |

**dev#2 definition of done:** every page works on a real phone over the live HTTPS URL; dev#2 rows of `make status` PASS; `make test` green; stranger test passed.

---

## 4. Unassigned: no-code work the team can pick up (suggested for Taher and Sarthak)

| Id | Task | Output | Needs |
|---|---|---|---|
| S-01 | Everyone checks in on the hackathon page; WeMakeDevs account + AWS Builder Center profile + student verification (SheerID) | 4 of 4 done | each member |
| S-02 | Pin the real **deadline time** from the schedule page / Discord; tell the group; compute the freeze time (deadline minus 6 h) | One line in the group chat | none |
| S-03 | Field work (safely, see `FIELD_RULES`): photos of a real choked drain from the kerb, dry weather; 4-6 short interviews (caretaker, RWA, shopkeeper, student); consent noted, no names | Photos + notes in `evidence/` | someone in Delhi |
| S-04 | **Fact-check** every number to be spoken in the video against a primary source (list: `docs/implementation-rough-idea.md` section 8); check DISCOM helpline numbers | A list of "OK to say" / "remove" | web access |
| S-05 | **Video**: script from `PROJECT.md` section 6, shot list, screen recordings of the deployed URL and the AWS console, voiceover, captions; YouTube upload; open it signed-out | Link, <= 3:00 | live URL, flow green |
| S-06 | Writeup (problem, build, where AWS fits, AI tools used, limits, credits) and, if time allows, the Builder Center blog | Text in repo `README.md` + submission form | after SP4 |
| S-07 | Credits and licences list in `README.md` for anything we did not write | Updated README | none |

---

## 5. Parallel-work check (why this works)

- **Zero shared files.** Section 0 is disjoint. The only shared files are the frozen seams.
- **No hard blockers.** dev#2 runs on mock fixtures (D2-01) until dev#1's stubs land (D1-02, about 45 min), then on the live server. dev#1 tests on curl, `TestClient` and `scripts/flow.py`.
- **The status board settles disputes.** If `make status` is green for your rows, you did your part, regardless of what the other side has built.
- **Biggest risk is the contract drifting.** Use field names exactly as in `openapi.yaml`/`schema.sql`. If the shape must change, change the file first.

## 6. If you fall behind (cut in this order)

D1-16 ledger anchor -> `verify.html` tamper demo -> Hindi polish beyond the checklist -> ops "create job" UI (use curl) -> D1-09 Bedrock (manual category) -> D1-08 clustering -> L3 audit. **Never cut:** report -> map, L1 -> L2 confirmation, building checklist, drill switch, safety wording and footer, the ledger verify page, the video.
