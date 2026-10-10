// web/tests/d2-board.test.js — V14 public accountability screen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { BANNED } from "../js/ui/copy.js";
import { createDashboardService } from "../js/services/dashboard.service.js";
import { boardShell, logView } from "../js/views/board.view.js";
import { board } from "../js/controllers/board.js";
import { TABS, CONTROLLERS } from "../js/controllers/index.js";

function dom() {
  const els = {};
  const el = (s) => els[s] ??= { textContent: "", innerHTML: "", value: "", disabled: false, dataset: {}, querySelector: el };
  return { els, el };
}
const LB = { demo: true, demo_note: "Rehearsal data. Made by the team.", banner: "Scenario, not a forecast.", generated_at: "2026-10-10T10:00:00",
  agencies: [{ agency_id: "mcd", agency_name: "MCD", rank: 1, ranked: true, score: 71.5, components: { response: 0.8, delivery: null, verified: 0.5, timeliness: 1 },
    inputs: { received: 5, handed_back: 1, still_in_window: 0, accepted: 4, accepted_in_48h: 3, completed: 2, completed_in_window: 2, late_open: 0, confirmed: 1, disputed: 1, open_now: 2, overdue_now: 0 },
    median_hours_to_accept: 4.2, median_hours_to_complete: 20 },
  { agency_id: "pwd", agency_name: "PWD", rank: null, ranked: false, score: null, components: { response: null, delivery: null, verified: null, timeliness: null },
    inputs: { received: 1, handed_back: 0, still_in_window: 1, accepted: 0, accepted_in_48h: 0, completed: 0, completed_in_window: 0, late_open: 0, confirmed: 0, disputed: 0, open_now: 1, overdue_now: 0 },
    median_hours_to_accept: null, median_hours_to_complete: null }],
  unassigned: { tasks: 2, oldest_days: 3.5, median_days: 2 },
  method: { score: "0 to 100 = weighted share.", measures: { response: "Tasks accepted within 48 hours.", delivery: "Tasks completed in window." },
    not_scored: ["Tasks with no owner found"], minimum: "Fewer than 3 tasks: no rank." } };
const TR = { demo: true, demo_note: "Rehearsal data.", banner: "Scenario.", gain_note: "Fill time gain is a scenario.", count: 1, actions: [{
  task_id: 3, asset_id: "DR-DN-PUSA", asset_name: "Daryai Nallah barrel", pocket: "P", agency_id: "mcd", agency_name: "MCD", status: "accepted", overdue: true,
  due_at: "2026-10-12T10:00:00+00:00", reports: 2, fill_time_gain_h: 1.5, why_routed: "Owner from MCD drain map", asset_data_source: "MCD list",
  timeline: [{ event: "created", label: "Reported and routed", at: "2026-10-10T10:00:00+00:00", by: "Resident", agency_id: null, note: "", photo_url: "/media/p.jpg", flags: [] },
    { event: "accepted", label: "Accepted by the agency", at: "2026-10-10T11:00:00+00:00", by: "MCD official", agency_id: "mcd", note: "on it", photo_url: null, flags: [] }] }] };
test("V14: board shows scores with inputs, unassigned as No owner found, method verbatim, rehearsal label, scenario banner", () => {
  const h = boardShell(LB);
  assert.match(h, /Rehearsal data/); assert.match(h, /Scenario, not a forecast\./);
  assert.match(h, /MCD/); assert.match(h, /71\.5/); assert.match(h, /Not ranked/);
  assert.match(h, /No owner found[\s\S]*<strong>2<\/strong> task/); assert.match(h, /3\.5 days/);
  for (const s of ["0 to 100 = weighted share.", "Tasks accepted within 48 hours.", "Tasks with no owner found", "Fewer than 3 tasks: no rank."]) assert.ok(h.includes(s), s);
  assert.match(h, /<select[^>]+id="fa"[\s\S]*value="none"/); assert.match(h, /id="fs"/); assert.match(h, /id="fl"/);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /verified|proof|unspoofable/i);
});
test("V14: no rehearsal label when demo is false", () => assert.doesNotMatch(boardShell({ ...LB, demo: false, demo_note: null }), /Rehearsal data/));
test("V14: log shows route, reason, evidence and a roles-only timeline; status is text", () => {
  const h = logView(TR);
  assert.match(h, /Daryai Nallah barrel/); assert.match(h, /accepted/); assert.match(h, /overdue/); assert.match(h, /Owner from MCD drain map/); assert.match(h, /MCD list/);
  assert.match(h, /Reported and routed/); assert.match(h, /Resident/); assert.match(h, /MCD official/); assert.match(h, /on it/); assert.match(h, /p\.jpg/);
  assert.match(h, /Fill time gain is a scenario/); assert.match(h, /Rehearsal data/);
  assert.match(logView({ ...TR, actions: [], count: 0 }), /No tasks match/);
});
test("V14: dashboard service passes filters to /api/transparency", async () => {
  const http = createFakeHttp({ "GET /api/leaderboard": LB, "GET /api/transparency?agency_id=mcd&status=open&limit=20": TR, "GET /api/transparency?limit=50": TR });
  const d = createDashboardService(http);
  await d.leaderboard(); await d.transparency({ agencyId: "mcd", status: "open", limit: 20 }); await d.transparency();
  assert.equal(http.calls.length, 3);
});
test("V14: board is public, in every role's tabs, and a filter change refetches the log", async () => {
  assert.equal(board.roles, null); assert.ok(CONTROLLERS.includes(board));
  for (const r of Object.keys(TABS)) assert.ok(TABS[r].some(([h]) => h === "#/board"), r);
  const asked = [], { els, el } = dom();
  const root = { innerHTML: "", querySelector: el };
  const ctx = { services: { dashboard: { leaderboard: async () => LB, transparency: async (f = {}) => { asked.push(f); return TR; } } } };
  await board.mount(root, ctx);
  assert.match(root.innerHTML, /Rehearsal data/);
  els["#fa"].value = "mcd"; els["#fs"].value = "open"; els["#fl"].value = "20";
  await els["#fa"].onchange();
  assert.deepEqual(asked.at(-1), { agencyId: "mcd", status: "open", limit: 20 });
  assert.match(els["#log"].innerHTML, /Daryai Nallah barrel/);
});

