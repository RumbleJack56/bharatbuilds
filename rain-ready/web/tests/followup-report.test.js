// web/tests/followup-report.test.js — report-screen fixes 2a-2f.
import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceM, nearestDrain } from "../js/ui/geo.js";
import { reportResult } from "../js/views/report.view.js";
import { taskCard, taskDetail } from "../js/views/official.view.js";
import { report } from "../js/controllers/report.js";
import { NO_OWNER, NEAREST, APPROX, ANDROID_PRECISE, BANNED } from "../js/ui/copy.js";

const PUSA = [28.643592, 77.186944];
const DRAINS = [{ id: "DR-DN-PUSA", name: "Daryai Nallah barrel", lat: 28.643592, lon: 77.186944, agency_id: "mcd" },
  { id: "DR-X", name: "Far drain", lat: 28.66, lon: 77.2, agency_id: null }];

test("geo: haversine distance and nearest drain rounded to 10 m", () => {
  assert.ok(Math.abs(distanceM(PUSA, [PUSA[0] + 0.0027, PUSA[1]]) - 300) < 2);
  assert.equal(distanceM(PUSA, PUSA), 0);
  const n = nearestDrain([PUSA[0] + 0.0027, PUSA[1]], DRAINS);
  assert.equal(n.drain.id, "DR-DN-PUSA"); assert.equal(n.m, 300);
  assert.equal(nearestDrain(PUSA, []), null);
});
test("2b: no linked drain shows the nearest drain and the 150 m rule; linked drain does not", () => {
  const r = { message: "Saved", field_rule: "r", linked_asset: null, flags: [], task_id: null };
  const h = reportResult(r, { nearest: { drain: DRAINS[0], m: 300 } });
  assert.match(h, /Nearest drain: Daryai Nallah barrel, about 300 m away\. A report links to a drain within 150 m/);
  assert.doesNotMatch(reportResult({ ...r, linked_asset: "DR-DN-PUSA", distance_m: 20 }, { nearest: null }), /Nearest drain/);
  assert.doesNotMatch(reportResult(r, {}), /Nearest drain/);
});
test("2e: result card says when the linked drain has no owner", () => {
  const r = { message: "Saved", field_rule: "r", linked_asset: "DR-X", distance_m: 20, flags: [], task_id: 3 };
  assert.match(reportResult(r, { ownerless: true }), new RegExp(NO_OWNER));
  assert.doesNotMatch(reportResult(r, { ownerless: false }), new RegExp(NO_OWNER));
});
test("2e: task page says no agency owns the drain; 2f: no dangling dash", () => {
  const t = { id: 1, status: "open", asset_name: "D", agency_id: null, agency_name: "", pocket_name: "", gain_h: 0, events: [], incidents: [] };
  const h = taskDetail(t, { banner: "", back: "#/x" });
  assert.match(h, /Owner: <strong>No owner found<\/strong>[\s\S]*No agency owns this drain yet\. A coordinator will assign it\./);
  assert.doesNotMatch(h, /- cleaning|<p> - /);
  assert.match(h, /Cleaning this gains no fill time at this rain\./);
  assert.match(taskDetail({ ...t, pocket_name: "Lane 2" }, { banner: "", back: "#/x" }), /Lane 2 - cleaning this gains/);
  assert.doesNotMatch(taskDetail({ ...t, agency_id: "mcd", agency_name: "MCD" }, { banner: "", back: "#/x" }), /No agency owns/);
  const c = taskCard({ ...t, report_count: 1, rank_score: 1 });
  assert.doesNotMatch(c, /> - |<p class="small muted"> -/);
});
test("copy: new strings carry no banned words", () => {
  for (const s of [NO_OWNER, NEAREST("A", 10), APPROX(200), ANDROID_PRECISE]) assert.doesNotMatch(s, BANNED);
  assert.doesNotMatch(NEAREST("A", 10) + NO_OWNER, /verified|proof|unspoofable/i);
});

function setup({ geo, capture, assets = DRAINS, create } = {}) {
  const els = {}; const el = (s) => els[s] ??= { textContent: "", innerHTML: "", hidden: false, style: {}, value: "", disabled: false, reset() {}, scrollIntoView() {} };
  const marks = []; let click;
  const view = { pin() {}, view() {}, destroy() {}, onClick: f => { click = f; }, badge: (at, o) => marks.push([at, o]), circle() {} };
  const ctx = { map: { available: () => true, create: () => view }, camera: { available: () => true },
    geo: geo || {}, toast: { show() {} },
    services: { dashboard: { map: async () => ({ assets }) }, capture: capture || {}, incidents: { create: create || (async () => ({})) } } };
  return { els, marks, ctx, root: { innerHTML: "", querySelector: el }, tap: (a, b) => click(a, b) };
}

