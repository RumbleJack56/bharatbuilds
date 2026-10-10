// web/tests/followup-sim.test.js — simulator map, captions, map-adapter clear().
import { test } from "node:test";
import assert from "node:assert/strict";
import { simControls, simCaption } from "../js/views/sim.view.js";
import { mapLegend, pocketCircle } from "../js/views/dash.view.js";
import { simPane } from "../js/controllers/sim.js";
import { createLeafletMap } from "../js/adapters/map-leaflet.js";
import { MapViewPort } from "../js/ports/index.js";

const P = (id, level) => ({ id, name: "Pocket " + id, level, lat: 28.6 + +id / 1000, lon: 77.1 });

test("sim view: caption names the rain and the scenario", () => {
  assert.equal(simCaption(80), "Levels at 80 mm/h (scenario)");
  const h = simControls(25);
  assert.match(h, /id="cap"[^>]*>Levels at 25 mm\/h \(scenario\)/);
  assert.match(h, /id="m" class="map[^"]*" data-liquid-ignore/);
  assert.ok(h.indexOf('id="cap"') < h.indexOf('id="m"') && h.indexOf('id="m"') < h.indexOf('id="res"'));
});
test("map view: caption names the reference rain", () => {
  assert.match(mapLegend({ reference_rain_mm_h: 25, banner: "" }), /Levels at 25 mm\/h \(reference rain\)/);
});
test("pocketCircle: label and colour from the shared level mapping", () => {
  const [at, o] = pocketCircle(P("1", "high"));
  assert.deepEqual(at, [P("1", "high").lat, 77.1]); assert.equal(o.label, "Pocket 1: High"); assert.equal(o.color, "#b3261e");
  assert.equal(pocketCircle(P("2", "weird"))[1].label, "Pocket 2: None");
});

function harness(sims) {
  const els = {}; const el = (s) => els[s] ??= { textContent: "", innerHTML: "", value: "", checked: true };
  const pane = { innerHTML: "", querySelector: (s) => el(s), querySelectorAll: () => [] };
  els["#rain"] = { value: "10", textContent: "" }; els["[name=st]:checked"] = { value: "current" };
  const calls = []; let destroyed = 0;
  const view = { circle: (at, o) => calls.push(["circle", o.label]), clear: () => calls.push(["clear"]), fit: () => calls.push(["fit"]), destroy: () => { destroyed++; } };
  const ctx = { map: { available: () => true, create: () => view },
    services: { dashboard: { map: async () => ({ reference_rain_mm_h: 10 }), simulate: sims } } };
  return { pane, els, calls, ctx, destroyed: () => destroyed };
}

test("sim controller: draws one labelled circle per result and redraws on change", async () => {
  const sims = async ({ rain }) => ({ banner: "b", scenario: {}, results: [P("1", rain > 50 ? "high" : "watch"), P("2", "none")] });
  const h = harness(sims);
  await simPane(h.pane, h.ctx);
  assert.deepEqual(h.calls.filter(c => c[0] === "circle").map(c => c[1]), ["Pocket 1: Watch", "Pocket 2: None"]);
  h.calls.length = 0; h.els["#rain"].value = "80";
  await h.els["#rain"].oninput();
  assert.deepEqual(h.calls.map(c => c[0]), ["clear", "circle", "circle"]);
  assert.equal(h.calls[1][1], "Pocket 1: High");
  assert.equal(h.els["#cap"].textContent, "Levels at 80 mm/h (scenario)");
});
test("sim controller: a stale response draws nothing", async () => {
  let release; const gate = new Promise(r => { release = r; });
  const sims = async ({ rain }) => { if (rain === 10) await gate; return { banner: "", scenario: {}, results: [P("1", rain === 10 ? "watch" : "high")] }; };
  const h = harness(sims);
  const first = simPane(h.pane, h.ctx);
  await new Promise(r => setTimeout(r, 5));            // first run (10 mm/h) is waiting on the gate
  h.els["#rain"].value = "80"; await h.els["#rain"].oninput();
  release(); await first;
  assert.deepEqual(h.calls.filter(c => c[0] === "circle").map(c => c[1]), ["Pocket 1: High"]);
});
test("sim controller: leaving destroys the map and later responses draw nothing", async () => {
  const h = harness(async () => ({ banner: "", scenario: {}, results: [P("1", "high")] }));
  const off = await simPane(h.pane, h.ctx);
  assert.equal(typeof off, "function"); off();
  assert.equal(h.destroyed(), 1);
  h.calls.length = 0; await h.els["#rain"].oninput();
  assert.deepEqual(h.calls, []);
});

test("MapViewPort lists clear", () => assert.ok(MapViewPort.methods.includes("clear")));
test("leaflet adapter: clear() empties the marker layer, not the pin, and is a no-op after destroy", () => {
  const log = []; let removed = false;
  const obj = { addTo: () => obj, bindTooltip: () => obj, bindPopup: () => obj, setLatLng: () => obj };
  const group = { addTo: () => group, clearLayers: () => { if (removed) throw new Error("dead"); log.push("clearLayers"); } };
  const map = { setView() {}, fitBounds() {}, invalidateSize() {}, on() {}, remove() { removed = true; } };
  const L = { map: () => map, tileLayer: () => obj, layerGroup: () => group, circleMarker: () => obj, marker: () => obj, divIcon: () => ({}) };
  const v = createLeafletMap(L).create({});
  v.clear(); assert.deepEqual(log, ["clearLayers"]);
  v.destroy(); v.clear(); assert.deepEqual(log, ["clearLayers"]);
});
