# PROJECT.md: Rain-Ready, project details

For the whole team. Read after `CLAUDE.md`. Longer research lives in `docs/` (`Rain_Ready_System_Design.md`, `Rain_Ready_Adversarial_Review.md`, `implementation-rough-idea.md`); you do **not** need to read those to build. This file is the single source of truth where they disagree.

---

## 1. The problem, in four facts
- **27 Jul 2024, Old Rajinder Nagar, Delhi:** three students drowned in a coaching-centre basement after about 58 mm of rain (per the High Court order). The drains had reportedly gone uncleaned for years, ramps had been built over drains, and a basement licensed for parking and storage was used as a library with one exit. *(press and inquiry reports; cite on screen)*
- **Drain cleaning claims are self-reported and unreliable.** Reported example: CAG found only 0.98 of 8.29 lakh m³ of excavated silt carted away. *(press-reported; verify against the CAG text before saying it aloud)*
- **Software can't pump water or close an underpass.** What it can do is make sure the drains, pumps and people are ready before the rain, and keep an honest record of whether they were.
- **A day-ahead model forecast would not have warned anyone.** We checked (Open-Meteo, saved in `evidence/openmeteo/`): it gave about 3.8 mm for 27 Jul 2024 (58 mm recorded) and about 14 mm for 28 Jun 2024 (228 mm recorded at Safdarjung). A coarse-model caveat applies, but it is why Storm Mode keys on **official IMD warnings**, not on our own prediction.

## 2. The idea in one paragraph
Rain-Ready is a **mobile-first website** that gives a ward three things. (1) A **tamper-evident evidence record** of which drains and inlets were actually cleaned before the monsoon, where "cleaned" only counts once a **different, independent person** confirms it. (2) A **preparedness checklist for basement caretakers**, delivered when an official heavy-rain warning is active, plus a public **QR placard** so students and parents can see a building's self-declared status. (3) A **citizen report flow** (live camera + GPS) that turns a photo into a ticket and forwards hazards. Not a better complaint app: a shared, verifiable record of readiness that any city could adopt.

**One line for judges:** *"Not another flood map. A pre-monsoon operating system with receipts."*

## 3. What we build (and what we explicitly do not)

| Build | Do not build / do not claim |
|---|---|
| Report flow: camera + GPS -> ticket -> map | Flood prediction, depth in cm, "safe" areas, terrain-based low-pocket verdicts |
| Evidence-backed closure: levels L0 to L3 | Disposal / tonnage proof (we have no such data) |
| Hash-chained **evidence ledger** with a public `/verify` page | "Proof the photo is true" (it proves the record was not rewritten) |
| Basement checklist + **QR placard** (`/b/<code>`) | A rating, a green tick, a public list of "unsafe" buildings |
| Operator **drill switch** = enter an official IMD warning | Auto-sent warnings from our own forecast |
| Ward board (aggregate, no names) | Naming contractors or officers; public "overdue" shaming |
| Pre-written Hindi/English copy | LLM-written safety text |
| Hand-digitised pilot assets and hotspots | Terrain/depression model, rain-capture planner, Strands agent, WhatsApp, voice, native app (all cut) |

**Death mechanisms and our honesty:** basements, directly (checklist + enrolment + drain-in-front). Underpasses, weakly (static "never drive into water" text plus readiness evidence near listed underpasses). Live wires and open manholes: the app shows a static safety message and a pre-filled forward text. Wall collapses: not covered. Say this in the video.

## 4. Users and screens (one URL, five web pages)

| Page | User | Does |
|---|---|---|
| `/report.html` | Resident or crew, on a phone | Pick category, take photo (camera), location auto-filled with accuracy (manual pin fallback), submit -> ticket ID. Wire / manhole reports show the static hazard text first |
| `/map.html` | Everyone | MapLibre map: assets coloured by tier (P1 / P2 / WATCH / NONE), listed hotspots and underpass watch list, recent reports, storm banner, ward board numbers |
| `/task.html?id=` | Crew, then a different resident | Crew adds before / after / bank-side photos (L1). A second person opens the same link and **Confirms** with their own photo (L2). Shows the soft flags and the ledger link |
| `/building.html` | Basement caretaker | 4 questions + consent -> level + pre-written checklist (en / hi toggle). Saved on device. Banner and acknowledge button when a warning is active |
| `/b.html?code=` | Public (QR placard) | Self-declared use and exits, last checklist acknowledgement, confirmation status of the nearest drain. Always shows `info_only` text. No colour rating |
| `/ops.html` | Operator (password) | Drill switch (enter / clear an IMD warning), P1 list, create a job from an asset, ward board |
| `/verify.html?id=` | Anyone | Shows a ledger entry, recomputes the chain, states what it does and does not prove |

