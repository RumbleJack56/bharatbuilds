# Rain-Ready: Scope

**One sentence:** a shared action list for monsoon waterlogging. What to clean, who owns it, who did it, who checked, and did it help.

Pilot ward: Old Rajinder Nagar and Karol Bagh, Delhi. Event: WeMakeDevs x AWS "Environmental Hacks", track Heat and Water. Judged from a 3-minute video and a public repo.

Legend: **[built]** runs today and has tests. **[written]** code exists but is not yet checked in a browser or on a phone. **[todo]** not started.

---

## 1. The loop (the whole product)

1. A **resident** reports a blocked drain or standing water with a photo and a location.
2. The system links the report to the nearest drain and its low-point pocket. It picks the owner agency by the asset's owner record, or says "No owner found". It creates or updates a task, ranked by the hours of fill time that cleaning would buy.
3. An **official** of that agency accepts the task, bounces it as "wrong owner" to another agency, or completes it with an after-photo.
4. A **different resident** confirms or disputes the work. A confirmed job resets that drain's silt estimate, so the pocket's fill time goes up.
5. A public **dashboard** shows the map, a responsibility chart per agency, impact numbers, a rain simulator and rain-capture candidates.

If steps 1 to 5 run on the live URL and on a phone, the MVP is done.

## 2. Who uses it

| Role | Needs | Entry |
|---|---|---|
| Resident | Report fast. See what happened. Confirm work. | Report, My reports, Confirm |
| Official (one agency) | See only my agency's tasks. Act with proof. | Inbox, Task |
| Coordinator (admin) | Assign tasks with no owner. Generate the ranked plan. | Admin |
| Anyone (no login) | See the map, owners and numbers. | Dashboard |

Login is a **demo persona picker**, labelled on screen. Real accounts are out of scope.

## 3. Architecture

```
Phone (APK) or browser --HTTPS (Caddy, sslip.io)--> FastAPI + SQLite   on EC2 t3.small, ap-south-1
                                                      |-- S3: photos
                                                      |-- Bedrock: photo -> report category
```

- One web codebase in `web/` (plain HTML, CSS and JS modules, no build step, Leaflet from a CDN).
- The same folder is wrapped by Capacitor into an Android APK (`mobile/`). Only `config.js` (the API base URL) differs.
- Pure logic in `core/` with unit tests. Task history in the `task_events` table.
- AWS services shown in the video: EC2, S3, Bedrock.
- The API contract is FastAPI's generated `/docs`.

---

## 4. MVP and good-to-haves, by concern

### 4.1 Resident app
| | Item | State |
|---|---|---|
| MVP | Persona login | written |
| MVP | Report: camera, GPS, optional tap-to-move pin, kind, note; result card with the linked drain | written |
| MVP | My reports list | written |
| MVP | Live in-app camera that stamps place, time and a reference code on the photo; no gallery (spec: `docs/CAPTURE.md`) | backend built, screen todo |
| MVP | Result card shows `flags` and "saved for review, not counted yet" when `held_for_review` is true | backend built, screen todo |
| MVP | Confirm screen: before/after photos, "Looks fixed" / "Still a problem" | written |
| Good | Offline queue: store a report and send when online | todo |
| Good | Client-side photo shrink before upload | todo |
| Good | Per-report status tracker with the full timeline | todo |

### 4.2 Official app
| | Item | State |
|---|---|---|
| MVP | Inbox: only my agency's tasks, ranked, overdue badge | written |
| MVP | Task detail with event timeline and report photos | written |
| MVP | Accept / "Not ours" (reassign with reason) / Complete with after-photo | written |
| Good | Edit due date | todo |
| Good | Work-order draft from structured facts, human edits before sending (Bedrock) | todo |

### 4.3 Coordinator (admin)
| | Item | State |
|---|---|---|
| MVP | Assign tasks that have no owner | written |
| MVP | "Generate ranked plan": create tasks for the top-ranked drains | written |
| Good | Create a task by hand for any drain | todo |
| Good | Edit an asset's owner and owner source | todo |

