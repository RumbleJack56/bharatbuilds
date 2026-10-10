// web/tests/v13-v18-defaults.test.js — V13 default pin and V18 reference rain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { PIN, BANNED } from "../js/ui/copy.js";
import { report, DEFAULT } from "../js/controllers/report.js";
import { simControls } from "../js/views/sim.view.js";
import { simPane } from "../js/controllers/sim.js";

// ---- V13
test("V13: default pin is the Daryai Nallah barrel at Pusa Road (DR-DN-PUSA) and says so", () => {
  assert.deepEqual(DEFAULT, [28.643592, 77.186944]);
  assert.match(PIN.default, /Daryai Nallah.*Pusa Road/);
  assert.doesNotMatch(PIN.default, BANNED);
});
test("V13: the report form starts at that pin with the label", async () => {
  const els = {}; const el = (s) => els[s] ??= { textContent: "", innerHTML: "", hidden: false, value: "" };
  let pinned;
  const ctx = { map: { available: () => true, create: (_, o) => ({ pin: p => { pinned = p; }, view() {}, destroy() {}, onClick() {}, center: o.center }) },
    camera: { available: () => true }, geo: {}, toast: {}, services: {} };
  await report.mount({ innerHTML: "", querySelector: el }, ctx);
  assert.deepEqual(pinned, [28.643592, 77.186944]);
  assert.match(els["#coords"].textContent, /Daryai Nallah/);
});


// ---- V18
test("V18: simControls starts at the rain it is given and names it as the reference", () => {
  const h = simControls(25);
  assert.match(h, /id="rv">25</); assert.match(h, /value="25"/); assert.match(h, /Reference rain: 25 mm\/h/);
  assert.doesNotMatch(h, /35/);
});
test("V18: simPane takes the starting rain from GET /api/map reference_rain_mm_h", async () => {
  const sent = [];
  const els = {}; const el = (s) => els[s] ??= { textContent: "", innerHTML: "", value: "", checked: true, querySelectorAll: () => [] };
  const pane = { innerHTML: "", querySelector: (s) => { if (s === "#rain") els[s] ??= { value: (/value="(\d+)"/.exec(pane.innerHTML) || [])[1], textContent: "" }; return el(s); }, querySelectorAll: () => [] };
  els["[name=st]:checked"] = { value: "current" };
  const ctx = { services: { dashboard: { map: async () => ({ reference_rain_mm_h: 25 }),
    simulate: async (a) => { sent.push(a); return { banner: "", scenario: {}, results: [] }; } } } };
  await simPane(pane, ctx);
  assert.equal(sent[0].rain, 25);
});

