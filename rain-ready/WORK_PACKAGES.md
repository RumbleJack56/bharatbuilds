# WORK_PACKAGES.md: who builds what, split along the seams

Four people, four packages, no shared files. You can all start **right now** because the seams already exist and run:

```
cd rain-ready && make setup && make run      # server on :8010
make status                                  # 7 pass / 4 todo today. The TODOs are exactly P2's and P4's endpoints.
make test                                    # 18 core tests pass
```
`make status` is the shared progress board: when a TODO turns PASS, that endpoint matches the contract. Everyone runs it before pushing.

## 0. The seams (what is frozen and who may touch it)

| Seam | File | What it fixes | Producer | Consumer |
|---|---|---|---|---|
| S1 HTTP API | `openapi.yaml` | Every endpoint and JSON shape | P1 (owner), implementers P1/P2/P4 | P3 (frontend), `scripts/status.py` |
| S2 Database | `schema.sql` | Tables and columns | P1 | P2, P4 (writers), P1 (ledger) |
| S3 Pure logic | `core/*.py` | Scoring, levels, building level, geo, ledger hashing, safety copy | P4 (+ P2 for levels, P1 for ledger_hash) | All backends |
| S4 Seed data | `data/seed.json` | Assets, hotspots, demo building | P4 | P1 (loader), all |
| S5 Ledger call | `app/ledger.py` `append(db, kind, ref_id, record, photo_sha256)` | One way to write the hash chain | P1 | P2, P4 |
| S6 Photo storage | `app/storage.py` `save_photo(data: bytes, ext: str) -> key`, `photo_url(key) -> str` | Local or S3, behind two functions | P2 | P2 routers, media route |
| S7 Triage | `ai/triage.py` `triage_photo(image_bytes: bytes, category: str) -> dict` (shape = `Triage` in openapi) | Bedrock or manual fallback | P2 | `reports.py` |
| S8 Web API helper | `web/js/api.js` | `fetch` wrapper that adds `X-User-Id`, falls back to `web/mock/*.json` on 404 | P3 | P3 pages |
| S9 Safety text | `core/safety_copy.py` | All safety copy, en + hi | P4 | API returns it; frontend renders it |

**Rule of change:** edit a seam file only with a note in the commit message and a heads-up to its consumers. Run `make test && make status`. Everything inside a package is private and can change freely.

**Rule of unblock:** never wait for another person. Backend owners push a **stub** router returning contract-valid example JSON within the first 45 minutes (so `make status` shows PASS and the frontend can integrate on the live server). The frontend uses `web/mock/` fixtures until the real endpoint exists (mock-on-404).

## 1. Dependency map (what actually blocks what)

```
core/ (done)  ----------------->  P2 (levels), P4 (scoring/building)    no wait
openapi.yaml (done) ----------->  P3 builds UI against examples          no wait
schema.sql + db.py + ledger (done) -> P2/P4 write rows                    no wait
P1: public URL (H3) ----------->  everyone integrates on the live box     soft
P2: reports/jobs live ---------->  P3 report/task pages go live            P3 uses mocks till then
P4: buildings live ------------>  P3 building/placard pages go live        P3 uses mocks till then
```
Hard blockers are zero. That is the point.

