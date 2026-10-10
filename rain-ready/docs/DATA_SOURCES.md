# Data sources for the pilot ward

Compiled 2026-10-10 from web research. Pilot bbox: south 28.632, west 77.170, north 28.662, east 77.205.

Status words: **tested** (endpoint or file fetched and read), **read** (page or PDF opened), **snippet** (search summary only, not opened), **not researched**.
Detail, quotes and curl commands are in `docs/research/`. Tests ran from one machine; government sites may behave differently elsewhere.

## 1. What unblocks which SCOPE item

| SCOPE item | Use | Status |
|---|---|---|
| 4.8 Cited ownership rule | 60 ft Right of Way rule (section 3) + PWD road API (section 2) | tested / read |
| 4.8 Real drain positions | OpenStreetMap via Overpass | **tested**: 3 unnamed culverts, no roadside drains (section 9) |
| 4.8 Real pocket positions | Flood Control Order 2025 rows + 2024 inquiry reporting (section 4). Names only, no coordinates | read |
| 4.5 Elevation suggestion | Copernicus GLO-30 on AWS (section 5). Coarse slope hint only | tested |
| 4.6 Water-table depth bands | CGWB | **not researched** (agent stopped early) |
| 4.8 Exposure counts | Census, buildings, OSM facilities | **not researched** (agent stopped early) |
| Rain context | Sachet CAP feed, Open-Meteo (section 6) | tested |

## 2. PWD Delhi road inventory API (tested)

Public JSON behind `https://www.pwddelhi.gov.in/maintenance-inventory/roads-with-pwd`. 1,297 roads.

```
curl -H "X-Requested-With: XMLHttpRequest" -H "Accept: application/json" \
  "https://www.pwddelhi.gov.in/api/maintenance/roads/search?page=1&limit=100&search=Pusa"
curl -H "X-Requested-With: XMLHttpRequest" "https://www.pwddelhi.gov.in/api/maintenance/roads/767"
```

- Search filters: `search`, `zone_id`, `circle_id`, `division_id`, `subdivision_id`. Lookups: `/api/common/zones`, `/api/common/circles?zoneId=`, `/api/common/divisions-by-circle?circleId=`.
- Search fields: `asset_code`, `road_name`, `starting_point`, `end_point`, `total_length_km`, `no_of_lanes`, `right_of_way_m`, division.
- Detail adds `road_taken_by_pwd_year`, `drain_length_m`, `water_logging_info`. On Pusa Road these were "2012", null and "N".
- No geometry (`geodata` null on the record opened). Match to OSM lines by name.
- The detail record holds named people with phone and email. Do not store or show them (SCOPE 7.5).
- No licence stated on the API.

Pilot-area roads in PWD's list (division 19, South West Road Division 1, saved in `research/pwd_roads_division19.json`):

| Road | From, to | Right of Way (m) |
|---|---|---|
| Pusa Road (RD-00219) | Dayal Chowk, Pusa Road Round About | 27.44 |
| Shankar Road (RD-00213) | Pusa Chowk, Shankar Chowk | 25 |
| Arya Samaj Road (RD-02138) | Dayal Chowk, Saraswati Marg | 34 |
| Ganga Ram Hospital Road (RD-00218) | Pusa Road, Shankar Road | 18.3 |
| Ajmal Khan, Abdul Aziz, Abdul Rehman, SK Das, Padam Singh, Saraswati, Vishnu Mandir, Ganga Mandir, Guru Ravi Das roads | Karol Bagh grid | 20 |
| Gurudwara Road (RD-02133) | Pusa Road, Arya Samaj Road | 24 |
| Dev Prakash Shastri Marg (RD-01255) | R Block Rajendra Nagar, Loha Mandi | 30.48 |
| Rani Jhansi Road (RD-00437, SRD Project Division 2) | Panchkuiyan Road, Pahari Dheeraj Road | 34 |

Searches for "Bara Bazar" and "Rajinder" returned no roads.

## 3. Ownership rule (read)

