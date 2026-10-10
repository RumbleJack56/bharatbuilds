// web/tests/d4-board.test.js — board honesty: no web-derived denominators, independent loads, scenario note in the log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { boardShell, logView } from "../js/views/board.view.js";
import { board } from "../js/controllers/board.js";

const inp = { received: 5, handed_back: 1, still_in_window: 2, accepted: 3, accepted_in_48h: 3, completed: 2, completed_in_window: 1, late_open: 1,
  confirmed: 1, disputed: 1, open_now: 4, overdue_now: 1 };
const LB = { demo: false, banner: "Scenario, not a forecast.", agencies: [{ agency_id: "mcd", agency_name: "MCD", rank: 1, ranked: true, score: 60,
  components: { response: 1, delivery: 0.5, verified: 0.5, timeliness: 0.75 }, inputs: inp, median_hours_to_accept: 4, median_hours_to_complete: 20 }],
  unassigned: { tasks: 0 }, method: { score: "s", measures: {}, not_scored: [], minimum: "m" } };
const TR = { demo: false, banner: "Fill time gains are a scenario.", gain_note: "Gain note text.", actions: [] };
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("board prints the API inputs next to a percentage, never a fraction with a denominator made in the web", () => {
  const t = text(boardShell(LB));
  assert.match(t, /Accepted within 48 h: 100% .*3 accepted in 48 h/);
  assert.match(t, /received 5, handed back 1, still in their window 2/);
  assert.doesNotMatch(t, /3 of 2/);                                    // received - handed_back - still_in_window = 2 (derived) must not appear as "of N"
  assert.match(t, /Done on time: 50% .*1 on time; completed 2, accepted and past due 1/);
  assert.doesNotMatch(t, /1 of 3/);                                    // completed + late_open = 3 (derived)
  assert.match(t, /1 overdue of 4 open/);                              // both numbers come from the API as-is
});
test("board with zero inputs still reads", () => {
  const z = Object.fromEntries(Object.keys(inp).map(k => [k, 0]));
  const t = text(boardShell({ ...LB, agencies: [{ ...LB.agencies[0], ranked: false, score: null, components: { response: null, delivery: null, verified: null, timeliness: null }, inputs: z }] }));
  assert.match(t, /no data yet/); assert.doesNotMatch(t, /undefined|NaN/);
});
test("log view puts the scenario banner and gain note above the first task", () => {
  const h = logView({ ...TR, actions: [] });
  assert.ok(h.indexOf("Fill time gains are a scenario.") >= 0 && h.indexOf("Gain note text.") >= 0);
  assert.ok(h.indexOf("Gain note text.") < h.indexOf("No tasks match"));
});

const dom = () => { const els = {}; const el = (s) => els[s] ??= { innerHTML: "", value: "", querySelector: el }; return { els, el }; };
test("a failed log fetch still shows the leaderboard, with the error in the log section only", async () => {
  const { els, el } = dom(), root = { innerHTML: "", querySelector: el };
  const ctx = { services: { dashboard: { leaderboard: async () => LB, transparency: async () => { throw new Error("log down"); } } } };
  await board.mount(root, ctx);
  assert.match(root.innerHTML, /Agency scores/); assert.doesNotMatch(root.innerHTML, /log down/);
  assert.match(els["#log"].innerHTML, /log down/);
});
test("a failed leaderboard fetch is an error for the router (nothing to show)", async () => {
  const root = { innerHTML: "", querySelector: () => ({}) };
  const ctx = { services: { dashboard: { leaderboard: async () => { throw new Error("lb down"); }, transparency: async () => ({ ...TR }) } } };
  await assert.rejects(board.mount(root, ctx), /lb down/);
});
