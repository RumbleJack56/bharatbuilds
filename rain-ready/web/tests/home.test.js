// web/tests/home.test.js — dashboard home: counts, progress stepper, activity feed, role-specific button, escaping, honesty.
import { test } from "node:test";
import assert from "node:assert/strict";
import { homeView, areaCounts, stepper, activity, STATUS_TEXT } from "../js/views/home.view.js";
import { homePane } from "../js/controllers/home.js";
import { BANNED } from "../js/ui/copy.js";

const ev = (event, at, by = "Resident", agency_id = null) => ({ event, label: `L-${event}`, at, by, agency_id });
const act = (task_id, status, timeline, over = {}) => ({ task_id, asset_id: `DR-${task_id}`, asset_name: `Drain <${task_id}>`, agency_id: "mcd",
  agency_name: "MCD (Municipal Corporation of Delhi)", status, timeline, ...over });
const ACTIONS = [
  act(1, "open", [ev("created", "2026-10-10T08:00:00+00:00")]),
  act(2, "accepted", [ev("created", "2026-10-10T07:00:00+00:00"), ev("accepted", "2026-10-10T09:00:00+00:00", "MCD official", "mcd")]),
  act(3, "confirmed", [ev("created", "2026-10-09T07:00:00+00:00"), ev("confirmed", "2026-10-10T10:00:00+00:00")]),
  act(4, "disputed", [ev("disputed", "2026-10-10T06:00:00+00:00")], { agency_id: null, agency_name: null }),
];
const OWNERS = [{ agency_id: "mcd", agency_name: "MCD (Municipal Corporation of Delhi)", assets_owned: 2, tasks: { open: 1 }, overdue: 0 },
  { agency_id: null, agency_name: null, assets_owned: 3, tasks: { open: 0 }, overdue: 0 }];

test("areaCounts groups statuses into open, in progress, resolved, disputed", () => {
  assert.deepEqual(areaCounts(ACTIONS), { open: 1, progress: 1, resolved: 1, disputed: 1 });
});

test("stepper marks steps up to the current one and always prints the status in words", () => {
  const h = stepper("accepted");
  assert.equal((h.match(/class="on/g) || []).length, 2); assert.match(h, /aria-current="step">Accepted/);
  assert.match(h, new RegExp(STATUS_TEXT.accepted));
  assert.doesNotMatch(stepper("rejected"), /class="on/); assert.match(stepper("rejected"), /Closed without action/);
});

test("activity is newest first across tasks and capped", () => {
  const a = activity(ACTIONS, 3);
  assert.deepEqual(a.map(e => e.event), ["confirmed", "accepted", "created"]); assert.equal(a[0].task_id, 3);
});

test("public visitor: area counts, owners with No owner found, feed, tiles, sign-in button; no complaints block", () => {
  const h = homeView({ me: null, actions: ACTIONS, owners: OWNERS });
  assert.match(h, /Pick a resident to report a problem/); assert.doesNotMatch(h, /My complaints/);
  assert.match(h, /No owner found/); assert.match(h, /Actions in your area/); assert.match(h, /href="#\/dash\/map"/);
  assert.match(h, /Drain &lt;3&gt;/); assert.doesNotMatch(h, /Drain <3>/);
  assert.match(h, /class="card glass lg" data-lg-css/);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /undefined|NaN/);
});

test("resident: Report a problem, complaints with owner and stepper, held and unlinked reports in words", () => {
  const me = { id: "res-1", role: "resident" };
  const mine = [{ id: 9, kind: "blocked_drain", created_at: "2026-10-10T08:00:00+00:00", task_id: 2, asset_id: "DR-2", flags: [] },
    { id: 8, kind: "standing_water", created_at: "2026-10-10T07:00:00+00:00", task_id: null, asset_id: null, flags: [{ level: "warn" }] }];
  const h = homeView({ me, mine, actions: ACTIONS, owners: OWNERS });
  assert.match(h, /href="#\/report">Report a problem/); assert.match(h, /My complaints/);
  assert.match(h, /href="#\/task\/2"/); assert.match(h, /Owner: MCD/); assert.match(h, /Accepted by the owner/);
  assert.match(h, /Held for a check/);
  assert.match(homeView({ me, mine: [], actions: [], owners: [] }), /You have not sent a complaint yet/);
});

test("official gets the inbox button", () => {
  assert.match(homeView({ me: { role: "official" }, actions: [], owners: [] }), /href="#\/inbox">Open your inbox/);
});

test("homePane loads log and owners, and a failed complaint list does not hide the area", async () => {
  const pane = { innerHTML: "" };
  const ctx = { services: {
    session: { me: async () => ({ id: "res-1", role: "resident" }) },
    dashboard: { transparency: async (q) => { assert.equal(q.limit, 200); return { actions: ACTIONS }; }, accountability: async () => ({ agencies: OWNERS }) },
    incidents: { mine: async () => { throw new Error("down"); } } } };
  await homePane(pane, ctx);
  assert.match(pane.innerHTML, /Your area/); assert.match(pane.innerHTML, /You have not sent a complaint yet/);
});