## 2. Package P1: Platform, deploy, integration
**Goal:** a public HTTPS URL running the app on AWS by H3, redeployable in one command, and the submission logistics owned.
**Files you own:** `app/main.py app/db.py app/config.py app/auth.py app/ledger.py app/routers/ops.py core/ledger_hash.py schema.sql openapi.yaml scripts/ Makefile Dockerfile docker-compose.yml Caddyfile CLAUDE.md`
**Tasks (in order):**
- [ ] `git init` in `rain-ready/`, create a **public** GitHub repo, add `LICENSE` (MIT), push the skeleton as the first commit, invite the three others. **Commit honestly and often from now on (history must match the event dates).**
- [ ] AWS (see `docs/implementation-rough-idea.md` section 14): account, region `ap-south-1`; private S3 bucket (Block Public Access on); IAM role for EC2 with S3 + Bedrock invoke on that bucket/region only; EC2 `t3.small` + Elastic IP + security group (22 from your IP, 80/443 open); install Docker; `.env` with `DOMAIN=<ip-with-dashes>.sslip.io`.
- [ ] First deploy of the skeleton; open the HTTPS URL on a phone. **Post the URL to the group (target H3).**
- [ ] Bedrock check: enable a Claude model, list inference profiles in your account, test one image call from the instance. Report go/no-go to P2 (the model ID goes in `.env`, never in code). If no-go, set `TRIAGE_MODE=manual`.
- [ ] `make deploy HOST=ec2-user@<ip>` works end to end; document in `README.md`.
- [ ] Extend `scripts/status.py` as endpoints appear; write `scripts/flow.py`: an end-to-end smoke test (report -> job -> crew evidence x3 -> resident confirm -> assert level 2 and `last_confirmed_clean` -> ledger verify -> storm on/off). This is the regression test before every demo and recording.
- [ ] Ledger anchor (stretch, 45 min): nightly job writes `ledger/YYYY-MM-DD.json` (head hash, count) to an S3 bucket created with Object Lock; show it in the video.
- [ ] Hourly copy of `var/rainready.db` to S3; AMI snapshot before recording.
- [ ] Basic abuse limits: file size <= 8 MB, per-IP and per-`X-User-Id` rate limit on POST routes.
- [ ] Submission logistics (you hold the list in section 8): check-in, verification, YouTube upload, form.
**Definition of done:** public URL, `make status` all PASS on the live host, `scripts/flow.py` green on the live host, backup and AMI exist.
**Hardcode freely:** `OPS_KEY`, one instance, no CI.
**Kickoff prompt for your Claude:**
> You are P1 (Platform) on Rain-Ready. Read CLAUDE.md, PROJECT.md, WORK_PACKAGES.md section 2 and docs/implementation-rough-idea.md section 14. Only edit files owned by P1. First task: initialise git and prepare the AWS deployment (EC2 + docker compose + Caddy with sslip.io HTTPS + S3 + IAM role). Give me exact commands and wait for me to run the AWS console steps. Then write scripts/flow.py.

## 3. Package P2: Reports, evidence, triage (backend)
**Goal:** a phone can send a photo and location, get a ticket, and a job can climb L0 -> L2 with flags and ledger entries.
**Files you own:** `app/routers/reports.py app/routers/jobs.py app/routers/media.py app/storage.py ai/triage.py core/levels.py tests/test_reports.py tests/test_jobs.py`
**First 45 minutes:** push stub routers so `make status` goes PASS for `/api/reports` and `/api/jobs` (return `[]`), then build for real.
**Tasks:**
- [ ] `app/storage.py`: `save_photo(data, ext) -> key` and `photo_url(key) -> str`; local disk (`PHOTO_DIR`) by default, S3 when `STORAGE=s3` (boto3, instance role, private bucket). `media.py`: `GET /media/{key}` streams local or 302s to a pre-signed URL.
- [ ] `POST /api/reports` (multipart): validate category and `core.geo.in_ncr`; reject files > 8 MB or non-image; compute `imagehash.phash` and sha256; save photo; nearest asset within 50 m (`core.geo.nearest`); ticket `RR-%06d` from the row id; run triage; if category is `live_wire` or `open_manhole` return `hazard_text` from `core.safety_copy.hazard_text(category, lang)`; build `forward_text` (pre-written template: ticket, category, lat/lon, "photo evidence logged, please inspect") and `footer`; `ledger.append("report", ...)`.
- [ ] Clustering: same category within 50 m and 24 h = one cluster (`cluster_id` = id of the first report). A cluster becomes `corroborated` when it has >= 2 distinct `user_id` or one `user_role='staff'`; otherwise `unverified`. Cap 10 reports per user per day.
- [ ] `GET /api/reports`: public, coarse (round lat/lon to 4 d.p.), no user ids.
- [ ] Jobs: `POST /api/jobs` (ops key), `GET /api/jobs`, `GET /api/jobs/{id}` with evidence list, flags and notes.
- [ ] `POST /api/jobs/{id}/evidence` (multipart): enforce phase/role pairs (before/after/bank = crew; confirm = resident; audit = staff; reject others with 422); compute flags with `core.levels.evidence_flags` against the asset and the phashes of recent evidence from all jobs; recompute level with `core.levels.compute_level`; update `jobs.level/status`; **if level >= 2 set `assets.last_confirmed_clean = today`**; `ledger.append` for `evidence` and, when the level changes, `job_level`.
- [ ] `ai/triage.py`: `triage_photo(image_bytes, category) -> dict`. If `TRIAGE_MODE != "bedrock"` or any error/timeout (5 s): return `{"mode":"manual","needs_human_review":true,"severity":"low","hazards":[],"gauge_rod_visible":false,"one_line_summary":"Manual category"}`. If bedrock: Converse API, temperature 0, strict JSON, ask only for type / severity / hazards / gauge-rod-visible / one-line summary; **never** ask the model for advice or safety text; on `live_wire` or submerged pole set severity `danger`. Triage output is display and routing only.
- [ ] Tests with FastAPI `TestClient` and a temp `DB_PATH`: report happy path, hazard text present for live_wire, duplicate photo flagged, same person cannot confirm, L2 sets `last_confirmed_clean`, ledger chain still verifies after all writes.
**Definition of done:** the P2 rows of `make status` PASS; `scripts/flow.py` passes; the duplicate-photo and far-away-pin cases show `FLAGGED`.
**Hardcode freely:** one S3 bucket name from env; manual triage fallback; NCR bounding box.
**Kickoff prompt:**
> You are P2 (Backend: reports/evidence/triage) on Rain-Ready. Read CLAUDE.md, PROJECT.md, WORK_PACKAGES.md section 3, openapi.yaml, schema.sql, core/levels.py and app/routers/map.py (the reference router pattern). Only edit files owned by P2. First push stub routers for /api/reports and /api/jobs that return contract-valid JSON, then implement storage, reports, jobs, evidence and triage in that order, running `make test && make status` after each.

