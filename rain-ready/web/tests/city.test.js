// web/tests/city.test.js — Delhi evidence page (#/city): service paths, pure view, controller.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { ApiError } from "../js/core/errors.js";
import { BANNED } from "../js/ui/copy.js";
import { createCityService } from "../js/services/city.service.js";
import { cityHead, sourceView, summaryView, cityInsightsView } from "../js/views/city.view.js";
import { city } from "../js/controllers/city.js";

const SRC = "Delhi Traffic Police lists; PWD road inventory.", NOTE = "Counts are floors.", BAN = "Scenario, not a forecast.";
const S = { location_dates: 1100, days: 156, places: 616, chronic_places: 19, roads_in_inventory: 1297, by_year: { "2018": 48, "2017": 22, "2023": 451 },
  by_month: { "6": 217, "7": 499, "11": 2 }, location_dates_by_owner: { pwd: 548, unresolved: 549, mcd: 3 }, source: SRC, note: NOTE };
const place = (n, x = {}) => ({ road: `Road ${n}`, place: `Spot ${n}`, dates: 10 - n, years: ["2018", "2022"], rows: [{ list: "2022", row_no: 148, pdf_page: 64 }],
  agency_id: null, pwd_code: null, ...x });
const I = { source: SRC, note: NOTE, banner: BAN, insights: [
  { id: "chronic", kind: "recurrence", priority: 1, text: "19 places were listed in three or more different years.", why: "Repeat failures.",
    evidence: { places: [place(1, { road: "<b>M.B. Road</b>", place: "Khanpur & <i>Hamdard</i>", agency_id: "pwd", pwd_code: "RD-00981" }), ...[2, 3, 4, 5, 6, 7].map(n => place(n))] },
    action: { type: "inspect", text: "Inspect the inlets." } },
  { id: "corridors", kind: "concentration", priority: 3, text: "The 10 busiest roads.", why: "Corridor review.",
    evidence: { top_roads: [{ road: "Ring Road", places: 81, location_dates: 145 }] }, action: { type: "coordinate", text: "One joint plan." } },
  { id: "heavy-tail", kind: "severity", priority: 2, text: "Five days hold 41%.", why: "Extreme days.", evidence: { busiest_days: [[139, "2023-07-09"]], n_days: 156 },
    action: { type: "prioritise", text: "Rank ordinary days first." } },
  { id: "pilot", kind: "context", priority: 1, text: "In the pilot ward.", why: "Not unusual.", action: { type: "plan", text: "Work the plan." },
    evidence: { pilot: [{ id: "LP-ANP", short: "New Rohtak Road", n_dates: 18, coverage_gap: false }, { id: "LP-ORN", short: "Old Rajinder Nagar", n_dates: 0, coverage_gap: true }] } },
] };
const clean = (h) => {
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /verified|proof|unspoofable/i);
  assert.doesNotMatch(h, /undefined|NaN|\[object/);
};

test("city service calls the two public GET paths", async () => {
  const http = createFakeHttp({ "GET /api/city/summary": S, "GET /api/city/insights": I });
  const c = createCityService(http);
  assert.equal((await c.summary()).places, 616); assert.equal((await c.insights()).insights.length, 4);
  assert.deepEqual(http.calls.map(x => `${x.method} ${x.path}`), ["GET /api/city/summary", "GET /api/city/insights"]);
});

test("head has the eyebrow and title; source and note show in full and escaped", () => {
  assert.match(cityHead(), /class="eyebrow">Delhi evidence</); assert.match(cityHead(), /<h1>/);
  const h = sourceView({ source: "Lists <script>x</script>", note: NOTE });
  assert.match(h, /Source:<\/strong> Lists &lt;script&gt;/); assert.match(h, /Counts are floors\./); assert.doesNotMatch(h, /<script>/);
  assert.equal(sourceView(undefined), ""); assert.equal(sourceView({}), "");
});