- **Roads:** GNCTD notification of 10.01.2012 vested MCD roads with Right of Way of 60 feet and above in GNCTD (PWD). Source: PWD reply in NGT OA 559/2022. The notification itself was not read (scanned annexure).
- **Drains follow the road:** SDMC affidavit to the NGT (Feb 2020): "all drains along with all roads having Right of Way more than 60 ft... are constructed, maintained and cleaned/de-silted by the PWD since May 2012"; drains on narrower roads are SDMC's. This is a South Delhi statement. Applying it to Karol Bagh is an inference.
- **The measure is Right of Way**, not carriageway width. 60 ft = 18.29 m.
- **Major storm drains by agency** (Delhi High Court order, 8 April 2024, quoted in an I&FC report to the NGT, OA 257/2024), about 3,740 km: PWD 2,064.08; MCD 521.87; I&FC 426.55; NDMC 335.29; DDA 251.30; DSIIDC 98.12; Cantonment Board 39.68; others 3.42.
- **Still fragmented:** on 29 May 2026 the High Court recorded "confusion as to which agency is in-charge of which drain", declined to create a new body and made the Integrated Drain Management Cell the coordinating task force. From April 2024 I&FC is the single agency for 22 Yamuna-outfall drains.
- **Legal basis:** DMC Act 1957 s.42(a) makes drain construction, maintenance and cleansing an MCD obligation. It does not allocate drains exclusively.

Conservative rule for the app:

| Case | Agency | Confidence |
|---|---|---|
| Roadside drain on a road found in the PWD API with `right_of_way_m` >= 18.29 | PWD | medium |
| Roadside drain on a road under 60 ft or an internal colony street | MCD | medium |
| Open drain among the 22 Yamuna-outfall drains | I&FC | high |
| Road not in the PWD list; covered drains; junctions; DDA, Railways, NHAI, DMRC or Cantonment land; sewers; the 2024 incident drain | No owner found | - |

Not found: a public drain-level "last desilted" list, the ward number for Rajinder Nagar (141 or 149, unresolved), any ruling on who owns the Bazar Marg drain.

## 4. Waterlogging locations (read)

- **Flood Control Order 2025**: `https://ifc.delhi.gov.in/sites/default/files/ifc/universal/fco_2025.pdf` (146 pages, text layer). Reproduces Delhi Traffic Police waterlogging lists for 2022, 2023 and 2024. Columns: road, location, dates. No coordinates, no agency per point. The 2024 table's row count is inconsistent within the document.
- Pilot-area rows: Pusa Road at Karol Bagh Metro Station; Pusa Road at Bagga Link Hanuman Mandir; Jhandewalan roundabout (2022 to 2024). Anand Parbat on New Rohtak Road; Rani Jhansi Marg at Filmistan, Azad Market and DCM Chowk; Ram Bagh Road under the railway bridge (2022, 2023). East Patel Nagar bus stand (13 Aug 2024).
- **Not in any official list:** Old Rajinder Nagar, Bazar Marg, Shankar Road, Ganga Ram Hospital Marg, Dev Nagar. The lists cover arterial roads.
- **Old Rajinder Nagar, July 2024** (news reporting of official findings): preliminary magisterial report describes a "saucer" with its lowest point in front of the coaching centre and ramps built over the drains; final report says drains were not desilted for five years; Delhi High Court, 2 Aug 2024, records the MCD Commissioner saying the stormwater drain "is dysfunctional" and "has been encroached upon".
- **Flood Control Order 2026**: issued 17 June 2026, but the page has no PDF attached.
- **Drainage Master Plan 2018 (IIT Delhi)**: `https://ifc.delhi.gov.in/sites/default/files/ifc/universal/main_report_dmp_version51.pdf`. Cites 330 hotspot segments; the appendix listing them is missing.
- No machine-readable complaint data or API for PWD Sewa, MCD 311 or Traffic Police advisories. No geocoded Delhi waterlogging dataset found.

Pocket coordinates must come from field capture or resident reports. A pocket is "official" only if it traces to a row above.

## 5. Elevation (tested)