## 5. The model in four small ideas

**Vulnerability score `V` (0..1)** per drain asset, from `core/scoring.py`: silt (measured if fresh, else a prior grown from days since last *confirmed* clean), age since confirmed clean, history (listed hotspot, standing water last monsoon), trusted report clusters, nearby waste sources, consequence (underpass/basement = high). Weights are hypotheses, shown in the UI.
**Tiers:** `P1` if the storm switch is on and `V >= 0.55`; `P2` if `V >= 0.75` any time; `WATCH` if `V >= 0.40`. Rain gates the *mode*; it does not multiply the score (the multiplier version could never reach P1; see test).
**Closure levels** (`core/levels.py`): L0 claimed / L1 evidence submitted (before, after, and 5 m either side) / L2 **independently confirmed by a different person** / L3 audited. Soft flags (far from asset, duplicate photo, low GPS accuracy) can withhold L1. Setting an asset's `last_confirmed_clean` requires L2.
**Ledger** (`core/ledger_hash.py`, `app/ledger.py`): `hash = sha256(prev_hash + canonical_json(record) + photo_sha256)`. Every report, evidence item, level change, storm switch and building acknowledgement appends. `/api/ledger/verify/{id}` recomputes the chain. *Proves:* the record was not changed after being written. *Does not prove:* the photo is genuine. L2 addresses that, imperfectly.

## 6. The golden path (this is the demo; everything else is optional)

1. Open the live HTTPS URL on a phone. `/map` shows the pilot ward: assets coloured, hotspots, banner "No official warning active".
2. A resident (teammate, labelled) opens `/report`, takes a real photo of a choked drain, location fills in, submits. Ticket appears on the map.
3. Operator creates a job from the drain asset. Crew (teammate) adds before / after / bank photos -> **Evidence submitted (L1)**. One deliberately bad submission (reused photo or pin far away) shows **FLAGGED**.
4. A different person confirms from their own phone -> **CONFIRMED (L2)**. The ward board "independently confirmed" share ticks up. The asset's last-confirmed date updates and its score falls.
5. Caretaker opens `/building`, answers 4 questions, gets the Hindi checklist. Operator flips the **drill switch** ("IMD orange warning entered"): banner appears, P1 list appears for operator, caretaker sees the action checklist and taps Acknowledge.
6. Public QR placard `/b?code=demo0001` shows the self-declared status with the information-only line.
7. `/verify?id=` for one evidence entry shows the chain is intact; edit a row in the DB on camera and show it fail (optional, powerful).
8. Cut to the **AWS console** (EC2, S3 bucket with photos, Bedrock invocation if live) and the address bar with the URL.

### 3-minute video script
| Time | Beat |
|---|---|
| 0:00-0:20 | Rajinder Nagar 2024: facts, sourced on screen. One real quote from an interview if we have it |
| 0:20-0:40 | Our finding: model forecast said 3.8 mm; so Storm Mode keys on official IMD warnings and local readiness |
| 0:40-1:20 | Resident reports; crew submits; flagged duplicate; second person confirms (labelled "played by team member") |
| 1:20-1:50 | Caretaker checklist (Hindi), drill switch, acknowledgement, placard |
| 1:50-2:10 | Ledger verify, then tamper -> fails |
| 2:10-2:35 | **AWS shown**: EC2 running the app, S3 photos, Bedrock call (only if truly live), URL |
| 2:35-3:00 | What it does not do, what a pilot would measure next monsoon, repo is open |

