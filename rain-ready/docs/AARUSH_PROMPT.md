# Seed prompt for Aarush's agents

Paste everything below the line into a fresh Claude Code session started in a clone of the repo. One session can do Part A and B (AWS); a second session can do Part C (screens) at the same time, because they touch different things.

---

You are working for **Aarush** on Rain-Ready (`RumbleJack56/bharatbuilds`, folder `rain-ready/`): a shared action list for monsoon waterlogging in Delhi. Ujjwal owns the backend and the data; Aarush owns the AWS account and every screen in `web/`. The live host is `https://15-207-177-122.sslip.io` and it still runs an **old build**. Your job is to finish the AWS work, seed the live database, and build the screens listed in Part C.

## 0. Before you do anything

1. `git switch main && git pull --ff-only`. Read, in this order: `rain-ready/CLAUDE.md`, `rain-ready/TASKS.md` (sections 0, 5 and 6), `rain-ready/docs/AWS_TODO.md`, `rain-ready/docs/SEEDING.md` (section 7), `rain-ready/docs/CAPTURE.md`, `rain-ready/docs/API.md`, `rain-ready/PLAN.md` sections 1 to 2.
2. Rules that bind you:
   - Edit only `web/` (and `web/tests`). Backend, data, scripts and CI are Ujjwal's. If you need a backend change, do not make it: write one line in your report ("need X on endpoint Y, because Z").
   - Architecture is checked by tests: controllers take their dependencies from `ctx`; only `web/js/adapters/http-fetch.js` calls `fetch`; views and `ui/` are pure. Run `node --test 'web/tests/*.test.js'` (the quotes matter) before every commit; it must stay green.
   - Banned UI words and honesty rules: see `web/js/ui/copy.js` (`BANNED`) and `SCOPE.md` section 7. Never write "verified", "proof" or "unspoofable" about a photo. Say "location and time stamped, checked against the report".
   - Branches `aarush/<topic>`, short-lived. Commit messages `[aarush] area: what`. PRs are squash-merged. **Commits and PR descriptions carry no AI attribution** (no Co-Authored-By, no session link, no "Generated with" footer): this is rule 8 in `CLAUDE.md`.
   - Never push to `main`. Never commit `.env`, `*.pem`, `var/` or anything under `mobile/android`.
   - Do not invent data or coordinates.

## Part A. AWS (run `docs/AWS_TODO.md` in order)

Use the values in its section 1. Region `ap-south-1` only. Every step has a **Check**: if a check fails, **stop and report the exact output**; do not improvise a fix. Do not delete or stop any resource. Do not run section 8 or section 9 (Ujjwal says when). Never print `.env`, the key or any credential.

Order:
1. `git pull` the latest `main` (the playbook changed after it was first shared). Section 2: inventory check.
2. Section 3.1 to 3.4: SSM, GitHub OIDC provider, deploy role, one manual deploy with `scripts/deploy-ssm.sh`. This is the first real run of that script, so read its whole output. **Report to Ujjwal now:** the role ARN from 3.3 and the output of 3.4. He then sets the repo variables (3.5), which turns on deploy-on-merge.
3. Section 3.7: set `CAPTURE_SECRET` if it is empty.
4. Confirm the new build is live: `curl -fsS https://15-207-177-122.sslip.io/api/health` shows `ok: true`, 11 routers and no `router_errors`; `/api/leaderboard` returns 200. If not, stop and report.
5. Do Part B (seed the live database) now.
6. Section 5: report a photo from a phone as a resident, open it as `off-mcd`. It must show in the task timeline, and a new object must appear in the bucket.
7. Section 4: Bedrock. The console form is a person's step (Aarush does it); then list the profiles, test the model, switch `TRIAGE_MODE`. If the test fails, stay on `manual` and report the error text. Do not guess a model id.
8. Sections 6 and 7: backups (including a restore test), then port 22 and the cost check.

## Part B. Seed the live database

Follow `docs/SEEDING.md` section 7 exactly, with these choices:
- **Clean seed, no `--demo`.** Ujjwal decides when rehearsal history goes in (just before recording).
- If the manual deploy in A3 already shipped the committed tree, skip its step 1 (the `git archive` upload) and start at step 2.
- Back up first (`var/backup-<time>.db`). The rebuild removes the test report and every task row; photos stay in the bucket.
- `scripts.verify_db` must end with **every check passed** (`N of N`; 26 of 26 on a clean seed when this was written). If any check fails, do not start the app on it: stop and report the failing lines.
- Then check `https://15-207-177-122.sslip.io/api/health`, `/api/city/summary` and `/board`.

## Part C. Screens (`web/`)

The real seed has 9 drains; the report screen needs to land on one of them. For the walk and for manual testing:

