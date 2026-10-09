# Rain-Ready: rainfall, weather, river-level and open-data research (tested 2026-10-10)

Raw outputs: `/tmp/claude-1000/-home-rumblejack-dev-allcode-hacks-bharatbuilds/0034f004-30d7-4ae1-b239-fc7f73d17158/scratchpad/rain/` (files `*.out`, `imd_ref.txt`, `dl/dmp.txt`, `reg/*.yaml`).
Test host: a datacentre IP (38.254.177.68), so "blocked" results may differ from a home or AWS IP. Status legend: TESTED-OK = real call returned data; PAGE-SEEN = page or docs fetched, endpoint not callable; SNIPPET = web-search snippet only; FAILED = reason given.

## 0. Key findings (read first)

1. IMD has a real, documented REST API (api.imd.gov.in), but it needs an API key. Calls without a key return `401 {"error":"API key missing"}`. Keys come from Register/Login at https://api.imd.gov.in/public/index.php. The API doc PDF says organisations that want to use it "following IMD's terms and condition" should contact the nodal officer Dr. Sankar Nath, Sc-E, IMD New Delhi (contact details are in the PDF). Not instant, so do not make the 2-day build depend on it.
2. The only unauthenticated official IMD-derived live feed that works is NDMA Sachet CAP RSS (Delhi feed). It carries IMD New Delhi nowcast and warnings (CAP 1.2 XML, district codes). TESTED-OK. These are warnings, so display them only as attributed context.
3. Reanalysis and satellite rain badly under-represent Delhi cloudbursts. For 28 Jun 2024, Open-Meteo (ERA5 grid) gave 14.3 mm for the day and NASA POWER (MERRA-2) gave 7.84 mm, against the IMD gauge figure of 228.1 mm at Safdarjung. Do not use them as ground truth for the simulator. Use them only as labelled context. Use gauge totals (IMD) for events.
4. The IIT Delhi Drainage Master Plan (2018) gives actual Delhi design intensities (Section 4.4). They are 15-minute annual-maximum values: Safdarjung 87.2 mm/h (2-yr) and 112.2 mm/h (5-yr); Palam 79.5 and 95.8 mm/h. 35 mm/h sits well below these 15-min figures, so it is a modest reference intensity. See section 3 for how to word this.
5. India-WRIS has a public, keyless swagger API (POST `/Dataset/RainFall`, `/Dataset/River Water Level`, etc.). The calls work, but every Delhi query I tried returned "No data found", so the district and agency names need discovery. See section 4.
6. data.gov.in, aws.imd.gov.in, data.delhi.gov.in and the IUDX API were not reachable from this host (see tables). Say so in the demo; do not claim them.

## 1. IMD and NDMA