## 7. Judging rubric and how we answer it (from wemakedevs.org/aws/env)
| Criterion (listed order, no weights stated) | Our answer |
|---|---|
| Idea and Impact: "a small problem solved well beats a big one solved vaguely" | One ward, one failure (unverified cleaning + unprepared basements), honest limits |
| Built on AWS (use of AWS is mandatory; the video must show it) | EC2 + S3 (+ Bedrock if live) + EventBridge optional, shown in video |
| Design and usability: "would someone who isn't on your team know what to do?" | Mobile web, one action per screen, Hindi/English, stranger test before recording |
| Execution: "one feature that runs beats five that almost do" | The golden path only, running on the public URL |
| Demo video (3 min, YouTube, shows what / who for / where AWS fits) | Script above |

## 8. Hardcoding and shortcuts: what is allowed

**Allowed (label it, move on):** seeded assets and hotspots in `data/seed.json` with `data_source`; a shared `OPS_KEY`; anonymous device IDs instead of accounts; local photo storage with S3 as the AWS demonstration; manual category if Bedrock is unavailable; operator-entered IMD warning; one demo building marked fictional; teammates playing resident/crew/JE (labelled on screen); SQLite; no tests beyond `core/` and happy paths; Hindi checked by one native speaker.
**Not allowed:** invented facts or statistics; unlabelled placeholder data presented as real; LLM-written safety text; showing "safe"; naming people or firms; claiming outcomes (no rain to test until next monsoon, about June 2027); features in the video that do not run.

## 9. Open items needing a human (do not code around these)
1. **Deadline time.** The schedule page says Sunday 11 Oct is the last day to submit but the hours are "still to come". Check the page and Discord; plan a code freeze at least 6 hours before whatever it says. *(An earlier note said 8:00 PM IST, from the Luma page; unconfirmed on the hackathon page.)*
2. **Check-in and verification, all four members:** check in on the hackathon page; WeMakeDevs account + AWS Builder Center profile with student verification (SheerID; an open case does not stop submitting, but fix it).
3. **Hindi copy** reviewed by a native speaker; English wording read by someone with disaster-management judgement. Until then, messages go to team accounts only.
4. **Legal:** Disaster Management Act s.54 (false warnings) text was not read by anyone. We frame everything as an unofficial preparedness checklist and re-broadcast only official warnings, but get a read before any real sending.
5. **DISCOM helpline numbers** (BSES 19123, TPDDL 19124 are from memory): verify before showing them. The shipped text uses 112 and "your power company's emergency line".
6. **Real photos:** at least one real choked-drain photo and one interview, taken following `safety_copy.FIELD_RULES`. If nobody can get to the ward, the video says the photos come from elsewhere.
7. **Verify any number spoken in the video.** Table in `docs/implementation-rough-idea.md` section 8 lists what is safe to say.

## 10. Architecture and deployment (short)
One FastAPI process + SQLite + static web, behind Caddy (HTTPS is mandatory; browsers only allow camera and GPS on HTTPS), on one **EC2 t3.small** in `ap-south-1` with an Elastic IP and a hostname like `13-233-10-20.sslip.io`. Photos in a private **S3** bucket via an IAM role (`STORAGE=s3`); local disk is the default. **Bedrock** for photo triage only (`TRIAGE_MODE=bedrock`), manual category as the fallback. Redeploy = `make deploy HOST=ec2-user@<ip>`. Runbook with commands: `docs/implementation-rough-idea.md` section 14. P1 owns this.

## 11. Honest limits (also say these in the video)
No outcome data until the next monsoon. Evidence can still be faked by a determined actor; the ledger stops rewriting, not a faked first entry. Asset data are hand-digitised placeholders until someone walks the ward. No terrain verdicts. Legal review pending. The pilot depends on people who have not yet agreed to take part.

## 12. Glossary
**Asset**: a drain segment, inlet, underpass or pump we track. **Job**: one cleaning visit for an asset. **Evidence**: a photo + location + phase attached to a job. **L0..L3**: closure levels. **Tier**: P1 / P2 / WATCH / NONE. **Storm mode / drill switch**: operator-entered official warning. **Placard**: the public QR page for a building. **Ledger**: the append-only hash chain. **Seam**: a contract file shared across owners.
