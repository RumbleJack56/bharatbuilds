// web/tests/d2-minors.test.js — review fixes from PR #10.
import { test } from "node:test";
import assert from "node:assert/strict";
import { inbox } from "../js/controllers/official.js";
import { simPane } from "../js/controllers/sim.js";
import { simControls } from "../js/views/sim.view.js";

test("minor: one failed dispute-note fetch does not blank the inbox", async () => {
  const T = (id, status) => ({ id, status, asset_name: "D" + id, agency_name: "MCD", rank_score: 1, report_count: 1, gain_h: 1 });
  const tasks = { list: async () => ({ tasks: [T(1, "disputed"), T(2, "disputed")], banner: "" }),
    get: async (id) => { if (id === 1) throw new Error("boom"); return { events: [{ event: "disputed", note: "Still full" }] }; } };
  const root = { innerHTML: "" };
  await inbox.mount(root, { services: { session: { me: async () => ({ agency_id: "mcd" }) }, tasks } });
  assert.match(root.innerHTML, /D1/); assert.match(root.innerHTML, /Still full/); assert.match(root.innerHTML, /\(no note\)/);
});
test("minor: simulator shows the error box when the map fetch fails", async () => {
  const pane = { innerHTML: "" };
  await simPane(pane, { services: { dashboard: { map: async () => { throw new Error("map is down"); } } } });
  assert.match(pane.innerHTML, /class="err"[^>]*>map is down/);
});
test("minor: simulator falls back to the default rain, never value=undefined", async () => {
  const els = {}; const el = (s) => els[s] ??= { textContent: "", innerHTML: "", value: "", checked: true };
  const pane = { innerHTML: "", querySelector: el, querySelectorAll: () => [] };
  els["#rain"] = { value: "25", textContent: "" }; els["[name=st]:checked"] = { value: "current" };
  await simPane(pane, { services: { dashboard: { map: async () => ({}), simulate: async () => ({ banner: "", scenario: {}, results: [] }) } } });
  assert.doesNotMatch(pane.innerHTML, /undefined/); assert.match(pane.innerHTML, /value="25"/);
  assert.doesNotMatch(simControls(undefined), /undefined/);
});

