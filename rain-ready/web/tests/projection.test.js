// web/tests/projection.test.js — rain and silt projection: service query, pure view, controller (fetch once, local re-render).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { BANNED } from "../js/ui/copy.js";
import { createProjectionService } from "../js/services/projection.service.js";
import { projectionView, projectionBody, initialPick, fillPhrase, useLine, options } from "../js/views/projection.view.js";
import { projection } from "../js/controllers/projection.js";

const EXTRA = /\bverified\b|\bproof\b|unspoofable/i;
const pk = (o) => ({ id: "LP-A", name: "Pusa Road", level: "high", time_to_fill_h: 0.5, time_to_fill_h_low: 0.3, time_to_fill_h_high: 1.1,
  silt_fraction: 0.4, capacity_mm_h: 7.12, runoff_mm_h: 21.25, utilisation_pct: 298, runoff_m3_h: 300, excess_m3_h: 150, storage_m3: 120, spills_to: null, ...o });
const pockets = (silt) => [
  pk({ silt_fraction: silt }),
  pk({ id: "LP-B", name: "Anand <img src=x onerror=1>", level: "elevated", time_to_fill_h: 2.2, time_to_fill_h_low: 0.6, time_to_fill_h_high: null, utilisation_pct: 121, spills_to: "LP-A" }),
  pk({ id: "LP-C", name: "Rajinder Nagar", level: "none", time_to_fill_h: null, time_to_fill_h_low: null, time_to_fill_h_high: null, utilisation_pct: 60, silt_fraction: 0 }),
];
const D = {
  scenarios: [20, 25].flatMap(r => [0, 30].map(h => ({ rain_mm_h: r, horizon_days: h, pockets: pockets(h ? 0.45 : 0.4) }))),
  silt_curve: [{ days: 0, silt_fraction: 0 }, { days: 90, silt_fraction: 0.35 }, { days: 180, silt_fraction: 0.455 }],
  silt_curve_illustrative: { points: [{ days: 0, silt_fraction: 0 }, { days: 90, silt_fraction: 0.33 }, { days: 180, silt_fraction: 0.41 }],
    illustrative: true, note: "Illustrative: an estimate, not a measurement." },
  reference_rain_mm_h: 25,
  meaning: { utilisation_pct: "Runoff as a share of what the drain can carry now.", silt_fraction: "Estimated share of the drain's depth filled with silt." },
  banner: "Scenario, not a forecast. <b>Unofficial</b>.", range_note: "Fill times are shown as a range.",
};
const clean = (html) => {
  assert.doesNotMatch(html, BANNED); assert.doesNotMatch(html, EXTRA);
  assert.doesNotMatch(html, /undefined|NaN|null/);
};

test("service: no query unless asked, comma lists when given, GET only", async () => {
  const http = createFakeHttp({ "GET /api/projection": D, "GET /api/projection?rain=20,25&horizon=0,30": D, "GET /api/projection?horizon=90": D });
  const s = createProjectionService(http);
  await s.projection(); await s.projection({ rains: [], horizons: [] });
  await s.projection({ rains: [20, 25], horizons: [0, 30] }); await s.projection({ horizons: [90] });
  assert.deepEqual(http.calls.map(c => c.path), ["/api/projection", "/api/projection", "/api/projection?rain=20,25&horizon=0,30", "/api/projection?horizon=90"]);
  assert.ok(http.calls.every(c => c.method === "GET"));
});

test("default pick is the reference rain and today; valid hash params win, invalid ones fall back", () => {
  assert.deepEqual(initialPick(D), { rain: 25, horizon: 0 });
  assert.deepEqual(initialPick(D, ["20", "30"]), { rain: 20, horizon: 30 });
  assert.deepEqual(initialPick(D, ["99", "x"]), { rain: 25, horizon: 0 });
  assert.deepEqual(initialPick({ ...D, reference_rain_mm_h: 7 }), { rain: 20, horizon: 0 });
  assert.deepEqual(options(D), { rains: [20, 25], horizons: [0, 30] });
});

test("page shows the banner (escaped), title, Illustrative chart with its note, and the glossary", () => {
  const h = projectionView(D, initialPick(D));
  assert.match(h, /If no drain is cleaned/);
  assert.match(h, /<p class="banner">Scenario, not a forecast\. &lt;b&gt;Unofficial&lt;\/b&gt;\.<\/p>/);
  assert.match(h, /Illustrative/); assert.match(h, /an estimate, not a measurement/); assert.match(h, /<svg [^>]*role="img"/);
  assert.match(h, /Days since a confirmed clean/);
  assert.match(h, /<dl>.*Drain use \(%\).*Runoff as a share.*Silt \(%\).*Estimated share/s);
  assert.match(h, /Fill times are shown as a range/);
  clean(h);
});

test("pickers: rain values with the reference marked, days as words, the pick marked on", () => {
  const h = projectionBody(D, { rain: 25, horizon: 30 });
  assert.match(h, /data-rain="25" class="on" aria-current="true">25 mm\/h \(reference\)</);
  assert.match(h, /data-rain="20">20 mm\/h</);
  assert.match(h, />Today</); assert.match(h, /data-horizon="30" class="on"[^>]*>In 30 days</);
  assert.match(h, /href="#\/projection\/20\/30"/);
});

