# Rain-Ready: waterlogging / flood-prone location data research
Researched 2026-10-10. Pilot: Old Rajinder Nagar + Karol Bagh (bbox S28.632 W77.170 N28.662 E77.205).
Local test downloads (not in repo): /tmp/claude-1000/-home-rumblejack-dev-allcode-hacks-bharatbuilds/0034f004-30d7-4ae1-b239-fc7f73d17158/scratchpad/hotspots/ (fco_2025.pdf, fco_2025.txt, dmp.pdf, fco_old.pdf, nodal.pdf, PWD html pages).

VERIFIED labels used:
- OPENED = I fetched/downloaded the page or file and read the passage cited.
- SNIPPET = only seen in a search-result summary; not opened. Do not cite without re-checking.
- FAILED = tried, could not read (reason given).

NO coordinates exist in any official list found. Everything below is place names only. Geocoding must be done separately and flagged as such.

---------------------------------------------------------------
## 1. Official lists and orders

### 1.1 Flood Control Order (FCO) 2025 - BEST SOURCE (OPENED)
- Publisher: Dept of Revenue, GNCTD (Divisional Commissioner), hosted by Irrigation & Flood Control Dept.
- URL: https://ifc.delhi.gov.in/sites/default/files/ifc/universal/fco_2025.pdf  (HTTP 200, 2.7 MB, 146 pages, text-extractable with pdftotext)
- Contents: control rooms, committees, vulnerable points of I&FC (Yamuna embankments, drains), drain annexures, telephone directories, police district/station lists, and THREE compiled waterlogging lists:
  - "COMPILED LIST OF WATER LOGGING LOCATIONS OBSERVED IN THE YEAR 2022" (doc p.54 on): my parse counts about 172 numbered rows.
  - "... YEAR 2023" (p.63 on): about 287 numbered rows.
  - "Water Logging Incidents Observed during 2024" (p.74 on): header says "(Total Location- 165)"; the index of the same PDF says "(Total Location -194)"; I counted about 138 numbered rows in the text. The three numbers disagree inside the document itself. Treat count as unreliable; 194 is also the figure quoted by Tribune (DDMA briefing, see 1.6).
- Columns: 2022/2023 lists = S.No, Name of Road, Specific Location, Date(s), Frequency (column often empty in text). 2024 list = SI.No, Name of Specific Location, Name of Road (header labels look swapped vs content), Date of Water Logging.
- Agency per point: NO. No owning agency, no traffic circle, no coordinates. Only road + specific location + dates.
- Agency responsibility is stated only generically (p. ~ "Water Logging for removal of stagnet water Civil authorities like M.C.D(s)., N.D.M.C. Cantonment Board, D.D.A., DSIIDC, PWD and DUSIB will be responsible for draining / pumping out water from their respective areas of jurisdiction.") and "Delhi Jal Board shall ensure by 15th June 2025 that all sewers have been desilted...".
- Also contains Annexure B/C "List of Drains under Control of I&FC Deptt." and police station list per district; Karol Bagh sub-division list: "15 Karol Bagh | Deshbandhu Gupta Road, Prashad Nagar, Karol Bagh, Rajinder Nagar, New Delhi Railway Station, Hauz Qazi, Pahargunj, Nabi Karim, Kamla MKT." (that is a revenue/ward-like grouping, p.~ Revenue Areas of Sub-Division).
- Licence/reuse: none stated (GNCTD public document). Treat as public record; cite.
- Machine readability: PDF with text layer; tables flatten badly (multi-line cells, dates in column). Parsing needs care and manual check.
- I&FC "Vulnerable points" section (pp.13-15) lists I&FC river/embankment points only (Dahisara Bund, Shank No.7 etc.), NOT urban waterlogging. Not relevant for pilot.

#### Pilot-area entries in FCO 2025 (exact text from fco_2025.txt; OPENED)
Page refs are the "Page N of 146" stamp nearest the entry.

