// web/tests/v11-disputed.test.js — V11 disputed tasks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { inboxView, taskDetail, disputedActions } from "../js/views/official.view.js";
import { inbox, task } from "../js/controllers/official.js";

// ---- V11
const dispute = { id: 9, event: "disputed", note: "Still full of plastic", actor_name: "Resident two", at: "2026-10-10T10:00:00+00:00" };
const T = { id: 7, status: "disputed", agency_id: "mcd", asset_name: "Drain", agency_name: "MCD", pocket_name: "P", gain_h: 1, rank_score: 2, report_count: 1,
  incidents: [], events: [{ id: 1, event: "created", at: "2026-10-09T10:00:00+00:00", actor_name: "x" }, dispute] };
test("V11: the inbox card for a disputed task carries the resident's note", () => {
  const h = inboxView({ tasks: [T], banner: "" }, { 7: "Still full of plastic" });
  assert.match(h, /disputed/); assert.match(h, /Resident.s note:<\/strong> Still full of plastic/);
  assert.doesNotMatch(inboxView({ tasks: [{ ...T, status: "open" }], banner: "" }), /Resident.s note/);
});
test("V11: the task page shows the dispute note, and Accept is the only action offered", () => {
  assert.match(taskDetail(T, { banner: "", back: "#/inbox" }), /Resident.s note[\s\S]*Still full of plastic/);
  assert.match(disputedActions(), /id="acc"/); assert.doesNotMatch(disputedActions(), /id="rej"/);
});
test("V11: after Accept, the task page shows the to-be-redone note", () => {
  const t = { ...T, status: "accepted", events: [...T.events, { id: 10, event: "accepted", note: "to be redone after a resident disputed the job", at: "2026-10-10T11:00:00+00:00", actor_name: "o" }] };
  assert.match(taskDetail(t, { banner: "", back: "#/inbox" }), /To be redone[\s\S]*to be redone after a resident disputed the job/);
  assert.doesNotMatch(taskDetail({ ...t, status: "done" }, { banner: "", back: "#/inbox" }), /class="banner redo"/);
});
test("V11: inbox controller loads detail only for disputed tasks to get the note", async () => {
  const http = createFakeHttp({ "GET /api/tasks/7": T });
  const tasks = { list: async () => ({ tasks: [T, { ...T, id: 8, status: "open" }], banner: "" }), get: async (id) => http.request("GET", `/api/tasks/${id}`) };
  const root = { innerHTML: "", querySelector: () => null };   // no filter bar to wire in a fake root
  await inbox.mount(root, { services: { session: { me: async () => ({ agency_id: "mcd" }) }, tasks } });
  assert.match(root.innerHTML, /Still full of plastic/);
  assert.deepEqual(http.calls.map(c => c.path), ["/api/tasks/7"]);
});
test("V11: a disputed task page offers Accept, which calls accept", async () => {
  const els = {}; const el = (s) => els[s] ??= { textContent: "", innerHTML: "", disabled: false, addEventListener(_, f) { this.f = f; } };
  const box = { querySelector: el }; const accepted = [];
  const root = { innerHTML: "", querySelector: (s) => s === "#actions" ? box : el(s) };
  const ctx = { camera: { available: () => true }, toast: { show() {} }, nav: { refresh() {} },
    services: { session: { me: async () => ({ role: "official", agency_id: "mcd" }) },
      tasks: { get: async () => T, list: async () => ({ banner: "" }), accept: async (id) => { accepted.push(id); } },
      dashboard: { agencies: async () => [] } } };
  await task.mount(root, ctx, [7]);
  assert.match(box.innerHTML, /id="acc"/);
  await els["#acc"].f({ target: { disabled: false } });
  assert.deepEqual(accepted, [7]);
});