test("summary: five stat tiles, years in order, all months by name, owner split with No owner found", () => {
  const h = summaryView(S);
  assert.equal((h.match(/class="big-num"/g) || []).length, 5);
  for (const n of ["1,100", "156", "616", "19", "1,297"]) assert.match(h, new RegExp(`big-num">${n}<`));
  assert.ok(h.indexOf("2017:") < h.indexOf("2018:") && h.indexOf("2018:") < h.indexOf("2023:"));
  assert.match(h, /July: <strong>499<\/strong>[\s\S]*?width:100%/); assert.match(h, /June: <strong>217<\/strong>[\s\S]*?width:43%/);
  assert.match(h, /February: <strong>0<\/strong>/); assert.match(h, /December: <strong>0<\/strong>/);
  assert.ok(h.indexOf("No owner found:") < h.indexOf("MCD:") && h.indexOf("MCD:") < h.indexOf("PWD:"));
  assert.match(h, /No owner found: <strong>549<\/strong><\/p>\s*<div class="bar bad"/); assert.doesNotMatch(h, /unresolved/i);
  assert.doesNotMatch(h, /style="(?!width:\d+%")/, "only bar widths are inline styles");
  clean(h);
});

test("summary with missing fields reads not available and shows empty states", () => {
  const h = summaryView({});
  assert.match(h, /big-num">not available</); assert.equal((h.match(/class="empty"/g) || []).length, 3);
  clean(h);
});

test("insights: banner, text, why, action, top 5 places escaped, owner and road link", () => {
  const h = cityInsightsView(I);
  assert.match(h, /class="banner">Scenario, not a forecast\./);
  assert.match(h, /19 places were listed/); assert.match(h, /Why: Repeat failures\./); assert.match(h, /What to do:<\/strong> Inspect the inlets\./);
  assert.match(h, /&lt;b&gt;M\.B\. Road&lt;\/b&gt;/); assert.match(h, /Khanpur &amp; &lt;i&gt;Hamdard&lt;\/i&gt;/); assert.doesNotMatch(h, /<b>M\.B\.|<i>Hamdard/);
  assert.match(h, /showing 5 of 7/); assert.match(h, /Road 5/); assert.doesNotMatch(h, /Road 6|Road 7/);
  assert.match(h, /9 dates in 2018, 2022/); assert.match(h, /Owner: PWD\./); assert.match(h, /Owner: No owner found\./);
  assert.match(h, /2022 list, row 148, PDF page 64/);
  assert.equal((h.match(/href="#\/road\//g) || []).length, 1); assert.match(h, /href="#\/road\/RD-00981">Road RD-00981</);
  assert.match(h, /Ring Road<\/strong>: 145 location-dates at 81 places/); assert.match(h, /2023-07-09<\/strong>: 139 listings/);
  assert.match(h, /New Rohtak Road<\/strong>: 18 dates/); assert.match(h, /Old Rajinder Nagar<\/strong>: in no list/);
  assert.match(h, /class="card glass rise" style="--i:1"/);
  clean(h);
});

test("empty insights use the shared empty state; the banner still shows", () => {
  const h = cityInsightsView({ insights: [], banner: BAN });
  assert.match(h, /class="empty"/); assert.match(h, /No city insights to show\./); assert.match(h, /Scenario, not a forecast\./);
  clean(h); clean(cityInsightsView({}));
});

const ctxWith = (svc) => ({ services: { city: svc } });
test("controller renders both calls into the page with source, note and banner", async () => {
  const root = { innerHTML: "" };
  await city.mount(root, ctxWith({ summary: async () => S, insights: async () => I }), []);
  assert.equal(city.path, "city"); assert.equal(city.roles, null);
  for (const s of ["Delhi evidence", "1,100", "No owner found", "19 places were listed", SRC, NOTE, BAN]) assert.ok(root.innerHTML.includes(s), s);
  clean(root.innerHTML);
});

test("controller: a failed call shows errBox and the other half still renders", async () => {
  const root = { innerHTML: "" };
  await city.mount(root, ctxWith({ summary: async () => { throw new ApiError("summary down", 500); }, insights: async () => I }), []);
  assert.match(root.innerHTML, /class="err" role="alert">summary down/); assert.match(root.innerHTML, /19 places were listed/);
  assert.ok(root.innerHTML.includes(SRC), "source comes from the insights response");
  await city.mount(root, ctxWith({ summary: async () => S, insights: async () => { throw new ApiError("insights down", 500); } }), []);
  assert.match(root.innerHTML, /role="alert">insights down/); assert.match(root.innerHTML, /1,297/);
});