2022 list ("OBSERVED IN THE YEAR 2022"):
| # | Road | Specific location | Dates (as printed) |
|---|---|---|---|
| 9 | New Rohtak Road | "Anand Parbat near Gali No. 10/ Zakhira to Anand Parbat" | 23.05.2022, 30.06.2022, 11.07.2022, 16.07.2022, 20.07.2022, 05.08.2022, 22.09.2022, 08.10.2022 |
| 11 | Pusa Road | "Bagga Link Hanuman Mandir" | 23.05.2022 |
| 12 | Rani Jhansi Marg | "Filmistan" | 23.05.2022 |
| 88 | Pusa Road- Vande Matram Marg | "Roundabout Bagga and surrounding area of Baba Lal Dayal Chowk" | 30.06.2022, 08.10.2022 |
| 90 | Rani Jhansi Marg | "Azad Market Chowk" | 30.06.2022 |
| 42 | Girdhari Lal Goswami | "Naraina T-Point" | 30.06.2022 (outside bbox probably; listed for context) |

2023 list:
| # | Road | Location | Dates |
|---|---|---|---|
| 121 | New Rohtak Road | "Near Gali No.10, Anand Parbat at the foot of Flyover" | 18.03.2023, 27.05.2023, 08.07.2023, 09.07.2023 |
| 164 | PUSA Road | "Karol Bagh Metro Station" | 09.07.2023 (and 22.07.2024 appears as a continuation line under this row) |
| 165 | PUSA Road | "R/A Bagga Link" | 08.07.2023, 09.07.2023 |
| 166 | Pusta [sic] Road | "Roundabout Jhandewalan/ Bagga Link, Near Hanuman Murti/ Near Bagga Link Service Station" | 18.03.2023, 20.03.2023, 30.03.2023, 27.06.2023 |
| 175 | Ram Bagh Road | "Railway under bridge, Azad Market" | 08.07.2023 |
| 177 | Rani Jhansi Marg | "DCM Chowk" | 09.07.2023 |
| 178 | Rani Jhansi Marg | "Filmistan" | 03.05.2023 |
| 179 | Rani Jhansi Marg | "Y-Point Underpass, Azad Market" | 01.04.2023 |
| 180 | Rani Jhansi Road | "Under Rani Jhansi Road Flyover" | 06.07.2023 |