## 4. Package P3: Frontend (all of `web/`)
**Goal:** a stranger with a phone can use every page without help, in Hindi or English, and the video looks good.
**Files you own:** `web/**`
**Constraints:** plain HTML + vanilla JS modules, no build step. MapLibre GL pinned (`maplibre-gl@4.7.1` from cdnjs/jsdelivr) with OSM raster tiles. HTTPS is required for camera and GPS (the deploy provides it; locally use `localhost`). Never write safety text yourself: render `message.headline/items/always/footer`, `hazard_text`, `info_only` exactly as the API returns them. UI chrome (button labels) can be translated in a small `i18n.js`.
**First 45 minutes:** create `web/js/api.js` (S8): `api.get/post/postForm`, auto-adds `X-User-Id` (UUID in localStorage), and on a 404 returns the matching fixture from `web/mock/*.json` (build fixtures from the `example` blocks and schemas in `openapi.yaml`). Now every page works before any backend exists.
**Pages (in this order of priority):**
- [ ] `map.html`: assets as circles coloured by tier with a **text label too** (P1 / P2 / Watch / None; use a colour-blind-safe palette, grey for None, never green for "OK"); hotspot markers; reports; storm banner from `/api/state`; ward board numbers from `/api/board`; popup shows `name`, `owner`, `basis` (measured/estimated), `last_confirmed_clean`, the score components, and `data_source/confidence`. Footer from the API.
- [ ] `report.html`: category buttons; `<input type="file" accept="image/*" capture="environment">`; `navigator.geolocation` with accuracy shown; manual pin fallback (set `location_verified=false`); offline queue in localStorage with retry; success screen shows ticket, `hazard_text` (large, first) when present, and `forward_text` with a copy button.
- [ ] `task.html?id=`: shows job, level, status, evidence list with flags (human-readable), and one action by role: crew uploads before/after/bank, resident taps Confirm (own photo). Make the three crew steps obvious (a stepper). Show the ledger link per evidence.
- [ ] `building.html`: 4 questions + consent + language toggle; result with level headline and checklist from the API; "Save on this device"; acknowledge button when `storm.active`; link to the placard.
- [ ] `b.html?code=`: public placard; shows `info_only` prominently; no colour rating.
- [ ] `ops.html`: password prompt (store `X-Ops-Key` in sessionStorage), drill switch (on/off with source text), create job from asset, P1/P2 list, board.
- [ ] `verify.html?id=`: shows chain result and the `proves / does_not_prove` text.
- [ ] Polish: loading and error states, large tap targets, works at 360 px width, no horizontal scroll, light theme only is fine.
**Definition of done:** all pages work on a real phone over the live HTTPS URL; a person outside the team completes the report flow unaided in under 2 minutes.
**Hardcode freely:** map centre/zoom on the pilot ward, fixtures, a single theme.
**Kickoff prompt:**
> You are P3 (Frontend) on Rain-Ready. Read CLAUDE.md, PROJECT.md (sections 4 and 6), WORK_PACKAGES.md section 4 and openapi.yaml. Only edit files under web/. First build web/js/api.js with mock-on-404 fixtures, then map.html, report.html, task.html, building.html, b.html, ops.html, verify.html in that order. Render all safety text exactly as the API returns it; never write your own.

