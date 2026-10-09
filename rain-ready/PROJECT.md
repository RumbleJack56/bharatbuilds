# PROJECT.md: Rain-Ready, project details

For the whole team (owner: dev#4). Read after `CLAUDE.md`. Research is in `docs/` (`Rain_Ready_System_Design.md`, `Rain_Ready_Adversarial_Review.md`, `implementation-rough-idea.md`) and you do not need it to build; where it disagrees with this file, **this file wins**.

---

## 1. The problem, in four facts
- **27 Jul 2024, Old Rajinder Nagar, Delhi:** three students drowned in a coaching-centre basement after about 58 mm of rain (per the High Court order). The drains had reportedly gone uncleaned for years, ramps had been built over drains, and a basement licensed for parking and storage was used as a library with one exit. *(press and inquiry reports; cite on screen; verify before speaking)*
- **Waterlogging is mostly an operations failure on top of low drain capacity.** Silt cuts a drain's capacity by roughly a third at 30 cm in a typical section (our Manning calculation), and cleaning claims are self-reported and unreliable. Reported example: CAG found only 0.98 of 8.29 lakh m³ of excavated silt carted away. *(press-reported; verify against the CAG text)*
- **Water collects in a few pockets first** (underpasses, a local depression, low lanes), and what happens in those pockets depends on whether the drains feeding them are clear.
- **A day-ahead model forecast would not have warned anyone.** We checked (Open-Meteo, saved in `evidence/openmeteo/`): about 3.8 mm forecast for 27 Jul 2024 against 58 mm reported, and about 14 mm for 28 Jun 2024 against 228 mm reported. A coarse-model caveat applies, but it is why alerts key on **official IMD warnings** entered by an operator, not on our own prediction.

## 2. The idea in one paragraph
Rain-Ready connects three things that are usually separate. **Anticipate:** a scenario map of the ward's low points where a rain slider shows which pockets fill first, in what spill order and roughly how fast, and how silted drains make it worse. **Prepare:** a citizen-and-crew flow where a drain only counts as cleaned once a *different, independent person* confirms it, recorded in a tamper-evident ledger. **Act:** pre-written Hindi/English checklists for basement caretakers when an official warning is active, plus a public QR placard, and an experimental rain-capture planner that says "store and reuse, do not recharge" where the water table is shallow. **The loop:** a confirmed cleaning lowers that pocket's silt estimate, so the simulator visibly slows its fill. Evidence changes the scenario.

**One line for judges:** *"Not another flood map. Which pockets fill first, whether the drains were really cleaned, and what each person should do, with receipts."*

## 3. Features, in build order
Status: **Real** = logic runs for real. **Seeded** = real logic on hand-made demo data. **Shown** = a slide or screen only.

### Must-have (the demo depends on these)
| # | Feature | What the audience sees | Status | Endpoints | Owner |
|---|---|---|---|---|---|
| F1 | **Low Point Scenario** | Map of ranked low points. Rain slider; pockets fill in spill order with an approximate time to fill, yellow -> orange -> red; toggle clean / silted / current drain state; at High an alert card appears and a teammate's phone gets the Hindi Telegram alert | Real math (`core/lowpoints.py`), Seeded pockets, Real Telegram send | `GET /api/lowpoints`, `POST /api/lowpoints/simulate`, `POST /api/alerts/telegram` | dev#3 sim and data, dev#2 UI, dev#1 send |
| F2 | **Forecast-miss replay** | Timeline: day-before forecast 3.8 mm -> reported 58 mm -> 3 deaths -> labelled hindsight score for the nearest drain | Real numbers, scripted timeline | `GET /api/replay` | dev#4 |
| F3 | **Report -> triage -> map pin** | Phone camera + GPS -> category and severity (Bedrock or manual) -> ticket -> pin | Real | `POST /api/reports`, `GET /api/reports` | dev#1 backend, dev#2 UI |
| F4 | **Task card + flagged closure** | Flagged drain with reasons. Closure photos: reused photo flagged, far-away pin flagged, genuine passes. A different person confirms -> CONFIRMED -> pocket slows in F1 | Real checks, Seeded job (id 1 on `DR-RN-001`) | `POST/GET /api/jobs`, `POST /api/jobs/{id}/evidence` | dev#1 backend, dev#2 UI |
| F5 | **Rain Capture planner** | Presets: shallow-table plot gets "store and reuse, do not recharge (R2)"; deep-table plot gets pit sized with the rule shown | Real rules, hypothetical presets | `GET /api/capture/presets`, `POST /api/capture/plan` | dev#4 |
| F6 | **Safety wording everywhere** | Footer, banners, risk classes, no depth in cm, never "safe" | Real | n/a | dev#4 |
| F7 | **Deployed on AWS** | Live HTTPS URL; the AWS console on screen in the video | Real (required to win) | n/a | dev#1 |

### Should-have (after the must-haves work on the live URL)
| # | Feature | Status | Owner |
|---|---|---|---|
| F8 | Ward board: share of drains independently confirmed, jobs by status | Real aggregate | dev#1 (`/api/board` exists) |
| F9 | Building checklist (4 questions -> level -> Hindi/English checklist) + public QR placard | Real rules | dev#3 backend + pages |
| F10 | Storm Mode button: one press (a) flips the banner and P1 list, (b) optionally sends the checklist to team phones | Real send, simulated trigger | dev#1 (`notify`), dev#2 (ops page) |
| F11 | Evidence ledger + `/verify` page (shows the chain is intact; tamper -> fails) | Real | dev#1 (exists), dev#3 page |

### Stretch
Inbound Telegram report bot (photo + location -> report). DEM-derived low-point candidates compared with the hand-placed ones, reported honestly with misses (dev#3). Nightly ledger anchor to an Object-Lock S3 bucket (dev#1).

### Shown only (slides, not built)
Escalation ladder (agency -> senior officials -> public overdue), WhatsApp channel, face and number-plate blurring, Strands agent, multi-city roadmap.

### Not doing
Depth in centimetres, a native app, SMS, sensors, real government users, public naming of any person or firm.

## 4. What we do not claim
- Not a flood forecast and not an official warning. The simulator is a **scenario** with hand-placed, illustrative parameters. Alerts are triggered by an operator entering an **official** IMD warning or by a scenario run, and go to team phones.
- Not a prevention system for live wires, open manholes or wall collapses: the app shows a static safety message and a pre-filled forward text. Underpasses: weak benefit (the scenario map and a standing "never drive into water" line).
- The ledger proves a record was not changed after it was written. It does not prove a photo is genuine; independent confirmation (L2) addresses that, imperfectly.
- Nothing here shows reduced flooding. There is no rain to test with until about June 2027. We claim readiness and clarity, not outcomes.

## 5. Pages (one URL)
| Page | Owner | User | Does |
|---|---|---|---|
| `/` index | dev#2 | all | Links to every page |
| `lowpoints.html` | dev#2 | all | **F1 flagship.** Pockets on a map; slider 10 to 120 mm/h (default 35); clean / silted / current toggle; time scrubber for `at_h`; fill-order numbers; alert card at High; "Send Hindi alert to team phones" (ops key) |
| `map.html` | dev#2 | all | Drain assets by tier (P1 / P2 / WATCH / NONE) with text labels, hotspots, reports, storm banner, board numbers |
| `report.html` | dev#2 | resident, crew | Category, camera capture, GPS with accuracy (manual pin fallback), ticket, hazard text first for wire/manhole |
| `task.html?id=` | dev#2 | crew, then a different resident | Crew: before / after / bank photos. Second person: Confirm with own photo. Flags in plain words |
| `ops.html` | dev#2 | operator | Drill switch (enter an official warning, optional notify), create job, P1 list, alert buttons, board |
| `replay.html` | dev#4 | all | F2 timeline with caveats |
| `capture.html` | dev#4 | all | F5 planner: presets, form, result card with rule id and banner |
| `building.html` | dev#3 | caretaker | 4 questions + consent -> level + checklist (en/hi); Acknowledge when a warning is active |
| `b.html?code=` | dev#3 | public | QR placard: self-declared use and exits, last acknowledgement, nearest drain status, information-only line |
| `verify.html?id=` | dev#3 | anyone | Ledger entry, chain check, what it does and does not prove |

## 6. The golden path and the video

**Order of the 3-minute video (this is also the build priority):**
| Time | Beat | Feature |
|---|---|---|
| 0:00-0:25 | Rajinder Nagar 2024 facts (sourced). "A free model said 3.8 mm; 58 mm was reported." Hindsight score for the nearest drain, labelled a reconstruction | F2 |
| 0:25-1:15 | **Simulator.** Slide rain to 35 mm/h: one pocket is Watch when clean, Elevated when silted, High at its current silt estimate. Spill order lights up. Alert card appears; a teammate's phone receives the Hindi alert (team phone, labelled) | F1 |
| 1:15-2:00 | **The loop.** Resident reports a real choked drain (phone). Crew submits; a reused photo is FLAGGED; a different person confirms -> CONFIRMED. Back in the simulator the linked pocket now fills slower | F3, F4 |
| 2:00-2:20 | Caretaker checklist (Hindi) and QR placard; ledger verify flash | F9, F11 |
| 2:20-2:35 | Rain capture: shallow-table preset says store and reuse (R2); deep-table preset sizes a pit (R4). Banner: experimental | F5 |
| 2:35-3:00 | **AWS on screen**: EC2 running the app, S3 photos, Bedrock call only if live, the URL. Limits stated: scenario not forecast, unofficial, no outcomes until next monsoon | F7 |

Roles in the video that are teammates (resident, crew, confirmer, the phone receiving the alert) are labelled on screen.

**Demo values that work today** (`POST /api/lowpoints/simulate`, pocket LP-RN-1): at 35 mm/h clean fills in about 4.3 h (watch), silted about 1.3 h (elevated), current about 0.75 h (high). After DR-RN-001 is independently confirmed (L2), LP-RN-1 in the "current" state moves from about 0.75 h (high) to about 2 h (elevated); it does not reach the all-clean 4.3 h because its two upstream pockets (LP-RN-2, LP-RN-3) are still silted and spill into it. `tests/test_lowpoints_api.py` pins these values; re-check them after any change to the seed data.

## 7. Judging rubric and how we answer it (wemakedevs.org/aws/env)
| Criterion (no weights stated) | Our answer |
|---|---|
| Idea and Impact: "a small problem solved well beats a big one solved vaguely" | One ward, one failure chain: pockets fill first, drains were not really cleaned, people were unprepared. Honest limits |
| Built on AWS (mandatory; the video must show it) | EC2 + S3 (+ Bedrock if live), shown in the video |
| Design and usability: "would someone who isn't on your team know what to do?" | Mobile web, one action per screen, Hindi/English, stranger test before recording |
| Execution: "one feature that runs beats five that almost do" | The path in section 6, running on the public URL |
| Demo video (3 min, YouTube, what / who for / where AWS fits) | Section 6 script |

## 8. Architecture and deployment (short)
One FastAPI process + SQLite + static web, behind Caddy (HTTPS is mandatory: browsers only allow camera and GPS on HTTPS), on one **EC2 t3.small** in `ap-south-1` with an Elastic IP and a hostname like `13-233-10-20.sslip.io`. Photos in a private **S3** bucket via an IAM role (`STORAGE=s3`); local disk by default. **Bedrock** for photo triage only (`TRIAGE_MODE=bedrock`), manual category as the fallback. Telegram Bot API for outbound alerts to team chats. Redeploy: `make deploy HOST=ec2-user@<ip>`. Runbook with commands: `docs/implementation-rough-idea.md` section 14 (dev#1). We keep this stack; we are **not** rewriting to Lambda + DynamoDB (poor fit for the distance queries, and no time).

## 9. Hardcoding and shortcuts: what is allowed
**Allowed (label it, move on):** hand-placed pockets with assumed catchment, storage and drain capacity; seeded assets and hotspots with `data_source`; hypothetical rain-capture plots with entered water-table depths; a shared `OPS_KEY`; anonymous device IDs; local photo storage with S3 as the AWS proof; manual category if Bedrock is unavailable; operator-entered IMD warning; a fictional demo building; teammates playing resident/crew/confirmer (labelled); SQLite; tests only for `core/`, routers' happy paths.
**Not allowed:** invented facts or statistics; unlabelled placeholders presented as real; LLM-written safety text; "safe"; depth in cm; naming people or firms; claiming outcomes; "the system flagged this" for 2024; features in the video that do not run.

## 10. Open items needing a human (do not code around these)
1. **Deadline time.** The schedule page says Sunday 11 Oct is the last day but the hours are "still to come". Check the page and Discord; freeze at least 6 hours before it. *(An earlier note said 8:00 PM IST, from the Luma page; unconfirmed.)*
2. **Check-in and verification for all four:** check in on the hackathon page; WeMakeDevs account + AWS Builder Center profile with student verification (SheerID; an open case does not stop submitting, but fix it).
3. **Hindi and English copy** reviewed (Hindi by a native speaker; English by someone with disaster-management judgement). Until then, Telegram sends go to team chats only.
4. **Legal:** Disaster Management Act s.54 (false warnings) was not read by anyone. We frame everything as an unofficial scenario/preparedness tool and send only to team phones. Get a read before any real third-party sending.
5. **Water-table depths for the two presets** (CGWB depth band) and an expert read of the rain-capture rules (R2, R3, R6, R9), or keep both clearly hypothetical.
6. **Real parameters for the pockets** (catchment, storage, drain capacity): field estimate or satellite measurement by dev#3, or keep the "illustrative" label.
7. **Telegram bot:** create with @BotFather; every teammate presses /start; collect chat ids into `TELEGRAM_CHAT_IDS` (dev#1).
8. **Real photos and interviews:** at least one real choked-drain photo and one interview, taken under `safety_copy.FIELD_RULES`. If nobody can reach the ward, the video says so.
9. **Verify every number spoken in the video.** The register is in `docs/implementation-rough-idea.md` section 8; update it for new numbers (3.8 mm, 14 mm, 228 mm).
10. **DISCOM helpline numbers** (BSES 19123, TPDDL 19124) are from memory: verify before showing. Shipped text uses 112 and "your power company's emergency line".

## 11. Honest limits (also say these in the video)
Scenario, not forecast; pocket parameters are illustrative. No outcome data until the next monsoon. Evidence can still be faked by a determined actor. Asset and pocket data are hand-placed placeholders until someone walks the ward. 30 m elevation data cannot locate street-level pockets, so none of our pockets come from it. Rain-capture rules are unreviewed by an expert. Legal review pending. The pilot depends on people who have not agreed to take part.

## 12. Glossary
**Pocket / low point**: a place where water collects (underpass, depression, low lane). **Scenario**: a what-if run, not a prediction. **Spill order**: pockets that overflow into downstream pockets. **Drain state**: clean, silted (25% of design depth is silt) or current (estimated from each linked asset's time since confirmed clean). **Asset**: a drain segment, inlet, underpass or pump we track. **Job**: one cleaning visit. **L0..L3**: closure levels. **Tier**: P1 / P2 / WATCH / NONE. **Drill switch / storm mode**: operator-entered official warning. **Placard**: the public QR page. **Ledger**: the append-only hash chain. **Seam**: a contract file shared across owners.
