# Rain-Ready: Implementation Rough Idea (v2, post-adversarial review)

Companion to `Rain_Ready_System_Design.md` (research) and `Rain_Ready_Adversarial_Review.md` (critique).
v1 of this file carried most of the review's problems forward. v2 audits each one, fixes what can be fixed in code and copy, and lists what only a human can settle.

Written Fri 9 Oct 2026. **Submission closes Sun 11 Oct, 8:00 PM IST.** Problem statement and judging rubric have never been seen by me (review item 22); see §9.

---

## 0. Things I checked just now (not re-read, actually run)

| Check | Result | Consequence |
|---|---|---|
| **Would a day-before forecast have flagged 27 Jul 2024?** Open-Meteo Previous Runs + archive at Rajinder Nagar (28.642, 77.186) | Forecast D-1 gave **3.8 mm** for the day; "observed" reanalysis **2.3 mm**. The recorded event was **58 mm** that evening (HC order). | **The planned REPLAY demo is invalid.** A model-driven trigger would have stayed silent. |
| Same for **28 Jun 2024** (228 mm at Safdarjung) | D-1 forecast **14.2 mm**, reanalysis **14.3 mm** for the day. | Open-Meteo cannot reproduce either headline storm. Caveat: coarse ~10-25 km model vs a point gauge; still decisive for a "forecast would have fired" claim. |
| **Scoring formula** (§6.3 of design doc, copied by v1) | `Priority = V·(0.4+0.6·Rf)`. At Rf = 0.3 the multiplier is 0.58, so P1 (≥ 0.60) needs V = 1.03: **impossible**. With unmeasured silt = 0, max V = 0.75, so P1 needs Rf ≥ 0.667 (≈ 43 mm/24 h). | Review item 12 confirmed. Replaced in §4.2. |
| **Yamuna thresholds** (web search, Tribune/Outlook 2025 reports) | Old Railway Bridge: warning **204.50 m**, danger **205.33 m**, evacuation **206 m**. The design doc's "danger mark 204.83 m" is wrong. | Fixed; outfall-limited mode is cut from the build anyway (rarely applies, see §3). |
| "100 mm over Delhi = 74 M m³" | Implies C ≈ 0.50 over 1,483 km² (my arithmetic, area assumed). | Drop that comparison from anything spoken aloud. |

Raw responses are saved in `evidence/openmeteo/` so the numbers can be re-checked.

**The silver lining, and the new pitch angle:** commercial grid forecasts missed both of Delhi's most damaging recent storms. That is a real argument for *not* building a model-triggered warning system, and for keying Storm Mode on **official IMD warnings plus local readiness**. It turns a dead replay into an honest finding we can state in the video.

---

## 1. Audit: which review problems did v1 carry, and what now happens

Status: **C** = carried into v1, **P** = partly, **N** = not carried (but see note). "Fix" points to the section below.

### A. Concept flaws

