# EDA: Delhi's recorded waterlogging

How the exploratory analysis works, what it found, what it cannot say, and how to rerun or extend it.
Results as generated: `docs/EDA_RESULTS.md`. Charts: `docs/eda-report.html`. Everything below traces to `core/eda.py`.

## 1. What it is for

The pilot ward is two neighbourhoods. The EDA puts them against the city so the action plan rests on Delhi's own records, and it turns
what it finds into actions that are routed to an owner, not into prose.

| Question | Stage | Answer in |
|---|---|---|
| Is the table itself sound? | `validate` | data quality notes |
| When does it happen? | `profile` | monsoon share, by month |
| Which places keep coming back? | `places`, `chronic` | chronic list |
| Is it a few extreme days or many ordinary ones? | `days` | day severity |
| Is it a few corridors? | `roads` | road concentration |
| Who owns the drains where it happens? | `owned`, `ownership` | resolved share |
| Where does the pilot ward sit? | `pilot` | recurrence percentile |
| What should be done, and by whom? | `insights`, `actions` | the action on each finding |

## 2. Inputs

| Dataset | Source | Retrieved | Used for | File |
|---|---|---|---|---|
| Traffic Police waterlogging lists, 2022, 2023, 2024 | Flood Control Order 2025, Dept of Revenue GNCTD, `ifc.delhi.gov.in/.../fco_2025.pdf`, pp. 54 to 79 | 2026-10-10 | every place and date | `data/raw/fco_rows.csv` (from `scripts/parse_fco.py`) |
| PWD Delhi road inventory | `pwddelhi.gov.in` road search API, 1,297 roads, road-level fields only | 2026-10-10 | Right of Way per road, owner by the 60 ft rule | `data/raw/pwd_roads.json` |
| Pilot cards | `scripts/consolidate.py` | same run | pilot context stage | `data/consolidated/hotspots.json` |

The lists are a public record. No licence is stated; the source is cited on every derived row. No contact fields are stored.

## 3. Pipeline

```
fco_rows.csv ─┬─ validate ─ profile ─ places ─┬─ days
pwd_roads.json┘                               ├─ roads
                                              ├─ owned ─ ownership ─ chronic ─┐
hotspots.json ─────────────────────────────── pilot ──────────────────────────┤
                                                                              └─ insights ─ actions ─> eda.json, EDA_RESULTS.md, DB
```

| Stage | Function | Does | Decision to know |
|---|---|---|---|
| validate | `eda.validate` | numbering gaps, duplicate numbers, rows without dates or place, which calendar years each list contains | Reports problems. It never drops rows. |
| profile | `eda.profile` | location-dates by month and year, dates per row, monsoon share | Monsoon is June to September. |
| places | `eda.places` | merges rows into places | Same road key and same place words, across lists. |
| days | `eda.days` | places listed per day, top-5 and top-10 share, median | A day is "ordinary" at 3 or fewer places (the median, floor 3). |
| roads | `eda.roads` | location-dates per road, concentration, Gini | Roads merged by `road_key`. |
| owned | `eda.match_ownership` | attaches a PWD inventory road to each place | See section 4. |
| ownership | `eda.ownership_summary` | location-dates by owner | Unresolved stays its own class. |
| chronic | `eda.chronic` | places with dates in 3 or more different calendar years | Counts date years, not list years. |
| pilot | `eda.pilot_context` | each pilot place against the city | Mid-rank percentile of dates per place. |
| insights | `eda.insights` | fixed sentences with numbers, evidence, one action | Text is pre-written. No model writes it. |
| actions | `eda.place_actions` | one routed action per place with 2 or more date years (15 shown) | Route follows `agency_id` from `owned`. |

## 4. Definitions and matching rules

- **Location-date**: one place listed on one day. The unit all counts use. 1,100 in the lists.
- **Place**: rows merged by `road_key(road) + "|" + place_key(place text)`.
  - `road_key`: lower case, brackets and punctuation removed, `M.B.`/`G.T.K.` forms normalised, words such as road, marg, street, chowk dropped.
  - `place_key`: place words with the same stop words removed, de-duplicated, sorted, first 8.
- **Ordinary day**: a day with 3 or fewer places listed in all of Delhi. A place listed on one is failing at modest rain.
- **Chronic place**: dates in 3 or more different calendar years.
- **Recurrence percentile**: share of Delhi's places with fewer dates, plus half the ties. A place with one date is near the middle, not at the top.
- **Resolved share**: share of location-dates on a place whose road matched the PWD inventory and whose owner is unambiguous.
- **Owner by rule**: Right of Way of 60 ft (18.29 m) or more gives PWD; under 60 ft gives MCD. Source: 2012 GNCTD notification and a 2020 SDMC affidavit to the NGT (a South Delhi statement, applied citywide by inference).

Ownership match order (`match_ownership`): (1) exact `road_key`; (2) closest spelling at similarity 0.88 or more (`difflib`);
(3) none. If several inventory roads share the key and they disagree on the owner, the place is `ambiguous` and stays unresolved.
Where they agree the widest Right of Way is shown. The match is by name; the road segment is not verified.

## 5. Results (run of 2026-10-10)