test("rows: level as text, fill range, over capacity in words, bar capped at 100, silt and runoff", () => {
  const h = projectionBody(D, { rain: 25, horizon: 0 });
  assert.match(h, /Level: High/); assert.match(h, /Level: Elevated/); assert.match(h, /Level: None/);
  assert.match(h, /Fills in about 0\.3 to 1\.1 h \(middle estimate about 0\.5 h\)/);
  assert.match(h, /298% of what the drain can carry - over capacity/); assert.match(h, /class="bar bad"[^>]*><i style="width:100%">/);
  assert.match(h, /60% of what the drain can carry - within capacity/); assert.match(h, /class="bar"[^>]*><i style="width:60%">/);
  assert.match(h, /Silt: about 40% of the drain&#39;s depth/); assert.match(h, /Runoff 21\.3 mm\/h; the drain can carry 7\.1 mm\/h/);
  assert.match(h, /Spills toward Pusa Road/); assert.match(h, /2 of 3<\/div>/);
  clean(h);
});

test("a null upper bound is said in words; no range at all reads as does not fill", () => {
  assert.equal(fillPhrase(pk({ time_to_fill_h: 2.2, time_to_fill_h_low: 0.6, time_to_fill_h_high: null })),
    "Fills in about 2.2 h at the middle estimate; about 0.6 h at the quick end of the range, and at the slow end it does not fill.");
  assert.match(fillPhrase(pk({ time_to_fill_h: null, time_to_fill_h_low: 1.3, time_to_fill_h_high: null })), /^Does not fill at the middle estimate; about 1\.3 h/);
  assert.equal(fillPhrase(pk({ time_to_fill_h: null, time_to_fill_h_low: null, time_to_fill_h_high: null })), "Does not fill in this scenario.");
  assert.match(useLine(null), /not available/);
  assert.match(projectionBody(D, { rain: 25, horizon: 0 }), /at the slow end it does not fill/);
});

test("later days compare silt with today", () => {
  const h = projectionBody(D, { rain: 20, horizon: 30 });
  assert.match(h, /about 45% of the drain&#39;s depth \(estimate\); today about 40%/);
  assert.match(h, /about 0% of the drain&#39;s depth \(estimate\), the same as today/);
});

test("pocket names are escaped", () => {
  const h = projectionView(D, initialPick(D));
  assert.doesNotMatch(h, /<img src=x/); assert.match(h, /Anand &lt;img src=x onerror=1&gt;/);
});

test("every rain and day renders clean; empty or partial data does not print undefined or NaN", () => {
  for (const rain of [20, 25]) for (const horizon of [0, 30]) clean(projectionView(D, { rain, horizon }));
  const bare = projectionView({ scenarios: [] }, initialPick({ scenarios: [] }));
  assert.match(bare, /No pockets to show/); clean(bare);
  const odd = { scenarios: [{ rain_mm_h: 25, horizon_days: 0, pockets: [pk({ level: "x", utilisation_pct: null, silt_fraction: null, capacity_mm_h: null })] }] };
  const h = projectionView(odd, initialPick(odd)); clean(h);
  assert.match(h, /Level: not available/); assert.doesNotMatch(h, /class="bar/);
});

test("controller fetches once, then a picker tap re-renders locally and keeps focus", async () => {
  const els = {};
  let calls = 0, prevented = 0, focused = "";
  const body = { innerHTML: "", querySelector: (s) => ({ focus: () => { focused = s; } }) };
  const root = { innerHTML: "", querySelector: (s) => (els[s] ??= body) };
  const ctx = { services: { projection: { projection: async () => { calls++; return structuredClone(D); } } } };
  await projection.mount(root, ctx, []);
  assert.equal(projection.path, "projection"); assert.equal(projection.roles, null);
  assert.match(root.innerHTML, /data-rain="25" class="on"/); assert.match(root.innerHTML, /data-horizon="0" class="on"/);
  const tap = (dataset) => body.onclick({ target: { closest: () => ({ dataset }) }, preventDefault: () => { prevented++; } });
  tap({ horizon: "30" });
  assert.match(body.innerHTML, /data-horizon="30" class="on"/); assert.match(body.innerHTML, /data-rain="25" class="on"/);
  tap({ rain: "20" });
  assert.match(body.innerHTML, /data-rain="20" class="on"/); assert.match(body.innerHTML, /data-horizon="30" class="on"/);
  assert.equal(focused, '[data-rain="20"]'); assert.equal(prevented, 2); assert.equal(calls, 1);
  body.onclick({ target: { closest: () => null }, preventDefault: () => { prevented++; } });
  assert.equal(prevented, 2);
});

test("controller lets a failed fetch reach the router", async () => {
  const ctx = { services: { projection: { projection: async () => { throw new Error("down"); } } } };
  await assert.rejects(projection.mount({ innerHTML: "", querySelector: () => ({}) }, ctx, []), /down/);
});
