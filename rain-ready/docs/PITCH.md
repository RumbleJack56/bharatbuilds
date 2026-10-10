# Pitch data (source for the PPT)

Collected from the repo on 10 Oct 2026. Every number here comes from the code, the seed or the tests, and says which. Seed data is **placeholder**. Scenario numbers are illustrative, not forecasts. Follow `SCOPE.md` section 7 on every slide.

## 1. The idea in one line

A shared action list for monsoon waterlogging: what to clean, who owns it, who did it, who checked, and did it help.

**Thesis for the deck:** software cannot fix a drain or raise a water table. It can make ownership visible, make action easy to prove, and point people to the place where one hour of work buys the most. Accountability through transparency. Action through insight.

**Short form:** Report. Assign. Fix. Confirm. Measure.

## 2. The problem (slide 1-2)

What the product assumes, in plain words:

1. Water collects at the same low points every monsoon. The places are known.
2. A blocked drain is cheap to clean, but nobody knows whose it is. Several agencies own drains in one ward (seed: MCD, PWD, I&FC, DJB).
3. A complaint has no visible end. The resident cannot see who took it or whether it was done.
4. Cleaning is not ranked by effect. All drains look equal.
5. The same rain that floods a lane runs off unused.

External facts to add, **each needs a citation before it goes on a slide** (task S3):

| Fact to source | Why it matters |
|---|---|
| Old Rajinder Nagar basement flooding, July 2024 (coaching centre library, three students died) | Reason for the pilot ward |
| Minto Bridge underpass waterlogging history | Reason for the underpass pocket in the seed |
| Which agency owns which drain type in Delhi (by drain width or road type) | The "who owns it" claim |
| Delhi annual rain (code uses 775 mm) and monsoon share | Capture numbers |
| CGWB water-table depth bands for the ward | Capture decisions |
| Count of known waterlogging hotspots in Delhi (traffic police or PWD list) | Scale of the problem |

None of these are in the repo. Do not state them from memory.

## 3. The loop (slide 3, the whole product)

1. A **resident** reports a blocked drain or standing water with a photo and location.
2. The **system** links it to the nearest drain within 150 m and its low-point pocket, picks the owner agency or says "No owner found", and ranks the task.
3. An **official** accepts, bounces it as "Not ours" to another agency, or completes it with an after-photo.
4. A **different resident** confirms or disputes. A confirmed job resets the drain's silt estimate.
5. A public **dashboard** shows the map, the per-agency chart, impact numbers, the rain simulator and rain-capture candidates.

Task states: `open -> accepted -> done -> confirmed | disputed`. Every step writes a row in `task_events` with who, when and the photo.

## 4. Who uses it (slide 4)

| Role | Gets |
|---|---|
| Resident | Report in under a minute. See what happened. Confirm work |
| Official (one agency) | Only their agency's tasks, ranked, with an overdue badge |
| Ward coordinator | Assign tasks with no owner. Generate the ranked plan |
| Anyone, no login | Map, owners, numbers |

## 5. The insight engine (slide 5-6)

This is the core: low-point analysis decides the order of work.

**Silt estimate** (`core/planning.py`): `silt = 0.50 x (1 - e^(-days since last confirmed clean / 75))`. A drain never cleaned counts as 365 days.

**Pocket fill** (`core/lowpoints.py`, rational-method style):
- drain capacity left = design capacity x (1 - min(0.9, 1.2 x silt))
- net inflow = runoff coefficient x rain - capacity left, over the catchment
- a full pocket spills its inflow to the next pocket downstream
- levels by time to fill: high (1 h or less), elevated (up to 3 h), watch (more)

**Rank:** `gain_h` = fill time after cleaning minus fill time now, at the reference rain (25 mm/h), capped at 6 h. `rank = gain_h x (1 + 0.25 x (reports - 1))`.

### Scenario numbers from the real seed (25 mm/h reference rain, taken from the live API on 10 Oct 2026; illustrative parameters, a scenario and not a forecast)

Time for each pocket to fill with the drains as they are now:

| Pocket | Level | Fills in about |
|---|---|---|
| East Patel Nagar bus stand, Dr K S Krishnan Marg | high | 32 min |
| Rani Jhansi Road at Filmistan | high | 34 min |
| Bagga Link / Jhandewalan roundabout (Dayal Chowk) | high | 34 min |
| Pusa Road at Karol Bagh Metro Station | high | 34 min |
| Old Rajinder Nagar low point (Bazaar Marg) | elevated | 1.2 h |
| New Rohtak Road at Anand Parbat (foot of Zakhira Flyover) | elevated | 2.2 h |