test("2a: drains are drawn on the report mini-map with their names", async () => {
  const s = setup();
  await report.mount(s.root, s.ctx);
  assert.equal(s.marks.length, 2);
  assert.ok(s.marks.every(([, o]) => /drain-label/.test(o.html)));
  assert.match(s.marks[0][1].html, /Daryai Nallah barrel/);
  assert.deepEqual(s.marks[0][0], [28.643592, 77.186944]);
});
test("2a: a failing /api/map leaves the report form working", async () => {
  const s = setup(); s.ctx.services.dashboard.map = async () => { throw new Error("down"); };
  await report.mount(s.root, s.ctx);
  assert.equal(s.marks.length, 0);
});
test("2b: submit with no linked drain shows the nearest drain from the tapped pin", async () => {
  const s = setup({ create: async () => ({ message: "Saved", field_rule: "r", linked_asset: null, flags: [], task_id: null, incident: {} }) });
  await report.mount(s.root, s.ctx);
  s.tap(PUSA[0] + 0.0027, PUSA[1]); s.root.querySelector("#kind").value = "blocked_drain";
  await s.els["#f"].onsubmit({ preventDefault() {} });
  await new Promise(r => setTimeout(r, 5));
  assert.match(s.els["#out"].innerHTML, /Nearest drain: Daryai Nallah barrel, about 300 m away/);
});
test("2e: linked drain without an owner adds the no-owner line on the result card", async () => {
  const s = setup({ create: async () => ({ message: "Saved", field_rule: "r", linked_asset: "DR-X", distance_m: 5, flags: [], task_id: 1, incident: {} }) });
  await report.mount(s.root, s.ctx);
  s.tap(28.66, 77.2); s.root.querySelector("#kind").value = "overflow";
  await s.els["#f"].onsubmit({ preventDefault() {} });
  await new Promise(r => setTimeout(r, 5));
  assert.match(s.els["#out"].innerHTML, /No agency owns this drain yet/);
});
test("2c: an approximate fix keeps the pin and says so in #coords; Android hint only above 1000 m", async () => {
  for (const [acc, approx, android] of [[50, false, false], [250, true, false], [1500, true, true]]) {
    const s = setup({ geo: { current: async () => ({ lat: 28.6, lon: 77.1, accuracy_m: acc }) } });
    await report.mount(s.root, s.ctx);
    await s.els["#gps"].onclick({ target: { disabled: false } });
    const t = s.els["#coords"].textContent;
    assert.equal(t.includes(APPROX(acc)), approx, String(acc));
    assert.equal(t.includes(ANDROID_PRECISE), android, String(acc));
    if (!approx) assert.match(t, /Your GPS/);
  }
});
test("2d: a refused photo keeps its message next to the button until the next attempt", async () => {
  let fail = true;
  const s = setup({ capture: { takePhoto: async () => { if (fail) throw new Error("Location is not precise enough (± 300 m). Move to open sky and retake."); throw Object.assign(new Error("x"), { cancelled: true }); } } });
  await report.mount(s.root, s.ctx);
  await s.els["#cam"].onclick({ target: { disabled: false } });
  assert.match(s.els["#camnote"].textContent, /not precise enough/);
  fail = false;
  const p = s.els["#cam"].onclick({ target: { disabled: false } });
  assert.equal(s.els["#camnote"].textContent, "");     // cleared when the next attempt starts
  await p;
});
test("a /api/map that never answers cannot hold the result card past the cap", async () => {
  const s = setup({ create: async () => ({ message: "Saved", field_rule: "r", linked_asset: null, flags: [], task_id: null, incident: {} }) });
  s.ctx.services.dashboard.map = () => new Promise(() => {});
  await report.mount(s.root, s.ctx);
  s.root.querySelector("#kind").value = "overflow";
  const t0 = Date.now();
  await s.els["#f"].onsubmit({ preventDefault() {} });
  while (!s.root.querySelector("#out").innerHTML && Date.now() - t0 < 3000) await new Promise(r => setTimeout(r, 20));
  assert.match(s.root.querySelector("#out").innerHTML, /Saved/);
  assert.ok(Date.now() - t0 < 2500, `took ${Date.now() - t0} ms`);
});