### 4.4 Dashboard
| | Item | State |
|---|---|---|
| MVP | Map: pockets by level (colour and text), drains with owner and last cleaned, open tasks | written |
| MVP | Accountability: per agency, tasks by status, overdue, bounced away, median hours to accept and complete; "No owner found" row | written |
| MVP | Impact: ownership split, task counts, fill time gained, exposure, capture m3/year | written |
| MVP | Scenario banner wherever scenario numbers show | written |
| Good | Filter by agency or status | todo |
| Good | CSV export of the accountability table | todo |
| Good | Shareable link to one task's timeline | todo |

### 4.5 Engine (ranking and simulator)
| | Item | State |
|---|---|---|
| MVP | Silt estimate from time since last confirmed clean | built |
| MVP | Pocket fill simulator: rain slider; clean, silted and current drains; spill order | built |
| MVP | Rank = fill time gained by cleaning x repeat-report factor | built |
| MVP | Simulator screen (slider, three drain states, fill order, "about X h") | written |
| Good | Show a low and high range, not one number | todo |
| Good | Cluster nearby reports (50 m, 24 h) and cap reports per user per day | todo (backend) |
| Good | Flag a re-used photo (perceptual hash) as a soft warning | built (backend, tested) |
| MVP | Photo checks on reports and after-photos: perceptual hash, EXIF geotag and time. A warn flag saves the report but does not create or bump a task | built (backend, tested) |
| MVP | Capture token and on-photo stamp check: the server compares the stamp's Lat, Long, time and Ref with the report | built (backend; stamp reading tested with a mock only) |
| Good | Elevation data to suggest where runoff concentrates (suggestion only) | todo |

### 4.6 Rain capture
| | Item | State |
|---|---|---|
| MVP | Rules engine: store, detain or recharge by water-table depth, soil, floodplain, setbacks | built |
| MVP | Candidate sites list with decision, rule id, m3/year and the experimental banner | written |
| Good | Pick a site on the map and enter your own roof size | todo |
| Good | Replace assumed water-table depths with the published depth bands | todo |

### 4.7 AI (kept small)
| | Item | State |
|---|---|---|
| MVP | Bedrock: photo and note to a report category. Falls back to the resident's choice | built (parser hardened, tested with a fake client) |
| MVP | Bedrock reads the on-photo stamp text (reads only, judges nothing) | built (mock only) |
| Good | Plain-language questions over the dashboard data (Bedrock with read-only queries) | todo |
| Good | Draft work orders (see 4.2) | todo |

AI never changes rank, owner or status, and never writes safety text.

### 4.8 Data
| | Item | State |
|---|---|---|
| MVP | Seed: 4 agencies, 5 personas, 8 drains, 5 pockets, 3 capture sites, all labelled placeholder | built |
| MVP | Owner source text on every drain | built |
| Good | Real drain and pocket positions for the ward, `data_source: field` | todo |
| Good | Cited ownership rule per drain type | todo |
| Good | Real exposure counts per pocket | todo |

### 4.9 Platform and AWS
| | Item | State |
|---|---|---|
| MVP | EC2 + Docker + Caddy HTTPS on sslip.io | todo |
| MVP | S3 for photos (`STORAGE=s3`, pre-signed redirects) | built, tested with a fake client; not tried on AWS |
| MVP | Deploy scripts: bucket and role setup, EC2 bootstrap, IAM policy (`scripts/`) | built, not run on AWS |
| MVP | `/api/health` shows config warnings; `?deep=1` probes S3 and Bedrock | built |
| MVP | Bedrock model enabled and tested once | todo |
| MVP | Upload size and type checks | built |
| MVP | Tests run in CI on every push | built (workflow at repo root; green) |
| Good | Hourly database copy to S3 (`scripts/backup.sh`); AMI before recording | script built; cron and AMI todo |
| Good | CloudFront in front of the static files | todo |
| Good | Rate limit on report creation | todo (backend) |
| Good | Admin action to release or reject a held report | todo (backend, then screen) |

### 4.10 Mobile (APK)
| | Item | State |
|---|---|---|
| MVP | Debug APK built from `web/`, installed on a real phone, camera and GPS working over HTTPS | written |
| Good | Signed release build, app icon and splash | todo |
| Good | Native camera plugin for better photo capture | todo |

