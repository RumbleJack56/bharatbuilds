# AWS and screens report (Aarush, 10 Oct 2026)

This is the report-back for `docs/AARUSH_PROMPT.md` Parts A to C. The AWS steps followed `docs/AWS_TODO.md` on `main`. Region `ap-south-1`, account `<account-id>`.

## Report-back table

| Item | Result | Evidence |
|---|---|---|
| A1 inventory (section 2) | pass | Account, instance `<instance-id>`, Elastic IP <elastic-ip>, instance profile `rainready-ec2`, hop limit 2, private bucket with public access blocked, S3 health: all match |
| 3.1 SSM | pass | `AmazonSSMManagedInstanceCore` attached to `rainready-ec2`. The agent was denied for about 15 minutes while IAM applied the change. After an agent restart, PingStatus is `Online` |
| 3.2 to 3.3 OIDC provider and deploy role | done | GitHub OIDC provider created. Role ARN: `arn:aws:iam::<account-id>:role/rainready-github-deploy` |
| 3.4 manual deploy | Success | `scripts/deploy-ssm.sh` status Success; commit `5a17d71` is live |
| 3.7 capture secret | set | It was empty. It was set on the server and never printed |
| New build live | pass | `/api/health` gives ok with 11 routers and no `router_errors`. `/api/leaderboard` gives 200. Both checked on https://<ip-with-dashes>.sslip.io and https://rainready.rumblejack56.dev |
| Part B live seed | pass | Clean seed, no `--demo`. Backup first: `var/backup-20261010-0626.db` on the server. `scripts.verify_db`: **26 of 26 checks passed**. `/api/city/summary` gives 1100 location-dates and 616 places. `/board` gives 200 |
| Section 4 Bedrock | manual (pending) | Inference profiles listed. Active Haiku options include `global.anthropic.claude-haiku-4-5-20251001-v1:0` and `in.anthropic.claude-haiku-4-5-20251001-v1:0`. Converse test not run. `TRIAGE_MODE=manual` |
| Section 5 phone photo | pending | A person's step (see below) |
| Section 6 backups | pass after a fix | The cron line was present, but the newest S3 copy was 8 h old. Cause: `scripts/*.sh` are mode 644 in git, so cron could not execute `backup.sh`. The cron line now runs `bash …/backup.sh`. A fresh copy, `backup/rainready-06.db` (729 KB), is in S3. The restore test passed `integrity_check` |
| Section 7 port 22 and cost | pass | Port 22 is open to one /32 only. Ports 80 and 443 are open to the world. Cost for 1 to 12 Oct is about $0 |
| Screens | in progress | PR #3 (V1 to V5) merged. PR #9 (V9 camera) merged. PR #10 (V13, V18, V10, V11, V12) open |

## Other server changes

- **Custom domain.** The server `.env` has `DOMAIN=<ip-with-dashes>.sslip.io, rainready.rumblejack56.dev`. This fixed Cloudflare error 525 (Caddy had no certificate for the custom host). Caddy now holds a Let's Encrypt certificate for both hosts.
- **Deploys delete untracked files.** The deploy removed `.env.bak-525`. A copy is kept in the server's `var/`.

## Backend asks (Ujjwal)

1. Set the four repo variables (`AWS_TODO.md` 3.5) with the role ARN above to turn on deploy-on-merge.
2. Make the scripts executable in git: `git update-index --chmod=+x rain-ready/scripts/*.sh`. Then the cron line can drop `bash`.
3. The backup key `rainready-<HH>.db` overwrites itself every day. Keep a dated copy if more history is wanted.
4. Add `held_for_review` to `GET /api/incidents?mine=true` items. The web app falls back to `flags.some(level == "warn")`.
5. Allow officials to call `GET /api/capture-token`, and have `POST /api/tasks/{id}/complete` accept `lat`, `lon`, `accuracy_m` and `capture_token`. Then after-photo stamps can be checked.
6. Put the dispute note on `GET /api/tasks` list items. The inbox makes one detail request per disputed task.
7. Note the custom domain in `.env.example` and `docs/DEPLOY.md` (DOMAIN may list several hosts, comma separated).
8. After V9 works on a phone on the live host: set `REQUIRE_LIVE_CAPTURE=1`, then build the APK.

## Manual steps left (a person must do these)

| # | Who | Step |
|---|---|---|
| 1 | Aarush | **Bedrock:** fill in the Anthropic use-case form in the Bedrock console (`AWS_TODO.md` section 4). Then pick a model id from the list above and run the documented converse test. If it fails, stay on `manual` and send the error text |
| 2 | Aarush | **Phone test (section 5 and V9):** on https://rainready.rumblejack56.dev, report a photo as a resident with the in-app camera, then open it as `off-mcd`. The stamp must show, the photo must open in the task timeline, and a new object must appear in the bucket |
| 3 | Aarush | **Cloudflare cache:** after each deploy, purge everything (Caching, Configuration, Purge Everything). Cloudflare keeps CSS and JS for 4 h |
| 4 | Ujjwal | Set the repo variables (backend ask 1). Merge PR #10 |
| 5 | Aarush | **V6 stranger test:** someone outside the team uses the app. Fix what confuses them |
| 6 | Both | **S2:** pin the deadline hour (11 Oct, 8:00 PM IST). Freeze code 6 h before. First submission is not before 12:00 noon on 11 Oct |
| 7 | Both | **Before recording (A7, when Ujjwal says go):** fresh seed, `--demo` if rehearsal data is wanted, and a new AMI |
| 8 | Both | **S3 to S6:** fact-check every spoken number, record and upload the video, README write-up with credits for AI tools, make the repo public and test a signed-out clone |
| 9 | Aarush | Stop the instance when idle. After judging, tear down (`AWS_TODO.md` sections 8 and 9, when Ujjwal says) and delete IAM user `rainready-deployer` |

## Screens left (code, in order)

V15 admin held queue, V14 public accountability screen, V16 actions list, V17 insights and ward report, V5b dashboard polish, V8 empty states and screenshots. Also fix the Leaflet `_leaflet_pos` error when leaving the map tab right after it loads, and add cache-busting to `index.html`.