| # | Review problem | In v1? | Fix in v2 |
|---|---|---|---|
| 1 | Thesis (deaths at underpasses/basements/wires/manholes/walls) ≠ product (drain ticketing) | **C** (v1 repeated the five-place thesis, then built drains first) | §2: explicit death-mechanism → module map; basements become the lead; pitch no longer claims to stop wire/manhole/wall deaths |
| 2 | "Verified closure" is self-reported; no auditor recruitment; disposal proof unavailable | **C** (random 10-15% re-audit "even if no one executes it") | §4.3: trust levels; only *independent confirmation* earns the word "confirmed"; no disposal claim |
| 3 | Chat-bot photo checks defeatable (EXIF stripped, spoofed pins, recompression, 20 m < GPS error, staged rod) | **C** (20 m geofence, "server time", gauge-rod flag all in v1) | §4.3: 50 m + accuracy, treat all as *soft evidence*, independent confirmation is the real control, say plainly it can be gamed |
| 4 | No agency agreed to use it; JE is a teammate; pump feature duplicates SCADA | **C** | §2/§6: JE/EE channel is *simulated and declared so*; "pilot ask" letter drafted; pump-operator one-tap **cut** |
| 5 | "Evidence not blame" vs public overdue board and auto-escalation to EE/zonal head | **C** | §4.3: escalation internal, board aggregated by ward, no contractor/officer names, no public "overdue" until an agency agrees |
| 6 | Not a workable warning system (cold-start enrolment, WhatsApp templates/cost, Telegram can't initiate, channel mix, no speech-to-text) | **C** (v1 said "Telegram for everything" but kept voice and WhatsApp as should-haves) | §4.4: Telegram-only pilot, QR deep-link enrolment, no WhatsApp, no voice; framed as *preparedness checklist* not warning |
| 7 | Storm Mode trigger undefined; Open-Meteo too coarse; "Low" class gets nothing | **C** | §4.4 and §0: trigger = official IMD warning (manual input) with a defined threshold; enrolled basements get the checklist regardless of terrain class |
| 8 | Underpass avoid-list adds little | **C** | §2: demoted to static content; not a headline feature |

### B. Logic and technical inconsistencies

| # | Review problem | In v1? | Fix in v2 |
|---|---|---|---|
| 9 | Terrain contradictions: address-level "low pocket" verdict from 30 m data; 10 m resample; stamped underpasses dominate ranking; drain network ignored; rain formula order | **P** (v1 kept the risk class at address level in `building_risk`; dropped the rain formula but kept road burn / underpass stamping) | §5: terrain is **optional and off the critical path**; no address-level terrain verdict; underpass depressions excluded from validation; correct formula noted |
| 10 | Validation leaks (hotspots as input and test; spatial clustering; OpenCity semantics unknown; tiny sample; invented "40%") | **P** (v1 told people to publish the hit rate but fed hotspot lists into both score and map) | §5.3: hotspot list not used as a score input for the layer being validated; spatial block split; OpenCity inspected first; descriptive only; fallback defined |
| 11 | Demo replay contaminated by hindsight; day-before forecast never checked | **C** (and v1 even built a "forecast-as-it-was" cache around it) | §0 + §7: replay dropped; replaced by a **labelled scenario drill**, assets "reconstructed from the inquiry report", hindsight stated out loud |
| 12 | Scoring barely works | **C** (copied verbatim) | §4.2: new scorer, reachable P1, numerical examples, unit tests that assert reachability |
| 13 | Capacity comparison mixes durations; 74 M m³ vs annual recharge strawman | **P** (v1 didn't repeat the claims in code, but the pitch beat "58 mm moderate" and the legacy-capacity framing stayed) | §8: banned-claims list; "indicative, durations differ" wording |
| 14 | Harvesting thresholds inconsistent; "store don't recharge" for Rajinder Nagar rests on a guess; Yamuna numbers wrong | **C** (v1 hard-coded Rajinder Nagar → `STORE_REUSE`) | §4.5: single drain-down rule, demo plot is explicitly **hypothetical**, Yamuna mode cut, correct thresholds recorded |
| 15 | Privacy rules conflict (hash vs messaging; auto-delete vs RTI; Rekognition doesn't blur) | **C** | §6.3: concrete retention table; chat IDs encrypted not hashed; blur is our own Pillow step, plates not promised |

### C. Real-world and safety risks

| # | Review problem | In v1? | Fix in v2 |
|---|---|---|---|
| 16 | Safety checklists LLM-generated | **C** (v1: "template-first with LLM polish") | §4.4: **no LLM text in safety content at all**; LLM only classifies photos |
| 17 | Field measurement hazard (probing drains/manholes) | **C** (gauge rod, "walk the ward", student auditors) | §6.2: no manholes, no covered drains, kerb-side open-drain photos only, never in rain, written rule in bot |
| 18 | DM Act s.54 unsettled | **C** (not mentioned) | §6.1: framed as preparedness checklist, official warnings only re-broadcast by link, consented pilot only; **legal read still outstanding** |
| 19 | No rain to test; pilot metrics unmeasurable until June 2027; tiny pilot proves little | **C** | §7/§9: say so in the video; claim *readiness evidence*, not outcomes; real rain is Jun 2027 |
| 20 | Reports not trustworthy; trust/dedupe undefined; 30-50 photos validates severity feeding score | **C** | §4.2: dedupe/trust defined; photo severity **does not enter the score** |

### D. Execution and scope

| # | Review problem | In v1? | Fix in v2 |
|---|---|---|---|
| 21 | Wildly overscoped; inputs untested; Bedrock quota | **C** (v1 trimmed but still had 5 modules, terrain, Strands, M4, validation page) | §3: scope halved; Phase 0 kill-checks come before any build; Bedrock fallback is a form |
| 22 | Unstated assumptions: team of 4, rubric unseen, "Strands satisfies open source" non sequitur | **C** (v1 assumed 3-4 people and repeated the Strands claim) | §9: open questions to you; Strands claim removed; repo itself must carry the open-source licence |
| 23 | DynamoDB wrong for spatial; Lambda zips too small for geo libs | **C** (v1 explicitly said "skip PostGIS") | §3: Postgres+PostGIS on one EC2 box in docker compose |
| 24 | Weak sourcing, untagged headline numbers | **C** | §8: spoken-number register with verification status |

**Bottom line:** 20 of the 24 problems were carried into v1 outright, 4 partly. Items that remain open after v2 are in §9; none of them can be fixed by writing code.

---

## 2. Revised thesis and product shape

### What Rain-Ready is (honest version)

> **An evidence layer for pre-monsoon drain cleaning, plus a preparedness checklist for basement caretakers.**
> It is not a flood-warning system, not a depth map, and it does not prevent electrocutions, open-manhole falls or wall collapses.

### Death mechanism → what we do about it (review item 1)

| Mechanism | Does Rain-Ready reduce it? | How | Be honest about |
|---|---|---|---|
| **Basement flooding** | **Yes, directly (lead feature)** | Caretaker enrolment, checklist when an official warning is active, "drain in front / ramp over drain" reports to the owner agency | Only reaches enrolled buildings; we cannot force anyone out |
| **Underpass drowning** | **Indirectly, weakly** | Evidence that inlets/drains near listed underpasses were cleaned before the season; static "never drive into water at an underpass" in every message | Deaths happen in the first minutes of a flash flood. Software without live depth sensing cannot stop this. Say so |
| **Live wire in water** | No (forward only) | Report → instant static safety text → pre-filled message to DISCOM | We are a report forwarder here, not a prevention system |
| **Open manhole** | No (forward only) | Report → forward | Same |
| **Wall collapse** | No | Not covered | Not covered. State it |

The pitch must put basements first and stop implying the full list.

### What gets built (cut list applied)

| Keep (critical path) | Keep (cheap) | Cut or demote |
|---|---|---|
| Telegram intake: pin + photo → triage → ticket | Hand-built hotspot/asset map (MapLibre, static GeoJSON) | **M4 rain capture: reduced to a one-page rules checker, built last, optional** (review: "different problem") |
| Evidence-backed closure with trust levels (§4.3) | Ward board (aggregated) | Terrain/depression modelling: **optional, off critical path** |
| Basement caretaker enrolment + "My building" checklist | Static underpass watch list | Strands agent, WhatsApp, voice notes, Rekognition, JE CSV, pump-operator one-tap, outfall mode, escalation to EE/zonal head, public overdue board |
| Storm Mode (IMD-triggered) with **pre-written** checklists | Scenario drill page | |
| Vulnerability scorer (fixed) | | |

---

## 3. Architecture (revised for the spatial reality)

Review items 21 and 23: nearly every query is spatial, geo libs don't fit Lambda zips, and the Day-1 inputs are untested. Simplest thing that works:

```
 Telegram ───▶ Caddy (HTTPS) ──▶ FastAPI app ──▶ Postgres + PostGIS
 Browser  ───▶ (one EC2 t3.small,  │   │              (assets, reports, jobs, alerts)
               docker compose)     │   ├──▶ S3 (photos: private bucket, KMS)
 EventBridge Scheduler ────────────┘   ├──▶ Bedrock (Claude): photo triage ONLY
   (hourly: POST /internal/tick)       └──▶ static web (MapLibre + GeoJSON)
```

- **One container app**, not 4 Lambdas. `shapely`, `pyproj`, and (optionally) `rasterio`/`richdem` all just work.
- PostGIS gives `ST_DWithin` for dedupe, nearest-asset and geofence in one line each.
- AWS services shown: EC2, S3, Bedrock, EventBridge Scheduler (+ KMS). CloudFront only if time.
- **Telegram long-polling** instead of a webhook if HTTPS setup eats time.
- **Bedrock is a risk, not an assumption.** A new account may have low quotas or need a use-case form. Phase 0 tests it. If it fails, triage degrades to "reporter picks the category; no photo analysis", and the demo still works.

Repo layout (trimmed):

```
rain-ready/
├── app/            # FastAPI: bot.py, api.py, tick.py
├── core/           # scoring.py, closure.py, trust.py, geo.py, safety_copy.py, m4_rules.py
├── ai/triage.py    # Bedrock vision -> JSON (the only LLM call)
├── data/           # assets_pilot.geojson, hotspots.geojson (each row has source+year), scenario/
├── evidence/       # saved Open-Meteo responses, interview notes
├── web/            # map, ward board, scenario drill, (optional) rain-capture checker
├── terrain/        # optional
├── tests/          # scoring reachability, closure, banned-words, m4 worked examples
└── docker-compose.yml
```

---

## 4. Fixed designs

### 4.1 Pilot data (no change in method, one change in honesty)

20-40 hand-digitised drains/inlets/underpasses around Old Rajinder Nagar / Karol Bagh, each with `source`, `confidence`, `digitised_by`. Because the assets are reconstructed *after* the 2024 event, label them: **"reconstructed from the public inquiry report; this is hindsight, not prediction"** (review item 11).

### 4.2 Vulnerability scorer (replaces v1; review items 12, 20)

Principles: unmeasured must not mean zero silt; rain must gate the *mode*, not multiply a score that then can't reach its threshold; photo severity never enters the score.

```python
import math

D_EQ, TAU = 0.50, 75          # prior: silt fill fraction approaches 0.5 with tau=75 d; EDITABLE, untested
FRESH_DAYS = 90               # a measured silt value older than this is replaced by the prior
NEVER_CLEANED_DAYS = 365      # "never verified" is treated as one year, not as zero or infinity

def silt_fill(a, today):
    if a.silt_measured is not None and (today - a.silt_measured_on).days <= FRESH_DAYS:
        return a.silt_measured, "measured"
    days = NEVER_CLEANED_DAYS if a.last_confirmed_clean is None else (today - a.last_confirmed_clean).days
    return D_EQ * (1 - math.exp(-days / TAU)), "estimated"

def vulnerability(a, today, trusted_report_clusters):
    fill, basis = silt_fill(a, today)
    silt = min(1.0, fill / 0.50)
    cycle = 120 if a.hotspot_listed else 365
    days = NEVER_CLEANED_DAYS if a.last_confirmed_clean is None else (today - a.last_confirmed_clean).days
    age = min(1.0, days / cycle)
    history = 1.0 if a.hotspot_listed else 0.6 if a.standing_water_last_monsoon else 0.0
    reports = min(1.0, trusted_report_clusters / 3)          # clusters, not raw photos (below)
    sources = 1.0 if a.source_near_m <= 100 else 0.5 if a.source_near_m <= 250 else 0.0
    v = 0.25*silt + 0.20*age + 0.20*history + 0.15*reports + 0.10*sources + 0.10*a.consequence
    return v, basis                                           # basis is shown on every card

# Rain gates the MODE. No multiplier.
def tier(v, storm_mode_active):
    if storm_mode_active and v >= 0.55: return "P1"
    if v >= 0.75:                       return "P2"           # inspect within 7 days, any weather
    if v >= 0.40:                       return "WATCH"
    return "NONE"
```

**Calibration (computed, not hoped):**

| Example | V | Tier in Storm Mode |
|---|---|---|
| A. Hotspot underpass drain, never confirmed cleaned | **0.80** | P1 |
| B. Ordinary collector drain, cleaned 30 d ago, no reports | **0.15** | none |
| C. Hotspot drain, cleaned 100 d ago, 2 trusted report clusters | **0.80** | P1 |
| D. Ordinary drain, cleaned 200 d ago, near a market | **0.41** | WATCH |

`tests/test_scoring.py` must assert: A and C reach P1; B and D do not; unmeasured silt never returns 0; a clean asset never alerts on rain alone (B stays NONE at any rain). A test that **P1 is reachable** is the one the original formula would have failed.

**Report clusters and trust (defining what v1 left vague):**
- Cluster = same category, within 50 m (`ST_DWithin`), within 24 h.
- One user counts once per cluster. Trust weight: known/enrolled local user 1.0, unknown 0.5, team member 1.0 (flagged `staff`).
- A cluster counts toward `reports` only if it has ≥ 2 distinct users **or** one staff confirmation; otherwise it is shown as "Unverified" on the map and contributes 0.
- Daily cap: 10 reports/user; geofence to NCR.
- Triage output (type, severity, silt estimate, "gauge rod visible") is stored and displayed, **but is never a scoring input**. It only pre-fills the ticket and decides routing of danger cases.

Weights are hypotheses. Store them in `weights.json`, show them on the ward board, and log predicted vs actual after any real storm.

### 4.3 Evidence-backed closure (replaces "verified closure"; review items 2, 3, 5)

The diagnosis in the design doc is that self-reporting fails. So a contractor's photo can never, by itself, make a drain "verified". Closure has **levels**:

| Level | Meaning | Who/what produces it | Label shown |
|---|---|---|---|
| **L0** | Claimed done, nothing attached | Crew says "done" | "Claimed" |
| **L1** | Photo evidence submitted that passes soft checks | Crew/JE: before, after, and "5 m either side of drain" photos | "Evidence submitted" |
| **L2** | **Independent confirmation** from a different person | RWA volunteer / resident: one-tap link, their own photo + pin | **"Independently confirmed"** |
| **L3** | Spot-audit by someone with no stake | Student auditor / ward partner | "Audited" |

Rules:
- The word *confirmed* only appears at L2+. The ward board reports **% of assets at L2+**, never "cleaned %" or tonnage.
- Soft checks at L1 are *advisory flags*, not gates, because they are defeatable (item 3): GPS pin within **50 m of the asset and ≤ reported accuracy**; server receipt time after the "before" photo; perceptual hash (`imagehash.phash`, Hamming ≤ 6) against the last 90 days to catch re-used photos; EXIF read **only if sent as a file** (Telegram strips it from normal photos); a "gauge rod visible" hint from triage. Each flag is shown to the reviewer. Absence of EXIF lowers trust, it doesn't prove fraud.
- **Disposal proof is not required and not claimed.** We have no weighbridge or truck-GPS data. Status words never say "silt removed" or "desilted".
- **Plain statement for judges:** a determined contractor can fake L1. The design bet is that L2 is cheap for a resident and expensive to fake at scale. Whether it works is exactly what a pilot would test.
- **Recruiting L2 (review item 2: "no recruitment, incentive or workflow"):** for the pilot, the RWA secretary shares one invite link in the colony group; confirming takes one photo + one tap. In the hackathon demo, **the team plays the confirming resident and says so on screen**. No pretending.

**Escalation (review item 5), conservative version:**
- Task goes to the owner agency's contact (simulated JE in the demo, declared) with a reminder after the SLA.
- Escalation beyond the first contact happens only as an **internal** reminder to the pilot's own coordinator. No auto-notification of EE/zonal heads, and no public "overdue" list, until an agency has agreed. Public board shows ward-level counts only (assets at L2+, median days to L2, reopen count). No contractor, firm or officer names. Legal exposure of naming is unassessed, so we don't do it.
- "Wrong owner" button stays: ownership confusion is a documented failure and rerouting is neutral.

### 4.4 Storm Mode and the caretaker flow (review items 6, 7, 8, 16)

**Reframe:** a *preparedness checklist* sent to consenting, enrolled caretakers when an **official** warning is active. We do not issue our own forecasts or warnings.

**Trigger (defined):**
- `storm_mode_active = True` when an operator (team/coordinator) enters an **IMD warning** for Delhi: orange or red for heavy rain, or "heavy rain" ≥ 64.5 mm/24 h expected. IMD has no programmatic feed we found, so this is a manual step in v1 and says so on the screen.
- Open-Meteo is shown as a **secondary hint to the operator only** (never auto-sends), because §0 shows it missed both flagship events. Planned later: log IMD warning vs Open-Meteo vs actual per storm.
- **False-alarm control:** at most one checklist per building per 5 days; a "Watch" level (information only, no action ask) vs "Warning" level (actions). False-alarm rate is **unknown** and is stated as such. It cannot be estimated without the IMD warning history, which we do not have.

**Cold start and enrolment (review item 6):**
- A Telegram bot cannot message people who have not pressed Start. So enrolment is in person, via a **QR code deep link** (`t.me/<bot>?start=bsmt_<code>`) handed to caretakers/RWAs by the team during the field visit.
- Interview 4-6 caretakers with one kill-question: *"Would you use Telegram for this?"* If most say no, the channel assumption is false and the pilot plan changes (WhatsApp with template approval and cost is a post-hackathon item, not hidden in the architecture).
- WhatsApp, voice notes and speech-to-text are **out of scope** (Amazon Transcribe supports Hindi, so it is a possible later add, unbuilt).

**All safety text is pre-written (review item 16).** `core/safety_copy.py` holds reviewed Hindi/English templates, selected by rules from `(audience, level, answers)`. **No LLM generates or rephrases any checklist, warning or instruction.** The only LLM use in the product is photo triage for ticket pre-fill. Footer attached in code: *"Unofficial preparedness checklist. Official warnings: IMD / NDMA Sachet."*

**"My building" flow (replaces v1's terrain-based verdict; review item 9):** the caretaker shares a pin and answers 4 questions (basement? entrance below road? people inside by day? ramp over the drain in front?). The result uses **their own answers plus the hand-built hotspot list within 200 m**. There is no terrain-derived "you are in a low pocket" statement anywhere.

```python
def building_level(basement, entrance_below_road, people_inside, ramp_over_drain, near_listed_hotspot_200m):
    score = basement*2 + entrance_below_road + ramp_over_drain + near_listed_hotspot_200m + (basement and people_inside)
    if basement and people_inside: return "HIGH_ATTENTION", reasons   # never "low", whatever the other answers
    return ("HIGH_ATTENTION" if score >= 4 else "ELEVATED" if score >= 2 else "NO_SPECIFIC_FLAG"), reasons
```
`NO_SPECIFIC_FLAG` is displayed as "No specific flag from your answers. Not a safety guarantee", and an **enrolled building still receives the checklist when a warning is active, regardless of level** (review item 7: "Low sends nothing").

**Live-wire / open-manhole reports:** immediate static message ("Stay away. Do not touch. Move people back. Call your power company's emergency line and 112."), then forward text. Verify DISCOM helpline numbers before shipping (BSES 19123 and TPDDL 19124 are from memory, unverified).

**Underpass watch list (review item 8):** static list of known underpass hotspots on the map. Not an alert, not "avoid-list" marketing. Fixed text: *"Never drive or walk into water at an underpass."*

### 4.5 Rain-capture checker (optional; review item 14 and "cut M4")

Built **only if the critical path is green by Sat night**. One page, a pure tested function, labelled **"Experimental. Not reviewed by a hydrogeologist. Not for construction."**

Fixes to the earlier inconsistencies:
- **One drain-down rule:** ≤ 24 h pass; > 24 h to 48 h "marginal, needs slow-release/overflow design"; > 48 h fail. Use these constants everywhere.
- **No claim about Rajinder Nagar's water table.** The shallow-zone example is a *hypothetical plot with user-entered depth*; the deep example likewise. We do not state the real depth until it is read from the CGWB yearbook.
- Evaluate "no recharge" rules before sizing; return the deciding rule ID; worked examples from the design doc (100 m² roof → 2.1 m³; annual 55-60 m³) as unit tests.
- If time is short, drop it completely. It is a different problem and the pitch is stronger without it.

---

## 5. Terrain / Water Map (review items 9, 10; demoted)

**New position:** the Water Map's primary content is the *hand-built* layer: hotspots, underpasses, drain assets coloured by V, report clusters, opted-in basements. Terrain is an **optional extra layer**, shown at catchment scale only, only if the Phase 0 checks pass and it finishes by Saturday evening.

### 5.1 Corrections
- No address-level verdicts from terrain. 30 m data with ~2 m relative error cannot support them.
- Don't resample "to 10 m" and then talk as if that adds resolution; if used, say it is for alignment.
- Don't size performance claims for 1 m grids, because we have no such data.
- **Underpass circularity:** stamped-in underpass depths will rank at the top by construction. Report underpass hits separately and **exclude stamped cells from the validation score**.
- The drain network is not in the 30 m data; depressions here ignore it. Say so.
- If rain input is ever modelled: `runoff_depth = max(0, C·P − D·T)` **per catchment** (review item 9); C applies to rain before capacity is subtracted; D differs by catchment. v1 never implemented this and it is not needed for the slice.

### 5.2 Optional layer recipe (≤ 3 hours, else drop)
Copernicus GLO-30 tile → clip to ~5 km box → priority-flood fill → depression depth, area, catchment → rank → classify into `Known hotspot / High attention / Elevated / No specific flag`. Libraries: `richdem` or `pysheds`; `malstroem` as reference. Output GeoJSON polygons, no depth numbers.

### 5.3 Honest validation (review item 10)
- Do **not** use the hotspot list as an input to the layer being validated (the History weight in the *drain* scorer is a different object; do not mix).
- Split by **space** (e.g. east/west blocks), not randomly, because hotspot points cluster.
- First open the OpenCity "2 Year Flood Points" KML and read what it contains. If it looks modelled rather than observed, it is not a test set.
- Report: hits within 150 m of a top-k depression vs random placement vs lowest-elevation baseline, area flagged, and the misses. One ward is a **descriptive** case study, not evidence of skill. No "40%" target, it was invented.
- **Fallback:** if the hit rate is not clearly above the baselines, remove the terrain layer from the pitch and the map. Nothing else depends on it.

---

## 6. Safety, legal, privacy, field work (review items 15, 17, 18, 19)

### 6.1 Liability (item 18)
- Wording: "preparedness checklist", not "warning". We only re-broadcast **official** IMD/Sachet warnings (link, not paraphrase) and generate no hazard predictions for the public.
- Pilot is consent-only: users opt in with Hindi/English text saying it is unofficial.
- **Disaster Management Act s.54 (false warnings): the statute text was never retrieved by anyone (the design doc tags it [NF]). I cannot settle this by writing code. It needs a lawyer or at least a read of the Act before any real send.** Until then, the demo sends only to team accounts.

### 6.2 Field-measurement safety (item 17)
Written into the bot's welcome message, the volunteer instructions, and the pilot protocol:
1. **Never lift or open a manhole cover.** No photos of silt inside covered drains. Covered drains get "covered; not assessable" and rely on the owner's own inspection.
2. Open drains: photo from the kerb or bank with a rod held at arm's length; never step in or lean over fast-moving water.
3. **Not during or right after rain**, not at night, not alone.
4. Silt level in a flowing drain cannot be seen: the rod photo is a *dry-weather* tool. State this limit.
5. No minors or students around drains without an adult; students do desk review of photos only.
6. The team's own demo photos follow the same rules.

### 6.3 Privacy (item 15), concrete and non-conflicting

| Data | Treatment |
|---|---|
| Telegram chat ID / phone | Needed to message people, so **encrypted at rest (KMS), not hashed**. A separate salted hash is used only for analytics/dedupe |
| Report photos with possible faces/plates | Private bucket; **delete raw after 30 days**; public views show only a blurred or no image. Blur is our own Pillow step on boxes from a detector (Rekognition returns boxes, it does not blur). Plate detection is unreliable, so the demo uses drain-only photos |
| Closure evidence photos (infrastructure, no people) | Keep 12 months; store hash permanently. This supports reopening disputes and RTI-style packs without keeping people photos |
| Public map | Coarse location (rounded) for individual reports; asset-level for public infrastructure |
| Consent | Hindi + English text at first Start; `/delete_me` deletes identity and personal photos |

### 6.4 Testing without rain (item 19)
- It is 9 Oct; the monsoon has withdrawn. The system can only be exercised as a **scenario drill** now, and real outcome metrics (waterlogging events, hours) cannot exist until the next monsoon (about June 2027).
- Therefore: **claim readiness evidence, not outcomes.** In the video, say "this is built to produce evidence in the next monsoon, we cannot show it reduced flooding".
- A 3-4 user trial is a usability check, not a pilot result.

---

## 7. Demo plan (replaces the invalid replay; review item 11)

The scenario drill replaces "REPLAY". Banner on screen throughout: **"SCENARIO DRILL. Not a forecast, not a replay."**

| Time | Beat | Content |
|---|---|---|
| 0:00-0:25 | The case | Old Rajinder Nagar, 27 Jul 2024: 58 mm (HC order), local depression, ramps over drains, drains uncleaned five years, library basement with one exit, 3 deaths. Source cited on screen |
| 0:25-0:45 | **The finding** | "We tested whether a day-ahead model forecast would have warned anyone. It said 3.8 mm for 27 Jul and 14 mm for 28 Jun (228 mm recorded). So Storm Mode keys on official IMD warnings plus local readiness." Show the saved numbers |
| 0:45-1:25 | Drill | Operator enters a mock IMD orange warning → enrolled caretakers (team accounts) get the pre-written Hindi checklist → map shows listed hotspots and drain assets; P1 list for the declared-simulated JE. Footer: unofficial |
| 1:25-2:10 | Evidence closure | Real photo of a real drain the team took (kerb-side, dry weather) → triage → ticket → crew submits L1 → resident (teammate, declared) confirms L2 → ward board shows "assets independently confirmed". Show a **rejected/flagged** L1 (reused photo or pin 300 m away) |
| 2:10-2:30 | What it does not do | The mechanism table: basements yes, underpass weakly, wires/manholes/walls forward only |
| 2:30-3:00 | AWS and limits | EC2/PostGIS, S3, Bedrock, EventBridge; limits: no depths, no outcomes until next monsoon, unofficial, legal read pending, open source |

One honest sentence for judges: *"No study shows an app alone reduces flooding. This is built to create the readiness evidence a pilot would need."*

The assets in the drill are labelled "reconstructed from the inquiry report", and the drill is described as a walkthrough, never as proof the system would have saved anyone.

---

## 8. Spoken-number register (review item 24)

Do not say a number aloud unless it is in the "OK to say" column.

| Claim | Source status | OK to say? |
|---|---|---|
| 3 students died, Old Rajinder Nagar, 27 Jul 2024 | Widely reported, in the design doc's inquiry/HC sources | Yes, cite |
| 58 mm that evening | HC order via ETV Bharat (design doc); single outlet | Yes, with "per the High Court order" |
| 228 mm on 28 Jun 2024 | Design doc, press; re-check against IMD | Check first |
| Open-Meteo gave 3.8 mm / 14 mm | **Ours, computed today**, files in `evidence/` | Yes, with the coarse-model caveat |
| Yamuna: warning 204.50, danger 205.33, evacuation 206 m | Verified via web search of 2025 reports | Yes (replaces design doc's 204.83) |
| CAG "0.98 of 8.29 lakh m³ carted" | Untagged in design doc; press-reported | **Verify against the CAG report text first** |
| 754 pumps at 167 locations; 179 CCTV on 45 hotspots | Untagged in design doc | **Verify or omit** |
| "71 of the 2025 hotspots had no clear owner"; 410/445 points | Hotspot counts "don't reconcile" per the design doc itself | Omit or say "hundreds" |
| "30 cm silt cuts capacity ≈ 32%" | Our Manning calc for one assumed section | Say "in a typical section, roughly a third; our calculation" |
| "Legacy 25 mm/h vs 2-yr storm ~80 mm/h so drains overtop even clean" | Durations not matched (review item 13) | **Do not say.** Say "indicative, standards differ" or omit |
| "100 mm storm = 74 M m³ vs park recharge 12.8 M m³/yr" | Strawman (storm vs annual), implied C ≈ 0.5 | **Do not say** |
| "Singapore 3,200 ha → <30 ha" etc. | Design doc, cited MSE page | OK if cited, not core |

---

## 9. Schedule (cut to what survives)

**Phase 0 (first 90 minutes, tonight; run before any build).** Each has a defined fallback.

| Check | If it fails |
|---|---|
| Bedrock model access works in the account (test one image) | Triage degrades to reporter-chosen category; rest unaffected |
| Telegram bot receives photo + location on EC2 | Switch to long-polling from a laptop for the demo |
| EC2 + docker compose + Postgres/PostGIS up | Use SQLite + shapely for the demo |
| OSM Overpass count of `tunnel`/`waterway=drain` in the pilot box | Hand-digitise only |
| OpenCity Delhi KML: read what it is | If modelled, do not call it observed |
| One Copernicus tile downloads | Drop the terrain layer |
| **Interview question (kill-test): "Would a caretaker use Telegram?"** | Pilot plan changes; demo still runs with team accounts |

### Fri 9 Oct (evening)
Phase 0; repo + compose + Postgres schema; Telegram intake storing photo/pin; `scoring.py` + tests (reachability test first); pilot asset GeoJSON started; saved Open-Meteo evidence (done).

### Sat 10 Oct
- AM: Bedrock triage → ticket; clusters + trust; closure levels L0-L3 with soft-flag display; ward board.
- Midday: pre-written safety copy (hi/en) reviewed by a native speaker, banned-word test (`safe`, `guarantee`, `cm deep`, `desilted`); enrolment QR flow; "My building" flow.
- PM: scenario drill + operator console (enter IMD warning); map with hotspot/asset layers; **deploy to EC2 tonight**.
- Evening: showcase for feedback. Anything undeployed at midnight is cut.
- Only if green: rain-capture checker (3 hours max) or terrain layer (3 hours max), not both.

### Sun 11 Oct
Fix feedback bugs → 1 PM record against deployed stack → **3 PM code freeze** → edit video, README (limits, provenance, AI tools used, licence) → **6 PM submit** (2 hours margin).

### Mon-Thu (hardening only if continuing)
IMD warning log vs Open-Meteo vs actual; legal read of s.54; hydrogeologist call for M4 rules; WhatsApp with template approval if the Telegram test failed; PostGIS-based validation; Rekognition + blur.

### Team size
Unknown (see §10). Priority if **solo**: (1) intake + ticket, (2) scorer + hand-made assets, (3) closure levels + ward board, (4) Storm Mode drill with pre-written copy, (5) static map. Terrain, rain checker and Strands are out entirely.

---

## 10. What only you can settle

These cannot be fixed by writing or testing code.

1. **Team size and roles.** Everything above assumes nothing; the solo priority list is the default.
2. **The problem statement and judging rubric.** Never provided. Paste the text so fit can be checked (review item 22).
3. **Open-source requirement.** The design doc's "Strands satisfies it" was a non sequitur; our repo must carry an open licence (MIT/Apache-2.0) and be public at submission if required.
4. **Legal read of DM Act s.54** before any message goes to a real person. Until then, team accounts only.
5. **Will a real JE, an RWA, a caretaker agree to take part?** If not, the demo declares those roles as played by the team.
6. **Hydrogeologist contact**, only if the rain-capture checker ships.
7. **Verify** the "verify" rows in §8 and the DISCOM helpline numbers in §4.4.

---

## 11. Acceptance checklist for Sunday 6 PM (revised)

- [ ] Telegram intake: pin + photo → triage (or manual category) → ticket → static safety text for wire/manhole → pre-filled forward message.
- [ ] Closure: L0/L1/L2 states work; the word "confirmed" appears only at L2+; at least one flagged L1 demonstrable; no use of "desilted/removed".
- [ ] Scorer: tests pass, including P1 reachability and "unmeasured ≠ 0 silt".
- [ ] Clusters/trust implemented per §4.2; triage severity not used in scoring.
- [ ] Enrolment via QR deep link; "My building" uses answers plus hotspot proximity, **no terrain verdict**.
- [ ] Scenario drill: operator enters IMD warning; pre-written copy goes to team accounts; "SCENARIO DRILL" banner always visible.
- [ ] Every user-facing safety text is pre-written; banned-words test passes; unofficial footer on all.
- [ ] Ward board shows only ward-level, L2+ based metrics; no names, no tonnage, no public overdue list.
- [ ] Field-safety rules in the bot welcome message and README.
- [ ] Privacy table implemented (encrypted chat IDs, 30-day raw-photo deletion job, `/delete_me`).
- [ ] README: limits, data provenance, "reconstructed from inquiry report", "legal read pending", AI tools used, licence.
- [ ] Deployed on EC2 with PostGIS; demo works from a clean browser and a second phone; no live external API calls on stage.
- [ ] Optional: rain-capture checker or terrain layer, only if green.

---

## 12. What changed in one paragraph

v1 was a polished build plan for the research's original framing, and it inherited that framing's weaknesses: a demo that depends on a forecast we have now shown would not have fired, a scoring rule that could never produce its top alert, a "verified" label resting on self-submitted photos, LLM-written safety text, a database wrong for the queries, terrain verdicts the data cannot support, and an unexamined legal and safety footprint. v2 narrows the claim to *evidence for pre-monsoon cleaning plus a basement preparedness checklist*, keys it to official warnings, replaces the dead replay with a labelled drill built around an honest finding, and moves everything that needs a person (legal, rubric, pilot partners, expert review) into §10 instead of pretending it is done.

---

## 13. One-day build decision (supersedes §3 architecture and §9 schedule where they conflict)

Inputs now known: the problem statement page (https://www.wemakedevs.org/aws/env), team of 4 using Claude, about one day.

### 13.1 What the event actually asks for (fetched 9 Oct, paraphrased by a fetch agent; **/aws/rules not yet read**)

- **Track: "Heat and Water"** (floods and monsoon waterlogging are named starter topics). Pick it. Each track is judged separately.
- Five criteria, no weights stated, in this order: **Idea and Impact** ("a small problem solved well beats a big one solved vaguely"), **Built on AWS** (an AWS open-source tool *or* deployed on AWS is mandatory to win a prize), **Design and usability** ("would someone who isn't on your team know what to do with it?"), **Execution** ("one feature that runs beats five that almost do"), **3-minute recorded demo video** (there is no live demo; the video is what judges see).
- Strands and Bedrock are **not required** (Strands is only listed as an example). Deployed-on-AWS (EC2, Lightsail, App Runner, S3, etc.) satisfies the rule.
- Blog on AWS Builder Center is optional (AirPods prize only). **Student verification on AWS Builder Center is required to compete** (bit.ly/abc-verify): do this tonight, it is a gate.
- Not on the page: repo/licence requirement and the exact deadline. **Someone must read https://www.wemakedevs.org/aws/rules and /aws/env/rules tonight.** My earlier "Sun 8 PM IST" came from the design doc's Luma note and is unconfirmed here.

Implication: this cuts the amount of "clever" we need. Scope is one working flow, a clear video, and a URL a stranger can use.

### 13.2 Form factor: one mobile-first website, deployed on AWS. Not a native app, not a bot-first product.

Why a website and not Telegram/WhatsApp (this reverses §4.4's channel choice, and fixes review items 3 and 6 at the same time):
- Judges only see a video and possibly click a link. Nobody on the panel will install our bot. A URL works for everyone ("would someone not on your team know what to do?").
- A browser gives **real capture and location**: `<input type="file" accept="image/*" capture="environment">` forces the camera, and `navigator.geolocation` returns coordinates **with accuracy** and a timestamp. No EXIF stripping, no fake map pins. This is better evidence than a chat bot can give.
- No enrolment cold-start problem: a QR/link opens the page; the caretaker taps "Save my building" (stored in `localStorage` + server).
- No native app: app stores, builds and review cannot fit in a day. A PWA install prompt is a free extra, not a goal.
- Telegram push is a **stretch** only for delivering the storm alert to a phone. If time is left, it is a 30-line sender; it is not on the critical path. Without it, the alert shows in the page and the video shows the phone screen.

### 13.3 The product in five screens, one URL (`/`)

| Route | User | What it does |
|---|---|---|
| `/report` | Resident or crew (phone) | Choose category → camera capture → location auto-filled with accuracy → submit → ticket ID. Wire/manhole shows static safety text first |
| `/map` | Everyone (public) | MapLibre map: hotspots, underpass watch list, drain assets coloured by score, report clusters ("Unverified/Reported"), banner when Storm Mode is on |
| `/task/:id` | Crew, then a different resident | Crew uploads before/after/bank photos (L1). A second person opens the same link → **"Confirm"** with their own photo (L2). Shows soft flags (distance, duplicate photo hash) |
| `/building` | Basement caretaker | 4 questions → level + pre-written checklist (hi/en toggle); "Save my building"; checklist banner when Storm Mode is on |
| `/ops` (password) | Operator / ward board | Toggle **"IMD warning active"** (the drill switch), see the P1 list, ward board (assets at L2+, median time to L2), `time_warp` for escalation demo |

That is the whole demo. M4 rain capture and terrain stay "if everything is green by Sat 8 PM", and the answer will usually be "no".

### 13.4 Stack for speed (revises §3: SQLite, not PostGIS)

- **Backend:** FastAPI, one process. **SQLite** file plus `shapely`/haversine for distance (under 100 assets; PostGIS is not worth the setup hour). Move to PostGIS in the post-hackathon list.
- **Frontend:** plain Vite + vanilla JS or React, MapLibre GL, OSM raster tiles. Mobile-first CSS. Static build served by FastAPI or Nginx.
- **AWS (satisfies "Built on AWS"):** one **EC2 or Lightsail** instance running `docker compose` (FastAPI + static site + Caddy for HTTPS), **S3** for photos, **Bedrock** for photo triage (with form fallback), optionally **EventBridge** for the nightly scorer. If Bedrock access is blocked, the app still runs; say "Bedrock triage" only if it is truly live.
- **Single public URL** plus a seeded demo dataset, so judges who click the link see a populated map immediately.
- All safety text stays pre-written (§4.4). The LLM does photo triage only.

### 13.5 How to keep 4 people's AI-generated code from colliding

The risk is real: four Claude sessions will each invent their own field names and helper functions. Controls, in order of importance:

1. **Contract before code (first 60-90 minutes, one person writes it, everyone reads it).** Three frozen files in the repo root:
   - `schema.sql` (tables: `assets`, `reports`, `jobs`, `evidence`, `buildings`, `alerts`, `settings`)
   - `openapi.yaml` (every endpoint, request and response, with example JSON)
   - `CLAUDE.md` (conventions + "do not edit files outside your directory" + naming rules + how to run + the banned-words list)
   Every Claude session is told to read these first. Any contract change is a PR that edits those files and pings the group.
2. **Vertical ownership by directory; no shared files.** Each person only edits their folder. Shared code (`core/`) is **pure functions with tests**, written by exactly one owner.
3. **Fixtures first.** P3 builds the frontend against `mock/` JSON generated from `openapi.yaml` examples, so the UI never waits for the backend.
4. **Tiny PRs, trunk-based, merge every ~2 hours** to `main`, deployed from `main` only. One **integrator** reviews diffs and resolves conflicts. No branch lives overnight.
5. **Fixed integration checkpoints** (see 13.7). At each one, everyone stops and runs `make demo-check` (a script that hits every endpoint with fixture data and prints green/red).
6. **Do not let Claude "improve" other people's code.** Tell each session: "Only modify files under `<your dir>`. If you need a change elsewhere, write it as a note for the owner."
7. **Seed data in git** (`data/seed.json`), so everyone sees the same assets, hotspots and demo users.

### 13.6 Roles (4 people)

| Person | Owns | Deliverables |
|---|---|---|
| **P1: Integrator / platform** | `schema.sql`, `openapi.yaml`, `CLAUDE.md`, `deploy/`, AWS (EC2, S3, Bedrock check), merges, `make demo-check` | Public URL with "hello" by hour 3; deploys every merge; student verification and /rules check; Bedrock go/no-go |
| **P2: Backend: reports, evidence, triage** | `app/api/`, `ai/triage.py` | `/report` endpoints, S3 upload, triage with fallback, clusters/trust, closure levels L0-L3, soft flags, perceptual hash |
| **P3: Frontend** | `web/` | The five screens against mocks, then real API; mobile polish; map layers; Hindi/English toggle |
| **P4: Logic, data, content, demo** | `core/` (scoring, building level, safety copy, M4 if ever), `data/`, `evidence/`, video, blog | Pure scorer with the reachability tests, hand-digitised assets (20-40) and hotspots with sources, pre-written hi/en safety copy (native-speaker check), scenario drill data, interviews, 3-minute script, README, blog |

Dependencies are one-directional: P4's `core/` has no deps and is imported by P2; P3 depends only on the OpenAPI examples.

### 13.7 Timeline (relative hours; shift to the real clock once the deadline is confirmed)

| When | Gate | Everyone |
|---|---|---|
| **H0-H1.5** | **Contract freeze** | P1 writes the three contract files; P4 starts assets/hotspots/copy in parallel; P3 scaffolds against example JSON; P2 reads contract, sets up S3/Bedrock test with P1 |
| **H1.5-H3** | **Walking skeleton live** | Public URL serves the site; `/api/health`; one fake report round-trips DB → map. Student verification done. /rules read, deadline pinned on the wall |
| **H3-H9** | Vertical slices | P2: report → ticket → triage; P3: `/report`, `/map`; P4: scorer + assets + copy |
| **H9** | **Checkpoint 1** (run `demo-check`) | Report from a phone shows up on the map on the live URL |
| **H9-H16** | Closure + building + ops | P2: task/closure L1/L2; P3: `/task`, `/building`, `/ops`; P4: scenario drill data and storm-mode logic |
| **H16** | **Checkpoint 2: full golden path works on the live URL** | If not, cut scope now, not later |
| **H16-H20** | Polish, seed data, bug bash with a stranger | Someone not on the team tries it without help. Fix what confuses them (criterion 3) |
| **H20-H22** | Record the video against the deployed site | Script from §7, adjusted below |
| **H22-H24** | Freeze, README, submit | Submit with margin. Blog only if time remains |

If the real window is shorter than this, drop in this order: Hindi toggle polish → `/ops` time-warp → ward board metrics → triage (use manual category) → clusters. **Never drop:** report → map, closure L1+L2, building checklist with pre-written copy, Storm Mode drill switch, the safety wording, the video.

### 13.8 Revised 3-minute video (judging criterion 5 + the "what it does, who it's for, where AWS fits" ask)

| Time | Beat |
|---|---|
| 0:00-0:20 | Problem: Old Rajinder Nagar, 27 Jul 2024 (58 mm, drains uncleaned, library basement, 3 deaths). One real quote from a caretaker/RWA interview |
| 0:20-0:40 | The finding: day-ahead model forecast said 3.8 mm; so we key on official IMD warnings and local readiness, not our own forecast |
| 0:40-1:15 | **Basement caretaker** (phone): scans QR, answers 4 questions, gets pre-written Hindi checklist; operator flips "IMD warning on" in `/ops`; banner appears |
| 1:15-2:00 | **Drain evidence loop** (phone + map): resident reports a real choked drain with live camera and GPS; ticket; crew L1; a second person confirms L2; one flagged duplicate photo; ward board updates |
| 2:00-2:20 | What it does not do (wires, manholes, walls are forwarded; underpass: weak) |
| 2:20-3:00 | AWS: EC2/Lightsail, S3, Bedrock (only if live); URL on screen; limits: unofficial, no outcomes until next monsoon, open source |

Roles played by teammates are labelled on screen ("played by team member").

### 13.9 Rubric mapping (so nothing is built that doesn't earn points)

| Criterion | Our answer |
|---|---|
| Idea and Impact | One narrow problem: pre-monsoon drain readiness evidence and basement preparedness in one ward. Honest about what it doesn't prevent |
| Built on AWS | Deployed on EC2/Lightsail + S3 (+ Bedrock if live); URL provided |
| Design and usability | Mobile website, one-tap flows, Hindi/English, stranger test at H16-H20 |
| Execution | One golden path that runs on the public URL; seeded data; `demo-check` |
| Demo video | 3 minutes, §13.8, recorded on the deployed stack |

### 13.10 Still open

- Read **/aws/rules** (deadline, repo and licence requirements, submission portal). Not yet read by anyone.
- Student verification on AWS Builder Center for all four (gate).
- Hindi copy checked by a native speaker; DISCOM numbers verified; DM Act s.54 not yet read.
- If any of the four can reach the pilot ward physically before the deadline, do it; otherwise the interviews and real drain photos come from wherever they are, and the video says so.

---

## 14. How to deploy on AWS (runbook, about 60-90 minutes the first time; P1 owns it)

**Why this shape:** one box, one command to redeploy, HTTPS that works. HTTPS is not optional here: browsers only allow `getUserMedia`/camera capture and `navigator.geolocation` on secure origins, and `/report` depends on both.

### 14.1 Decide once

- **Region:** `ap-south-1` (Mumbai).
- **Compute:** one **EC2 `t3.small`** (Amazon Linux 2023) with an **Elastic IP**. (Lightsail $10 instance is the same thing with fewer clicks; either satisfies "deployed on AWS".)
- **Storage:** one private **S3** bucket for photos (Block Public Access ON). SQLite file on the instance's EBS volume, copied nightly to S3.
- **HTTPS without buying a domain:** Caddy gets a Let's Encrypt cert automatically for a hostname like `13-233-10-20.sslip.io` (your Elastic IP with dashes). `sslip.io` resolves that name to the IP. Use a real domain/Route 53 later.
- **Identity:** an **IAM role on the instance** (no access keys in the repo), allowing only `s3:GetObject/PutObject` on your bucket and `bedrock:InvokeModel` (+ `bedrock:Converse` if you use it).
- **Secrets:** `/ops` password and Telegram token in **SSM Parameter Store** (SecureString) or, for today, a root-owned `.env` on the box that is in `.gitignore`.

### 14.2 Steps

1. **Account and gate.** Create the AWS account (free-tier credits; debit/RuPay accepted, small verification charge). All four: student verification on AWS Builder Center (bit.ly/abc-verify). Request the extra $25 credit form if needed.
2. **Bucket.** S3 → create bucket `rainready-<random>`; Block all public access; default encryption on. Photos are served to the app via **pre-signed URLs**, never public.
3. **Role.** IAM → role for EC2 with an inline policy scoped to that bucket ARN and Bedrock invoke. Attach as the instance profile.
4. **Instance.** Launch `t3.small`, 20 GB gp3, security group inbound: **22 from your IP only, 80 and 443 from anywhere**. Allocate and attach an **Elastic IP**.
5. **Install Docker.**
   ```bash
   sudo dnf install -y docker git
   sudo systemctl enable --now docker
   sudo usermod -aG docker ec2-user          # re-login after this
   sudo mkdir -p /usr/local/lib/docker/cli-plugins
   sudo curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
   sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
   ```
6. **Compose file (repo root).**
   ```yaml
   services:
     app:
       build: .
       env_file: .env
       volumes: ["./var:/app/var"]        # SQLite + local photo cache survive redeploys
       restart: unless-stopped
     caddy:
       image: caddy:2
       ports: ["80:80", "443:443"]
       environment: { DOMAIN: "${DOMAIN}" }
       volumes: ["./Caddyfile:/etc/caddy/Caddyfile", "caddy_data:/data"]
       depends_on: [app]
       restart: unless-stopped
   volumes: { caddy_data: {} }
   ```
   `Caddyfile`: `{$DOMAIN} { reverse_proxy app:8000 }`. `.env`: `DOMAIN=13-233-10-20.sslip.io`, `S3_BUCKET=...`, `AWS_REGION=ap-south-1`, `BEDROCK_MODEL_ID=...`, `OPS_PASSWORD=...`.
7. **Deploy loop.** `make deploy` = `ssh ec2-user@<ip> 'cd rain-ready && git pull && docker compose up -d --build'`. Deploy from `main` only. Do the first deploy of an empty "hello" app in the first 3 hours (checkpoint in §13.7).
8. **Bedrock.** Console → Bedrock → model access: enable a Claude model. **Do not guess the model ID**: list what your account has (`aws bedrock list-inference-profiles --region ap-south-1`) and put it in `.env`. Test one image with the Converse API from the instance. If it fails (quota, use-case form), flip `TRIAGE_MODE=manual` and move on; the app must still work.
9. **Smoke test** from a phone on mobile data: open the URL, take a photo on `/report`, see the pin on `/map`. Run `make demo-check` against the live URL after every merge.
10. **Backups and teardown.** Cron: copy `var/app.db` to S3 hourly. Take an AMI/snapshot before recording the video. Stop the instance after judging closes to stop charges.

### 14.3 Common ways this fails

| Symptom | Cause | Fix |
|---|---|---|
| Camera or location silently doesn't work on phone | Page served over HTTP | Use the Caddy/sslip.io HTTPS URL, never the raw IP |
| Caddy can't get a certificate | Ports 80/443 blocked, or wrong DNS name | Security group inbound; hostname must be the Elastic IP with dashes |
| Photos upload but never display | Bucket private, URL not signed | Return pre-signed URLs from the API |
| Bedrock `AccessDenied`/throttling | Model access not enabled, wrong region, new-account quota | Enable in console; test early; use manual triage fallback |
| Data vanished after redeploy | SQLite inside the container | Bind-mount `./var` as above |
| Works on one laptop, not on another's | Contract drift between sessions | `make demo-check`, frozen `openapi.yaml` |

Fallback if the AWS account itself is blocked (card, verification): run the same compose locally and show a **LocalStack/SAM** or Strands-based component, which also counts as "Build It" on the event page. Say so plainly in the submission. Deployed is stronger; do not plan on the fallback.

---

## 15. What is genuinely new, and what impact we can honestly show

You asked for concepts that are novel and show real impact. The drain-ticket idea alone is not novel (MCD 311, BBMP and Mumbai apps exist). What the research supports as new is below. Each is cheap to build in a day and each answers a documented failure.

### 15.1 Five concepts, ranked by novelty × feasibility today

| # | Concept | Why it is new | Why it matters (evidence in the design doc) | Build size |
|---|---|---|---|---|
| **1** | **Tamper-evident evidence ledger.** Every report, photo hash and closure step is appended to a hash chain; the chain head is published daily to S3 with Object Lock. Anyone can open `/verify/:id` and check an item was not altered after the fact | Civic complaint tools store rows an admin can edit. Here, history cannot be quietly rewritten, which is exactly the gap "forged weighbridge slips, phantom trips, self-reported tonnage" exposes | Court-ready: High Court action-taken reports, NGT hearings, CAG audits and RTI all hinge on records people can dispute | ~3 h |
| **2** | **Independent confirmation as the unit of progress** (L2). The metric is "assets confirmed by someone with no stake", not tonnage or "% desilted" | Shifts the measured quantity from the number agencies self-report (the doc's central diagnosis) to one the public can check | CAG: 0.98 of 8.29 lakh m³ carted (verify) vs claims up to 126% of target | Already in §4.3 |
| **3** | **Student-facing basement placard.** A QR on the door of every coaching centre/library/PG basement opens `/b/:code`: declared use, number of exits as declared, whether the checklist for the current warning was acknowledged, and the independently confirmed status of the drain in front | The Rajinder Nagar victims were students. The people at risk become verifiers, and the building's own caretaker gets a reason to act. Turns a private licensing failure into public, low-key pressure | Old Rajinder Nagar 2024: licence for parking/storage, used as library, one exit, drains blocked, ramps over drains | ~3 h |
| **4** | **Open Readiness Schema.** A published, versioned JSON/GeoJSON spec for "drain/inlet/pump/basement readiness evidence" (Open311-compatible), with an example dataset and validator | The product is a *standard*, not an app: any city, NGO or agency can emit or consume it. This is the only route to country-scale effect | No open GIS of Delhi drains exists; asset data are PDFs. Bengaluru and Chennai have open flood points to test the schema against | ~1 h for v0.1 |
| **5** | **Readiness drill days.** A ward runs a pre-monsoon "drill" the way buildings run fire drills: operator flips the drill switch, caretakers acknowledge, crews and residents confirm assets, the board shows coverage. Repeatable, and it builds the habit before real rain | The Singapore result in the doc rests on rehearsed operations, not apps. A drill needs no storm, which also fixes the "no rain to test" problem | Pump and operations failures even where hardware exists (Minto 2025, Gurugram mock drill) | Already the scenario drill |

**Build today:** 1, 2, 3 and the Open Schema (4) as a README + JSON schema file. 5 is the demo. Do not add anything else.

### 15.2 Implementation notes for the new pieces

**Evidence ledger (concept 1).**
```python
import hashlib, json

def canon(rec) -> bytes: return json.dumps(rec, sort_keys=True, separators=(",", ":")).encode()

def append(db, rec, photo_sha256=None):
    prev = db.last_hash() or "0"*64
    h = hashlib.sha256(prev.encode() + canon(rec) + (photo_sha256 or "").encode()).hexdigest()
    db.insert_ledger(prev_hash=prev, hash=h, record=rec, photo_sha256=photo_sha256, server_ts=now_utc())
    return h
```
- A nightly job writes `ledger/YYYY-MM-DD.json` (head hash + count) to an S3 bucket created **with Object Lock enabled** (retention mode "Governance" for today; "Compliance" later). Console path: create bucket → Advanced → Object Lock.
- `/verify/:id` recomputes the chain from the item to the head and shows pass/fail and the day's published head.
- **Say what it proves and what it doesn't:** records were not changed after being written. It does *not* prove a photo is true. Garbage in stays garbage; this protects against rewriting, not against a faked first entry (which L2 addresses).

**Basement placard (concept 3).** Public read-only page keyed by an unguessable code: self-declared use, exits (declared), last checklist acknowledgement date, nearest asset's confirmation level and date. **Rules (so it cannot mislead):**
- No green tick, no "safe", no rating. Banner: "Self-declared by the building. Information only. Not a safety certificate."
- Missing data shows "Not declared", not a default.
- A building can only be listed by its own caretaker or the pilot team with consent. We never publish a list of "unsafe" buildings.
- Legal exposure of naming is unassessed (§6.1); today's demo uses a consenting or fictional building.

**Open Readiness Schema (concept 4).** `schema/readiness-0.1.json` plus `README`: fields for `asset` (id, type, owner, geometry), `evidence` (hash, capture time, accuracy, level L0-L3, confirmer role), `building` (declared use, exits, acknowledgements), and `ledger` (prev/hash). Validate seeded data with `jsonschema` in `make demo-check`. Cite Open311 GeoReport v2 (listed in the design doc's sources) for report compatibility.

### 15.3 Impact: what we can claim, and how we would prove it

Do not claim lives saved or flooding reduced; no study shows that and we have no rain to test. Claim these, which are measurable:

| Claim | Metric | When measurable |
|---|---|---|
| Readiness is checkable | % of mapped assets at L2+ before the monsoon; median hours from L1 to L2 | Pilot, pre-monsoon 2027 |
| Records can be trusted | Ledger verification passes; number of disputed items resolved by the ledger | Immediately in the pilot |
| Basement occupants are informed | Placard scans per building; checklist acknowledgements per warning | Pilot |
| It is cheap | ₹ per confirmed asset (compute + staff time) vs. the ₹2.3-3.5 lakh/gauge sensor numbers in the doc | Pilot |
| It predicts nothing it can't | Calibration log: IMD warning vs. observed vs. our flags, published after each storm | Monsoon 2027 |

**Pilot design that would count as evidence (propose to a ward/RWA, not promised):** two comparable wards or colony clusters; one uses Rain-Ready from April 2027, one does not; compare L2 coverage before the first heavy rain and recorded waterlogging hours at known points (with the caveat that one season, two sites is suggestive, not proof).

### 15.4 The honest national-scale pitch

You cannot change a country with one hackathon app. A credible path is a ladder, each rung supported by something that already exists:

1. **Prove the unit of trust.** "Independently confirmed readiness" plus a tamper-evident record, in one ward, before one monsoon.
2. **Publish the standard.** The Open Readiness Schema, so other cities need not rebuild it. Bengaluru and Chennai already publish flood-point data; Delhi's drain data is in PDFs. A common format lets the cities compare.
3. **Plug into the accountability channels that already exist.** The Delhi High Court demands monthly action-taken reports and third-party audits; the NGT has RWH hearings; CAG audits and RTI exist. An export in those formats lets an agency use the data with no new workflow. (Verify the exact current court orders before quoting them.)
4. **Use existing volunteer networks as L2/L3 confirmers** such as university NSS/NCC units (they exist and are student-run; confirm eligibility and safety rules with the institutions; their involvement must follow §6.2 field-safety rules).
5. **Adoption hooks for city governments:** pre-monsoon desilting is a recurring, deadline-bound, publicly criticised process in many Indian cities (the Delhi, Mumbai and Bengaluru examples are in the design doc). A neutral evidence layer helps the engineer who did the work. (Not verified: any specific scheme or budget line; do not cite one until looked up.)

One line for judges and funders: *"Not a better complaint app. A shared, tamper-evident record of which drains and basements were actually ready before the rain, in a format any city can adopt."*

---

## 16. "Robust and foolproof": what that can honestly mean

Nothing is foolproof, and saying so in the pitch will help us. What we can do is make failures **visible, bounded and non-dangerous**.

### 16.1 Failure modes and degraded behaviour

| Failure | Behaviour |
|---|---|
| Bedrock down / quota / slow | Triage falls back to the reporter's category; ticket created; `needs_human_review` set. Nothing in the safety path depends on the LLM |
| GPS denied or inaccurate | Allow manual pin on map; mark "location unverified"; never counts toward `reports` until corroborated |
| No network at the drain | Report form saves to `localStorage` and retries on reconnect; shows "queued" status |
| Same photo reused | Perceptual hash flags it; shown to reviewer; L2 required anyway |
| Spam / abuse | Rate limit per device and IP, NCR geofence, per-user daily cap, one vote per user per cluster, captcha only if abused |
| Someone enters false storm mode | `/ops` behind a password; every toggle is written to the ledger with time and who; the unofficial footer on every message |
| Instance dies on demo day | Elastic IP + AMI snapshot to relaunch in 10 minutes; pre-recorded video is the submitted artifact anyway |
| Data wrong or stale | Every card shows `source`, `confidence`, `as_of`; stale (> 90 d) data is shown as "estimated" |
| A user acts on our message and is hurt | Message wording is non-guaranteeing; the first line points to official warnings; field rules prohibit hazardous measurement (§6.2); legal read pending |

### 16.2 Engineering guard-rails (cheap, do these)

- **Pure-function core with tests:** scoring, closure levels, building level, safety-copy selection. CI-less: `make test` before merge.
- **Banned-words test** across every user-visible string (`safe`, `guarantee`, `desilted`, `removed`, `cm deep`).
- **Least privilege:** IAM role limited to the bucket and Bedrock; private bucket, pre-signed URLs; strip EXIF GPS from any public image; ops password from env; HTTPS only.
- **Input validation** at the API (pydantic); file type and size limits; no user-provided HTML rendered.
- **Observability:** structured logs, `/api/health`, a visible "last tick" time; `docker compose logs` is enough for a day.
- **Demo hygiene:** seeded data, no live third-party calls on stage, a recorded fallback video, a stranger test.

### 16.3 What to say about limits (judges reward this; it is also true)

No outcome data until the next monsoon. Drain-state evidence can still be faked by a determined actor; the ledger only stops rewriting. Terrain is not used for verdicts. Legal reads (DM Act s.54, naming risks) are pending. The pilot depends on people who have not yet agreed.

---

## 17. Updated "build today" list (replaces the priority order in §13.7 if time is short)

1. Public HTTPS URL on AWS with seeded data (§14).
2. `/report` with camera + GPS → ticket → map.
3. Closure with L1 → L2 and the evidence **ledger + `/verify`** (concept 1).
4. `/building` checklist + **placard page** `/b/:code` (concept 3), pre-written hi/en copy.
5. `/ops` storm switch (the drill) and the ward board.
6. Open Readiness Schema v0.1 file + validator in `demo-check`.
7. Video (§13.8, add 15 s on the ledger verify and 15 s on the placard).

Cut automatically if behind: terrain, rain-capture, Strands, Telegram push, escalation ladder, time-warp.