| Source | Publisher | Exact URL / endpoint | What it gives | Resolution / latency | Format | Auth | Limits / licence | VERIFIED |
|---|---|---|---|---|---|---|---|---|
| IMD API portal | IMD | https://api.imd.gov.in/public/index.php (register/login) ; reference https://api.imd.gov.in/public/api_reference.html | API management platform with key-based access | n/a | HTML | Register, then key | Terms per IMD; contact nodal officer (see PDF) | PAGE-SEEN (HTTP 200). Text: "controlled key-based API consumption" |
| IMD API doc PDF | IMD | https://mausam.imd.gov.in/Forecast/marquee_data/API_doc.pdf | Points to the API reference; says to contact nodal officer to use the APIs | n/a | PDF | n/a | n/a | TESTED-OK (HTTP 200, 1 page) |
| City forecast 7 d | IMD | `GET https://api.imd.gov.in/api/v1/cityforecast?id=42182` (42182 = Delhi on the mausam home page link `city_weather.php?id=42182`) ; `/cityforecastloc` adds lat/lon ; `/cityforecast_mapping` lists station ids | Past-24h rainfall (0830 IST to 0830 IST), temps, 7-day text forecast | daily | JSON | API key | HTTP 401 "API key missing" without key | Endpoint exists; fields PAGE-SEEN; data FAILED (no key) |
| Current weather | IMD | `GET https://api.imd.gov.in/api/v1/current_wx[?id=StationId]` | Synoptic obs: pressure, wind, temp, humidity, "Last 24 hrs Rainfall" | per obs (3-hourly synoptic) | JSON | key | - | PAGE-SEEN (docs) |
| District nowcast | IMD | `GET https://api.imd.gov.in/api/v1/districtnowcast[?id=n]` ; station: `/stationnowcast` | Nowcast categories. Cat2 light rain < 5 mm/h, Cat7 moderate 5-15 mm/h, Cat12 heavy > 15 mm/h; plus thunderstorm, dust and lightning categories | nowcast, valid ~3 h | JSON | key | HTTP 401 without key | Endpoint exists (401); category table PAGE-SEEN |
| AWS/ARG data | IMD | `GET https://api.imd.gov.in/api/v1/aws_data?sid=7` (state 7 = DELHI) ; `?id=NDL` ; mapping `/aws_data_mapping` | Automatic weather stations. Sample fields for LODI ROAD (call sign NDL, 28.5885, 77.2224): CURR_TEMP, RH, wind, MSLP, DATE, TIME. The sample shows no rainfall field | hourly-ish; the sample is dated 2024-06-06 | JSON | key | HTTP 401 without key | Endpoint exists (401); sample PAGE-SEEN. Do not assume a rain field exists |
| District rainfall | IMD | `GET https://api.imd.gov.in/api/v1/districtrainfall` (also `/staterainfall`, `/basinqpf`, `/districtwarning`, `/subdivisionwarning`) | Daily/weekly/monthly/cumulative actual vs normal per district | daily | JSON | key | HTTP 401 | Endpoint exists; fields PAGE-SEEN |
| Radar / lightning API | IMD | Listed in the reference index ("Radar Image", "Lightning Data"); I did not extract the exact URL | Radar image | - | - | key | - | SNIPPET (index only) |
| Old guessed endpoints | IMD | https://mausam.imd.gov.in/api/nowcast_district_api.php | Body: "Your IP ... needs to be whitelisted" (HTTP 401) | - | - | IP whitelist | - | FAILED: this path may be a legacy API that needs IP whitelisting. Treat as unusable |
| IMD Delhi station obs (Safdarjung, Palam, Ridge, Lodi Rd, Pusa, Ayanagar) | IMD RWFC New Delhi | Not found as an open API. Station 24h totals appear only in IMD press releases (e.g. 28 Jun 2024: Safdarjung 228.1, Lodhi Rd 192.8, Ridge 150.4, Palam 106.6, Ayanagar 66.3 mm, per a search summary) | - | - | PDF / tweets | - | - | SNIPPET. The press-release PDF URL returned 404 on direct fetch |
| IMD AWS network site | IMD | https://aws.imd.gov.in/ | - | - | - | - | - | FAILED: connection timed out (25 s) |
| IMD gridded rain 0.25 deg | IMD Pune CMPG | https://imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html (also `Rainfall_25_Bin.html`) | Daily gridded rain over India, 1901-2024, 0.25 x 0.25 deg, 135 x 129 grid from 6.5N 66.5E; yearly binary or NetCDF | daily, annual files; updated yearly, not live | GRD binary / NetCDF | Download pages (200). I did not test the file download | Licence not stated on the page | PAGE-SEEN |
| imdlib | PyPI | https://pypi.org/pypi/imdlib/json | Python package "for handling and downloading IMD gridded data", version 0.3.1, MIT | - | - | - | MIT (code only) | TESTED-OK (PyPI JSON 200). I did not run a download |
| NDMA Sachet CAP, Delhi | NDMA / IMD New Delhi | https://sachet.ndma.gov.in/cap_public_website/rss/rss_delhi.xml ; all-India `.../rss/rss_india.xml` ; item link `https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=<id>` | CAP 1.2 alerts: event, severity, headline, effective/expires, LGD district codes, polygon URL (`FetchPolygonXMLFile?identifier=<id>`) | event-driven; "next 3 hours" nowcasts | RSS 2.0 + CAP 1.2 XML | none | `<copyright>public domain</copyright>` in the feed. Attribute "NDMA Sachet / IMD". No published rate limit | TESTED-OK. Delhi RSS 200 (6 KB). Item sample: "Moderate Rain", Severity Moderate, Certainty Likely, sent 2026-09-17T17:48:11+05:30, author "controlroom@ndma.gov.in (IMD New Delhi)", area "Central, East, New Delhi... districts of Delhi" |