2024 list:
| # | Name of specific location (col 1) | Road (col 2) | Date |
|---|---|---|---|
| 13 | Dr. Bhim Rao Ambedkar Marg | "Bagga Link Roundabout Hanuman Mandir" | 27.06.2024 |
| 14 | Dr. K.S. Krishnan Marg | "East Patel Nagar Bus Stand on the carriageway going towards Ratanpuri" | 13.08.2024 |
| 15 | Girdhari Lal Goswami Marg | "Opposite main gate of Katputli Colony on the carriage towards Naraina" | 15.07.2024 |
| (cont. of 2023 #164) | PUSA Road | Karol Bagh Metro Station | 22.07.2024 |

NOT found in any of the three lists (grep for rajinder, rajendra nagar, shankar road, bara bazar/bazar marg, ganga ram, dev nagar, ranjit nagar, desh bandhu): zero hits for Old Rajinder Nagar, Shankar Road, Bazar Marg, Ganga Ram Hospital Marg, Dev Nagar. "Dr. Rajendra Prasad R/A Dr. Rajendra Prasad Road 04.07.2023" is a different place (central Delhi, not the pilot). "Shankar Vihar" (NH-48) is Delhi Cantt, not Shankar Road. KEY GAP: the traffic-police lists record arterial roads/junctions that disrupt traffic, so the interior lanes where Old Rajinder Nagar floods (Bazar Marg, Shankar Road) are absent. The pilot's real trouble spots are not in the official lists.

### 1.2 FCO 2026 - EXISTS, PDF NOT FOUND
- Page exists: https://ifc.delhi.gov.in/ifc/flood-control-order-2026 (OPENED; HTTP 200; page title "Flood Control order 2026."; I saw no PDF link in the static HTML, likely injected by JS or absent).
- Guessed PDF names fco_2026.pdf, FCO_2026.pdf, fco-2026.pdf, fco2026.pdf, FCO2026.pdf all HTTP 404. fco_2024.pdf also 404 (2024 PDF name unknown).
- Site also links an orders listing: https://ifc.delhi.gov.in/orders and a Delhi gov central orders search filtered to IFC: https://delhi.gov.in/centralized-cos (field_domain_id_value=IFC). Not opened.
- News (OPENED): Daily Pioneer 18 June 2026, https://www.dailypioneer.com/news/cm-issues-flood-control-order-2026-makes-nodal-officers-accountable-for-waterlogging : CM issued FCO-2026 "on Wednesday" (17 June 2026); "a nodal officer be appointed for every identified waterlogging point in the city"; control room 24x7 since 15 June; "more than 243" pumps; desilting of 77 drains; MCD cleaned 793 drains deeper than four feet. No list and no PDF link in the article.
- Next step: ask I&FC / Revenue Dept, or browse https://ifc.delhi.gov.in/orders in a real browser.
- 2024 edition and older: not found (2019 edition found, see 1.3).

### 1.3 FCO 2019 (older edition) (OPENED, partial)
- URL: https://revenue.delhi.gov.in/sites/default/files/revenue/important-news/part_1_1.pdf (HTTP 200, 4.9 MB; PDF has only 60 of the 123 pages).
- Annexures M and N: "AREAS WHERE REPEATED WATER LOGGING NOTICED DUE TO RAIN (AS CIRCULATED BY DELHI TRAFFIC POLICE VIDE LETTER NO. 4138-4147/TE/(D-11)/TRAFFIC DATED AT NEW DELHI 07.05.2019)". Pages are scanned images (no text layer). I viewed one page image: columns = S.No, road, location, dates (2017), frequency. No agency column. I did not read the pilot-area rows. Needs OCR or manual reading.

### 1.4 Delhi Traffic Police waterlogging lists (direct) - NOT FOUND AS A PUBLIC FILE
- I did not find a Traffic Police-hosted PDF/table. The lists appear to be circulated to agencies by letter and then reproduced in the FCO (1.1, 1.3), in the IIT Delhi Drainage Master Plan Appendix III (1.5) and in PWD orders.
- Counts in news (all SNIPPET unless noted; counts conflict, do not cite without opening):
  - Tribune 30 Apr 2025 (OPENED, https://www.tribuneindia.com/news/delhi/officers-deployed-at-335-key-spots-to-prevent-waterlogging): PWD order issued 28 April 2025; "335 vulnerable locations" = 214 spots identified by DTP in 2023 and 121 flagged in 2024 "pertained to the PWD"; seven perennial hotspots for special monitoring: Minto Bridge; Pul Prahladpur Underpass; Ring Road opposite WHO building; Jahangirpuri Metro Station Road; under Zakhira Flyover; Loni Road Golchakkar; Karala-Kanjhawla stretch. Pilot area not named.
  - PTI via The Week 19 Jun 2025 (OPENED, https://www.theweek.in/wire-updates/national/2025/06/19/des66-dl-pwd-waterlogging.html): 308 points in 2023 (per PWD); 410 points in 2025 from traffic police data; 335 of 410 under PWD; "71 points" outside PWD remit or with coordination issues; 11 district magistrates told to fix them; named locations in article: Minto Bridge, Azadpur, ITO. (Another search summary quoted 445 for 2025; I did not find 445 in the pages I opened, so do not cite 445.)
  - Pioneer 16 Jul 2026 (OPENED, https://dailypioneer.com/news/traffic-police-civic-agencies-review-congestion-waterlogging-hotspots): multi-agency review of "24 identified congestion and possible waterlogging stretches"; nine named incl. "Anand Parbat-New Rohtak Road", Nigambodh Ghat, 100 Futa Road near Burari, Kapashera, DM Office LBS, Okhla Underpass, Jahangirpuri Metro, Pandav Nagar Underpass, tunnel India Gate to Ring Road. Nine agencies attended (Traffic Police, NHAI, DMRC, PWD, MCD, DJB, Transport Dept, DTC, TPDDL). "The article does not assign any specific agency to any specific location."
  - Tribune 21 Jul 2026 (OPENED, https://www.tribuneindia.com/news/delhi/waterlogging-prone-sites-in-capital-down-by-80/): per DDMA briefing, waterlogging-prone sites "194 in 2024, 169 in 2025, and 34 in 2026 so far"; no location names.
  - "169 traffic hotspots" (Pioneer, year tag unclear) and "448 mapped" (Outlook/PTI): SNIPPET only.
- Agency per point: none of the opened sources provides it.

### 1.5 IIT Delhi "Drainage Master Plan for NCT of Delhi, Final Report, July 2018" (OPENED, main report only)
- Publisher: IIT Delhi for Dept of Irrigation & Flood Control. URL: https://ifc.delhi.gov.in/sites/default/files/ifc/universal/main_report_dmp_version51.pdf (HTTP 200, 4.1 MB, 153 pages).
- Quote: "examination of their [Delhi Traffic Police] records reveal a total of 330 segments that could be designated as drainage hot spots within the capital territory as listed in APPENDIX III." Barapullah basin: "There are 162 water logging locations which have been identified by Delhi Traffic Police".
- Appendix III (the 330-location list) is NOT in this PDF (appendix titles only, p.132-134). Pilot area sits in Barapullah/Najafgarh basin boundary; I found no pilot place names in the main text (grep for Rajinder, Karol Bagh, Pusa returned nothing).
- Also has SWMM model results and "Flooding junction" appendices (not included). Plan later reported shelved/"generic" (SNIPPET only).
- Licence: none stated.

### 1.6 PWD Delhi
- PWD portal (OPENED): https://www.pwddelhi.gov.in/ (the URL /Home/ShowWaterLogging returned the home page). Shows toll free 1908, "PWD SEWA" app, "PWD SEWA on WhatsApp", "Nodal Officers", "Desilting of Drain", "PWD Road/Drain Map".
- PWD Drain Map page (OPENED, static shell): https://www.pwddelhi.gov.in/pwd-drain-map. Filters: Block = Alipur / Kanjhawala / Najafgarh only; Drain type (box, rectangular, circular, pipe, trapezoidal); Map and Table views with Export. Data loads via JS (endpoint not identified). Covers only outer blocks; central Delhi / Karol Bagh not offered. "Desilting of Drain" page (https://www.pwddelhi.gov.in/desilting-drain): "No data found" at time of fetch.
- Nodal officer order: https://ppwddelhi.s3.ap-south-1.amazonaws.com/pwd/nodal/Nodal_Officers_Revised_List.pdf (OPENED, 2 pages, poor scan text). It is a 2018-numbered subject-nodal order (e.g. SE C&ND Circle: "Drainage and Flood Management"), not a per-waterlogging-point list. A per-point nodal list for 2025/2026 was not found.
- PWD monsoon control room (OPENED, Pioneer 10 Jul 2026, https://dailypioneer.com/news/4-waterlogging-hotspot-underpasses-stay-open-amid-rain-pwd-minister-reviews-operations): "the PWD has identified 45 waterlogging-prone locations across the city"; 179 CCTV cameras connected to the central control room; 24x7 monsoon control room staffed by Assistant Engineers; helpline 1908; control room 011-23490323; WhatsApp chatbot 8130188222; underpasses named: Minto Bridge, Zakhira, Dhaula Kuan, Moolchand. The 45 locations are not listed in the article.
- PWD list of waterlogging points with agency: not published as a table that I could find.

### 1.7 MCD Karol Bagh Zone vulnerable points; NDMC - NOT FOUND
- Searches returned nothing usable. The only MCD-specific pilot material is news (see sec. 2). NDMC: FCO 2025 text says "NDMC area gets flooded - Due to improper outfall of MCD Drains ... Sunheripul Nala, Purana Quila" (2023 flood problems section, OPENED) - outside pilot.
- FCO 2025 lists MCD zones' flood control contacts (Karol Bagh zone appears in telephone section; line "KAROL ZONE BAGH" in text ~line 5934) - useful for "owning agency" contact but not hotspots.

### 1.8 Delhi Jal Board (DJB)
- Outlook India (OPENED; published 28 Jun 2023, updated 18 Jan 2024; https://www.outlookindia.com/amp/story/national/djb-appoints-nodal-officers-to-mitigate-problem-of-waterlogging-news-298759): DJB order effective 27 June directed monitoring of 41 vulnerable points; only six named: Lothian Road, the railway underpass on Minto Road, Loni Road, MB Road, Hanuman Setu, Ring Road. Full list not public in the article. 11 nodal officers each for 4-9 assembly constituencies.
- DJB open data portal (SNIPPET): https://data.opencity.in/organization/delhi-jal-board lists sewer pipeline and manhole KML layers; not opened. These are assets, not overflow points.

### 1.9 DDMA / Delhi Disaster Management Plan
- Not located as a hotspot list. DDMA review counts only via Tribune (above). OpenCity hosts DDMA flood layers (sec. 4.1, riverine, not urban waterlogging).

---------------------------------------------------------------
## 2. Old Rajinder Nagar incident, 27 July 2024 (Rau's IAS Study Circle)
Site: Plot BP-11, Bazar Marg [The Week/ThePrint 2026 summary of CBI says "Plot No. BP-11, Bazar Marg, Old Rajinder Nagar" (SNIPPET via search summary; ThePrint article opened did not show the plot)]. Tribune calls the road "Bada Bazar Road".

What is established (OPENED sources only):
1. Tribune 30 Jul 2024 (updated 2 Aug 2024) https://www.tribuneindia.com/news/delhi/coaching-centre-tragedy-ramps-constructed-over-drains-blocked-water-flow-inquiry-report : initial magisterial report (ordered by Revenue Minister Atishi, filed by the District Magistrate; detailed report to follow). Quotes: "the property owners in the area have constructed ramps over stormwater drains thereby blocking the entry of rainwater"; area "in the shape of a saucer with the lowest point falling right in front of Rau's coaching centre"; "the coaching institute had completely blocked the drainage system". MCD inspected "the barrel, a larger pipe carrying mixed discharge from Shankar Road and Old Rajinder Nagar" and found no silt obstruction; DJB sewer in nearby backlane showed no overflow. Drain owner: NOT stated.
2. The Week/PTI 9 Aug 2024 https://www.theweek.in/wire-updates/national/2024/08/09/des4-dl-coaching-deaths-report.html : full magisterial report (DM Central) to the Revenue Minister; drains "not desilted for five years" though low-lying and waterlogging-prone; MCD accused of "passing the buck" and "shrugging off their responsibility" on desilting of drains on both sides of the road; blames MCD engineers ("deliberate misconduct with malafide intentions" re sealing basement), fire dept ("serious lapse"), coaching owners ("criminal negligence"). 15 statements recorded. Drain ownership: NOT stated in the article.
3. Verdictum, Delhi High Court 2 Aug 2024 https://www.verdictum.in/court-updates/high-courts/breaking-delhi-high-court-transfers-to-cbi-investigation-into-recent-water-flooding-tragedy-killing-3-students-at-upsc-coaching-centre-1546451 : Division Bench (Acting CJ Manmohan, J. Tushar Rao Gedela) transferred probe to CBI; MCD Commissioner told court "the stormwater drain is dysfunctional" and "has been encroached upon by residents"; court directed MCD Commissioner to ensure drains functional and "Encroachments and illegal constructions in the area shall be removed forthwith"; committee headed by Chief Secretary with MCD Commissioner, Delhi Police Commissioner, DDA VC, report in four weeks. Agency responsible not explicitly stated but the court directs MCD.
4. DT Next/PTI 28 Jul 2024 https://www.dtnext.in/news/national/coaching-centre-deaths-storm-drains-were-covered-by-encroachers-says-mcd-official-797114 : MCD official: "people on street sides have encroached and covered the storm drains." Referred PTI to Karol Bagh zone DC, who did not respond. Locals said drains "heavily clogged with silt".
5. Tribune 28 Jul 2024 (updated 20 Aug 2025) https://www.tribuneindia.com/news/delhi/tragedy-was-waiting-to-happen-waterlogging-in-old-rajinder-nagar-ignored-for-decades-644292 : residents: "This area is a low-lying zone, and water has always accumulated here"; Shankar Nagar and New Rajinder Nagar on higher ground drain into it; roads near Metro station raised; residents sent videos to officials for ~15 days before the deaths.
6. ThePrint 13 Jul 2026 https://theprint.in/india/cbi-supplementary-final-report-names-3-mcd-engineers-for-negligence-in-2024-coaching-centre-deaths/2985254/ : CBI supplementary final report dated 8 July (2026) names three MCD officials of the "Karol Bagh Zone's building department": JE Arnav Datta ("falsely reported the basement was being used for furniture storage"), AE Rajeev Kumar Jain, EE Kumar Mahendra; clean chit to DC Kumar Abhishek and ex-SE Ajay Nagpal. About building misuse, not drains.
7. ThePrint 20 Jul 2026 https://theprint.in/india/2-yrs-after-raus-ias-deaths-delhis-old-rajinder-nagar-has-got-a-facelift-but-its-a-band-aid/2990616/ : road outside old Rau's freshly laid; "A senior MCD official said encroachments over rainwater drains were removed"; basement libraries shut; residents: "Rental properties continue to rent out their basements, and these areas still flood whenever it rains." Only MCD named.

Not verified / gaps:
- MHA committee report: only formation seen (SNIPPET: Scroll, Deccan Herald). No final report text found.
- Delhi HC later orders, CBI first chargesheet: not opened.
- Who OWNS the Bazar Marg / Shankar Road drain (MCD vs PWD vs I&FC): no opened source states it outright. All official action points at MCD (Commissioner told HC; MCD removed encroachments; Karol Bagh Zone). Chief Secretary asked six agencies (I&FC, PWD, MCD, NDMC, DDA, Cantt) for desilting reports (SNIPPET from search summary of a PTI/Chief Secretary report; not opened). Treat "owner = MCD Karol Bagh Zone" as likely but UNVERIFIED for the specific drain; recommend RTI / MCD drain map.
- "MCD planned drainage on Satpal Bhatia Marg, Rs 2.74 crore" (SNIPPET only, could not corroborate).

---------------------------------------------------------------
## 3. News-reported waterlogging in/near pilot (names only; no coordinates)
| Place name as reported | Date | Source (opened) | What was reported |
|---|---|---|---|
| Pusa Road near Hanuman Mandir; Jhandewalan Mandir | 1 May 2023 | https://www.india.com/news/delhi/delhi-rains-latest-update-traffic-jam-waterlogging-reported-across-delhi-ncr-after-heavy-rains-list-of-roads-to-avoid-6025805/ | Traffic affected on Pusa Road near Hanuman Mandir; traffic problems at Jhandewalan Mandir (police via X) |
| Karol Bagh (Tibbia College Society) | 9 Jul 2023 | https://organiser.org/2023/07/09/182857/bharat/waterlogging-traffic-snarls-as-delhi-witnesses-seasons-first-heavy-spell-of-rain/amp/ | Karol Bagh named ONLY for a fatal wall collapse in heavy rain, not as waterlogged |
| Old Rajinder Nagar (waist-high water); Karol Bagh among areas "severely impacted" | 31 Jul 2024 (pub. 1 Aug 2024) | https://www.tribuneindia.com/news/delhi/heavy-rain-paralyses-delhi-old-rajinder-nagar-worst-hit/amp | Old Rajinder Nagar worst hit, "rainwater rising to waist-high levels"; ITO, Karol Bagh, Mayur Vihar, CP severely impacted with traffic jams |
| Old Rajinder Nagar, Rajinder Nagar, Shankar Nagar, New Rajinder Nagar | 27-28 Jul 2024 | Tribune 644292 (see sec. 2) | Chronic flooding, residents' accounts |
| Rajinder Nagar (resident accounts) | pub. 20 Jan 2025 | https://www.tribuneindia.com/news/delhi/rajinder-nagar-residents-bear-the-brunt-of-poor-infra | Residents say nothing improved; no agency named; no official response in article |
| Patel Nagar | 29 Jul 2025 | https://www.theweek.in/wire-updates/national/2025/07/29/des6-dl-2ndld-weather.html | Listed among areas of waterlogging/traffic disruption ("Naraina, Patel Nagar, Vijay Chowk"); also Azad Market Railway Underpass, Ram Bagh Road, Zakhira Railway Underpass, Dhaula Kuan. Karol Bagh/Pusa Road/Rajinder Nagar not in article |
| Anand Parbat-New Rohtak Road | 14-16 Jul 2026 | Pioneer (sec. 1.4) | Named among 24 congestion/possible waterlogging stretches under multi-agency review |
| Old Rajinder Nagar | 20 Jul 2026 | ThePrint (sec. 2 item 7) | Basements "still flood whenever it rains" per resident; road outside Rau's not flooded since repairs per one aspirant |
Not found: any opened 2025 or 2026 report of waterlogging specifically on Karol Bagh Bara Bazar Marg / Shankar Road / Pusa Road. Times of India and Hindustan Times pages were not retrievable via search (no TOI/HT results). Deccan Herald 2025/2026 pages returned 403.
Searched-but-unopened (SNIPPET): Newslaundry 31 Jul 2024 "days after 3 deaths delhi coaching hub flooded again" https://newslaundry.com/2024/07/31/days-after-3-deaths-delhi-coaching-hub-flooded-again .

---------------------------------------------------------------
## 4. Research / civic datasets

### 4.1 OpenCity "Delhi Flooding Data" (DDMA) - SNIPPET ONLY / FAILED TO OPEN
- Search-result summary: dataset https://data.opencity.in/dataset/delhi-flooding-data with KML layers: Delhi 2 Year Flood Points (~579 KiB), 5-year flood points, Flooded Areas 2023, flood levels 205m to 209m; credited "Floods data and maps for Delhi from DDMA"; licence shown as public domain; "Data last updated October 22, 2024".
- My fetch of that URL and of the 2-year points resource returned HTTP 404 (both WebFetch and curl, 6 KB body). Slug may have changed. Not verified.
- Caveat: these are Yamuna/riverine flood-level and return-period layers, not street waterlogging pockets. Probably not useful for Old Rajinder Nagar.
- OpenCity also hosts Delhi Traffic Police datasets (jurisdictions, crash report 2023) and DJB sewer KML (SNIPPET); no waterlogging-point layer seen.

### 4.2 IIT Delhi Drainage Master Plan 2018 - see 1.5 (OPENED). Related papers (SNIPPET): Kumar, Kaushal, Gosain (IIT Delhi) iRIC hydrodynamic simulation, https://jart.icat.unam.mx/index.php/jart/article/view/704 ; IIT Delhi Dhanya CT urban flood early warning, piloted in Barapullah basin (Minto Bridge, Lajpat Nagar etc.). Not opened.

### 4.3 Sentinel-1 2023 Yamuna flood
- Paper SNIPPET: "Real-time flood inundation monitoring in Capital of India using Google Earth Engine and Sentinel database" https://kbes.journals.publicknowledgeproject.org/index.php/kbes/article/view/8459 (flooded area ~110 km2). Riverine; pilot area is inland and likely outside it. Not opened.
- India Flood Inventory (IIT Delhi / Zenodo, DOI 10.5281/zenodo.4742142) SNIPPET: district-level, not point-level.

### 4.4 Not researched this session / no result
Global Flood Database, CSE, WRI India, SEEDS, GitHub/Kaggle geocoded Delhi waterlogging datasets (a search for these found none), Twitter-derived or Safecity-like crowd maps (found none). Do not assume they exist.

---------------------------------------------------------------
## 5. Complaint channels (machine-readability)
- PWD helpline 1908 (toll-free), control room 011-23490323, WhatsApp chatbot 8130188222: OPENED (Pioneer 10 Jul 2026, PWD portal header shows 1908). Complaint portal: https://www.pwddelhi.gov.in/sewa/login ("Register a Complaint"), "PWD SEWA" app (App Store/Google Play), "View Complaint" menu on pwddelhi.gov.in. No public API or open data export found. Public "View Complaint" page not tested.
- MCD-311 app (SNIPPET: Tribune https://www.tribuneindia.com/news/delhi/delhi-mc-urges-residents-to-report-civic-issues-on-app ; Pioneer on Mayor inspecting control room, residents told to call 155305). MCD claims ~90% resolved in 3-4 days (MCD's own claim). No open data/API found.
- Delhi PGMS https://pgms.delhi.gov.in/ (SNIPPET only, not opened).
- Single waterlogging number proposal (NDMC 311 as single number) May 2025: Pioneer URL I tried returned 404; unverified whether implemented.
- DJB helpline 1916 and PWD 1908 (SNIPPET, Statesman).
- CPGRAMS, RTI disclosures listing waterlogging complaints: nothing found.
- Conclusion: no machine-readable complaint data found. Rain-Ready's own resident reports would be new data; PWD/MCD complaint registers would need RTI.

## 6. Live feeds
- Delhi Traffic Police advisories: posted on X @dtptraffic (SNIPPET: news credits "X/@dtptraffic"); no official API or open feed found. Not verified directly (X not fetched).
- PWD Delhi X account @DelhiPWD appears embedded on the PWD home page (OPENED; posts dated Oct 2026).
- PWD 179 CCTV cameras on 45 locations (OPENED, Pioneer 10 Jul 2026), but no public feed mentioned. Underpass water-level sensors: only SNIPPET (Minto Bridge new stormwater system with "real-time monitoring" alerts, June 2025, The Week https://www.theweek.in/wire-updates/national/2025/06/24/des71-dl-pwd-minto-bridge.html ; automatic pump houses). Nothing public.
- Delhi FCO 2025 gives flood control room numbers (see pdf near p.1): Central Flood Control Room contact, and I&FC publishes daily Yamuna/drain reports at https://ifc.delhi.gov.in/sites/default/files/ifc/universal/DDMMYYYY.pdf (SNIPPET: e.g. 04092025.pdf) tracking 17 vulnerable points (river side), not urban waterlogging.
- Google/Waze: not researched.

---------------------------------------------------------------
## 7. Ranking by usefulness for Rain-Ready
1. FCO 2025 PDF (1.1): citable, text-extractable, three years of Traffic Police-observed waterlogging with dates. Gives 14 pilot-adjacent entries (Pusa Road/Bagga Link/Jhandewalan/Karol Bagh Metro, Anand Parbat, Rani Jhansi Marg, Azad Market, East Patel Nagar). No agency, no coordinates.
2. Court/inquiry reporting on Old Rajinder Nagar (sec. 2): defines the motivating pocket (Bazar Marg / Shankar Road, saucer-shaped low point, drains blocked by ramps/encroachment, MCD accountable). Drain owner not verified.
3. 2026 PWD/DDMA/Traffic Police news (1.4, 1.6): shows the system now assigns a nodal officer per point (FCO 2026) but lists are not public.
4. IIT Delhi DMP 2018 (1.5): methodology and basins; appendix not available here.
5. Everything else is weak or unverified.

## 8. Recommended actions
- Do not label any pilot "pocket" as official unless it traces to a row in sec. 1.1 or a quoted inquiry sentence in sec. 2. Old Rajinder Nagar interior (Bazar Marg/Shankar Road) is supported by news/inquiry only, not by an official list.
- File RTIs: (a) MCD Karol Bagh Zone: drain inventory and ownership for Bazar Marg/Shankar Road/Satpal Bhatia Marg, desilting records; (b) Delhi Traffic Police: full 2025 and 2026 waterlogging lists with coordinates; (c) PWD: list of identified waterlogging points and nodal officers 2026; (d) I&FC/Revenue: FCO 2026 PDF.
- Find the FCO 2026 PDF through a real browser at https://ifc.delhi.gov.in/ifc/flood-control-order-2026 or https://ifc.delhi.gov.in/orders.
- Geocoding the FCO place names must be a separate, flagged step (e.g. OSM lookup by human review).