## 5. Package P4: Logic, data, buildings, content, demo
**Goal:** correct, tested core logic; believable seed data; the building flow and placard; and the content that makes the video land.
**Files you own:** `core/scoring.py core/building.py core/geo.py core/safety_copy.py app/routers/map.py app/routers/buildings.py data/** evidence/** docs/** tests/test_core.py tests/test_buildings.py`
**Tasks:**
- [ ] `app/routers/buildings.py` (copy the pattern in `map.py`): `POST /api/buildings` (random 8-char lowercase code; `near_listed_hotspot_200m` from hotspots + `core.geo`; level from `core.building`; message from `core.safety_copy.building_message(level, lang, storm_active)`); `GET /api/buildings/{code}?lang=`; `POST /api/buildings/{code}/ack` (insert `acks`, set `last_ack_at`, `ledger.append("building_ack", ...)`); `GET /api/public/b/{code}` (placard: name, declared use/exits, last ack, nearest asset with status "CONFIRMED" if it has `last_confirmed_clean` else "NOT CONFIRMED YET" and distance, storm, `info_only`, `is_demo`; **never** expose lat/lon, never a rating). Done when the two `buildings` rows in `make status` PASS.
- [ ] Field digitisation (or the best substitute): replace placeholder coordinates in `data/seed.json` with real positions of 20 to 40 drains/inlets/underpasses around the pilot ward (QGIS / geojson.io / satellite), following `FIELD_RULES`. Set `data_source: field` and honest `confidence`. Verify the hotspot coordinates against a map.
- [ ] Safety copy review: a native Hindi speaker reads `core/safety_copy.py`; someone with disaster-management judgement reads the English. Fix wording only in that file; keep the banned-words test green. Add tests if you add strings.
- [ ] `evidence/`: save interview notes (consent, no names), the photos taken, and the Open-Meteo files already there. Prepare the "our finding" slide with the saved numbers (3.8 mm vs 58 mm; 14 mm vs 228 mm) and the caveat.
- [ ] Verify every number to be spoken in the video against a primary source (table in `docs/implementation-rough-idea.md` section 8). Replace anything you cannot verify with "reported" or remove it.
- [ ] Video: script (PROJECT.md section 6), shot list, voiceover, screen recordings of the deployed URL and the AWS console; captions; upload to YouTube (public or unlisted), open it signed-out.
- [ ] Writeup (problem, build, where AWS fits, AI tools used, limits, credits and licences) and, if time allows, the Builder Center blog.
- [ ] `tests/test_buildings.py`: basement with people inside never `NO_SPECIFIC_FLAG`; placard never contains lat/lon; storm on/off changes `message.items`.
**Definition of done:** P4 rows of `make status` PASS; seed data labelled and plausible; all core tests green; video recorded and uploaded.
**Hardcode freely:** one fictional demo building (`demo0001`), a fixed set of hotspots.
**Kickoff prompt:**
> You are P4 (Logic, data, content) on Rain-Ready. Read CLAUDE.md, PROJECT.md, WORK_PACKAGES.md section 5, openapi.yaml, schema.sql, app/routers/map.py and core/. Only edit files owned by P4. First implement app/routers/buildings.py to the contract and add tests/test_buildings.py. Never invent facts, coordinates or statistics; label placeholders. Do not add LLM-generated safety text.

## 6. Integration protocol