Working commands:
```
curl -s https://sachet.ndma.gov.in/cap_public_website/rss/rss_delhi.xml
curl -s "https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1789647517472022"
curl -s https://api.imd.gov.in/api/v1/districtnowcast   # -> {"error":"API key missing"}
```
Note: the Sachet feed is a stale-able site. The newest Delhi item I saw was dated 17 Sep 2026. Test it live before the demo; there may be no item on a dry day.

## 2. Open and keyless weather APIs (point 28.645 N, 77.187 E)

| Source | Publisher | Exact endpoint | What | Resolution / latency | Auth / limits / licence | VERIFIED |
|---|---|---|---|---|---|---|
| Open-Meteo forecast | Open-Meteo | `https://api.open-meteo.com/v1/forecast?latitude=28.645&longitude=77.187&hourly=precipitation&forecast_days=1&timezone=Asia%2FKolkata` | Hourly precip forecast. Also `minutely_15=precipitation&past_minutely_15=8&forecast_minutely_15=4` works | hourly, 15-min via `minutely_15`; models 2-25 km; grid cell snapped to 28.6467 N 77.1722 E, elevation 234 m | No key. Free tier: non-commercial, 600/min, 5,000/h, 10,000/day, 300,000/month, no uptime guarantee (pricing page). Data CC BY 4.0, attribution required (licence page). Commercial use needs a paid key | TESTED-OK (200). First hours of 2026-10-10 were 0.0 mm, 0.3 mm at 17:00 |
| Open-Meteo archive (ERA5) | Open-Meteo / ECMWF C3S | `https://archive-api.open-meteo.com/v1/archive?latitude=28.645&longitude=77.187&start_date=2024-06-28&end_date=2024-06-28&hourly=precipitation&timezone=Asia%2FKolkata` | Hourly ERA5 reanalysis | ~25 km grid | Same terms as above | TESTED-OK. 28 Jun 2024 daily sum = 14.3 mm, hourly max 3.0 mm. This is far below the gauge's 228.1 mm. Daily call: 27/28/29 Jun = 7.9 / 14.3 / 7.9 mm. `models=era5_land` returned null for these dates |
| NASA POWER | NASA LaRC | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=RE&longitude=77.187&latitude=28.645&start=20240627&end=20240629&format=JSON` | Daily MERRA-2 corrected precip | ~0.5 x 0.625 deg, daily; days of lag | No key. No limit read from docs | TESTED-OK: 27/28/29 Jun 2024 = 48.61 / 7.84 / 8.68 mm/day (day boundary is LST and not IMD's 0830 IST). Also underestimates |
| MET Norway locationforecast | MET Norway | `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=28.645&lon=77.187` | Hourly forecast incl. `next_1_hours.details.precipitation_amount` | hourly, then 6-hourly | No key, but a descriptive `User-Agent` with contact is required: the same URL gave 403 with a curl-like default UA and 200 with a custom UA. Terms: CC BY 4.0 and NLOD, attribution | TESTED-OK with `-H "User-Agent: RainReady-hackathon/0.1 you@example.com"`; `updated_at` 2026-10-09T19:18:25Z, precip 0.0 |
| RainViewer | RainViewer | `https://api.rainviewer.com/public/weather-maps.json` then `{host}{path}/256/{z}/{x}/{y}/2/1_1.png` | Global radar composite tiles, past 2 h in 10-min steps | 13 past frames, `nowcast` array empty (0 frames); max zoom 7 | No key. The API doc page did not show rate limits or a licence; read the RainViewer Terms before using | TESTED-OK: JSON 200; a tile PNG 256x256 downloaded. Coarse (zoom 7, about 1 km at best). Not Delhi-specific; IMD radar data is blended in. Treat as a visual, not data |
| OpenWeatherMap | OpenWeather | `https://api.openweathermap.org/data/2.5/weather?lat=28.645&lon=77.187` | - | - | Key required (401 without). Free-tier numbers not checked | Endpoint exists (401); the rest SNIPPET-less, not verified |
| Tomorrow.io | Tomorrow.io | `https://api.tomorrow.io/v4/weather/forecast?location=28.645,77.187` | - | - | Key required (401 without). Free-tier numbers not checked | Same as above |
| NASA GPM IMERG | NASA GES DISC | Console: https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGHHE_07/summary ; S3 `s3://gesdisc-cumulus-prod-protected/GPM_L3/GPM_3IMERGHHL.07/` (us-west-2) | Half-hourly 0.1 deg precip. Early run ~4 h latency (dynamical.org page), Late ~14 h (not checked) | 0.1 deg (~10 km), 30 min | Earthdata login needed for the HTTPS archive (the ges.disc directory index showed a banner page). Registry lists CC BY 4.0 | PAGE-SEEN. No download tested (needs login) |
| IMERG as Zarr | dynamical.org | `s3://dynamical-nasa-imerg` (us-west-2) ; catalogue https://dynamical.org/catalog/nasa-imerg-analysis-early/ | Same data as cloud-optimised Icechunk Zarr, 30-min, Early run "published about 4 hours after observation time" | 0.1 deg, 30 min, 1998 to present | Registry says CC BY 4.0, no account | PAGE-SEEN (page text + registry YAML). Python snippet uses `dynamical_catalog.open("nasa-imerg-analysis-early")`. Not run |
| CHIRPS | UCSB CHC | https://data.chc.ucsb.edu/products/CHIRPS-2.0/ | 0.05 deg daily gauge-satellite rain | daily, ~2-3 week latency (not checked here) | none | PAGE-SEEN (directory index 200). A sub-directory call timed out (25 s). Not a live source |
| ERA5-Land via CDS | Copernicus | https://cds.climate.copernicus.eu/ | Hourly 0.1 deg land reanalysis | ~5-day lag (not verified here) | Account + API key | PAGE-SEEN only |
| Open-Meteo ERA5-Land | Open-Meteo | `models=era5_land` | - | - | - | Returned null values for June 2024 (see above) |