### 4.11 Demo and submission
| | Item | State |
|---|---|---|
| MVP | Public repo with a LICENSE and a credits list (open source used, AI tools used) | LICENSE done; credits todo |
| MVP | 3-minute video on YouTube showing the loop, the dashboard, the APK and the AWS console | todo |
| MVP | Write-up: problem, build, where AWS fits | todo |
| MVP | Stranger test on the live URL | todo |
| Good | Blog on AWS Builder Center | todo |

### 4.12 Status on 10 Oct 2026

**Done and in the repo (PR #1):**
- Backend loop: report, task, accept, complete, confirm, dashboard. 76 tests pass, CI green.
- Deploy prep: S3 and Bedrock code paths with tests, deploy scripts, health checks, `docs/DEPLOY.md`.
- Photo integrity: hash reuse, EXIF geotag and time, capture token, stamp check, held-for-review reports.
- APK wrapper builds (placeholder API host).

**Left, backend and AWS (Ujjwal):**
1. Create the AWS resources and a public HTTPS URL (account owner: Aarush). Then run the S3 test and the Bedrock test. Nothing has run on real AWS.
2. Real Delhi data: drains, pockets, owners with sources. Plan the sourcing first.
3. Rate limit, report clustering, fill-time range, admin release of held reports.
4. Backend report generation and actionable insights, after the data is real.
5. Build the APK with the real host; test camera and GPS on a phone.
6. Hourly backup cron and an AMI before recording.

**Left, screens (Aarush):** see `TASKS.md` section 4 and V9. The new work is the stamping camera and the flags display.

**Left, shared:** pin the deadline hour (first submission is not before 12:00 noon on the last day; the exact hour is unknown), credits and write-up, video, make the repo public.

**Wording rule for photo checks:** say "location and time stamped, checked against the report". Never say "unspoofable". A rooted phone with a fake-GPS app can still stamp a false place.

---

## 5. Ranking rule

`gain_h` = (time for the linked pocket to fill after cleaning this drain) minus (time now), at a reference rain of 35 mm/h, capped at 6 h. `rank = gain_h x (1 + 0.25 x (reports - 1))`. Pocket size, catchment and drain capacity are illustrative parameters. Always shown with the scenario banner and as "about".

## 6. Impact numbers we may show

1. Drains with a named owner vs "No owner found".
2. Tasks created, accepted, bounced, done, confirmed, disputed. Median hours to accept and to complete. Overdue per agency.
3. Fill time gained by confirmed work (hours, in the scenario).
4. Exposure: assets inside each pocket (placeholder counts until real data).
5. Rain capture: m3 per year a site can capture, split into store-and-reuse, detain and recharge.

**Not claimable:** floods prevented, lives saved, water-table rise, damage avoided.

## 7. Honesty rules

1. Fixed safety strings are pre-written in `core/copy.py`. No model writes them.
2. Banned in any UI string: the bare word "safe", "guarantee", "desilted", "removed", "cm deep". No green ticks, no ratings, no depths.
3. The scenario banner shows wherever simulator or rank numbers show. Time is "about X h".
4. The capture planner shows its experimental banner and the rule id.
5. Ownership is shown at agency level with its source. Never name officers or contractors. "No owner found" is a valid result.
6. AI only pre-fills a category and must fail soft.
7. Label every placeholder (`data_source`, `confidence`). Do not invent facts or coordinates.
8. Nothing in the product asks anyone to open a manhole or enter a drain.
9. Only features that run appear in the video.
10. Photo checks are soft flags. They hold a report for review. They never delete it and never claim proof. Held reports stay visible to officials with the reason.

## 8. Out of scope

Real accounts and single sign-on. Push or SMS alerts. Public warnings of any kind (official warnings come from IMD and NDMA Sachet). Flood forecasting. Depth maps. Native iOS. Integration with any agency's systems.

## 9. Demo script (3 minutes)

| Time | Beat |
|---|---|
| 0:00-0:20 | Problem in two sentences. Pilot ward. |
| 0:20-1:30 | The loop on a phone (APK): report a drain; official accepts, completes with a photo; second resident confirms |
| 1:30-2:10 | Dashboard: pocket slows after the confirmation; accountability chart with a "No owner found" row and a bounce |
| 2:10-2:30 | Simulator and rain-capture candidates |
| 2:30-3:00 | AWS: EC2, S3 bucket with the photos, Bedrock call; live HTTPS URL; limits stated |

People in the demo are teammates, and the video says so.
