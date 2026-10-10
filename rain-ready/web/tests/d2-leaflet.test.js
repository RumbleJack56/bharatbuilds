// web/tests/d2-leaflet.test.js — Leaflet destroy race.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLeafletMap } from "../js/adapters/map-leaflet.js";

function fakeL() {
  const log = []; let removed = false;
  const live = (n) => (...a) => { if (removed) throw new TypeError("Cannot read properties of undefined (reading '_leaflet_pos')"); log.push(n); return obj; };
  const obj = { addTo: live("addTo"), bindTooltip: live("bindTooltip"), bindPopup: live("bindPopup"), setLatLng: live("setLatLng") };
  const map = { setView: live("setView"), fitBounds: live("fitBounds"), invalidateSize: live("invalidateSize"), on: live("on"), remove() { removed = true; log.push("remove"); } };
  return { log, L: { map: () => map, tileLayer: () => obj, circleMarker: () => obj, marker: () => obj, divIcon: () => ({}) } };
}
test("leaflet: every view method is a no-op after destroy and the deferred invalidate is cancelled", async () => {
  const { L, log } = fakeL(), view = createLeafletMap(L).create({});
  view.destroy();
  const after = log.length;
  view.circle([1, 2], { color: "#000" }); view.badge([1, 2], { html: "" }); view.pin([1, 2]); view.onClick(() => {}); view.view([1, 2]); view.fit([[1, 2]]);
  view.destroy();                                             // twice is fine
  await new Promise(r => setTimeout(r, 150));
  assert.equal(log.length, after); assert.equal(log.filter(x => x === "remove").length, 1);
  assert.ok(!log.slice(after).includes("invalidateSize"));
});
test("leaflet: methods still work before destroy", () => {
  const { L, log } = fakeL(), view = createLeafletMap(L).create({});
  view.circle([1, 2], { color: "#000", label: "x", popup: "p" }); view.fit([[1, 2]]);
  assert.ok(log.includes("fitBounds")); assert.ok(log.includes("bindTooltip"));
});