Working commands:
```
curl "https://api.open-meteo.com/v1/forecast?latitude=28.645&longitude=77.187&minutely_15=precipitation&past_minutely_15=8&forecast_minutely_15=4&timezone=Asia%2FKolkata"
curl "https://archive-api.open-meteo.com/v1/archive?latitude=28.645&longitude=77.187&start_date=2024-06-28&end_date=2024-06-28&hourly=precipitation&timezone=Asia%2FKolkata"
curl -A "RainReady/0.1 you@example.com" "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=28.645&lon=77.187"
curl "https://api.rainviewer.com/public/weather-maps.json"
curl "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=RE&longitude=77.187&latitude=28.645&start=20240627&end=20240629&format=JSON"
```
Hackathon licence note: Open-Meteo free API is non-commercial; a hackathon prototype is non-commercial, but say so, and credit "Weather data by Open-Meteo.com (CC BY 4.0)".

## 3. Design rainfall and record events

### 3a. Delhi design intensities (primary source, read from the PDF)
Source: IIT Delhi, "Drainage Master Plan for NCT of Delhi", Final Report, July 2018, Section 4.4 (pp. 118-124). PDF: https://ifc.delhi.gov.in/sites/default/files/ifc/universal/main_report_dmp_version51.pdf (downloaded OK, local text `dl/dmp.txt`). TESTED-OK.