- **Copernicus GLO-30** on AWS Open Data, no credentials: `s3://copernicus-dem-30m/Copernicus_DSM_COG_10_N28_00_E077_00_DEM/Copernicus_DSM_COG_10_N28_00_E077_00_DEM.tif` (41.7 MB COG, also over HTTPS).
- Measured in the bbox (13,608 cells): min 218.5 m, max 261.7 m, mean 236.9 m. Higher to the south and south-west, lower to the north-east.
- It is a surface model with buildings and trees. Neighbouring cells differ by a median of 1.4 m, the same scale as the relief. No distinct low-point cells. Use only as a 1 to 3 km slope hint.
- Point APIs (Open-Meteo, Open-Elevation, OpenTopoData) answer without a key, but SRTM and ASTER differ by 18 m at one point. Not usable for low points.
- Not verified: published accuracy figures, the exact Copernicus attribution wording, FABDEM (reported non-commercial licence).

## 6. Rain and live sources (tested)

| Source | Endpoint | Notes |
|---|---|---|
| NDMA Sachet CAP feed, Delhi | `https://sachet.ndma.gov.in/cap_public_website/rss/rss_delhi.xml` | No key. Official IMD alerts as CAP 1.2 XML. Show as attributed context only |
| Open-Meteo | forecast and archive APIs | No key. CC BY 4.0, free tier non-commercial, 10,000 calls/day |
| MET Norway | locationforecast | Needs a custom User-Agent |
| India-WRIS | `https://indiawris.gov.in/v3/api-docs` | Open spec; Delhi queries returned "No data found" |
| IMD API | `https://api.imd.gov.in/api/v1/...` | Needs a registered key (401 without) |
| AWS Open Data | `noaa-gfs-bdp-pds`, `copernicus-dem-30m`, `esa-worldcover`, `overturemaps-us-west-2`, Sentinel-2 | Anonymous listing works |

- Reanalysis is not ground truth: for 28 June 2024 the Open-Meteo archive gave 14.3 mm against 228.1 mm at the Safdarjung gauge (gauge figure from a snippet).
- **35 mm/h reference:** no return period can be claimed. The Drainage Master Plan gives 15-minute intensities only (Safdarjung 87.2 mm/h at 2-year, 112.2 at 5-year; Palam 79.5 and 95.8). 35 mm/h is above IMD's "heavy rain" nowcast threshold of 15 mm/h (read in IMD's API document).
- Failed: `aws.imd.gov.in` (timeout), `data.delhi.gov.in` (no DNS), `api.data.gov.in` (connection refused), IUDX (timeout). No JSON endpoint found on the CWC flood site.

## 7. What we can acquire with clean-up

| Dataset | Source | Clean-up | Result |
|---|---|---|---|
| PWD roads with Right of Way | PWD road API (tested) | Page through 1,297 roads, keep road-level fields, drop contact details, normalise names | Per-road PWD / not-PWD lookup with a citable figure |
| Official waterlogging locations | Flood Control Order 2025 PDF | Extract the 2022 to 2024 tables, fix broken rows, dedupe across years, filter to the pilot area | About 8 to 10 named locations with years listed; no coordinates |
| Old Rajinder Nagar incident facts | 2024 inquiry and High Court reporting | Short cited record of the quoted findings | One cited pocket description |
| Relative-elevation layer | Copernicus GLO-30 on AWS | Window to bbox, smooth, store a small raster | "Relatively lower ground" hint, suggestion-only |
| Rain context | Sachet Delhi feed, Open-Meteo | Parse CAP XML, cache calls | Attributed alerts and forecast rain |
| Drain and road lines | OSM via Overpass (**untested**) | Query bbox, join road lines to PWD list by name, check matches by hand | Geometry with an owner label per roadside drain |

Clean-up cannot give: pocket coordinates (lists have place names only; a geocoded name is approximate and must be labelled so), the owner of interior lanes such as Bazar Marg, or last-desilted dates.

## 8. To do next (paused 2026-10-10, usage limit)

Research not yet run (two agents were stopped before saving anything):