Ranked plan, hours of fill time gained by cleaning one drain (range from catchment, storage and drain size each changed by 25 %):

| Rank | Drain | Owner | Gain, about |
|---|---|---|---|
| 1 | Daryai Nallah barrel, Bazaar Marg (inferred) | MCD | 4.8 h (0.7 to 5.2) |
| 2 | Rani Jhansi Road roadside drain (assumed), Filmistan | PWD | 1.6 h (0.3 to 5.6) |
| 3 | Link Road roadside drain (assumed), Jhandewalan | PWD | 1.6 h (0.3 to 5.6) |
| 4 | Pusa Road roadside drain (assumed), Karol Bagh Metro | PWD | 1.6 h (0.3 to 5.6) |
| 5 | Patel Road barrel (1976 plan), East Patel Nagar | PWD | 0.8 h (0.2 to 4.6) |

Three pockets have identical parameters and tie. Say so if asked. Drains with a gain of 0 h are not shown: the pocket's worst linked drain limits it, or no pocket is linked.

## 6. Accountability chart (slide 7)

Per agency (`GET /api/accountability`): drains owned, tasks by status, overdue, bounced away, median hours to accept, median hours to complete. "No owner found" is its own row and is a finding, not an error.

Seed: 8 drains, 7 with a named owner, 1 with none. 4 agencies. Tasks are due in a fixed number of days and show an overdue badge.

Rules: agency level only. Never name an officer or a contractor. Each owner shows its source.

The chart has no task data until the loop is run. For the slide, run the demo loop once (report, bounce, accept, complete, confirm) and take the screenshot.

## 7. Rain capture (slide 8)

Rules engine (`core/m4_rules.py`): store, detain or recharge, decided by water-table depth, soil, floodplain and distance to a sewer. Every result shows the rule that decided it.

| Water table | Decision | Rule |
|---|---|---|
| Floodplain | Store and reuse | R8 |
| Under 3 m | Detain only | R1 |
| 3 to 5 m | Store and reuse | R2 |
| 5 to 8 m | Shallow pit, roof water only | R3 |
| 8 to 15 m | Pit, trench or shaft | R4 |
| Over 15 m | Pit plus recharge bore | R5 |
| Drain-down over 48 h | Tank or bore | R7 |

Yearly capture = roof area x 775 mm x 0.85 runoff x 0.85 efficiency.

Seed sites (all **hypothetical**):

| Site | Roof | Decision | m3 per year |
|---|---|---|---|
| Society, shallow table (3.5 m, loam) | 600 m2 | Store and reuse (R2) | 336 |
| Society, deep table (12 m, sandy loam) | 600 m2 | Pit 4 m x 4 m x 2.5 m, drain-down about 28 h (R4) | 336 |
| Plot, clay soil (12 m) | 300 m2 | Tank or bore (R7) | 168 |

Total 840 m3 per year over three roofs. One 600 m2 roof is about 336,000 litres a year.

**Label:** "Experimental. Not reviewed by a hydrogeologist. Not for construction. Water-table depth is as entered, not verified."

## 8. Trust in reports (slide 9)

Say: "location and time stamped, checked against the report". Do not say "tamper-proof", "verified" or "unspoofable".

- In-app live camera, no gallery. The photo carries Lat, Long, time and a reference code.
- Server checks: capture token (this user, under 15 min), stamp against the report (50 m, 15 min), EXIF geotag (200 m), photo age (48 h), same picture sent before (perceptual hash).
- A warn flag holds the report for review. It is saved and visible to officials with the reason. It does not create or raise a task.
- The official's after-photo gets the same checks.
- The person who did the work cannot confirm it.

State today: server side built and tested. The camera screen is not built yet. Stamp reading is tested with a mock only.

## 9. Architecture and AWS (slide 10)

```
Phone (APK) or browser --HTTPS (Caddy)--> FastAPI + SQLite on EC2 t3.small, ap-south-1
                                            |-- S3: photos (private, pre-signed links)
                                            |-- Bedrock: photo -> report category; reads the photo stamp
```