| Station | Data | Method | 2-yr, 15-min intensity | 5-yr, 15-min intensity |
|---|---|---|---|---|
| Safdarjung | 1979-2008, 25 yrs used (5 missing) | EV1 (Gumbel) with PWM; I = mu + alpha*Y_T; mu = 79.116, alpha = 22.071 | 87.205 mm/h | 112.22 mm/h |
| Palam | 1977-2008, 27 yrs used | mu = 74.24, alpha = 14.39 | 79.52 mm/h | 95.84 mm/h |

- The report says the intensities for 30, 45 and 60 minutes were also computed, but the text gives only the formula and a figure (curves for 2, 3, 5, 10 yr, 15-60 min). The 60-min values are not in the extractable text, so I have no number for a 1-hour, 2-year intensity. I will not guess one.
- The report states the 2-yr and 5-yr intensities "have been decided to be used as design storms for NCT of Delhi", only Palam and Safdarjung have long sub-hourly records, and it simulated the 13 Sep 1997 event (2-yr, 88 mm/h 15-min max) and the 27 Jun 2006 event (5-yr) for Safdarjung.
- Annual 15-min maxima in the table at Safdarjung range from 42.4 to 164 mm/h (2008).
- Existing drain capacity: CAG audit and PWD statements (search summaries, SNIPPET) say the drains handle about 25 mm of rain in an hour; experts suggested 62.5 mm in 30 min. A "50 mm" figure in another article was per day. Sources: https://www.indiaenvironmentportal.org.in/news-clippings/delhis-drainage-desilting-and-flood-control-a-big-fraud-cag and https://www.theweek.in/wire-updates/national/2025/05/02/des65-dl-rain-drainage.html (SNIPPET, not opened).
- CPHEEO 2019 manual: the return periods I found (residential 2-5 yr, commercial 5-10 yr, arterial roads 10-25 yr, underpasses 25-50 yr; 1.10-1.30 climate multiplier) come from a third-party summary at https://infralens.in/cpheeo/cpheeo-sw-01. SNIPPET, unverified against the official MoHUA PDF. Do not cite as CPHEEO text.
- IMD IDF paper "Rainfall intensity-duration frequencies for India, for local drainage design" (Mausam journal): https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/4185 (abstract page seen; the PDF values were not read).

### 3b. Is 35 mm/h defensible?
- The IMD API doc's own nowcast scale classes "Heavy rain" as > 15 mm/h (verified in `imd_ref.txt`). So 35 mm/h is more than twice the IMD "heavy" nowcast threshold.
- The IIT Delhi 2-yr design storm is 87 mm/h as a 15-min maximum, and a 1-hour 2-yr intensity is lower (value not in text). 35 mm/h as a one-hour intensity is plausibly near or below the 2-yr 1-hour level, but I cannot state its return period. Do not claim "1-in-N-year". Safe wording: "a reference intensity, about 1.4x the 25 mm/h that CAG says Delhi's drains were designed for, and above IMD's 15 mm/h heavy-rain nowcast threshold. Not a forecast, not a return-period claim."
- 35 mm/h vs the 25 mm/h design capacity is the strongest, citable framing: it shows where drains fail first.

