# Rain-Ready: elevation research (tested 2026-10-10)

Status key: TESTED = ran it here; PAGE = read this session; MEMORY = my background knowledge, NOT re-verified now (check before quoting); NOT-TESTED.

## 1. Tools present on this machine
No gdal CLI. System python3 has numpy, no rasterio. I made a venv at scratchpad/dem/v and pip-installed rasterio 1.5.2 (bundles GDAL 3.12.2), which works with /vsicurl. pysheds/richdem install: richdem failed to build (not retried); pysheds not confirmed installed.

## 2. Comparison table
| Dataset | Res | Type | Vertical accuracy | Licence / attribution | Access | Auth | Status |
|---|---|---|---|---|---|---|---|
| Copernicus DEM GLO-30 | 1 arcsec (~30 m) | DSM (buildings, trees included; AWS readme says so) | MEMORY: abs <4 m LE90, rel <2 m (slopes <=20%) | Free for general public under Copernicus DEM licence (spacedata.copernicus.eu ... #Licencing; AWS readme links it). Attribution wording: I could not load the Copernicus page (connection refused). MEMORY: "Produced using Copernicus WorldDEM-30 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved." Verify before publishing. | s3://copernicus-dem-30m/Copernicus_DSM_COG_10_N28_00_E077_00_DEM/Copernicus_DSM_COG_10_N28_00_E077_00_DEM.tif ; HTTPS https://copernicus-dem-30m.s3.amazonaws.com/<same key> | none | TESTED: HTTP 200, 41,680,243 bytes (~41.7 MB), float32 EPSG:4326, 3600x3600, COG, range-read works |
| Copernicus DEM GLO-90 | 3 arcsec (~90 m) | DSM | MEMORY: similar spec | same licence | s3://copernicus-dem-90m/Copernicus_DSM_COG_30_N28_00_E077_00_DEM/Copernicus_DSM_COG_30_N28_00_E077_00_DEM.tif | none | TESTED: HEAD 200 (size not captured). Too coarse: ~1-2 cells per 3 km. Skip. |
| Mapzen/Tilezen terrarium tiles (AWS) | z12 ~38 m/px at this lat; up to z15 | Mixed DSM (SRTM in India, per x-amz-meta sources srtm/N28E077.tif) | SRTM-class (about 16 m spec, better in practice - MEMORY) | Mapzen terrain terms; attribution list at registry page (not fetched) | https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png ; decode m = R*256+G+B/256-32768 | none | TESTED: z12/2926/1707.png 200, 34,988 bytes, decoded min 194 max 271 mean 222.1 over whole tile (tile is wider than bbox, and values differ from Copernicus bbox, so they are not interchangeable) |
| SRTM/NASADEM via OpenTopography API | 30 m | DSM | SRTM abs ~ <16 m spec (MEMORY) | OpenTopography terms | portal.opentopography.org/API/globaldem?demtype=COP30\|SRTMGL1\|NASADEM&south=..&north=..&west=..&east=..&outputFormat=GTiff&API_Key=KEY | FREE API KEY required | TESTED: unauthenticated call -> HTTP 401 "API Key required". Not used with key (no key). |
| NASA Earthdata / USGS EarthExplorer | 30 m | DSM | - | - | - | Login required (MEMORY) | NOT-TESTED |
| ALOS AW3D30, ASTER GDEM, MERIT DEM, TanDEM-X EDEM | 30 m / 90 m / 12 m | DSM (MERIT is error-reduced, trees partly removed) | MEMORY: AW3D30 ~5 m RMSE; ASTER poor (~8-17 m); MERIT ~ 2-4 m in low relief | AW3D30: JAXA terms; ASTER: open (NASA/METI); MERIT: CC BY-NC 4.0 on request (MEMORY); EDEM: DLR proposal | JAXA/Earthdata/DLR portals | Registration for most | NOT-TESTED. OpenTopoData serves aster30m publicly (see section 3). |
| FABDEM | 30 m | Bare-earth (ML-corrected COPDEM; buildings/trees removed) | PAGE (search snippet of developers' abstract): mean abs error built-up 1.61 -> 1.12 m vs GLO-30; forest 5.15 -> 2.88 m | CC BY-NC-SA 4.0 (non-commercial, ShareAlike) per GEE community catalog snippet; Bristol repo labels it differently. Credit Copernicus WorldDEM-30 as well. Commercial use needs Fathom/Bristol permission. | data.bris.ac.uk (10x10 degree zips) and GEE community catalog | none/ free download | snippet-only; not downloaded. Hackathon prototype is arguably non-commercial, but ShareAlike affects derived outputs. Decide consciously. |
| ISRO CartoDEM 30 m (Bhuvan) | 30 m (v3), 10 m for some areas | DSM | MEMORY: ~ 8 m LE90 plan? not verified | Bhuvan terms | bhuvan-app3.nrsc.gov.in/data/download/ | Registration/login for download (MEMORY); page loads | page loads (HTTP 200 HTML); download not tested. Non-API, not automatable. |
| Survey of India open series maps/contours, Delhi LiDAR, GSDL 3D city model, SVAMITVA, Delhi drainage master plan DEM | - | - | - | - | - | - | NOT-FOUND/NOT-TESTED. Did not find any public Delhi LiDAR DEM. Delhi I&FC (ifc.delhi.gov.in) hosts drain master-plan documents (.docx) - PAGE (seen in search results only). Do not assume a downloadable DEM exists. |
| Google Open Buildings 2.5D temporal, Microsoft footprints | - | building heights/footprints | - | CC BY 4.0 / ODbL (MEMORY) | sites.research.google/gr/open-buildings | - | NOT-TESTED. Idea only: subtract building height from a DSM; 30 m cells are mixed, so correction is crude. |

## 3. Elevation APIs, query 28.641, 77.184 (all TESTED 2026-10-10)
| API | Result | Notes |
|---|---|---|
| Open-Meteo: https://api.open-meteo.com/v1/elevation?latitude=28.641&longitude=77.184 | 233.0 m (HTTP 200) | Underlying: Copernicus GLO-90 per their docs (MEMORY). 90 m, integer-ish output. Free non-commercial tier; rate limits per their docs (not verified). My multi-coordinate comma call was blocked by zsh globbing, not tested. |
| Open-Elevation: https://api.open-elevation.com/api/v1/lookup?locations=28.641,77.184 | 233.63 m (HTTP 200) | SRTM-based (MEMORY). Public instance, no stated SLA. |
| OpenTopoData srtm30m | 228 m | public API https://api.opentopodata.org/v1/<dataset>?locations=lat,lon |
| OpenTopoData aster30m | 246 m | 18 m above SRTM at the same point: shows how noisy the DEMs are |
| OpenTopoData mapzen | 228 m | |
| OpenTopoData eudem25m | null | Europe only |
| Mapbox Terrain-RGB | 401 "Not Authorized" without token | needs free token |
| Google Elevation API | REQUEST_DENIED without key | paid |
| Copernicus GLO-30 at the same point | not sampled at exactly this cell | bbox mean 236.9 |
So four sources give 228-246 m for one point: disagreement of ~18 m, far larger than the within-pilot relief. Point lookups from these APIs are not suitable for pocket finding.

## 4. Measured: Copernicus GLO-30, pilot bbox (S28.632 W77.170 N28.662 E77.205)
Windowed read via /vsicurl (no full download). Script: scratchpad/dem/w.py, t.py; array saved cop30_bbox.npy.
- Window 126 cols x 108 rows = 13,608 cells (each 1 arcsec, about 27 x 30 m... roughly 30 m).
- min 218.5 m, max 261.7 m, mean 236.9 m, std 7.9 m.
- Percentiles 5/25/50/75/95: 224.3 / 231.2 / 236.8 / 242.3 / 250.6 m.
- Mean by thirds, north to south: 233.7, 236.7, 240.3 m. West to east: 240.7, 235.9, 234.1 m. So the broad tilt in this DSM is higher to the south/south-west (toward the Ridge side) and lower to the north-east. This is a coarse trend of about 6 m over 3 km; treat as indicative.
- Median absolute difference between neighbouring cells 1.4 m, p95 4.6 m (building/tree noise at the same scale as real relief).
- Single-cell local minima (3x3) in raw data: 0 of 13,144 interior cells. I.e. raw cells show no isolated pits; the DSM is smooth/filtered, so "sink detection" will find nothing without flow-routing on larger scales.
- The terrarium tile covers a different (larger) extent, mean 222 m, range 194-271: not comparable.
Verdict: the signal exists at the 1-3 km scale (broad slope, ~40 m total span including building noise) but a 30 m DSM cannot resolve street-level low points, underpasses, or pocket depths (those are 0.3-1 m features). Use it only as a coarse "which direction does water tend to drain / which zone is relatively low" hint.

## 5. Accuracy caveats (state honestly in the product)
- Copernicus GLO-30 is a surface model: roofs and tree canopies are in the heights. Dense Delhi blocks mean the 4 m-ish stated accuracy (MEMORY) is bigger than street-level relief. FABDEM paper (snippet) quotes mean absolute error 1.1-1.6 m in built-up areas, again larger than waterlogging depths.
- Cross-dataset point disagreement at our test point was 18 m (SRTM 228 vs ASTER 246).
- Nothing here measures drainage capacity, culverts, or pumping; drain gradient problems are reported (IIT Delhi, per search snippet).

## 6. Derived hydrology products (not tested, listed from knowledge or snippets)
- MERIT Hydro / HydroSHEDS flow accumulation: 90 m / 3 arcsec, too coarse for ward scale (MEMORY). NOT-TESTED.
- JRC global flood hazard, Fathom, WRI Aqueduct Floods: mostly riverine/coastal at 90 m-1 km; pluvial urban waterlogging not captured. NOT-TESTED. No Delhi-specific open hazard raster found.
Code sketch (rasterio venv works; pysheds is a pure-python alternative):
```python
import rasterio, numpy as np
from rasterio.windows import from_bounds
u='/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N28_00_E077_00_DEM/Copernicus_DSM_COG_10_N28_00_E077_00_DEM.tif'
d=rasterio.open(u); w=from_bounds(77.170,28.632,77.205,28.662,d.transform).round_offsets().round_lengths()
a=d.read(1,window=w)
# pysheds: grid=Grid.from_raster(path); dem=grid.read_raster(path); pit=grid.fill_pits(dem); flooded=grid.fill_depressions(pit);
#   inflated=grid.resolve_flats(flooded); fdir=grid.flowdir(inflated); acc=grid.accumulation(fdir)
# depth of depression = flooded - dem  (cells >0 are candidate pockets)
```
WhiteboxTools: FillDepressions, D8FlowAccumulation. richdem: rd.FillDepressions(epsilon=False) then subtract (richdem failed to pip build here).

## 7. Ridge / basin context
Search results (not primary documents): Delhi Ridge acts as natural watershed; historic streams from the south-west to the Central Ridge merged into the Barapullah; Barapullah catchment reported to cover 91% of South Delhi and 95% of Central Delhi. The 1976 drainage master plan puts MCD "Karol Bagh Zone" drains into the Najafgarh drain system (snippet from MCD drains master-plan doc at ifc.delhi.gov.in/sites/default/files/inline-files/mcd.docx, unread in full). I found no source giving the slope direction for Old Rajinder Nagar specifically. Rajinder Nagar's basin was not confirmed. The DSM trend above (higher to south-west) is our only local evidence.

## 8. Recommendation
Use Copernicus GLO-30 from the AWS bucket (tested-working, no auth, same cloud/region family as the event; fetch the tile once in a build step, window to the bbox, save a small GeoTIFF/JSON). Present it only as a coarse "relatively lower ground" hint with text such as: "Based on 30 m satellite surface heights, which include buildings and trees. Not a flood depth or flood map." Combine with community reports as the primary signal. Do not use the point APIs for ranking. Optional: FABDEM for a bare-earth view only if non-commercial/ShareAlike is acceptable. Verify the exact Copernicus attribution text on the official licence page before publishing.
