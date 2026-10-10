// web/tests/d3-actions.test.js — V16 actions list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { BANNED } from "../js/ui/copy.js";
import { hrRange } from "../js/ui/format.js";
import { createDashboardService } from "../js/services/dashboard.service.js";
import { actionsView, actionRows } from "../js/views/actions.view.js";
import { TAB_TITLES } from "../js/views/dash.view.js";
import { actionsPane } from "../js/controllers/actions.js";

const A = (o) => ({ asset_id: "DR-1", asset_name: "Pusa barrel", type: "clean", text: "Clean Pusa barrel.", route: { agency_id: "mcd", agency_name: "MCD", why: "MCD drain map", needs_coordinator: false },
  pocket_id: "P1", gain_h: 1.5, gain_h_low: 1, gain_h_high: 2.4, rank_score: 3, due_in_days: 3, evidence_reports: 2, status: "dispatched", task_id: 7, task_status: "open",
  evidence: ["2 resident report(s)", "silt estimate 40%"], data_source: "MCD", confidence: "medium", ...o });
const D = { actions: [A(), A({ asset_id: "DR-2", asset_name: "Orphan drain", type: "clarify_owner", route: { agency_id: null, agency_name: "Ward coordinator", why: "No source assigns this drain to an agency.", needs_coordinator: true },
  gain_h_low: 0, gain_h_high: 0, task_id: null, task_status: null, status: "proposed" })], total: 30, banner: "Scenario, not a forecast.", range_note: "A range, not a promise.", how_routed: "Routed by owner record." };

test("V16: hrRange formats a low to high range", () => {
  assert.equal(hrRange(1, 2.4), "about 1 to 2.4 h");
  assert.equal(hrRange(12.4, 20.6), "about 12 to 21 h");
  assert.equal(hrRange(null, null), "not available");
});
test("V16: each row has a text type chip, owner or No owner found, route, reason, evidence, range, task link", () => {
  const h = actionsView(D, 10);
  assert.match(h, /chip[^>]*>Clean</); assert.match(h, /chip[^>]*>Clarify owner</);
  assert.match(h, /Pusa barrel/); assert.match(h, /Owner: MCD/); assert.match(h, /Owner: No owner found/);
  assert.match(h, /Route: Ward coordinator/); assert.match(h, /MCD drain map/); assert.match(h, /silt estimate 40%/);
  assert.match(h, /about 1 to 2\.4 h/); assert.match(h, /href="#\/task\/7"/); assert.doesNotMatch(h, /#\/task\/null/);
  assert.match(h, /Scenario, not a forecast\./); assert.match(h, /A range, not a promise\./); assert.match(h, /Showing 2 of 30/);
  assert.match(h, /<select[^>]+id="top"[\s\S]*value="25"/);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /verified|proof|unspoofable/i);
});
test("V16: empty list says so", () => assert.match(actionRows({ ...D, actions: [], total: 0 }), /No actions/));
test("V16: dashboard.actions passes top; actions tab exists", async () => {
  const http = createFakeHttp({ "GET /api/actions?top=25": D });
  await createDashboardService(http).actions(25);
  assert.equal(http.calls[0].path, "/api/actions?top=25");
  assert.ok(TAB_TITLES.actions);
});
test("V16: pane renders, then top change refetches", async () => {
  const asked = [], els = {};
  const el = (s) => els[s] ??= { innerHTML: "", value: "10", querySelector: el };
  const pane = { innerHTML: "", querySelector: el };
  const ctx = { services: { dashboard: { actions: async (n) => { asked.push(n); return D; } } } };
  await actionsPane(pane, ctx);
  assert.deepEqual(asked, [10]); assert.match(pane.innerHTML, /Pusa barrel/);
  els["#top"].value = "25"; await els["#top"].onchange();
  assert.deepEqual(asked, [10, 25]);
});