| Measure | Value |
|---|---|
| Rows, location-dates, days | 622, 1,100, 156 (dates run 2017-06-20 to 2024-09-17) |
| Places after merging | 616 (436 have one date, 38 have five or more, most dates 21) |
| June to September share | 88% (July 45%) |
| Five busiest days | 41% of location-dates; median day lists 3 places; 46 days list one |
| Ten busiest roads | 45% of location-dates of 257 roads; Ring Road alone 13% |
| Chronic places | 19, holding 14% of location-dates (12 route to PWD, 7 unresolved) |
| Owner resolved | 50%: PWD 548 location-dates, MCD 3, unresolved 549 (316 places) |
| Pilot | Anand Parbat 18 dates and Jhandewalan 10: about 1% of Delhi's places have as many. Old Rajinder Nagar is in no list |

Match quality: 274 exact, 26 close spelling, 5 ambiguous, 311 none.

### Insight catalogue

| id | Trigger | Number it states | Action type | Routed to |
|---|---|---|---|---|
| `chronic` | places with 3+ date years | count, share of location-dates, share of one-date rows | inspect | owner per place, else coordinator |
| `owner-gap` | always | resolved share, unresolved places | clarify_owner | MCD, PWD and I&FC asked to name owners |
| `pilot` | pilot cards present | pilot dates and share of places with as many | plan | ward action plan |
| `season` | always | monsoon and July share | schedule | all drain owners; finish by end of May |
| `heavy-tail` | always | top-5 day share, median, single-place days | prioritise | rank places by ordinary-day listings |
| `corridors` | always | top-10 road share, top road | coordinate | owners along each corridor |
| `data-quality` | always | row gaps, rows without dates or place | note | read counts as floors |

## 6. Outputs

`data/consolidated/eda.json`: `validate`, `profile`, `days` (with per-day `counts`), `roads`, `ownership`, `chronic` (places), `pilot`, `insights`
(`id`, `kind`, `priority`, `text`, `why`, `evidence`, `action{type,text}`), `actions` (`key`, `road`, `place`, `agency_id`, `pwd_code`, `n_dates`, `years`, `rows`, `text`), `places` (all 616).

Database (loaded by `app/reference.py` when empty):

| Table | Rows | Holds |
|---|---|---|
| `ref_roads` | 1,297 | the PWD inventory: code, name, Right of Way, division |
| `ref_waterlog_events` | 1,100 | one row per place, list and date, with PDF page |
| `ref_places` | 616 | merged places, years, match type, owner by rule, `chronic` flag |
| `eda_insights` | 7 | each insight with evidence JSON and its action |

API: `GET /api/city/summary`, `/api/city/insights`, `/api/city/places?chronic=true&owner=unresolved&road=`, `/api/city/roads/{code}`.

How the actions are used: city actions are advisory work items (a place has no drain asset or coordinates here). Ward actions are
`GET /api/actions`, built from drains and pockets, and become tasks through `POST /api/plan/generate` or a resident report.

## 7. Limits

1. **Floors, not totals.** The lists name places that disrupted traffic, mostly arterial roads. Interior lanes and basements are missing, which is why Old Rajinder Nagar is in no list.
2. **List year is not event year.** The 2022 list holds dates from 2017 onward. Counts by year reflect how the lists were compiled and are not a trend. Do not read 2023 > 2022 as worsening.
3. **Recurrence is a floor.** Only 5 places merged across lists. Different wording for one place stays separate.
4. **Ownership is a name match.** Half of location-dates cannot be assigned. Major roads such as Ring Road and M.B. Road are split into segment names in the inventory. The 60 ft rule is an inference from a South Delhi statement.
5. **No rainfall.** "Ordinary day" is relative to how many places were listed that day. The reanalysis archive tested read 14 mm for 28 June 2024 against 228 mm at the Safdarjung gauge (the gauge figure is from a search snippet, not a document), so no rainfall is joined.
6. **Table defects.** 2022 row 97 is duplicated and 98 missing; 2024 rows 58 and 145 missing; 2023 row 234 has no date; 7 rows have no place text. The 2024 list header says 165 or 194 places depending on the page.
7. **Actions are inspection, ownership and scheduling.** Nothing here claims what caused a failure or what an engineering fix would achieve. Nothing asks anyone to open a manhole.

## 8. Run, test, extend

```
python -m scripts.parse_fco path/to/fco_2025.pdf     # only when the source PDF changes (needs pdftotext)
python -m scripts.fetch_sources --only pwd           # only to refresh the road inventory
make eda                                             # stages -> eda.json, EDA_RESULTS.md
python -m scripts.make_eda_report                    # docs/eda-report.html
make seed FORCE=1                                    # reload the database (docs/SEEDING.md)
```

To add an insight: write the rule in `eda.insights` with fixed text, an `evidence` dict and one `action`; add its row to the catalogue above;
extend `tests/test_eda.py`. Texts are scanned for banned words by `tests/test_real_seed.py`.

Tests: `tests/test_eda.py` (merging, profile, day counts, ownership rule, ambiguity, chronic, text cleaning), `tests/test_city.py`
(the evidence tables and endpoints), `tests/test_parse_fco.py` (rows and dates), `tests/test_real_seed.py` (generated text).