**Checkpoints (H0 = when the group starts; adjust to the real clock once the deadline time is known):**
| When | Gate | Who | Pass condition |
|---|---|---|---|
| H0 to H0.5 | Read-in | All | Everyone has run `make setup && make run && make status && make test`; roles confirmed |
| H0.5 to H1 | Stubs | P2, P4 | Stub routers pushed; `make status` has no FAIL |
| **H3** | **Live URL** | P1 | HTTPS URL on AWS serving the skeleton; posted to the group; Bedrock go/no-go known |
| **H9** | **Checkpoint 1** | All | A real photo from a phone on the live URL appears as a report on the map |
| **H16** | **Checkpoint 2: golden path** | All | `scripts/flow.py` green on the live host and the 8 golden-path steps (PROJECT.md section 6) work by hand |
| H16 to H20 | Bug bash | All + a stranger | A person outside the team completes the report and the building flow unaided |
| Freeze = deadline minus 6 h | **Code freeze** | All | Only fixes for bugs found in recording |
| Freeze to deadline minus 3 h | Record and edit | P4 lead, P1 for AWS shots | 3-minute video on YouTube, opens signed-out |
| Deadline minus 2 h | **Submit** | P1 | Form submitted; confirmation saved. Do not wait for the last hour |

**If a checkpoint slips by more than 2 hours, cut (in this order):** ledger anchor to S3, `/verify` tamper demo, Hindi polish beyond the checklist, ops "create job" UI (use curl), Bedrock triage (manual category), clusters (single reports), L3 audit. **Never cut:** report -> map, L1 -> L2 confirmation, building checklist, drill switch, the safety wording and footer, the ledger verify page, the video.

**Git etiquette (disjoint directories means almost no conflicts):**
- `git pull --rebase` before pushing. Small commits, prefixed `[P1]`..`[P4]`, to `main`, at least every 2 hours. No long-lived branches.
- Seam files (`openapi.yaml`, `schema.sql`, `core/*`, `CLAUDE.md`) change only with a note in the commit message and a message to the consumers. If two people need to change the same seam, P1 merges.
- Never commit `.env`, `var/`, `.venv`, credentials, or other people's code without a credit in `README.md`.
- Because the repo is judged on history, do not rewrite it. No force-push.

**Working with AI-generated code (four sessions, one repo):**
1. Every session starts by reading `CLAUDE.md`, `PROJECT.md` and its package section. Paste the kickoff prompt.
2. Tell your Claude "only edit files under <your paths>". If it proposes a change elsewhere, ask it to write a note for the owner instead.
3. Run `make test && make status` after every meaningful change. If your change turns another owner's PASS into FAIL, you broke a seam: fix or revert.
4. Do not let a session refactor, rename or "tidy" shared files. Naming comes from the contract: use field names exactly as in `openapi.yaml` and `schema.sql`.
5. Prefer asking the owner over guessing. A two-line message beats an hour of drift.

## 7. Seed accounts and demo data
- Ops key: `OPS_KEY` from `.env` (default `demo` locally; change on the server).
- Demo building: code `demo0001` ("Demo Library (FICTIONAL building)"), seeded with answers that give `HIGH_ATTENTION`.
- Assets `DR-RN-001..005`, `DR-KB-006..007`, `UP-DEMO-1`; `DR-RN-004` already confirmed (to show a low score); the rest start unconfirmed, so the first jobs have visible effect.
- Roles in the demo are teammates (labelled on screen): crew = person A's phone, confirming resident = person B's phone (different browser profile so a different `X-User-Id`).

## 8. Submission checklist (P1 drives, everyone checks)
- [ ] All four checked in on the hackathon page; WeMakeDevs account + AWS Builder Center profile for each; student verification started.
- [ ] Public GitHub repo; `LICENSE`; `README.md` with run steps, limits, data provenance, credits and licences for anything we did not write, **AI tools used** (be exact: Claude Code, Bedrock model if live).
- [ ] Git history shows work from the event window; no old-project code.
- [ ] Live URL works on mobile data from a signed-out device.
- [ ] Video <= 3:00, on YouTube (public or unlisted), opens signed-out, **shows the AWS console and the live URL**, shows every feature we claim.
- [ ] Writeup: problem, build, where AWS fits, AI tools, limits.
- [ ] Optional: blog on AWS Builder Center linked in the submission (top-5 blog prize).
- [ ] Submit once per team on the hackathon's own form, before the deadline on the schedule page. Save the confirmation.
- [ ] Stop the EC2 instance after judging to stop charges.
