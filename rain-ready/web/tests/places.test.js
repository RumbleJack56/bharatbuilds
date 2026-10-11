// web/tests/places.test.js — city places explorer and PWD road page: query building, honesty, escaping, 404 handling.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { ApiError } from "../js/core/errors.js";
import { BANNED } from "../js/ui/copy.js";
import { createPlacesService } from "../js/services/places.service.js";
import { placesShell, placesResults, roadView, EMPTY_PLACES } from "../js/views/places.view.js";
import { places, road } from "../js/controllers/places.js";

const SRC = "Traffic Police lists; PWD road inventory.", NOTE = "Counts are floors.";
const P = { key: "k1", road: "M.B. Road", place: "Khanpur T-Point", n_dates: 21, n_years: 3, years: ["2018", "2022", "2024"],
  first_date: "2018-07-13", last_date: "2024-09-12", rows: [{ list: "2022", row_no: 148, pdf_page: 64 }], match: "exact",
  pwd_code: "RD-00981", row_m: 43, agency_id: "pwd", chronic: true };
const BARE = { key: "k2", road: null, place: null, n_dates: 1, n_years: 1, years: [], first_date: null, last_date: null, rows: [],
  match: "none", pwd_code: null, row_m: null, agency_id: null, chronic: false };
const R = { asset_code: "RD-00981", road_name: "MB Road", starting_point: "Badarpur crossing", end_point: "Batra Hospital", length_km: 5.8,
  lanes: 6, row_m: 43, division: "South East Road Division 2", status: "active", road_key: "mb", pwd_by_rule: true, rule: "60 ft rule text." };
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const clean = (h) => { assert.doesNotMatch(text(h), BANNED); assert.doesNotMatch(h, /undefined|NaN|\[object/); };

test("places() sends only the filters given", async () => {
  const http = createFakeHttp({ "GET /api/city/places": { places: [] },
    "GET /api/city/places?chronic=true&min_dates=3&owner=unresolved&road=Ring+Road&limit=50": { places: [] },
    "GET /api/city/places?chronic=false&min_dates=1": { places: [] } });
  const s = createPlacesService(http);
  await s.places();
  await s.places({ chronic: true, minDates: 3, owner: "unresolved", road: " Ring Road ", limit: 50 });
  await s.places({ chronic: false, minDates: 1, owner: "", road: "   " });
  assert.deepEqual(http.calls.map(c => [c.method, c.path]), [["GET", "/api/city/places"],
    ["GET", "/api/city/places?chronic=true&min_dates=3&owner=unresolved&road=Ring+Road&limit=50"],
    ["GET", "/api/city/places?chronic=false&min_dates=1"]]);
});
test("road() encodes the code into the path", async () => {
  const http = createFakeHttp({ "GET /api/city/roads/RD%2F1%20x%3F": R });
  assert.equal((await createPlacesService(http).road("RD/1 x?")).asset_code, "RD-00981");
});

test("results show source and note above the rows, with every place field", () => {
  const h = placesResults({ places: [P], source: SRC, note: NOTE }, { limit: 50 }), t = text(h);
  assert.ok(h.indexOf(SRC) >= 0 && h.indexOf(NOTE) >= 0 && h.indexOf(NOTE) < h.indexOf("Khanpur"));
  assert.match(t, /Khanpur T-Point Chronic/); assert.match(t, /M\.B\. Road/);
  assert.match(t, /Listed on 21 dates in 3 years: 2018, 2022, 2024/);
  assert.match(t, /First listed 13 Jul 2018, last listed 12 Sep 2024/);
  assert.match(t, /Owner: PWD \(Right of Way 43 m\)/); assert.match(t, /Name match: road name found in the PWD inventory/);
  assert.match(h, /<a href="#\/road\/RD-00981">Road record RD-00981<\/a>/);
  assert.match(t, /2022 list, row 148 \(PDF page 64\)/);
  assert.match(t, /Showing 1 place, most dates first/);
  assert.match(h, /class="card glass rise" style="--i:0"/);
  clean(h);
});
test("a place with no agency reads No owner found, no road link, no chronic chip", () => {
  const h = placesResults({ places: [BARE], source: SRC, note: NOTE }), t = text(h);
  assert.match(t, /Owner: No owner found/); assert.match(t, /road not found in the PWD inventory/);
  assert.doesNotMatch(h, /#\/road\//); assert.doesNotMatch(h, /class="chip"/);
  assert.match(t, /Listed on 1 date in 1 year/); assert.match(t, /First listed not listed/);
  clean(h);
});
test("empty result: empty state, count of zero, source and note still shown", () => {
  const h = placesResults({ places: [], source: SRC, note: NOTE }, { limit: 50 });
  assert.match(h, new RegExp(EMPTY_PLACES)); assert.match(text(h), /Showing 0 places/);
  assert.ok(h.includes(SRC) && h.includes(NOTE)); clean(h);
});
test("a full page says it is only the first N places", () => {
  assert.match(text(placesResults({ places: [P, BARE], source: SRC }, { limit: 2 })), /Showing the first 2 places, most dates first\. Narrow the filters/);
});
test("views escape every API string", () => {
  const x = "<img src=x onerror=alert(1)>";
  const h = placesResults({ places: [{ ...P, place: x, road: x, years: [x], pwd_code: '"><b>', match: x, agency_id: x,
    rows: [{ list: x, row_no: x, pdf_page: x }] }], source: x, note: x }) + placesShell({ road: '"><script>' })
    + roadView({ ...R, road_name: x, asset_code: x, division: x, rule: x, starting_point: x });
  assert.doesNotMatch(h, /<img|<script|<b>|onerror=alert\(1\)>/);
  assert.match(h, /&lt;img src=x/);
});
test("filter form: checkbox, owner, minimum dates, show and road search keep the given state", () => {
  const h = placesShell({ chronic: true, owner: "unresolved", road: "Ring", minDates: 3, limit: 100 });
  assert.match(h, /<input type="checkbox" id="pc" checked> Only chronic places/);
  assert.match(h, /<option value="unresolved" selected>No owner found<\/option>/);
  for (const o of ["All", "MCD", "PWD"]) assert.match(h, new RegExp(`>${o}</option>`));
  assert.match(h, /<option value="3" selected>3 or more<\/option>/); assert.match(h, /<option value="100" selected>100 places<\/option>/);
  assert.match(h, /id="pr" value="Ring"/); assert.match(h, /class="eyebrow"/); clean(h);
});

test("road page: back link, fields, rule text and Yes/No in words", () => {
  const h = roadView(R), t = text(h);
  assert.match(h, /<a class="back" href="#\/places">/);
  assert.match(t, /MB Road PWD inventory code RD-00981/); assert.match(t, /43 m Right of Way/); assert.match(t, /5\.8 km Length/); assert.match(t, /6 Lanes/);
  assert.match(t, /From: Badarpur crossing To: Batra Hospital PWD division: South East Road Division 2 Status in the inventory: active/);
  assert.match(t, /Applies by rule: Yes ?\./); assert.match(t, /Rule: 60 ft rule text\./); clean(h);
  const no = text(roadView({ ...R, pwd_by_rule: false, row_m: 12 }));
  assert.match(no, /Applies by rule: No ?\. Right of Way 12 m: the rule does not place its drains with PWD/);
  const none = roadView({ ...R, pwd_by_rule: false, row_m: null, length_km: null, lanes: null, division: null, status: null, road_key: null });
  assert.match(text(none), /Applies by rule: No ?\. The inventory lists no Right of Way/); assert.match(text(none), /not listed Length/); clean(none);
});

// Minimal DOM for the controllers: elements by selector, listeners kept to fire by hand.
function dom(values = {}) {
  const els = {};
  const el = (s) => els[s] ??= { innerHTML: "", value: values[s] ?? "", checked: !!values[s + ":checked"], on: {},
    addEventListener(ev, fn) { this.on[ev] = fn; } };
  return { els, root: { innerHTML: "", querySelector: el } };
}
const svc = (places) => ({ services: { places } });

test("places screen loads once on mount, re-queries on change, skips a repeat, and keeps errors in the results", async () => {
  const { els, root } = dom({ "#pm": "1", "#pl": "50" }), calls = [];
  let fail = false;
  await places.mount(root, svc({ places: async (f) => { calls.push(f); if (fail) throw new Error("server down"); return { places: [P], source: SRC, note: NOTE }; } }));
  assert.match(root.innerHTML, /Waterlogging places/); assert.match(els["#pres"].innerHTML, /Khanpur/);
  assert.deepEqual(calls[0], { chronic: false, owner: "", road: "", minDates: 1, limit: 50 });
  els["#pc"].checked = true; els["#po"].value = "unresolved"; els["#pr"].value = " GTK ";
  await els["#pf"].on.change();
  assert.deepEqual(calls[1], { chronic: true, owner: "unresolved", road: "GTK", minDates: 1, limit: 50 });
  let prevented = false;
  await els["#pf"].on.submit({ preventDefault: () => { prevented = true; } });
  assert.ok(prevented); assert.equal(calls.length, 2);           // same filter: no second request
  fail = true; els["#pm"].value = "3";
  await els["#pf"].on.change();
  assert.match(els["#pres"].innerHTML, /class="err".*server down/);
});
test("road screen: 404 is a friendly message with a way back; other errors show as they are", async () => {
  let { root } = dom();
  await road.mount(root, svc({ road: async () => { throw new ApiError("road not in the PWD inventory", 404); } }), ["RD-404"]);
  assert.match(root.innerHTML, /Road RD-404 is not in the PWD inventory/); assert.match(root.innerHTML, /href="#\/places"/);
  ({ root } = dom());
  await road.mount(root, svc({ road: async () => { throw new ApiError("Cannot reach the server.", 0); } }), ["RD-1"]);
  assert.match(root.innerHTML, /Cannot reach the server/);
  ({ root } = dom());
  await road.mount(root, svc({ road: async () => { throw new Error("must not be called"); } }), []);
  assert.match(root.innerHTML, /No road code given/);
  ({ root } = dom());
  let asked = "";
  await road.mount(root, svc({ road: async (c) => { asked = c; return R; } }), ["RD%2000981"]);
  assert.equal(asked, "RD 00981"); assert.match(root.innerHTML, /MB Road/); clean(root.innerHTML);
});