### 3c. Record events (all cited)
| Event | Number | Source |
|---|---|---|
| 28 Jun 2024, Safdarjung, 24 h to 0830 IST | 228.1 mm; 2nd highest June 24-h total since 1901 (1st: 235.5 mm in 1936; 3rd: 191.6 mm on 30 Jun 1981). Same-day: Lodhi Rd 192.8, Ridge 150.4, Palam 106.6, Ayanagar 66.3 mm. Sources disagree on the 1936 date (24 vs 28 June) | Web search summary of IMD table + media: https://www.theweek.in/wire-updates/national/2024/06/28/del110-dl-2ndld-weather.html , https://www.businesstoday.in/amp/india/story/historic-delhi-records-second-highest-rainfall-in-43-years-reveals-imd-data-435102-2024-06-28 . SNIPPET only; IMD press-release PDF URL returned 404 |
| 8-9 Jul 2023, Safdarjung, 24 h | 153 mm, highest July day since 169.9 mm on 25 Jul 1982; July record 266.2 mm in 1958 | https://www.deccanherald.com/amp/story/india%2Fdelhi-records-highest-single-day-rainfall-for-july-since-1982-imd-1235296.html (SNIPPET) |
| 13 Jul 2023 Yamuna at Old Railway Bridge | 208.66 m new HFL at 18:00 (previous 207.49 m, 6 Sep 1978); danger 205.33 m, warning 204.50 m, evacuation 206 m | Search summaries (CWC bulletin and media); SNIPPET. Another snippet gave a wrong-looking 1923 date; ignore |
| 29 Jul 2025 | 63.5 mm at Safdarjung between 0830 and 1130 (~21 mm/h average, my arithmetic); waterlogging at Minto Bridge underpass | https://www.theweek.in/wire-updates/national/2025/07/29/des26-dl-3rdld-weather.html (SNIPPET) |
| Aug 2025 | 399.8 mm, wettest August since 2010 (455.8 mm); max single day 80 mm on 15 Aug (one source) | https://www.theweek.in/wire-updates/national/2025/08/29/des54-dl-rain-data.html (SNIPPET) |
| 20 Aug 2024 | Ridge 72.4, Safdarjung 28.7, Lodi Road 25.6, Ayanagar 2.2 mm | SNIPPET, source link not retained |
| 1 Sep 2021 | 112.1 mm at Safdarjung in 24 h | SNIPPET |
| IMD 24-h categories | Heavy 64.5-115.5; very heavy 115.6-204.4; extremely heavy >= 204.5 mm | IMD national bulletins (https://rsmcnewdelhi.imd.gov.in/uploads/archive/1/1_f389dc_23.National%20Bulletin%20No%2023-18th%20Sept2024_0530%20IST.pdf), SNIPPET |

No 2026 Delhi event was found in my searches. Do not claim one.

## 4. River and drain levels

| Source | URL | Result | VERIFIED |
|---|---|---|---|
| CWC Flood Forecast site | https://ffs.india-water.gov.in/ | HTTP 200, an Angular SPA (runtime-es2015 bundle). I found no JSON endpoint in the HTML. Guessed `/ffm/api/stations` and `/api/` returned 404 | PAGE-SEEN. No usable endpoint found (data loads from the SPA's own backend that I did not locate in the JS bundles) |
| CWC daily flood bulletins | e.g. https://cwc.gov.in/sites/default/files/cfcrcwcdfb13.07.2023_0.pdf | Lists "Delhi Railway Bridge" with warning 204.5 and danger 205.33 (per search summary) | SNIPPET. PDFs are the practical fallback (manual) |
| India-WRIS API (Swagger) | https://indiawris.gov.in/swagger-ui/index.html ; spec `https://indiawris.gov.in/v3/api-docs` | OpenAPI "WRIS API" v1.0, server https://indiawris.gov.in. All endpoints are POST with query params: `/Dataset/RainFall`, `/Dataset/River Water Level`, `/Dataset/River Water Discharge`, `/Dataset/Ground Water Level`, `/Dataset/Reservoir`, `/Dataset/Temperature`, plus `/Dataset/Basin/...`. Params: stateName, districtName, agencyName (e.g. CWC), startdate, enddate (yyyy-mm-dd), download, page (>=0), size (1-1000). Responses JSON, XML or CSV | TESTED-OK (spec downloaded, 38 KB) |
| WRIS data call | `curl -X POST "https://indiawris.gov.in/Dataset/RainFall?stateName=Delhi&districtName=New%20Delhi&agencyName=CWC&startdate=2024-06-27&enddate=2024-06-28&download=false&page=0&size=5"` | HTTP 200 `{"statusCode":500,"message":"No data found for the given criteria.","data":[]}`. Same for Central Delhi, and for River Water Level | Call works with no key. No Delhi data returned with the names I tried. District or agency spelling or agency (CWC may not hold Delhi rain) may be wrong; this needs a short discovery loop through the other agencies. Not resolved |
| Delhi I&FC department | https://ifc.delhi.gov.in/ | Site up. Has Flood Control Rooms page (phone numbers; helpline for water logging 1800-11-0093) and the Drainage Master Plan 2018 PDF. A "Water Levels" link is a photo gallery. I found no data feed or daily bulletin API | PAGE-SEEN |
| Hathnikund discharge | not located | - | Not found. Do not claim |
| Google Flood Forecasting API | https://developers.google.com/flood-forecasting | Free, CC BY 4.0, but needs a waitlist form, approval, API key and a Cloud project. Riverine only (the page says "riverine flood forecasts"); it does not cover urban drain waterlogging | PAGE-SEEN |

## 5. Open-data portals

| Portal | URL | Auth | Result | VERIFIED |
|---|---|---|---|---|
| data.gov.in OGD | catalogue pages https://www.data.gov.in/ (200). API: `https://api.data.gov.in/resource/<resource-id>?api-key=KEY&format=json&offset=0&limit=10&filters[field]=value` | Key from https://api.data.gov.in/signup/ (per search summary), also "My Account" after login | api.data.gov.in resolved to 164.100.61.198 but TCP port 443 refused/timed out from this host. IMD sub-divisional monthly rainfall resource page https://data.gov.in/resource/sub-divisional-monthly-rainfall-1901-2017 says no API exists, use "Request API". I have no verified rainfall resource ID. The OGD daily IMD grid resource exists: https://www.data.gov.in/resource/daily-rainfall-data-india-meteorological-department-imd-grid-model-agency-during-725 (seen in a search; not opened) | API FAILED (connection). Catalogue PAGE-SEEN. No resource IDs verified |
| data.delhi.gov.in | https://data.delhi.gov.in/ | - | DNS did not resolve | FAILED |
| OpenCity Delhi rainfall | https://data.opencity.in/dataset/delhi-rainfall-data | none | Page 200. "Delhi North Monthly Rainfall Data 1901-2021" CSV from imd.gov.in, public domain per search summary | PAGE-SEEN. Monthly, so useless for hourly design |
| Delhi Open Transit Data | https://otd.delhi.gov.in/ | Terms acceptance | Static DMRC data and real-time GTFS-RT; not rain related; site up (200) | PAGE-SEEN |
| IUDX catalogue | https://catalogue.iudx.org.in/ (200 page). API host `api.catalogue.iudx.io` did not resolve (timeout) | - | I found no Delhi flood or rain dataset (a 2021 deployment deck lists Faridabad, not Delhi) | PAGE-SEEN; API FAILED |
| CPCB, Bhuvan, NRSC | https://app.cpcbccr.com/ccr/ , https://bhuvan-app1.nrsc.gov.in/ | - | Both returned 200. I did not find or test any rain or flood API there | PAGE-SEEN only |
| Google Flood Hub | https://sites.research.google/floods/ | - | Public map 200; see API row above. `floodhub.google.com` did not resolve | PAGE-SEEN |

## 6. AWS Registry of Open Data (read from awslabs/open-data-registry YAML and anonymous S3 listing)

| Dataset | S3 path (region) | Notes | Anonymous listing test |
|---|---|---|---|
| GPM IMERG Final/Late/Early half-hourly 0.1 deg | `s3://gesdisc-cumulus-prod-protected/GPM_L3/GPM_3IMERGHH.07/` , `.../GPM_3IMERGHHL.07/` (us-west-2) | CC BY 4.0, registry says RequesterPays false; Earthdata login for HTTPS | not tested (needs Earthdata credentials) |
| IMERG as Zarr (dynamical.org) | `s3://dynamical-nasa-imerg` (us-west-2) | CC BY 4.0; Early run ~4 h latency; SNS new-object topic | not tested |
| CHIRPS (NASA copy) | registry entry `nasa-chirps` lists `s3://nsidc-cumulus-prod-protected/HMA/...` (a High-Mountain-Asia product, not global CHIRPS) | ignore for Delhi | - |
| ERA5 | `s3://era5-pds` (us-east-1, NetCDF, monthly update) ; `s3://nsf-ncar-era5` (us-west-2) ; Icechunk/Zarr `s3://earthmover-icechunk-era5/icechunkV2` (us-east-1, CC BY 4.0) | era5-pds anonymous HTTPS list returned 403 AccessDenied (use the AWS CLI `--no-sign-request` with an exact prefix) | era5-pds root list: 403 |
| NOAA GFS | `s3://noaa-gfs-bdp-pds` (us-east-1), every 6 h; also `noaa-gfs-pds` | open to the public | TESTED-OK: listed `enkfgdas.20210212/` etc. |
| Copernicus DEM | `s3://copernicus-dem-30m` , `s3://copernicus-dem-90m` (eu-central-1) | GLO-30 COG tiles, keys like `Copernicus_DSM_COG_10_N00_00_E006_00_DEM/...` | TESTED-OK |
| ESA WorldCover | `s3://esa-worldcover` (eu-central-1) | 10 m land cover 2020 and 2021; includes `esa_worldcover_grid.fgb` | TESTED-OK |
| Sentinel-2 L2A COGs | `s3://e84-earth-search-sentinel-data` (us-west-2); the old `sentinel-cogs` bucket also lists `sentinel-s2-l2a-cogs/` | STAC via Earth Search | TESTED-OK (listing of sentinel-cogs) |
| Sentinel-1 GRD | `s3://sentinel-s1-l1c` (eu-central-1) | - | not tested |
| Overture Maps | `s3://overturemaps-us-west-2/release/` (us-west-2), GeoParquet, monthly | listing showed `bridgefiles/`, `changelog/` | TESTED-OK |
| RAPID NRT flood maps | `s3://rapid-nrt-flood-maps` (us-west-2) | CC BY-NC-SA 4.0 (non-commercial) | not tested |
| OSM | `s3://osm` registry entry exists (`datasets/osm.yaml`) | - | not tested |
| Terrain Tiles | `s3://elevation-tiles-prod` (us-east-1) | - | not tested |
| Open Buildings (Google) | NOT in the registry YAML list that I scanned (search for "building" matched only copernicus-dem and overture). Source Cooperative host `data.source.coop` returned a proxy banner only | do not claim it is on AWS | FAILED to find |

Command example (GFS, works anonymously over HTTPS): `curl "https://noaa-gfs-bdp-pds.s3.amazonaws.com/?list-type=2&max-keys=3&delimiter=/"`.

## 7. Not verified (be honest in the demo)
- Any IMD API data (needs key). aws.imd.gov.in. data.gov.in API. data.delhi.gov.in. IUDX API. CWC FFS JSON. Hathnikund. India-WRIS Delhi rows. GPM/CHIRPS/ERA5-Land downloads. OpenWeatherMap and Tomorrow.io free-tier numbers. MET Norway rate limits. RainViewer licence and limits.
- All 2023-2025 event numbers come from web-search summaries of news and IMD tweets, not from the original IMD files.