- One central server. One web codebase for all four roles, wrapped by Capacitor as an Android APK.
- AI does two small jobs: suggest a report category, read the stamp text. It never changes rank, owner or status, and never writes safety text. If it fails, the resident's choice is used.
- Size: 20 API endpoints, 76 tests passing, CI on every push, about 2,900 lines.

## 10. Impact (slide 11)

**Can show:**
1. Drains with a named owner against "No owner found" (seed: 7 and 1).
2. Tasks created, accepted, bounced, done, confirmed, disputed. Median hours to accept and to complete. Overdue per agency.
3. Fill time gained by confirmed work, in the scenario.
4. Exposure: 28 assets inside 5 pockets (placeholder counts).
5. Rain capture: m3 per year, split into store, detain and recharge.

**Cannot claim:** floods prevented, lives saved, water-table rise, damage avoided.

How the indirect effect works, for the closing slide:

| What the software does | What it can change |
|---|---|
| Names an owner in public | Fewer complaints passed between agencies |
| Counts bounces and overdue tasks | A reason to act before the rain |
| Ranks by fill time gained | Limited crews go to the drain that matters most |
| Second resident confirms | Work is checked by the people it affects |
| Shows capture per roof with the deciding rule | A society can see if harvesting fits its plot |

## 11. Built against not built (be exact in the deck)

| Part | State on 10 Oct |
|---|---|
| Backend loop, ranking, simulator, capture rules, photo checks | Built, tested |
| Screens (resident, official, admin, dashboard, public board, held queue, actions, insights) | Built and checked in a browser (screenshots in `docs/screenshots/`). Phone test pending |
| Stamping camera and flags display | Built. Phone test pending; live capture is not yet required |
| AWS (EC2, S3) | Running: the app, photo storage and auto-deploy on every merge to `main`. Bedrock is off (`TRIAGE_MODE=manual`) until the console form is filed |
| APK | Wrapper builds. Release build waits for the phone test |
| Real Delhi data | Seeded: 9 drains and 6 pockets in Old Rajinder Nagar and Karol Bagh from public records. Field coordinates, ward number and the 2026 FCO list are still to confirm (`TASKS.md` B7b) |
| Report generation and actionable insights | Built: actions tab and ward report with Markdown download |

Only features that run may appear in the video (SCOPE 7.9).

## 12. Where the pitch and the repo differ

Fix the wording or the code before these go on a slide.

1. **"High runoff becomes harvested water."** The capture planner is not linked to the pockets. It plans roof water only, and its own rule 10 bars road runoff from recharge bores. Honest wording: "the same ward view shows where water collects and which roofs could keep it out of the drains". A link between a pocket and the roofs in its catchment would make this real.
2. **"Replenish the water table."** Not claimable (SCOPE 6). Say "m3 per year a site could capture or recharge".
3. **"Insights from topology, drainage, history and incidents."** Topology is hand-placed pockets, no elevation data. History is the last clean date and the report count. No rain history.
4. **"What was done" reports.** Task B12, not started. The accountability chart and task timelines are what exists.
5. **Supabase and two apps** (from the first note). The repo has one FastAPI server and one app with role views. The deck must describe the repo.
6. **"Tamper-free."** Drop it. The repo offers a visible event history and soft photo checks.
7. **Simulator presets.** "All silted" uses 25% silt. Seed drains "as they are now" sit near 50%, so "now" looks worse than "all silted", and at 20 mm/h "now" fills while "all silted" does not. Rename or change the preset before the demo.
8. **Sources.** Code comments cite `docs/Rain_Ready_System_Design.md` for the CGWB, CGWA and IS 15797 thresholds. That file is not in the repo. Check each threshold against its source before it is spoken.

## 13. Slide order (draft, 10 slides)

1. Title and the one line
2. Problem: known low points, unknown owners, no visible end
3. The loop
4. Who uses it
5. Insight: pocket fill and the ranked plan (table from section 5)
6. Simulator: now against cleaned
7. Accountability chart with the "No owner found" row
8. Rain capture candidates
9. Trust: stamped photos and the second resident
10. Architecture, AWS, limits stated, what is next

## 14. Still to collect

- [ ] Screenshots: report screen, official inbox, task timeline, confirm, map, accountability, simulator, capture
- [ ] Live URL and AWS console shots (EC2, S3 bucket with photos, Bedrock call)
- [ ] Real drain and pocket data with owner sources (B7)
- [ ] Citations for section 2
- [ ] A filled accountability chart from one full demo run
- [ ] Credits list and AI tools used (README)
