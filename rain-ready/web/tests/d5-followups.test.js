// web/tests/d5-followups.test.js — review follow-ups: insights labels, dates, empty pockets, text 4xx, actions load error, zero gain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFetchHttp } from "../js/adapters/http-fetch.js";
import { insightsView, reportView } from "../js/views/insights.view.js";
import { taskCard } from "../js/views/official.view.js";
import { actionsPane } from "../js/controllers/actions.js";
import { when } from "../js/ui/format.js";
import { BANNED } from "../js/ui/copy.js";

const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const ins = (evidence) => ({ banner: "b", insights: [{ id: "x", text: "t", why: "w", evidence }] });
const R = { generated_at: "2026-10-10T10:00:00", banner: "b", range_note: "r", tasks_by_agency: [], held_reports: 0, confirmed_cleans_7d: 0, top_drains: [], pockets_by_level: {} };

test("insights evidence: friendly labels and units, values as the API gives them", () => {
  const t = text(insightsView(ins({ silt_estimate: 0.4, time_to_fill_h: 3.2, days_overdue: 2, days_since_clean: 40, reports: 3, bounced: 1 })));
  assert.match(t, /silt estimate \(0 to 1\): 0\.4/); assert.match(t, /time to fill: about 3\.2 h/);
  assert.match(t, /days overdue: 2/); assert.match(t, /days since last clean: 40/); assert.match(t, /resident reports: 3/); assert.match(t, /tasks handed back: 1/);
  assert.doesNotMatch(t, /time to fill h|silt estimate:/);
});
test("report generated_at uses the date formatter", () => {
  const h = text(reportView(R));
  assert.ok(h.includes(`Generated ${when(R.generated_at)}.`)); assert.doesNotMatch(h, /T10:00:00/);
});
test("report with no pockets says so", () => assert.match(text(reportView(R)), /No pockets/));
test("http text:true with a 4xx JSON body raises ApiError(detail, status)", async () => {
  const http = createFetchHttp({ fetchImpl: async () => ({ ok: false, status: 403, text: async () => "ignored", json: async () => ({ detail: "role cannot do this" }) }) });
  await assert.rejects(http.request("GET", "/api/x", { text: true }), e => e.status === 403 && e.message === "role cannot do this");
});
test("actions pane shows an errBox when the first load fails", async () => {
  const pane = { innerHTML: "", querySelector: () => null };
  await actionsPane(pane, { services: { dashboard: { actions: async () => { throw new Error("Cannot reach the server."); } } } });
  assert.match(pane.innerHTML, /role="alert"[^>]*>Cannot reach the server\./);
});
test("a zero rank score or zero gain reads as a plain phrase, not a figure", () => {
  const t0 = { id: 1, status: "open", rank_score: 0, gain_h: 0, asset_name: "A", agency_name: "MCD", report_count: 1 };
  const h = text(taskCard(t0));
  assert.doesNotMatch(h, /rank 0|about 0 h/); assert.match(h, /gains no fill time at this rain/);
  const t1 = text(taskCard({ ...t0, rank_score: 2.34, gain_h: 1.5 }));
  assert.match(t1, /rank 2\.3/); assert.match(t1, /gains about 1\.5 h/);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /verified|proof|unspoofable/i);
});
