// web/tests/final-wave.test.js — liquid-mode click targets, drain markers that never block taps, late /api/map.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLiquidGlass } from "../js/adapters/glass-liquidgl.js";
import { createLeafletMap } from "../js/adapters/map-leaflet.js";
import { report } from "../js/controllers/report.js";
import { NO_OWNER, NEAREST } from "../js/ui/copy.js";

// ---- 1. liquidGL sets pointer-events:none on each lens target; the adapter must give clicks back ----
function lensRig() {
  const kid = () => ({ style: { pointerEvents: "none" } });
  const mk = () => { const kids = [kid(), kid()]; return { kids, style: {}, classList: { add() {} }, querySelectorAll: () => kids }; };
  const els = [mk(), mk()], canvases = [], timers = [];
  const root = { classList: { add() {}, remove() {} } };
  const lib = (o) => { for (const e of els) e.style.pointerEvents = "none"; return {}; };   // what lg224 does in the lens ctor
  const win = { document: { documentElement: root, images: [], querySelectorAll: (q) => q === "body > canvas" ? canvases : els },
    liquidGL: lib, addEventListener() {}, removeEventListener() {}, dispatchEvent() { for (const e of els) e.style.pointerEvents = "none"; return true; }, Event: class { constructor(t) { this.type = t; } } };
  const glass = createLiquidGlass(win, { settleMs: 1, setTimeoutFn: (f) => { timers.push(f); } });
  const flush = async () => { for (let i = 0; i < 4; i++) { await Promise.resolve(); while (timers.length) timers.shift()(); } await Promise.resolve(); };
  return { glass, els, flush };
}
const clickable = (e) => e.style.pointerEvents === "auto" && e.kids.every(k => k.style.pointerEvents === "auto");
test("liquid: after mount every lens target and its links/buttons take pointer events again", () => {
  const r = lensRig(); r.glass.mount(".lg");
  assert.ok(r.els.every(clickable));
});
test("liquid: refresh (the library re-applies its styles on resize) restores them again", async () => {
  const r = lensRig(); r.glass.mount(".lg");
  const p = r.glass.refresh(); for (let i = 0; i < 3; i++) await r.flush(); await p;
  assert.ok(r.els.every(clickable));
});

// ---- 3. a drain marker without a popup is not interactive and not a tab stop ----
test("leaflet badge: no popup means interactive:false, keyboard:false; with a popup both stay on", () => {
  const opts = [];
  const obj = { addTo: () => obj, bindPopup() {} };
  const map = { setView() {}, fitBounds() {}, invalidateSize() {}, on() {}, remove() {} };
  const L = { map: () => map, tileLayer: () => obj, layerGroup: () => obj, circleMarker: () => obj, marker: (_, o) => { opts.push(o); return obj; }, divIcon: () => ({}) };
  const v = createLeafletMap(L).create({});
  v.badge([1, 2], { html: "" }); v.badge([1, 2], { html: "", popup: "p" });
  assert.equal(opts[0].interactive, false); assert.equal(opts[0].keyboard, false);
  assert.equal(opts[1].interactive, true); assert.equal(opts[1].keyboard, true);
});

// ---- 4. the result card waits for /api/map ----
test("report: the result card waits for a late /api/map so the no-owner and nearest-drain lines survive", async () => {
  const els = {}, el = (s) => els[s] ??= { textContent: "", innerHTML: "", hidden: false, style: {}, files: [], value: "", scrollIntoView() {} };
  const root = { innerHTML: "", querySelector: el };
  let release; const gate = new Promise(r => { release = r; });
  const drains = [{ id: "DR-X", name: "Far drain", lat: 28.66, lon: 77.2, agency_id: null }];
  const ctx = { map: { available: () => false }, toast: { show() {} }, camera: { available: () => true }, geo: {},
    services: { dashboard: { map: async () => { await gate; return { assets: drains }; } },
      incidents: { create: async () => ({ message: "Saved", field_rule: "r", linked_asset: "DR-X", distance_m: 20, flags: [], task_id: 3 }) } } };
  await report.mount(root, ctx);
  el("#kind").value = "blocked";
  el("#f").reset = () => {};
  const sent = el("#f").onsubmit({ preventDefault() {} });
  await new Promise(r => setTimeout(r, 5));
  release(); await sent; await new Promise(r => setTimeout(r, 20));
  assert.match(els["#out"].innerHTML, new RegExp(NO_OWNER));
});

// ---- 6. copy comment ----
test("copy.js notes that 150 m mirrors the server LINK_RADIUS_M", () => {
  assert.match(readFileSync(new URL("../js/ui/copy.js", import.meta.url), "utf8"), /LINK_RADIUS_M/);
});
