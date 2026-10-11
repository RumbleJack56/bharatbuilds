// web/tests/drain.test.js — drain page: service path, honest labels, escaping, empty history, the links from other views.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { createDrainsService } from "../js/services/drains.service.js";
import { drainView, drainMissing, drainHref, drainLink } from "../js/views/drain.view.js";
import { BANNED } from "../js/ui/copy.js";

const fixture = (over = {}) => ({
  asset: { id: "DR-T<1>", type: "drain_segment", name: "Test <b>drain</b>", lat: 28.64, lon: 77.18, agency_id: null, agency_name: null,
    owner_source: "Test owner source", data_source: "official", confidence: "low", citation: "Test citation", note: "Test note", last_confirmed_clean: null },
  silt_now: 0.496, days_since_clean: null, silt_if_not_cleaned: { 0: 0.496, 30: 0.496, 60: 0.496, 90: 0.496 },
  silt_series_illustrative: { points: [{ days: 0, silt_fraction: 0 }, { days: 30, silt_fraction: 0.2 }, { days: 90, silt_fraction: 0.4 }], illustrative: true, note: "Illustrative curve note" },
  cleaning_history: [], reports: 0, pockets: [], banner: "Scenario, not a forecast.", ...over,
});

test("service encodes the asset id in the path", async () => {
  const http = createFakeHttp({ "GET /api/assets/DR%2F1": fixture() });
  await createDrainsService(http).asset("DR/1");
  assert.equal(http.calls[0].path, "/api/assets/DR%2F1");
});

test("view: escaped name, No owner found, sources, model and illustrative labels, banner, empty history", () => {
  const h = drainView(fixture());
  assert.match(h, /Test &lt;b&gt;drain&lt;\/b&gt;/); assert.doesNotMatch(h, /<b>drain<\/b>/);
  assert.match(h, /No owner found/); assert.match(h, /Test owner source/); assert.match(h, /Test citation/);
  assert.match(h, /model estimate/i); assert.match(h, /Illustrative/); assert.match(h, /Illustrative curve note/);
  assert.match(h, /Scenario, not a forecast\./); assert.match(h, /No confirmed clean on record/);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /undefined|NaN/);
});

test("view names the owner agency when there is one", () => {
  const h = drainView(fixture({ asset: { ...fixture().asset, agency_id: "mcd", agency_name: "MCD (Municipal Corporation of Delhi)" } }));
  assert.match(h, /MCD \(Municipal Corporation of Delhi\)/);
});

test("missing drain keeps a back link and a friendly 404 message", () => {
  const h = drainMissing({ status: 404, message: "asset not found" });
  assert.match(h, /class="back"/); assert.match(h, /could not find that drain/);
});

test("links from other views point at #/drain/<id> and escape the name", () => {
  assert.equal(drainHref("DR 1"), "#/drain/DR%201");
  assert.match(drainLink("DR-1", "A<b>"), /href="#\/drain\/DR-1">A&lt;b&gt;<\/a>/);
  assert.equal(drainLink(null, "Plain"), "Plain");
});
