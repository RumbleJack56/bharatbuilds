# Rain-Ready: System Design and Research Brief

Urban waterlogging, drains, life safety and safe rainwater harvesting. Delhi/NCR first, built to generalise to other Indian cities.

Compiled 9 Oct 2026 from six Sonnet research agents: terrain and low points; drain hydraulics and silt; hotspots and harm; safe harvesting and recharge; drain operations and cleaning alerts; product, users and build scope. Together they made about 730 searches and page fetches.

Tags used throughout:
- [S] single source.
- [V] vendor, ministry or politician claim, not independently verified.
- [calc] our own arithmetic from sourced inputs.
- [inf] engineering inference, not a sourced fact.
- [NF] searched for and not found.

## 0. Bottom line

**Deadline first.** Online submissions close **Sunday 11 Oct 2026, 8:00 PM IST** (confirmed on the event's Luma page). A full week of work does not fit before the deadline. Section 10 splits the week into two parts:
- **Days 1–3 (Fri–Sun):** a submittable slice.
- **Days 4–7:** pilot hardening after submission.

**What the research says, in eight points:**

1. **People die at a few specific kinds of place, not across flooded streets.** These are underpasses (Minto Bridge 2020, Pul Prahladpur 2022, Siraspur and Okhla 2024), basements (Old Rajinder Nagar, 27 Jul 2024: 3 students; Jaipur 2024: 3), live wires in waterlogged streets (several Delhi cases in 2024–25; 3 of 8 deaths in Gurugram on 9–10 Jul 2025), open manholes, and wall collapses (Jaitpur, Aug 2025: 7 dead). A system that only maps flood depth misses most of these deaths.
2. **Most waterlogging is an operations failure layered on low capacity.** The specific failures:
   - Legacy drains carry about 25 mm/h, while a 2-year design storm in Delhi is about 80 mm/h, so the drains are overtopped often even when clean [calc].
   - 30 cm of silt cuts a typical drain's capacity by about a third [calc].
   - Inlets choke with first-flush debris.
   - Pumps at underpasses fail or are not staffed (Minto Bridge, May 2025).
   - The Yamuna backs up into drains above 206.04 m at Old Railway Bridge.
   - Gradients are reversed in three basins.
   - 71 of the 2025 hotspots had no clear owning agency.
3. **Desilting is self-reported, late and often fake.** In 2025 PWD stood at 60% on 16 June against a 31 May target. CAG found that only 0.98 of 8.29 lakh m³ of excavated silt was actually carted away. Mumbai has had forged weighbridge slips and phantom truck trips. **Verified cleaning is the single biggest gap software can close.**
4. **Free 30 m elevation data cannot find street-level low points in flat Delhi.** Relative vertical error is about 2 m, comparable to the total relief over a kilometre of street. Use the elevation model to see where water drains at catchment scale. Find the deadly low points from an underpass inventory, the hotspot lists and photo reports.
5. **Harvesting has a paradox.** The places that flood often sit on a shallow water table (North, North-West, Central, the Yamuna floodplain), where recharge is prohibited (CGWA: not where water is shallower than 5 m) or contaminates the aquifer. Recharge belongs where the water table is deeper than 8 m (South, South-West, the ridge). At hotspots, the answer is usually **detain and reuse, not recharge**.
6. **Harvesting helps locally, not citywide.** A 100 mm storm over Delhi produces about 74 million m³ of runoff [calc], while the city's entire park recharge potential is about 12.8 million m³ a year (CSE). Plot-scale harvesting cuts nuisance waterlogging on that plot and its lane. It does not stop a cloudburst.
7. **Software cannot pump water or close an underpass.** It can do three things:
   - make sure drains, inlets, pumps and pits work before the rain;
   - put the right checklist in front of the right person 24 hours ahead;
   - verify that each action happened.

   That is where the gaps are. NYC, Singapore, Jakarta and Mumbai all show sensors and apps helping only when someone is assigned to act on them.
8. **Use the channels Delhi already has; don't compete with them.** PWD runs a WhatsApp chatbot (8130188222), a 1908 helpline, 179 CCTV cameras on 45 hotspots and 754 permanent pumps at 167 locations; MCD has its 311 app. Bengaluru's dedicated flood apps got about 10,000 downloads in five years. **Build a WhatsApp/Telegram-first layer that produces evidence and forwards it to official channels, not another app.**

**What Rain-Ready is.** A pre-monsoon and storm-day operating system for one ward or neighbourhood at a time, with five modules:

| Module | Answers | Main user | Output |
|---|---|---|---|
| M1 Water Map | Where does water go and pond here, and what floods first? | RWA, ward engineer | Ranked low points and underpasses with catchment, spill order, risk class per storm |
| M2 Drain Health | Which drain or inlet will fail next storm, and was it really cleaned? | Ward JE, sanitation inspector, RWA | Prioritised cleaning alerts (P1/P2), verified closure with photo evidence, public ward board |
| M3 Storm Mode | What must each person do in the next 24 hours to stop deaths? | Basement and building caretakers, pump operators, RWA, commuters | Timed checklists, underpass avoid-list, hazard routing (live wires, open manholes) |
| M4 Rain Capture | Where and how can this plot store or recharge rain safely? | RWA, building owner, school | Go/no-go decision, structure type and size, safety rules, maintenance clock |
| M5 Report Bot | What is happening on the ground right now? | Anyone | Photo + location → AI triage → evidence record → forwarded to the right agency |

## 1. How waterlogging actually happens

Each stage below can fail, and each failure leaves a different signal in data. Every module is designed around this chain.

| Stage | What goes wrong | Evidence | What reveals it | Module |
|---|---|---|---|---|
| Rain | Intensity exceeds design | Legacy design about 25 mm/h; IIT Delhi 2018 used 79.5 mm/h (2-yr) and 95.8 mm/h (5-yr); 228 mm fell in 24 h on 28 Jun 2024 | Hourly forecast and gauge data vs drain capacity | M1, M3 |
| Runoff | Paved ground sends 70–95% of rain to the street | CPHEEO runoff coefficients: paved 0.85–0.95, dense residential 0.65–0.80 | Land use, building footprints | M1, M4 |
| Inlet / gully | Grates choke with first-flush debris; CPHEEO checks inlets at 50% clogging | 5% of 300 Amsterdam gully pots silted to blockage [S]; NDMC alone has 7,888 bell-mouths | Photo reports, inspection age | M2, M5 |
| Drain | Silt, garbage, encroachment, covered drains, culvert chokes, wrong gradients | 30 cm silt cuts about 32% of capacity [calc]; Delhi Gate drain covered for 40 years gave up 21,000+ t of silt [S]; IIT Delhi found reversed inverts | Silt-gauge photos, age since verified clean, proxies | M2 |
| Outfall | River backs up into drains | Back-flow into Najafgarh drain at Yamuna 206.04 m (Old Railway Bridge); danger mark 204.83 m | River gauge | M2 (mode switch), M3 |
| Pumps | Pump fails, isn't switched on, or isn't staffed | Minto Bridge, May 2025 (staff did not reach); Gurugram mock drill found dead pumps; BMC fined operators ₹10 lakh each | Pump check-ins, crowd reports | M3 |
| Terrain | Water collects in a natural or engineered pit | Rajinder Nagar sits in a "saucer"; underpasses are bowls | Elevation model plus underpass inventory | M1 |
| Ownership | Nobody owns the point | 71 of 410–445 points in 2025 had disputed or unclear owners | Asset-owner field per point | M2 |

**One example covers the whole chain.** On 27 July 2024 in Old Rajinder Nagar, "moderate" rain (58 mm that evening, per CBI) fell on a road that is a local depression. Owners had built ramps over the stormwater drains. The drains had not been desilted for five years and were encroached. A basement licensed only for parking and storage was being used as a library with one exit. Three students drowned. Rain, terrain, drain, ownership and building misuse all failed together. No single-signal tool would have caught it.

## 2. Where water aggregates: finding low points (M1)

### 2.1 What the data can and cannot do

| Dataset | Resolution and type | Accuracy evidence | Licence |
|---|---|---|---|
| Copernicus GLO-30 (on AWS Open Data, `copernicus-dem-30m`) | 30 m surface model (includes buildings and trees) | Spec 4 m absolute, 2 m relative (90%); Kolkata vs ICESat-2 RMSE 3.07 m [S] | Free, attribution |
| FABDEM | 30 m, buildings and trees removed by ML | Urban MAE 1.12 m vs 1.61 m for Copernicus; Kolkata RMSE 1.41 m [S] | CC BY-NC-SA, non-commercial only |
| ALOS AW3D30, NASADEM, CartoDEM | 30 m | Kolkata RMSE 3.4–4.8 m [S] | Free |
| Open LiDAR / high-resolution DEM for Delhi | — | [NF]. Survey of India data is government-to-government only. A 0.5 m DEM of New Delhi exists in research but is not open | — |

**Implication.** Delhi is very flat. A 2 m relative error swamps the 0.1–1 m depth of real ponding. Studies show depression-finding becomes unstable above about 2 m resolution (Guangzhou). Even a 1.6 m grid was judged doubtful for roads (Danish Blue Spot work).

From 30 m data, Rain-Ready can say:
- which way water drains at catchment scale;
- where large depressions are (ponds, old quarries, floodplain pockets);
- the spill order between them;
- a prior for ranking areas.

It cannot say how deep a particular street will flood.

### 2.2 Three layers, fused into risk classes

1. **Terrain layer (catchment scale).** Depression filling, flow routing and a fill-and-spill network on the elevation model, with buildings and roads burned in.
2. **Engineered low points (where people die).** Underpasses, subways and rail underbridges.
   - OpenStreetMap tags `tunnel=yes` and `layer=-1` find some, but many Delhi underpasses are tagged only as the bridge above, so coverage is unverified.
   - Add a hand-built list from PWD and news hotspot reports, and mark basements registered by their owners.
3. **Observed truth.**
   - OpenCity's "Delhi 2 Year Flood Points" KML (public domain, Oct 2024; its meaning is not documented).
   - Hotspot lists in news and PWD notices: 308 in 2023, 194 in 2024, 445 or 410 listed in 2025, 169 recorded in 2025. These counts don't reconcile and probably measure different things.
   - Citizen photo reports from M5.

Output **risk classes** (Low / Elevated / High / Known hotspot), never centimetre depths.

### 2.3 Method choice

| Method | Use it? | Why |
|---|---|---|
| Priority-Flood depression filling (Wang–Liu, Barnes) | Yes | O(n log n), robust. Fill depth (filled minus original) = depression depth |
| Fill-spill-merge depression hierarchy (Barnes et al. 2021) | Yes, core | Routes runoff into depressions that fill and spill into neighbours; orders of magnitude faster than iterative methods; gives spill order |
| Danish "Blue Spot" screening; `malstroem` (open source) | Yes, as a reference | Off-the-shelf chain: fill → depths → D8 → accumulation → blue spots → watersheds → pour points → rain fill %. Thresholds: ≥10 m³ volume; catchments for >100 m³ and >1 ha upstream |
| D8 flow direction on a road-burned grid | Yes | Kerbs channel flow; D-infinity and MFD smear flow through buildings |
| TWI / HAND | Baseline only | In flat terrain TWI showed no pattern around observed flood points (Guangzhou); HAND needs a drain network invisible at 30 m |
| 2D shallow-water models (LISFLOOD-FP, RIM2D) | Later, on GPU | Needs LiDAR-grade data; RIM2D Berlin 892 km² at 5 m took 34 min on 8 A100s |

Runtime: filling and D8 on 50 km² at 10 m (about 0.5 million cells) takes seconds. At 1 m (50 million cells) it is about 1–2 minutes on a laptop [calc from pysheds benchmarks]. That fits in Lambda (10 GB memory, 15 minutes).

### 2.4 Pipeline (one run per tile of about 7×7 km, with a 500 m buffer)

1. **Fetch.** Copernicus GLO-30 tiles (FABDEM if non-commercial use is acceptable). OSM roads, tunnels, bridges, culverts and waterways. Overture building footprints (GeoParquet on S3, filtered with DuckDB).
2. **Resample** to 10 m, for alignment only. This adds no information.
3. **Burn in features.**
   - Buildings: raise as obstacles if using bare-earth FABDEM; mask them with Copernicus.
   - Roads: lower by 0.10–0.15 m [inf].
   - Culverts and bridges over drains: carve through.
   - Underpasses: stamp in an assumed 3–5 m depth until measured values replace it.
   - Mask known water bodies (Delhi water-body census map on OpenCity).
4. **Fill** with Priority-Flood. Depression depth = filled − original. Label connected depressions.
5. **Filter** depressions by volume (≥10 m³) and catchment (>1 ha). At 30 m, use depth for ranking only.
6. **Route.** Fill with epsilon, then D8 direction and accumulation, then the local catchment and pour point of each depression.
7. **Build the spill graph**: depression → the depression it spills into. Store a level–volume curve V(h) for each.
8. **Rain input.** Effective rain = max(0, P − D·T) × C, where:
   - D is drain capacity as a rate: run 12, 25 and 50 mm/h scenarios. The UK Environment Agency uses 12 mm/h nationally and finds ±3 mm/h rarely changes maps.
   - C is the runoff coefficient, 0.7–0.9 in built-up areas.
9. **Fill and spill** from upstream to downstream. Inflow fills V(h); the excess spills downstream; merge nodes when both are full.
10. **Outputs:**
    - (a) ranked low points with volume, catchment, time to fill and underpass flag;
    - (b) flow paths;
    - (c) spill order;
    - (d) risk class per storm scenario.
11. **Validate** against the observed hotspot layer (section 2.5).
12. **Feed back from M2.** Per catchment, lower D where drains are verified silted or inlets choked. Static terrain cannot see blockage, and blockage is the main cause at many hotspots.

### 2.5 Validation (and how to report it honestly)

- **Metrics:**
  - share of known hotspots within 100–200 m of a top-k depression, compared with random placement and with a lowest-elevation or TWI baseline;
  - precision and recall at top-k;
  - share of the area flagged.
- **Calibration:** calibrate D and the filters on half the points and test on the other half.
- **Out-of-city test sets:** Bengaluru BBMP flood-prone points and Chennai 2015 crowdsourced points (both on OpenCity).
- **Expect a modest hit rate at 30 m and publish it.** Judges will trust a measured 40% more than a claimed 95%.

## 3. Drains: why they overflow and where silt collects (M2)

### 3.1 Capacity physics and parameters

| Item | Formula / value | Source |
|---|---|---|
| Peak runoff | Q = C·i·A / 360 (Q m³/s, i mm/h, A ha); valid up to about 200 ha with sub-catchments | CPHEEO 2019 via InfraLens [S] |
| Runoff coefficient C | Roof/paved 0.85–0.95; dense residential 0.65–0.80; medium 0.40–0.60; open 0.10–0.30 | same [S] |
| Delhi design rain | Legacy about 25 mm/h. IIT Delhi 2018: 79.52 mm/h (2-yr), 95.84 mm/h (5-yr). Safdarjung 5-yr 15-min ≈ 112 mm/h. New master plan targets 65–70 mm by 2029–30 | CAG via press; DDA appendix; CPHEEO |
| Time of concentration | Kirpich tc(min) = 0.0195·L^0.77·S^−0.385 (L in m), minimum 5 min | CPHEEO summary [S] |
| Capacity | Manning Q = (1/n)·A·R^(2/3)·S^(1/2); n = 0.015 design RCC/brick, 0.025 earth, ≥0.018 debris-laden | CPHEEO summary [S] |
| Self-cleansing | ≥0.6 m/s at design flow (CPHEEO); storm 0.75–0.9 m/s (BS 8005, ASCE); better, shear τ = γRS ≥ 3–4 N/m² | review [S] |
| Freeboard | max(0.30 m, 30% of depth) | CPHEEO summary [S] |
| Inlet check | Capacity at 50% clogging | CPHEEO summary [S] |

**Worked example [calc].** A 100 ha catchment at C = 0.75 produces 5.2 m³/s at 25 mm/h and 16.6 m³/s at 79.5 mm/h. A drain built for 25 mm/h is overtopped by a 2-year storm even when perfectly clean.

### 3.2 How much silt costs [calc, Manning, n = 0.015]

| Section | Silt depth | Capacity lost |
|---|---|---|
| Rectangular drain, 2.0 m wide, design depth 1.2 m, slope 0.002 | 10 cm | 11% |
| same | 20 cm | 21% |
| same | 30 cm | 32% |
| same | 50 cm | 52% |
| same, roughness raised to 0.018 (debris) | 30 cm | 43% |
| 900 mm pipe, slope 0.001 | 10% / 20% / 30% of diameter | 8% / 20% / 35% |

**Rule of thumb:** capacity lost is about 1.1–1.3 × (silt depth ÷ design depth). Velocity drops only 5–15%, so **a silted drain still looks like it is flowing while it has lost a third of its capacity.** Thirty centimetres of silt turns a 25 mm/h drain into roughly a 17 mm/h drain.

### 3.3 Where silt and garbage collect

- **Flat reaches and backwater zones.** Delhi's Model Town drain (1976 plan). Guwahati's Bharalu: the drain passes a velocity check but silts because river backwater drops velocity to near zero at peak flow. **A velocity check does not predict siltation; model backwater and bottlenecks.**
- **Upstream of culverts, bridges, bends and junctions.** Daryai Nallah below the railway bridge; Drain 14 at Mathura Road "heavily choked"; plastic and cloth under bridges in Bengaluru.
- **Between manholes in covered drains.** Workers rarely go more than 5 m from a manhole spaced 50–100 m apart, leaving "silt dunes" (Mumbai) [S]. Covered drains harden silt (IIT Delhi).
- **Near dumping points with no garbage collection point.** The Nasirpur and Asola drains are named in the 2025 master plan.
- **Sources.** Road dust, construction debris, solid waste, sewage solids (about half of Delhi is unsewered), and silt from treatment plants.
- **Re-silting is fast.** Mumbai drains declared clean on 31 May were full of floating garbage by 30 June. Silt left on banks washes back in. In Amsterdam, gully pots become blockage-prone about 100 days after cleaning [S].

### 3.4 Silt build-up model (a prior, to replace with local data)

depth(t) = D_eq × (1 − e^(−t/τ)), with τ ≈ 60–90 days, starting from the last **verified** clean.

Raise the risk for:
- low slope or backwater exposure;
- a covered drain;
- an upstream market, construction site or garbage point;
- unsewered colonies upstream;
- a previous waterlogging record.

These weights are untested and must be editable.

**Overflow flag per segment:** ratio = Q_demand(i at tc) ÷ (Q_capacity with current silt × inlet factor). Flag when the ratio exceeds 1. **Backwater mode:** when the Yamuna is above 206.04 m, mark outfall-limited drains "pump problem, not a cleaning problem".

### 3.5 Measuring drains cheaply

| Method | What it gives | Cost and reliability |
|---|---|---|
| Photo with a painted gauge rod at a manhole or open drain | Silt depth, blockage, before/after evidence | Near zero. No validated Indian protocol [NF]; require a reference object and geotag |
| Computer vision on photos | Clear vs blocked triage | About 0.85 accuracy on binary culvert images; about 54% on graded sewer video. Use for triage only, never for grading |
| Ultrasonic / LiDAR level sensors | Water level, not silt | Mumbai about ₹2.3 lakh per gauge with 3-yr maintenance; LiDAR pilot ₹3–3.5 lakh. DIY ESP32 + JSN-SR04T ₹800–3,000 [V] |
| "Indicator" sensors | One downstream gully tracked at least 26 upstream gullies (Suffolk trial) | Silt sensors were unreliable; 8% of level sensors failed in 6 months. **Sample with sensors; don't blanket** |

### 3.6 Delhi's drain data, honestly

- **No open GIS of Delhi drains exists** [NF].
- I&FC publishes PDFs listing 77 major drains (382 km) with chainage ranges and silt estimates, but no geometry or cross-sections.
- IIT Delhi's 2018 invert data contains reversed and zero inverts.
- OSM `waterway=drain` coverage in Delhi has not been measured.
- Official network length varies by definition: 3,700 km of major drains, about 11,000 km (Haskoning), or 18,958 km across 8 agencies.
- **For the pilot ward, digitise the drain and inlet layer by hand** from satellite imagery, a street walk and the I&FC lists. About 20–40 segments and inlets is enough.

## 4. Hotspots and harm: who dies, where, and what worked

### 4.1 Hotspot typology and how to detect each type

| Type | Examples | Detect from data |
|---|---|---|
| Underpasses, rail underbridges, tunnels | Minto Bridge, Pul Prahladpur (5–6 ft standing water), Zakhira, Pragati Maidan tunnel, Siraspur, Okhla | OSM tunnel/layer tags; hotspot lists; pump and CCTV presence; depth vs approach roads |
| Basements | Old Rajinder Nagar 2024; Jaipur 2024; Bengaluru 2025 | Owner self-registration; entrance below road crown; inside a terrain depression; MCD sealing and misuse lists |
| Natural depressions, low-lying colonies | Narsinghpur and Hero Honda Chowk (Gurugram); Rajinder Nagar "saucer" | Elevation-model depressions and spill graph |
| Roads lower than adjoining plots | Plot owners raise plinths and build ramps over drains | Road vs parcel elevation; photo reports of ramps over drains |
| Near outfalls / backflow | I&FC gates closed when the Yamuna rises | Outfall locations plus river gauge |
| Choked or silted drains | Najafgarh drain only 43.95% desilted in May 2025 | M2 condition data |
| Encroached or covered drains | 58 drains reported "missing" to NGT; Bengaluru drains narrowed from 60 m to 28.5 m | Satellite change detection; field photos |
| Ownership gaps | 71 disputed points in 2025 | Owner field empty or contested |

### 4.2 How people die

| Mechanism | Documented cases | What prevents it |
|---|---|---|
| Driving or walking into a flooded underpass | Minto Bridge 19 Jul 2020 (56-yr-old, Tata Ace); Pul Prahladpur 31 May 2022; two boys at Siraspur and a 60-yr-old at Okhla (28–29 Jun 2024, 11 deaths in Delhi in two days); KR Circle, Bengaluru 2023 | Close before water rises; pump working; depth marker; avoid-list |
| Basement flooding | Old Rajinder Nagar 27 Jul 2024 (3); Jaipur 1 Aug 2024 (3); NYC Hurricane Ida: 11 of 13 deaths in basements | No occupancy during heavy rain; clear drains in front; second exit; flood barrier; owner warned 24 h ahead |
| Electrocution in waterlogged streets | NE Delhi Jul 2024; Rohini Aug 2024; Kirti Nagar Aug 2025; Gurugram 9–10 Jul 2025 (3 of 8 deaths: submerged wire, pole, electrified railing) | DISCOM isolation of flagged poles and feeders; public warnings; hazard reports routed to the DISCOM |
| Open or hidden manholes | Gurugram Jul 2025 (1); Mumbai cases | Report and cover before rain; marking |
| Wall and house collapse | Jaitpur 9 Aug 2025 (7); Vasant Vihar Jun 2024 (3 labourers) | Flag compromised walls near standing water |

### 4.3 What has worked, and what that means for software

- **Singapore.** Flood-prone area fell from 3,200 ha (1970s) to under 30 ha, through capital works, building platform-level rules, over 1,000 water-level sensors and over 500 CCTV cameras, Telegram alerts, about 16,000 flood barriers distributed, and a 2024 law requiring owners to maintain protection. In January 2025, 255 mm of rain over two days caused one flood incident (0.3 m, about 3 hours).
- **Minto Bridge** flooded in May 2025 because staff did not arrive. After a new 1,000 mm drain and SCADA pump alerts, it stayed open through more than 100 mm of rain in July 2026 [V].
- **Operations fail even when the hardware exists.** BMC fined four pump operators ₹10 lakh each in May 2025 for not running at capacity. A Gurugram mock drill found dead underpass pumps. Mumbai's holding tanks at Hindmata and Milan Subway "did little" in June 2022 [S].
- **The Hong Kong underpass warning design is a good template.** It detects incoming power failure, pump failure, high water in the pump pit and high water in the barrel, uses a 4–6 minute delay to filter splashes, has 6 hours of battery backup and targets 99% reliability.
- **Gates without enforcement fail.** Houston drivers drove round or crashed into an automatic gate.
- **Conclusion.** No source shows software alone reducing flooding. Software raises the odds that existing pumps, drains and people are ready and act. That is M2 and M3's job.

## 5. Rain capture: where and how to harvest safely (M4)

### 5.1 The paradox and the depth map

- Where water is shallow (May 2022, CGWB):
  - 16% of NCT (244 km²) has groundwater 0–5 m below ground;
  - 67% has it at 5–20 m;
  - 17% at 20–66 m.
- Shallow zones are the Yamuna floodplain and parts of the North-West and West. The deep zones are the ridge and the South, South-West and New Delhi.
- Waterlogged low points often sit in shallow zones. There, a recharge pit adds no capacity, because the ground is already saturated. It also opens a contamination path, because the polluted runoff reaches the aquifer quickly.
- **Rain-Ready must be able to say "store and reuse here; do not recharge".**

### 5.2 Decision rules the software encodes

These are thresholds from official sources, set to the strictest where sources conflict. A hydrogeologist should review them before they gate real decisions.

| # | Rule | Source |
|---|---|---|
| 1 | Post-monsoon water level < 3 m → no recharge; detention only | CGWB Master Plan 2020 |
| 2 | Water level < 5 m (shallower of pre/post-monsoon) → no recharge structure; storage for non-potable use only | CGWA/MoJS advisory, Mar 2023 |
| 3 | 5–8 m → shallow pit or trench only, roof water only, no injection bore; flag conflicting standards | CGWA + IS 15797 (8 m) [inf] |
| 4 | ≥ 8 m → pits, trenches and shafts allowed | IS 15797:2008 |
| 5 | > 15 m → add a recharge bore; a shaft without injection is limited to about 15 m | CGWB manual |
| 6 | Bore bottom ≥ 5 m above the post-monsoon water level; never into the water table | NGT 2019; CGWA |
| 7 | Measured infiltration halved for clogging gives drain-down > 48 h → no pit; use tank, bore or slow-release detention | [inf]; IS 15792 asks > 36 mm/h [S] |
| 8 | In the Yamuna floodplain or another flood-prone polygon → no recharge structure | CGWA |
| 9 | Within setback of sewer or septic tank (default 10 m), foundation (5–10 m), another pit (3 m), or "away from storm drains" → reject | CGWA; IS 15792 [S]; Railways circular |
| 10 | Catchment includes vehicular paving, parking, balconies, wash areas or drains → never into bores; only treated soil infiltration where rule 4 holds | CGWA; NGT 2019; DJB 2024 findings |
| 11 | Roof catchment → first-flush diverter (≥ 2 mm) plus desilting chamber required | IS 15792 [S] |
| 12 | Local EC > 3,000 µS/cm, or in Narela, Alipur, Najafgarh or Kalkaji no-fresh-water pockets, or uranium > 30 ppb → label "quantity benefit only"; require a quality piezometer | CGWB yearbooks; 2025 quality report via NGT |
| 13 | Design capture 25 mm in 30 min; drain-down ≤ 24 h target, 48 h hard limit; every structure needs an overflow path | [inf]; verify against IMD isopluvials |
| 14 | Inspect pre-monsoon, after the first heavy storm, and post-monsoon; certificate every 2 years; alert if no inspection in 12 months or drain-down > 48 h | DJB scheme; ORF; CGWA |
| 15 | Large sites need a piezometer for level and quality | CGWA; NGT 2019 |

### 5.3 Structures and sizing

| Structure | Typical design | Rate / capacity | Cost (sourced only) |
|---|---|---|---|
| Roof → covered storage tank | Desilting chamber, first-flush diverter, mesh, covered tank | Roof yield (below) | Bengaluru complex ₹8–10 lakh excluding sump (2023) |
| Recharge pit | 1×1×2 m (≤100 m² roof) up to 1.5×2×3 m (200–300 m²); boulder, gravel and coarse sand layers, 30–40% voids [V] | Set by a soil test | ₹500–5,000 small domestic [S]; whole-plot RWH ₹1.7 lakh plus ₹12–15k/yr upkeep (Gurugram) |
| Recharge shaft | 0.5–3 m diameter, 10–15 m deep, inverted filter | 7–14 L/s for 2–3 m diameter; about 15 L/s with injection well (CGWB manual) | CGWB demonstration average about ₹6 lakh per structure (2007–16 prices) |
| Recharge well / bore | 150 mm bore, slotted casing, ≥ 5 m above post-monsoon level | Delhi rate [NF] | Defence Colony: 19 wells for ₹2.58 lakh (2003) |
| Park percolation | Recharge structures cover 1.5–3% of park area | CSE: 16,000 parks, about 12,800 ML/yr potential | [NF] |
| Road-level silt trap + recharge | Baffle-wall silt trap, then recharge wells (Defence Colony) | — | [NF] |

**Worked sizing [calc]** (design storm 25 mm; annual rain about 775 mm):
- **100 m² RCC roof.** 2.1 m³ per storm. A 1.5×1.5×2.5 m pit holds about 2.0 m³ in its voids.
  - Drain-down about 17 h on sandy loam: passes.
  - About 41 h on loam: marginal.
  - Over 80 h on clay loam: fails; use a tank or a bore.
  - Annual capture about 55–60 m³.
- **2-ha society.** 25 mm yields 106 m³ from roofs, 120 m³ from roads and 56 m³ from turf. Send only roof water to recharge (about 95 m³ storage plus two shafts). Send road water to a treated drain. Annual roof capture about 3,300 m³.
- **1 km road, 12 m paved.** 240 m³ per storm. A gravel trench along it stores about 250 m³. On typical Delhi soil it drains down over about 80 h, so it acts as slow-release detention, not recharge, unless the soil is sandy or shafts are added.

### 5.4 Safety, failure and evidence of effect

- **Contamination is real in Delhi.** In Dwarka in 2023, 180 of 235 RWH samples were contaminated (ammonia, TDS), and roof water was mixed with parking and wash water. DJB's 2024 tests found paved or parking runoff connected at 34 of 39 societies. Five-state checks found nitrate rises in Jaipur and coliform in a Bengaluru recharge well.
- **Maintenance decay is the norm.**
  - Delhi 2003–07: 97 of 108 subsidised systems filed no maintenance reports, and all 7 inspected were silted.
  - Gurugram 2023: about 70% of 500 pits were defunct, some converted into sewage pits.
  - Delhi 2026: DJB is restoring about 1,000 non-functional structures in government buildings.
- **Test, don't trust.** Use a falling-head or drain-down test: pre-soak, fill, time the drop. The pass mark is drain-down within 24 h.
- **Groundwater effect is documented in pilots.**
  - CGWB Delhi pilots raised levels by 0.12–2.55 m (Lodhi Garden, President's Estate, IIT, JNU check dams).
  - MES Palam: a 1.16 m/yr fall became a 0.11 m/yr rise.
  - **No measured waterlogging reduction from RWH was found.**
- **Other hazards.** Cover every pit with a load-rated slab (drowning). Use 1 mm mesh and drain-down ≤ 48 h (mosquitoes). Keep basements at least basement depth + 3 m away [inf].

### 5.5 Turning the problem into a resource, honestly

The documented cases are plans, not measured outcomes:
- the master plan's lakes and wetlands and 11 groundwater zones;
- the LG's order to reuse 5 lakh litres held in pipelines at the WHO stretch for greening.

The credible actions are:
- **At hotspots in shallow zones:** detain, then reuse for flushing, gardens or road washing, and release slowly after the storm.
- **In deep zones:** recharge roof water through tested, maintained pits and shafts.
- **In parks:** percolation sized to 1.5–3% of area.
- **Everywhere:** keep the existing structures working (most of the "lost" capacity is maintenance).

## 6. Drain management and cleaning alerts (M2)

### 6.1 Current practice and failure

- **Cycle.** Pre-monsoon desilting has a 31 May or 15 June deadline that keeps slipping: PWD stood at 60% on 16 June 2025 (1,294 of 2,140 km), and the deadline moved to 30 June. MCD splits desilting into two phases. In 2025 the city was split into 35 zones, contractors had 24 h to remove silt, and payment was to depend on drains staying unblocked.
- **Verification is weak.**
  - Agencies report their own tonnage; claims run as high as 126% of target.
  - CAG: 8.29 lakh m³ excavated vs 0.98 lakh m³ carted away.
  - Delhi High Court orders note silt is left on roadsides and require third-party audits and monthly action-taken reports. No published audit was found.
  - Silt needs 1–2 weeks to dry before transport, a real constraint that makes it easy to game.
- **Mumbai fraud patterns:** fake trip records and forged weighbridge slips, debris dumped and then "lifted" as silt, phantom work. The controls added were weight-based payment, GPS on trucks, CCTV, mandatory photo upload and squads. **Each control was bypassed until a person was assigned to watch the data.**

### 6.2 What works elsewhere

- **US practice.** Clean a sump when it is over 50% full. If it is over half full at two consecutive inspections, raise the inspection frequency. About 85% of 54 surveyed jurisdictions base cleaning on inspection data.
- **UK silt surveys show most cleaning is wasted.** In Kent, half of 21,639 gullies had under 20% silt and only 4% had over 71%, so most gullies are over-cleaned and a few under-cleaned. Lincolnshire uses a risk-based cycle.
- **Sensors.** The Suffolk trial found silt sensors unreliable. A water-depth sensor costs about £550 per sensor-year against about £6 per inspect-and-clean, so use inspections plus a few indicator sensors.
- **Singapore** inspects drains about every 5 years and is moving to AI video inspection. A Quick Response Team clears blockages before the monsoon.

### 6.3 Alert logic (a transparent score a ward engineer can read and dispute)

Vulnerability V (0–1), recomputed daily per drain segment or inlet cluster:

```
V = 0.25*Silt + 0.20*Age + 0.20*History + 0.15*Reports + 0.10*Sources + 0.10*Consequence
Silt        = min(1, silt_fill / 0.50)       # verified gauge-rod photo; >90 d old = "unmeasured"
Age         = min(1, days_since_verified_clean / cycle)  # cycle 120 d hotspots, 365 d else
History     = 1.0 on hotspot list; 0.6 if verified standing water last monsoon; else 0
Reports     = min(1, weighted reports within 50 m, last 14 d / 3)  # deduped, trust-weighted
Sources     = 1 market/garbage/construction within 100 m; 0.5 within 250 m; else 0
Consequence = 1 underpass/hospital/basements/arterial low point; 0.5 collector; 0.2 other
```

Rain factor and priority:

```
Rf = min(1, max(P24 / 64.5, I1h / 25))   # 64.5 mm/24h = IMD "heavy rain"; 25 mm/h = legacy capacity
Priority = V * (0.4 + 0.6 * Rf)          # multiplicative: a clean drain never alerts on rain alone
```

| Tier | Condition | Action |
|---|---|---|
| P1 pre-rain clean | Priority ≥ 0.60, forecast lead 12–72 h, Rf ≥ 0.3 | Ticket to JE/SI and contractor; crew within 24 h; verified closure before rain |
| P2 inspection | V ≥ 0.75 in any weather, or Silt = 1 | Inspection within 7 days |
| Watchlist | 0.45 ≤ V < 0.75 | Weekly digest only |
| Live incident | Standing water ≥ 2 h after rain falls below 5 mm/h | JE + pump team; ≥ 6 h escalate to EE |
| Outfall-limited | Yamuna above (206.04 m − margin) | Suppress cleaning dispatch for those drains; notify pump operations and flood cell |

All weights are starting hypotheses. Log predicted vs actual waterlogging after each storm and refit.

### 6.4 Verified closure (the anti-fraud core)

A job closes only with all of the following:
- before and after photos within about 20 m of the asset, with the gauge rod in frame;
- server-side timestamp, EXIF check and duplicate-image hash check;
- an after photo that covers **5 m either side of the drain**, because silt left on the bank is the most documented Delhi fraud;
- for silt removal, a weighbridge slip or truck GPS trace for the disposal leg; without it, the job is marked "partial";
- a random 10–15% re-photographed by a different person (RWA volunteer, student auditor or inspector).

A disputed job reopens, and reopens count against the contractor and the ward. The public board shows verified closure time and reopen rate, never raw tonnage (tonnage is the gamed number). Show wards and agencies only, never named officers.

### 6.5 Escalation and channels

- **Route by asset owner, not geography.** Include a "wrong owner" button that reroutes and logs the change, since ownership confusion is a core failure.
- **Ladder:**
  - T+0: JE/SI and contractor.
  - T+6 h in rain (T+24 h dry): AE.
  - T+24/48 h: EE and the contractor firm.
  - T+72 h: zonal head.
  - After 7 days: public "overdue" entry, plus inclusion in the monthly action-taken report export.
- **SLAs:**
  - Acknowledge within 1 h in rain windows.
  - P1 on site within 24 h; closure photo within 48 h.
  - P2 within 7 days.
  - Benchmarks: MCD says 1–2 days for 311 waterlogging complaints [S]; NYC averages 3–7 days; BMC's real average was 46–48 days.
- **Alert fatigue:** three tiers only; at most 5 pushes per person per day, with the rest going to the digest; no alert without a named action and deadline.
- **Channels:** WhatsApp for engineers; Telegram for the public; email for the audit trail. **No SMS.** India needs DLT registration, which takes 2–4 weeks.
- **Legal hooks:**
  - Export in the format of the monthly action-taken reports the High Court already demands.
  - Export an RTI-ready pack (job IDs, quantities, photo hashes).
  - NGT's next RWH hearing is 27 Oct 2026.

### 6.6 Data model (Open311-shaped API, PostGIS/GeoJSON)

- agency
- drain_segment: geometry, type, depth, width, owner, maintainer, downstream, outfall, basin, covered, last_verified_clean
- inlet_gully
- outfall: backflow level
- pump_station: capacity, status
- hotspot: source list, events, linked assets, consequence class
- cleaning_job: trigger score snapshot, assignee, SLA, status, planned and actual quantity, disposal proof
- inspection: silt fill, O&M grade 1–5
- report: Open311 fields plus trust, dedupe group, linked job
- evidence_photo: hash, geometry, server time, EXIF ok, gauge rod present, phase, verifier
- observation: rain or river gauge reading
- alert: tier, recipient, channel, sent, acknowledged, escalated
- site_plan: M4 decisions, structures, tests, maintenance clock

## 7. The Rain-Ready system

### 7.1 Primary users (ranked by "can act" × "lives with the problem")

| # | User | Decision they make | What they need | Channel |
|---|---|---|---|---|
| 1 | Basement and building caretakers (coaching centres, libraries, parking, shops) | Close the basement, move cars, cut power, block the entrance | A 3-line verdict for **their address**: "Heavy rain 3–6 pm tomorrow. You are in a low pocket. Do X, Y, Z" | WhatsApp, Hindi/Hinglish, voice notes in |
| 2 | RWA secretaries, market associations | Get the right agency to clean; organise pumps; warn residents | Which drain near us, who owns it, when it was last verified clean, the photo trail | WhatsApp group, web map |
| 3 | Ward JE, sanitation inspector (action recipient) | Dispatch crews and pumps, prioritise | Ranked P1 list with evidence, "reported X days ago, still open" | WhatsApp task card, CSV; not a new app |
| 4 | Pump operators and underpass owners (PWD, NHAI) | Test-run, staff, report status | Pre-storm check prompt, one-tap status | WhatsApp/Telegram |
| 5 | Residents of low-lying colonies, commuters, delivery riders | Avoid underpasses, report flooding | Avoid-list, report flow, helplines | Telegram/WhatsApp |
| 6 | Councillors / MLAs | Escalate, allocate funds | Ward summary, repeat locations | PDF / image |

### 7.2 Key flows (WhatsApp/Telegram first; web for maps)

- **Report** (copied from BMC's proven flow):
  1. Choose category (waterlogged road, blocked drain, open manhole, live wire, basement water).
  2. Share a location pin.
  3. Send a photo.
  4. Bedrock triages it into structured JSON (type, severity, reference objects).
  5. The reporter gets a ticket ID and a pre-filled message to forward to 1908 or 311.
  6. When the job closes, the reporter gets the after photo.
- **"Is my building at risk?"** The caretaker sends a location and answers 4 questions: basement yes/no, entrance below road level, people inside during the day, drain ramp in front. The bot returns:
  - a risk class with the reason (terrain + hotspot + drain status);
  - a standing checklist;
  - enrolment in Storm Mode alerts.
- **Storm Mode** (triggered by forecast):
  - T−24 h: basement caretakers in Elevated/High classes get the checklist (no occupancy, move vehicles and valuables, power isolation plan, barrier, check the drain in front). Pump operators at listed underpasses get "test-run now and reply with status". JEs get the P1 drains. RWAs get "clear the inlets on these streets".
  - During the storm: photo reports update states. Commuters can request the underpass avoid-list. Live-wire reports go straight to the DISCOM helpline. Wording never says "safe".
  - After the storm: standing water still present after 2 h becomes a live incident. The system logs predicted vs observed points.
- **JE task card.** Asset, reason ("silt 50%, 3 reports, 62 mm forecast"), deadline, a "start" photo, a "done" photo, and a "wrong owner" button.
- **Rain Capture Planner (web).** Pick the plot on a map; roofs come from footprints. Enter the water-table band (CGWB) and the pit test result. The planner returns:
  - recharge, store or detain, with the rule that decided it;
  - structure type and size for 25 mm and annual yield;
  - safety checks and costs;
  - the maintenance calendar.

**Safety wording (non-negotiable).**
- Map and bot states are only *Reported flooded*, *Elevated risk*, *High risk* and *No recent report (not a safety guarantee)*.
- Every alert carries "Unofficial advisory. Official warnings: IMD / NDMA Sachet."
- Default advice: never drive into water at an underpass; never enter water near poles, wires or open drains.

### 7.3 Architecture on AWS

| Layer | Service | Notes |
|---|---|---|
| Terrain processing | AWS Batch/Fargate or one EC2 job; or Lambda per tile | rasterio + RichDEM/pysheds; reads `copernicus-dem-30m` (eu-central-1, no signing) with windowed COG reads; Overture buildings via DuckDB on `overturemaps-us-west-2` |
| Static map data | S3 + CloudFront | GeoJSON and PMTiles for low points, drains, hotspots |
| API | API Gateway (HTTP) + Lambda (Python) | Open311-shaped report endpoints; scoring; planner rules |
| Data | DynamoDB with geohash keys (or Aurora PostgreSQL + PostGIS if the team prefers SQL) | Assets, reports, jobs, evidence, alerts |
| Scheduling | EventBridge Scheduler | Hourly forecast pull, nightly scoring, SLA timers |
| AI | Bedrock (Claude via global cross-region inference from ap-south-1) | Haiku for photo triage; Sonnet for Hindi/English advice and work orders. Data may be processed outside India: disclose it |
| Agent | Strands Agents SDK | "Ask Rain-Ready" agent with tools: risk lookup, drain status, planner, forecast. Satisfies the open-source requirement |
| Maps | Amazon Location Service + MapLibre | Or a free OSM basemap via PMTiles |
| Privacy | Rekognition | Blur faces and number plates before public display |
| Messaging | Telegram bot first; WhatsApp Cloud API test number (up to 5 recipients) | No SMS (DLT). WhatsApp Business service messages beyond 1,000 a month are chargeable from 1 Oct 2026 [S] |

### 7.4 Data sources and status

| Source | Use | Status |
|---|---|---|
| Copernicus GLO-30 on AWS | Terrain | Bucket and Delhi tile name confirmed by agents; download blocked from our research sandbox, so test from a laptop |
| Overture buildings / Google Open Buildings | Roofs, obstacles | Docs confirmed; Overture release 2026-09-23.1 |
| OSM (roads, tunnels, culverts, drains) | Underpasses, flow paths | Coverage of Delhi underpasses and drains unverified |
| OpenCity Delhi flood points KML; Bengaluru and Chennai sets | Validation | Pages load; Delhi semantics undocumented |
| Open-Meteo (forecast, Previous Runs from Jan 2024, ECMWF single runs from Mar 2024) | Storm Mode, honest replay | Free non-commercial, 10k calls/day; no IMD model |
| IMD warnings | Official context | No programmatic feed found; read manually |
| CGWB yearbooks (depth bands, quality) | M4 rules | PDFs load; no gridded surface; groundwater portal was in maintenance on 8 Oct |
| I&FC drain PDFs; NGT action-taken reports | Drain list for the pilot | PDFs with chainage, no geometry |
| Yamuna level at Old Railway Bridge | Outfall-limited mode | Source feed not identified; manual entry for the demo |

## 8. How effective can it be?

- **Strongest evidence.** Early warning tied to action pays off: 24 hours' notice can cut potential damage by about 30% (Global Commission on Adaptation, via WMO), and World Bank benefit-cost ratios run 4–35. These are national hydromet systems; they support the principle, not this product.
- **Crowd reports are useful but biased.** PetaBencana had 1,054 reports at one Jakarta peak, and the agency treats them as a "second opinion". US studies find under-reporting in poorer areas, so a blank map does not mean safe.
- **Maintenance alerting:** no study found showing it reduces flood damage. Rain-Ready should create that evidence by logging predicted vs actual.
- **Where impact is most plausible:**
  - verified drain and inlet cleaning before storms (the capacity numbers are large and the gap is documented);
  - pump readiness at underpasses;
  - basement caretaker action;
  - roof-water harvesting in deep-water zones.

**Metrics to show at the hackathon (outputs, measured honestly):**
- hindcast: share of named hotspots in the top-k risk zones, with misses listed;
- for the replayed storm: which P1 drains and basements would have been alerted, and when;
- photo triage accuracy on 30–50 hand-labelled photos;
- time from photo to advice, and cost per report in ₹;
- M4: a plot-level decision with the rule that produced it;
- interview signal: how many of 5–8 caretakers or RWA members said they would act on the message.

**Metrics for a pilot (outcomes):**
- verified-clean share of the ward's inlets before monsoon;
- median time to verified closure and the reopen rate;
- pump readiness confirmations;
- waterlogging events and hours at known points, against the previous year;
- m³ of roof water captured by tested structures.

## 9. Pitfalls and must-dos

1. **Never claim depths or "safe".** Show risk classes with reasons and uncertainty. Publish hit and miss rates.
2. **Liability.** Label every alert as an unofficial advisory and link to IMD and Sachet. Check the Disaster Management Act s.54 (false alarms) before any public launch [NF: statute text not retrieved].
3. **Politics.** Waterlogging is a live party fight, and engineers face suspension. Show evidence and status, not blame. Use ward and agency level only, and frame the record as protecting the JE who did the work.
4. **Ownership.** An alert for a drain nobody owns goes unanswered. Keep an owner field and a "wrong owner" reroute, and track disputed points as a category of their own.
5. **Bad inputs.** There is no open drain geometry, and the invert data is suspect. Digitise the pilot ward by hand. Treat official "% desilted" as a claim, not truth.
6. **Recharge harm.** Never recommend recharge in shallow or contaminated zones, or from road runoff into bores. Send threshold rules to a hydrogeologist before real use.
7. **Fraud and gaming.** Use server timestamps, geofences, image hashes, the gauge rod, disposal proof and random audits. Assume determined fraud is still possible.
8. **Privacy.** DPDP Act 2023 applies:
   - store phone numbers as salted hashes;
   - show coarse locations publicly;
   - blur faces and plates;
   - auto-delete raw photos;
   - show consent text in Hindi and English.
9. **Spam and hoaxes.** Rate-limit, geofence to NCR, cluster duplicates, keep "unverified" visible until corroborated.
10. **Alert fatigue.** Three tiers, push caps, and a named action on every alert.
11. **The October demo.** Replay real storms (28 Jun 2024: 228.1 mm; 27 Jul 2024: Rajinder Nagar) using only the forecasts that existed at the time (Open-Meteo Previous Runs). Label it "REPLAY". Show misses next to hits.
12. **After the hackathon.** Open-source the code, document its limits, and name an owner for the data pipeline.

## 10. Build plan: seven days, with the real deadline

**Pilot area.** One ward around **Old Rajinder Nagar / Karol Bagh** fits best:
- it has documented deaths;
- it has documented causes (a depression, ramps over drains, uncleaned drains, basement misuse);
- it has a dense basement stock;
- it has a replayable storm (27 Jul 2024).

Its water table is probably shallow (Central district 2–7 m in 2011 data; verify), so M4 should say "store and detain, don't recharge". That demonstrates the safety rule. Add one South Delhi society as the contrasting case where recharge is allowed.

**Roles.**
- A: terrain and geo (M1).
- B: backend, bot and AWS (M5, API, deploy).
- C: drain scoring, Storm Mode logic, Bedrock prompts (M2, M3).
- D: UX copy, interviews, M4 rules, video and blog.

| Day | Goal | Deliverables |
|---|---|---|
| D1 Fri 9 Oct | Foundations | A: DEM tiles plus OSM/Overture for the pilot ward; fill, D8, depression list; first ranked map. B: AWS account, S3/CloudFront, Lambda + API skeleton, Telegram bot echo with photo + pin. C: Open-Meteo Previous Runs pulled for 28 Jun and 27 Jul 2024; V × Rf scorer on a hand-made asset table. D: walk or map the pilot ward; digitise 20–40 drains and inlets plus underpasses; 4–6 quick interviews (caretaker, RWA, shop owner, student); Hindi/English copy |
| D2 Sat 10 Oct | End-to-end slice | Photo report → Bedrock triage → DynamoDB → map. "Is my building at risk?" flow. P1 alerts with task card and verified closure (photo + geofence). Storm Mode T−24 h checklists. Use the Strands workshop (11:00–12:30) to build the agent. Show at the 7 PM showcase for feedback |
| D3 Sun 11 Oct | Submit (closes 8:00 PM IST) | Hindcast vs named hotspots; M4 planner rules for 2 sites; safety copy and disclaimers; deploy; freeze code at 3 PM; record video; write the writeup listing AI tools used; submit by 6 PM; publish the blog on AWS Builder Center (blog prizes) |
| D4 Mon | Validation | Precision@k vs all named hotspots plus the Bengaluru/Chennai sets; triage accuracy on labelled photos |
| D5 Tue | Pilot prep | WhatsApp test number with 3–4 real users; consent, auto-delete, rate limits; Rekognition blur |
| D6 Wed | Officer view | JE CSV and action-taken-report export; escalation ladder timers; ward board |
| D7 Thu | Handoff | Public repo, limits document, pilot feedback, next-steps for an RWA or ward partner |

**Must-have by Sunday:**
- pilot-ward Water Map with risk classes and an underpass/hotspot layer;
- hand-built drain and inlet layer;
- report bot with Bedrock triage;
- drain scoring with P1 alert and verified closure;
- Storm Mode replay;
- one M4 decision;
- safety wording;
- deployed on AWS;
- the video.

**Should-have:**
- Strands agent;
- WhatsApp test flow;
- hindcast page;
- JE CSV;
- face and plate blur;
- second M4 site.

**Won't-have this week:**
- SMS;
- a native app;
- centimetre depths;
- SWMM or 2D modelling;
- IVR;
- sensor hardware;
- multi-city;
- user accounts beyond roles.

**Cut first, in this order:** Strands agent → WhatsApp → JE CSV → blur → hindcast page. **Never cut:** the replay, the safety wording, the photo-to-verified-closure path.

**3-minute demo storyline:**
1. 0:00–0:25. The problem in facts: Rajinder Nagar (58 mm of "moderate" rain, a depression, ramps over drains, drains uncleaned for 5 years, 3 deaths); underpass drownings; 410–445 listed points across eight agencies.
2. 0:25–0:50. Who it's for: a basement caretaker and an RWA secretary, with one real interview quote.
3. 0:50–1:40. **REPLAY, 27 Jul 2024** (banner on screen). The forecast available the day before triggers Storm Mode. The Water Map shows the pocket. Two P1 drains are flagged for silt and reports. The caretaker gets a Hindi checklist ("no one in the basement 5–9 pm; move vehicles; check the drain in front").
4. 1:40–2:15. A real photo of a choked drain taken by the team this week: triage, the JE task card, closure with a gauge-rod photo and the 5 m bank check, and the ward board updating.
5. 2:15–2:35. Rain Capture: here, "store, don't recharge" (shallow water table). In a South Delhi society, recharge shafts are sized, with the rule shown.
6. 2:35–3:00. AWS architecture (Lambda, DynamoDB, S3, Bedrock, Strands, EventBridge) shown running. Limits stated: no depth claims, unofficial advisory, open-source.

## 11. Verify first (first hours of Day 1)

- Download one Copernicus tile and one Overture extract from a laptop; check that the pilot-ward bounding box is covered.
- Call Open-Meteo forecast and Previous Runs for 27 Jul 2024 at Rajinder Nagar's coordinates.
- Run an OSM Overpass query for `tunnel=yes`, `layer=-1` and `waterway=drain` in the pilot ward; count what is mapped.
- Download the OpenCity "Delhi 2 Year Flood Points" KML and check what it contains.
- Get the CGWB depth band for the pilot ward (yearbook map) and the quality flags.
- Check whether Bedrock Claude models are enabled in the AWS account (ap-south-1, cross-region inference).
- Confirm with a hydrogeologist or faculty member: M4 rules 2, 3, 6 and 9.

## 12. Key sources

**Terrain and data**
- Copernicus DEM spec: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- AWS Open Data, Copernicus DEM: https://registry.opendata.aws/copernicus-dem/
- FABDEM (Hawker 2022): https://iopscience.iop.org/article/10.1088/1748-9326/ac4d4f
- Priority-Flood (Barnes): https://arxiv.org/pdf/1511.04463
- Fill-Spill-Merge (ESurf 2021): https://esurf.copernicus.org/articles/9/105/2021/
- Danish Blue Spot model (CEDR): https://www.cedr.eu/download/other_public_files/research_programme/eranet_road/call_2008_climate_change/swamp/04_Report-3-The-Blue-Spot-Model.pdf
- malstroem: https://github.com/SDFIdk/malstroem
- Guangzhou depression vs TWI validation: https://www.mdpi.com/2073-4441/11/10/2115
- UK EA local drainage rates: https://assets.publishing.service.gov.uk/media/6036611ee90e0740b50cac5a/Improving_surface_water_flood_mapping_-_estimating_local_drainage_rates_-_user_guidance.pdf
- OpenCity Delhi flooding data: https://data.opencity.in/dataset/delhi-flooding-data
- Overture buildings: https://docs.overturemaps.org/examples/build-a-map/

**Drains**
- CPHEEO Manual Vol 1: https://mohua.gov.in/upload/uploadfiles/files/Volume%20I%20Engineering(3).pdf
- CPHEEO summaries (InfraLens): https://infralens.in/cpheeo/storm-water
- IIT Delhi 2018 plan appendix (DDA): https://www.dda.gov.in/sites/default/files/QAC/APPENDIX%20XXI06092018.pdf
- I&FC 1976 master plan: https://ifc.delhi.gov.in/sites/default/files/inline-files/mcd.docx
- CAG findings (Governance Now): https://www.governancenow.com/views/columns/delhi-in-deep-waters-cag-report-flood
- Delhi drainage master plan 2025 (Pioneer): https://www.dailypioneer.com/2025/page1/delhi-gets--new-drainage-master-plan-after-50-years.html
- Eight troublesome drains (ThePrint): https://theprint.in/india/delhi-has-eight-troublesome-drains-master-plan-suggests-remedial-measures/3028362/
- Amsterdam gully pots (Post et al. 2016): https://repository.tudelft.nl/file/File_bacdad53-c948-4ad0-8e7b-90212254c3fc
- I&FC action-taken report to NGT (2026): https://www.greentribunal.gov.in/sites/default/files/news_updates/Action%20Taken%20Report%20by%20R%207%20IFCD%20Delhi%20in%20OA%20No%20230%20of%202025%20NEWS%20ITEM%20TITLED%20DEADLINE%20LOOMING%20MCD%20MET%20JUST%2021%20OF%20DESILTING%20TARGET%20BY%20END%20OF%20APRIL.pdf

**Hotspots and harm**
- 2025 hotspot list and disputed points: https://www.theweek.in/wire-updates/national/2025/06/19/des66-dl-pwd-waterlogging.html
- PWD operations 2026: https://dailypioneer.com/news/4-waterlogging-hotspot-underpasses-stay-open-amid-rain-pwd-minister-reviews-operations
- Rajinder Nagar inquiry: https://www.tribuneindia.com/news/delhi/coaching-centre-tragedy-ramps-constructed-over-drains-blocked-water-flow-inquiry-report
- Rajinder Nagar HC order (58 mm): https://www.etvbharat.com/en/!bharat/coaching-centre-deaths-time-for-administration-to-awake-from-deep-slumber-says-hc-enn24091703856
- Delhi first-monsoon deaths 2024: https://www.siasat.com/11-killed-in-first-two-days-of-monsoon-in-delhi-3053620/
- Gurugram 2025 deaths: https://scroll.in/latest/1084396/gurugram-8-dead-in-rain-related-incidents-3-of-them-due-to-electric-shocks
- Minto Bridge 2025: https://www.theweek.in/wire-updates/national/2025/05/25/des32-dl-minto-bridge.html
- Singapore drainage (MSE): https://www.mse.gov.sg/latest-news/oral-reply-on-drainage-improvement-feb2025/
- Hong Kong underpass warning practice note: https://www.hyd.gov.hk/en/technical_references/technical_document/division_practice_notes/pdf/Pn2D.pdf
- Mumbai pump operator fines: https://www.etvbharat.com/en/!state/rs-ten-lakh-fine-on-mini-pumping-station-operators-for-waterlogging-after-mumbai-rains-enn25052800956

**Harvesting**
- CGWB Master Plan for Artificial Recharge 2020: https://cgwb.gov.in/cgwbpnm/public/uploads/documents/168613326251844776file.pdf
- CGWA report to NGT (thresholds, contamination): https://www.greentribunal.gov.in/sites/default/files/news_updates/Report%20by%20CGWA%20in%20EA%20No.%2034%20of%202023%20IN%20OA%20No.526%20of%202019%20%28Mahesh%20Chandra%20Saxena%20Vs.%20CPCB%20%26%20Ors.%29.pdf
- CGWB Delhi Yearbook 2022–23: https://www.cgwb.gov.in/cgwbpnm/public/uploads/documents/17032373871370440403file.pdf
- CGWB manual chapter (structures): https://www.megphed.gov.in/rainwater/Chap9.pdf
- NGT RWH order 2019: https://indiaenvironmentportal.org.in/in-court/order-of-the-national-green-tribunal-regarding-installation-of-rainwater-harvesting-systems-in-delhi-01122023
- DJB report to NGT (2024 testing): https://www.greentribunal.gov.in/sites/default/files/news_updates/REPORT%20BY%20DJB%20IN%20EA%20NO.%2004%20of%202023%20IN%20OA%20NO.%20147%20of%202021%20Mahesh%20Chandra%20Saxena%20Vs%20The%20Chief%20Secretary%20Gort.%20of%20NCT%20of%20Delhi%20%26Ors.pdf
- CAG 2007 (RWH maintenance): https://cag.gov.in/uploads/old_reports/state/Delhi/2007/Performance_Audit/Performance_Audit_Delhi_2007/vol_2_chap3.pdf
- Gurugram audit: https://www.tribuneindia.com/news/haryana/70-rainwater-harvesting-pits-lie-defunct-audit-ordered-516641/amp
- CGWB demonstrative recharge results: https://www.cgwb.gov.in/cgwbpnm/download/1257

**Operations and product**
- PWD desilting 2025: https://www.theweek.in/wire-updates/national/2025/06/17/des105-dl-pwd-desilting.html
- Suffolk gully sensor trial: https://media.adeptnet.org.uk/sites/default/files/media/2022-07/Suffolk%20Gully%20sensors%20final%20report%20v2_0.pdf
- Kent silt survey: https://democracy.kent.gov.uk/documents/s100342/Item%2004%20Mitigating%20Surface%20Water%20Flood%20Risk%20on%20the%20Highway.pdf?txtonly=1
- Catch basin 50% rule (Haverhill): https://www.haverhillma.gov/media/q1jh5wdt/catch-basin-inspection-and-cleaning-optimization.pdf
- Open311 GeoReport v2: https://wiki.open311.org/GeoReport_v2/
- PetaBencana (Rest of World): https://restofworld.org/2021/hi-im-disaster-bot/
- Bengaluru flood apps adoption: https://citizenmatters.in/?p=87431
- Early warning economics (WMO): https://public.wmo.int/node/25794
- Bedrock Claude in India: https://aws.amazon.com/blogs/machine-learning/access-anthropic-claude-models-in-india-on-amazon-bedrock-with-global-cross-region-inference
- Open-Meteo historical forecast API: https://open-meteo.com/en/docs/historical-forecast-api
- Event schedule and deadline (Luma): https://luma.com/env