| Drain id | Place | Owner |
|---|---|---|
| `DR-DN-PUSA` | Daryai Nallah barrel, Pusa Road crossing, 28.643592 77.186944 | MCD |
| `DR-DN-BAZ` | Daryai Nallah barrel, Bazaar Marg, 28.639516 77.184020 | MCD |
| `DR-KBM-PUSA` | Pusa Road roadside drain, 28.644121 77.188929 | PWD |
| `DR-PRB-EPN` | Patel Road barrel, East Patel Nagar, 28.642189 77.173936 | PWD |
| `DR-FIL-RANI`, `DR-JHB-LINK` | roadside drains | PWD |
| `DR-OSM-A`, `-B`, `-C` | unnamed culverts | **No owner found** |

Personas (header `X-User-Id`): `res-1`, `res-2` (residents), `off-mcd`, `off-pwd` (officials), `admin-1`. Backend rules to design around: the resident who made the first report on a task cannot confirm it (403); a photo that is not a readable image is refused (422); a repeat of the same picture or a far geotag holds the report.

Work in this order, one branch and PR per item (or two small ones together):

1. **V13 real-seed fixes.** `web/js/controllers/report.js` `DEFAULT` is the old placeholder point and links to no drain. Set it to `DR-DN-PUSA` (28.643592, 77.186944) with a label. Update `web/tests/e2e/walk.mjs` to the real seed so it no longer needs `SEED_PATH`. Also (V18): the simulator's default rain and any caption must come from `reference_rain_mm_h` in `GET /api/map` (it is now 25, not 35). *Done when:* a report at the default pin links to `DR-DN-PUSA` and routes to MCD.
2. **V9 stamping camera**, exactly as `docs/CAPTURE.md`. Call `GET /api/capture-token` (returns `token`, `ref`, `server_time`), open the live camera with `getUserMedia` (no gallery, no file input), read the position, draw the stamp block on a canvas (address if known, `Lat`, `Long`, date and time with the GMT offset, `Ref <ref>`, white text on a dark box, at least 3% of the image height), and send `photo`, `lat`, `lon`, `accuracy_m`, `capture_token` through `web/js/services/incidents.service.js`. If location is denied or `accuracy_m` is above 100, tell the resident and let them retry; never stamp a guessed position. A token covers one saved report, so fetch a new one for each photo (a refused request does not use it up). Use the same camera and stamp for the official's after-photo. Show the response: `held_for_review` and `flags` (`code`, `level` warn or info, `detail`). When held: "Saved for review. It is not counted yet." plus each warn flag's `detail`; info flags small. *Done when:* a report from a phone shows a stamp, reaches `/api/incidents`, and a repeated photo shows "Saved for review".
3. **V10 shrink on the phone.** After the stamp is drawn, scale the long side to about 1600 px and re-encode as JPEG under 2 MB, in a new adapter behind a port (see `PLAN.md` section 6), chosen in `main.js`.
4. **V11 disputed tasks.** A `disputed` task shows in the owning official's inbox with the resident's note and the existing Accept button (accept sends it back to `accepted`; the task page shows the "to be redone" note).
5. **V12 messages.** Confirm screen: show the 403 text from the server when the reporter tries to confirm, and the 422 text ("the photo could not be read as an image; please take it again") on report and after-photo.
6. **V14 public accountability screen.** `GET /api/leaderboard` (scores, inputs, `method`, `unassigned`, `demo`) and `GET /api/transparency?agency_id=&status=&limit=` (route, reason, evidence, timeline; roles, never names). Print the method. Show "Rehearsal data" whenever `demo` is true. `/board` is a stand-in to replace.
7. **V15 held queue (admin).** `GET /api/incidents?held=true`, `POST /api/incidents/{id}/review` with `{decision: "release"|"reject", note}`. Show each warn flag in plain words.
8. **V16 actions list.** `GET /api/actions?top=`: one action per drain (clean, inspect, clarify owner, monitor) with route, reason, evidence and the fill-time range; link to the task when one exists.
9. **V17 insights and report.** `GET /api/insights`, `GET /api/reports/ward` (`?format=md` as a download). City evidence (`/api/city/*`) and `/api/projection` only if time allows. Cut this first if late.

After V9 ships to the live host and works on a phone, tell Ujjwal: he sets `REQUIRE_LIVE_CAPTURE=1` and then builds the APK.

## Stop and ask when

- a Check in the playbook fails, or a command would delete, stop or replace something not named in it;
- a screen needs a backend field that does not exist;
- tests that were green start failing for a reason outside `web/`;
- anything asks for a credential to be printed or committed.

## Report back (send this to Ujjwal after each part)

| Item | Result | Evidence |
|---|---|---|
| A2 inventory | pass / fail | output |
| A3 role ARN, manual deploy `Success` | | ARN, last lines of the output |
| A8 capture secret | already set / set | |
| New build live (11 routers, leaderboard 200) | | health JSON |
| Live seed: `verify_db` all checks passed | | last line |
| Phone photo opens (A4) | | |
| Bedrock: model id, or manual with the error text | | |
| Backup restore, port 22, cost | | |
| Screens done (V13, V9, ...) | PR numbers | |
| Backend changes I need | one line each | |
