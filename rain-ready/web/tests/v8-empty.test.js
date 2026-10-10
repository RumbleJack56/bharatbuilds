// web/tests/v8-empty.test.js — every list screen prints one plain line when it has nothing to show.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY, BANNED } from "../js/ui/copy.js";
import { mineView, confirmList } from "../js/views/resident.view.js";
import { inboxView, taskDetail } from "../js/views/official.view.js";
import { adminView } from "../js/views/admin.view.js";
import { heldView } from "../js/views/held.view.js";
import { actionRows } from "../js/views/actions.view.js";
import { insightsView, reportView } from "../js/views/insights.view.js";
import { logView } from "../js/views/board.view.js";
import { accountabilityView, captureView } from "../js/views/dash.view.js";

const T = { id: 1, status: "open", asset_name: "Drain", agency_name: "MCD", incidents: [], events: [], gain_h: 1 };
const cases = {
  mine: mineView([]), confirm: confirmList([]), inbox: inboxView({ tasks: [], banner: "" }),
  history: taskDetail(T, { banner: "", back: "#/inbox" }), reports: taskDetail(T, { banner: "", back: "#/inbox" }),
  admin: adminView({ tasks: [], agencies: [], banner: "" }), held: heldView({ items: [], canReview: true }),
  actions: actionRows({ actions: [] }), insights: insightsView({ banner: "", insights: [] }),
  log: logView({ actions: [], gain_note: "n" }), accountability: accountabilityView({ note: "n", agencies: [] }),
  capture: captureView({ banner: "", sites: [] }),
};
for (const [k, html] of Object.entries(cases)) {
  test(`empty state: ${k}`, () => {
    assert.ok(EMPTY[k], `EMPTY.${k} missing`);
    assert.ok(html.includes(`<p class="muted">${EMPTY[k]}</p>`), html.slice(0, 200));
    assert.doesNotMatch(EMPTY[k], BANNED); assert.doesNotMatch(html, /undefined|NaN/);
  });
}
test("empty lines are one sentence", () => { for (const v of Object.values(EMPTY)) assert.ok(v.length < 90 && !v.includes("\n")); });
test("ward report with no open tasks still reads", () => assert.doesNotMatch(reportView({ banner: "", generated_at: "x", range_note: "", tasks_by_agency: [], held_reports: 0,
  confirmed_cleans_7d: 0, top_drains: [], pockets_by_level: {} }), /undefined/));
