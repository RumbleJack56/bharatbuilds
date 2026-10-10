// web/tests/d2-held.test.js — V15 held queue.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { ApiError } from "../js/core/errors.js";
import { BANNED } from "../js/ui/copy.js";
import { createIncidentsService } from "../js/services/incidents.service.js";
import { heldView } from "../js/views/held.view.js";
import { held } from "../js/controllers/held.js";
import { TABS, CONTROLLERS } from "../js/controllers/index.js";

// root whose innerHTML is parsed for data-inc cards so controllers can bind buttons
function heldRoot() {
  const cards = {}, root = { innerHTML: "", querySelector: () => null,
    querySelectorAll(sel) { const ids = [...root.innerHTML.matchAll(/data-inc="(\d+)"/g)].map(m => m[1]);
      return sel === "[data-inc]" ? ids.map(id => cards[id] ??= card(id)) : []; } };
  const card = (id) => { const c = { dataset: { inc: id }, buttons: {}, note: { value: "" } };
    c.querySelector = (s) => s === "textarea" || s === "input" ? c.note : (c.buttons[s] ??= { disabled: false, onclick: null });
    return c; };
  return { root, cards };
}

const INC = { id: 5, asset_id: "DR-DN-PUSA", created_at: "2026-10-10T10:00:00+00:00", kind: "blocked_drain", note: "full", photo_url: "/media/a.jpg",
  flags: [{ code: "photo_reused_other", level: "warn", detail: "This picture was already sent by someone else." }, { code: "x", level: "info", detail: "No location in photo." }] };
const places = { "DR-DN-PUSA": "Daryai Nallah barrel, Pusa Road crossing" };

test("V15: incidents service lists held reports with absolute photo urls and posts a review", async () => {
  const http = createFakeHttp({ "GET /api/incidents?held=true": { incidents: [INC] },
    "POST /api/incidents/5/review": (o) => ({ incident: { ...INC, review_decision: o.json.decision, task_id: 9 } }) });
  const svc = createIncidentsService(http);
  assert.equal((await svc.held())[0].photo_url, "https://api.test/media/a.jpg");
  const r = await svc.review(5, { decision: "release", note: "ok" });
  assert.equal(r.task_id, 9);
  assert.deepEqual(http.calls[1].json, { decision: "release", note: "ok" });
});
test("V15: held view shows photo, place, time, flag details and review buttons for admin only", () => {
  const h = heldView({ items: [INC], places, canReview: true });
  assert.match(h, /Daryai Nallah barrel/); assert.match(h, /already sent by someone else/); assert.match(h, /Check needed/);
  assert.match(h, /<img[^>]+a\.jpg/); assert.match(h, /data-inc="5"/); assert.match(h, /data-act="release"/); assert.match(h, /data-act="reject"/);
  const ro = heldView({ items: [INC], places, canReview: false });
  assert.doesNotMatch(ro, /data-act=/); assert.match(ro, /already sent by someone else/);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /verified|proof|unspoofable/i);
  assert.match(heldView({ items: [], places, canReview: true }), /No reports are waiting/);
});
test("V15: held view result line links the task and shows server errors", () => {
  assert.match(heldView({ items: [], places, canReview: true, result: { text: "Released.", taskId: 9 } }), /href="#\/task\/9"/);
  assert.match(heldView({ items: [], places, canReview: true, result: { error: "report not found" } }), /report not found/);
});
test("V15: route and tabs: admin and official see Held, resident cannot reach it", () => {
  assert.deepEqual(held.roles, ["admin", "official"]); assert.ok(CONTROLLERS.includes(held));
  assert.ok(TABS.admin.some(([h]) => h === "#/held")); assert.ok(TABS.official.some(([h]) => h === "#/held"));
  assert.ok(!TABS.resident.some(([h]) => h === "#/held"));
});
test("V15: release re-renders without the item, shows the task link, and a double tap sends once", async () => {
  let list = [INC], sent = [], release;
  const incidents = { held: async () => list, review: (id, b) => { sent.push([id, b]); return new Promise(r => { release = () => { list = []; r({ ...INC, task_id: 9 }); }; }); } };
  const { root, cards } = heldRoot();
  const ctx = { toast: { show() {} }, services: { session: { me: async () => ({ role: "admin" }) }, incidents, dashboard: { map: async () => ({ assets: [{ id: "DR-DN-PUSA", name: "Daryai Nallah barrel" }] }) } } };
  await held.mount(root, ctx);
  assert.match(root.innerHTML, /Daryai Nallah barrel/);
  const c = cards[5]; c.note.value = "looks real";
  const btn = c.buttons['[data-act="release"]']; const p = btn.onclick({ target: btn }); btn.onclick({ target: btn });
  release(); await p; await new Promise(r => setTimeout(r, 0));
  assert.equal(sent.length, 1); assert.deepEqual(sent[0], ["5", { decision: "release", note: "looks real" }]);
  assert.doesNotMatch(root.innerHTML, /data-inc/); assert.match(root.innerHTML, /#\/task\/9/);
});
test("V15: a 409 or 404 shows the server's text and refreshes the list", async () => {
  let n = 0;
  const incidents = { held: async () => (n++ ? [] : [INC]), review: async () => { throw new ApiError("this report is not held for review, or was already reviewed", 409); } };
  const { root, cards } = heldRoot();
  const ctx = { toast: { show() {} }, services: { session: { me: async () => ({ role: "admin" }) }, incidents, dashboard: { map: async () => ({ assets: [] }) } } };
  await held.mount(root, ctx);
  const btn = cards[5].buttons['[data-act="reject"]']; await btn.onclick({ target: btn });
  assert.match(root.innerHTML, /already reviewed/); assert.doesNotMatch(root.innerHTML, /data-inc/);
});
test("V15: an official sees the list without review buttons; a failed place lookup falls back to the drain id", async () => {
  const { root } = heldRoot();
  const ctx = { services: { session: { me: async () => ({ role: "official" }) }, incidents: { held: async () => [INC] }, dashboard: { map: async () => { throw new Error("x"); } } } };
  await held.mount(root, ctx);
  assert.doesNotMatch(root.innerHTML, /data-act=/); assert.match(root.innerHTML, /DR-DN-PUSA/);
});