- [x] Overpass on the bbox (2026-10-10, section 9): OSM drain lines are not usable as a network; road lines are.
- [ ] MCD 250-ward boundary file (GeoJSON or shapefile); settle the Rajinder Nagar ward number (141 or 149) from the State Election Commission order.
- [ ] Which basin Old Rajinder Nagar drains to (Najafgarh or Barapullah); named drains serving it.
- [ ] CGWB depth-to-water bands for Karol Bagh / Pusa (Ground Water Year Book NCT Delhi, INGRES category); citable minimum depth for recharge structures; DJB and bye-law rainwater harvesting rules.
- [ ] Soil and lithology near the Ridge (SoilGrids API, CGWB).
- [ ] Exposure: ward population, building footprints (Overture on AWS, OSM), coaching centres. (OSM schools, clinics, hospitals and libraries within 200 m are done, section 9.)

Build from what is already found (task B7):

- [x] Script: pull all PWD roads to a road-level JSON (no contact fields): `scripts/fetch_sources.py`.
- [x] FCO 2025 pilot-area rows with PDF page numbers and dates: `data/sources/hotspots.csv` (checked against the PDF, 2026-10-10).
- [x] Join OSM road lines to PWD roads; `owner_source` per drain from the section 3 rule: `scripts/prepare_sources.py`.
- [ ] Replace placeholder assets in `data/seed.json`. Candidate is `data/seed.candidate.json`; blocked on tests and `web/` fixtures that use the placeholder ids (section 9).
- [x] Copernicus tile windowed and sampled (section 9). Result: not usable as a risk layer; no raster stored.

Needs a person:

- [ ] Skim `docs/research/*.md` before the repo goes public (may name officials from news coverage).
- [ ] Fetch the Flood Control Order 2026 PDF in a browser from `https://ifc.delhi.gov.in/orders`.
- [ ] Verify the exact Copernicus attribution wording.
- [ ] Field capture of pocket and drain coordinates in Old Rajinder Nagar.

## 9. Experiment results (2026-10-10)

Run with the pipeline in `docs/DATA.md`. Candidate output: `data/seed.candidate.json` (9 drains, 6 pockets, passes `make seedcheck`). Presentable view: `docs/data-report.html`.

**OSM (Overpass, ODbL).**
- Drain lines: 3 unnamed culverts (`waterway=drain`, `tunnel=culvert`; 17, 5 and 3 points), no roadside drains. One manhole, a telecom one. OSM gives no drain network here, so a drain asset beside a road is an assumption and the seed says so.
- Roads: 389 named highway ways, 117 names. Overpass often returns 500 or 504; the fetch script retries mirrors and splits the bbox.

**Road names to PWD records.** Exact normalised-name join matched 24 of 117 names. Misses are spelling: PWD has "Dr. K. S. Krishanan Marg" (RD-00216), "Vande Martram Marg" (RD-00212), "Dev Prakash Shatri Marg" (RD-01255). Some names are ambiguous across divisions (Gurudwara Road appears 6 times). The same road is often listed twice (South West Road Division 1 and SRD Project Division 2) with equal Right of Way. Rule: every owner row names its PWD asset code by hand, and the script fails on an unknown code.

**Flood Control Order 2025, re-read from the PDF.** Earlier notes under-counted: row 121 (New Rohtak Road, Anand Parbat) carries 8 dates including four in 2024; row 175 (Ram Bagh Road railway underbridge, Azad Market) carries 6 dates including four in 2024. Pilot rows placed on the map: Karol Bagh Metro (2 dates), Bagga Link and Jhandewalan roundabout (10), Filmistan (2), Anand Parbat (16), East Patel Nagar bus stand (1). Pages are PDF page numbers, not the "Page N of 146" stamp.

Rows with no OSM feature of that name in the bbox, so not placed (listed, not guessed): 2022 #35 Azad Market Underpass (p59), #90 Azad Market Chowk (p62), #168 Under Flyover Azad Market (p65); 2023 #175 Railway under bridge, Azad Market (p73), #177 DCM Chowk, #179 Y-Point Underpass, Azad Market, #180 Under Rani Jhansi Road Flyover (p73), #270 Veer Banda Bairagi Marg / Azad Market (p77).

**Elevation (Copernicus GLO-30), tested against the documented points.** Point height minus the mean of cells within 300 m: Karol Bagh Metro +4.3 m, Jhandewalan +4.5, Rani Jhansi flyover +1.0, Anand Parbat -0.4, Filmistan -4.3, East Patel Nagar -2.5, Old Rajinder Nagar (approximate) +0.9. Only 2 of 6 documented waterlogging points sit below their surroundings. The model includes metro structures, flyovers and buildings. Do not present it as a risk layer.

**Exposure.** 75 OSM schools, colleges, clinics, hospitals and libraries in the bbox. Counts within 200 m of each pocket are stored in `exposed_assets`.

**Behaviour found by loading this data.**
- All five "other" pockets use the same scenario parameters, so the four that have a linked drain tie at 0.407 h. The ranking among them is arbitrary until parameters are measured or recorded dates feed the rank.
- A pocket with no linked drain (Anand Parbat) is simulated as having clean drains (`planning.build_pockets` uses 0.0), so it looks safer than the rest.
- `silt_estimate` is 0.496 on every drain: `last_confirmed_clean` is null and `planning.silt_fraction` treats null as 365 days. It is a prior, not a measurement. No public desilting record exists, so silting patterns can only come from confirmed cleans in the app.
- Tests and `web/` fixtures use the placeholder ids and coordinates (`DR-RN-001`, `LP-RN-1`, 28.6433 / 77.1846). With the candidate seed 13 tests fail for that reason alone.

## 10. Availability tests (2026-10-10)

| Item | Result |
|---|---|
| Ward number for Rajinder Nagar | **141** under the 2022 delimitation (SEC ward summary: population 62,224). The Datameet ward GeoJSON uses the 2007 numbering, where "Rajender Nagar" is 149 and 150 is Pusa; 149 and 150 are Malviya Nagar and Green Park in 2022. 2022 boundaries are map PDFs only (`sec.delhi.gov.in/.../ward_141_rajinder_nagar.pdf`). |
| Basin of Old Rajinder Nagar | **Najafgarh drain system, Karol Bagh Zone**, by the 1976 I&FC master plan (`ifc.delhi.gov.in/sites/default/files/inline-files/mcd.docx`). Trunk "Daryai Nallah": originates near Shankar Road, 800 m through Rajinder Nagar, crosses Pusa Road, 3,000 m through Karol Bagh and Sarai Rohilla, 5,700 m in total, 3,386 acres, design 0.7 cusec per acre. Also "Patel Road barrel" (starts at the Pusa Road and Shankar Road crossing, 2,000 m along Patel Road, 0.6 cusec per acre). The plan names Anand Parbat run-off "stagnated in a round-about" and Filmistan "water logged practically every monsoon". |
| Groundwater (CGWB year book 2019-20, India-WRIS 2024) | Karol Bagh tehsil has **no monitoring well**. Nearest: Pusa (NRL) piezometer 2.2 to 2.6 km away, 30.4 m bgl May 2019, 29.4 m May 2024, 28.5 m Nov 2024 (decadal mean about 20 m); Pusa Institute (WTC) decadal mean about 19 m. India-WRIS works with `districtName=Central` (earlier "no data" was a parameter problem). The seed's 3.5 m "shallow" site is not realistic here. |
| Soil texture (SoilGrids) | Returns null for built-up Delhi cells. Not available. |
| Building footprints | Overture (releases 2026-08 and 2026-09 listed on AWS) and ESA WorldCover tile exist; a DuckDB read timed out and was not retried. Not needed for the current parameters. |
| Population raster | WorldPop 100 m India 2020 is reachable (`data.worldpop.org/GIS/Population/Global_2000_2020/2020/IND/ind_ppp_2020.tif`). Not used. |
| Delhi drain or sewer layer on OpenCity | None. Only Pune, Bengaluru, Chennai, Hyderabad. |
| FCO 2026 | Still no PDF link in the static page; needs a browser. |
| CGWB old site | `cgwb.gov.in/old_website` fails certificate verification from this machine; the year book was fetched with verification off and read, since it is a public PDF. |
