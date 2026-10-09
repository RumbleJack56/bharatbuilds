// web/tests/views.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, hrs } from "../js/ui/format.js";
import { photos, guard } from "../js/ui/components.js";
import * as copy from "../js/ui/copy.js";
import { reportForm, reportResult } from "../js/views/report.view.js";
import { loginView } from "../js/views/login.view.js";

test("esc escapes HTML", () => assert.equal(esc(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;"));
test("hrs reads 'about X h' and handles null", () => {
  assert.equal(hrs(1.234), "about 1.2 h");
  assert.equal(hrs(12.6), "about 13 h");
  assert.equal(hrs(null), "not available");
});
test("photos drops empty URLs", () => assert.equal(photos(["", null], "x"), ""));
test("guard keeps the button disabled until the action settles (double tap sends once)", async () => {
  const btn = { disabled: false };
  let calls = 0, release;
  const p = guard(btn, () => { calls++; return new Promise(r => { release = r; }); }, () => {});
  assert.equal(btn.disabled, true);
  guard(btn, () => { calls++; }, () => {});          // second tap while disabled
  release(); await p;
  assert.equal(calls, 1);
  assert.equal(btn.disabled, false);
});
test("no banned word in any fixed UI string", () => {
  const strings = Object.values(copy).flatMap(v => typeof v === "string" ? [v] : v instanceof RegExp ? [] :
    Object.values(v).flatMap(x => Array.isArray(x) ? x.filter(s => typeof s === "string") : [x]));
  for (const s of strings) assert.doesNotMatch(String(s), copy.BANNED, s);
});

const base = { message: "Linked.", linked_asset: "DR-RN-001", distance_m: 3, task_id: 4, task_created: true, field_rule: "rule",
  incident: { kind: "blocked_drain", ai: { kind: "blocked_drain", summary: "Grate covered in plastic." } } };
test("report form offers 'Not sure' first so the photo can be classified", () => {
  assert.match(reportForm({ fieldRule: "rule", kinds: copy.KINDS }), /<option value="">Not sure/);
});
test("report result shows the AI suggestion, labelled", () => {
  const html = reportResult(base);
  assert.match(html, /Suggested from your photo/);
  assert.match(html, /Grate covered in plastic\./);
  assert.match(html, /#\/task\/4/);
  assert.doesNotMatch(html, /held for a check/);
});
test("held report says it is saved but waiting for a check, and lists flags with a text level", () => {
  const html = reportResult({ ...base, task_id: null, task_created: false, held_for_review: true, flags: [
    { code: "old", level: "warn", detail: "Photo is older than 2 days." }, { code: "x", level: "info", detail: "No location in photo." }] });
  assert.match(html, /saved and linked/);
  assert.match(html, /held for a check/);
  assert.doesNotMatch(html, /No task was created/);
  assert.match(html, /Check needed[^<]*<\/strong>[^<]*Photo is older than 2 days\./);
  assert.match(html, /Note[^<]*<\/strong>[^<]*No location in photo\./);
  assert.doesNotMatch(html, copy.BANNED);
});
test("not-held report with an info flag still lists it", () => {
  const html = reportResult({ ...base, held_for_review: false, flags: [{ code: "x", level: "info", detail: "Taken indoors." }] });
  assert.match(html, /Taken indoors\./);
  assert.doesNotMatch(html, /held for a check/);
});
test("login view lists personas and escapes names", () => {
  const html = loginView({ users: [{ id: "res-1", name: "A<b>", role: "resident" }], note: "demo" });
  assert.match(html, /data-id="res-1"/);
  assert.match(html, /A&lt;b&gt;/);
});

import { mineView, confirmCard } from "../js/views/resident.view.js";
test("mine shows an empty state with a link to report", () => assert.match(mineView([]), /#\/report/));
test("mine marks held reports and lists flag details with text levels", () => {
  const warn = { kind: "blocked_drain", created_at: "2026-10-09T10:00:00", photo_url: "https://h/a.png",
    flags: [{ code: "old", level: "warn", detail: "Photo is older than 2 days" }, { code: "n", level: "info", detail: "Low GPS accuracy" }] };
  const html = mineView([warn]);
  assert.match(html, /Held for a check/); assert.match(html, /Check needed:<\/strong> Photo is older/); assert.match(html, /Note:<\/strong> Low GPS/);
  assert.doesNotMatch(mineView([{ ...warn, flags: [warn.flags[1]] }]), /Held for a check/);
  assert.match(mineView([{ kind: "other", held_for_review: true, photo_url: "" }]), /Held for a check/);
});
test("confirm card shows before and after photos and both answers", () => {
  const t = { id: 2, asset_name: "Drain", agency_name: "MCD", pocket_name: "Saucer",
    incidents: [{ kind: "blocked_drain", note: "plastic", photo_url: "https://h/media/b.png" }],
    events: [{ event: "completed", note: "cleared", photo_url: "https://h/media/a.png" }] };
  const html = confirmCard(t);
  assert.match(html, /media\/b\.png/); assert.match(html, /media\/a\.png/);
  assert.match(html, /Looks fixed/); assert.match(html, /Still a problem/);
});

import { taskDetail, openActions, acceptedActions, assignActions } from "../js/views/official.view.js";
const T = { id: 5, status: "open", agency_id: "mcd", agency_name: "MCD", asset_name: "Drain", pocket_name: "Saucer", gain_h: 1.2,
  owner_source: "placeholder", due_at: null, overdue: false, incidents: [], events: [] };
test("task page carries the scenario banner next to the gain number", () => {
  assert.match(taskDetail(T, { banner: "Scenario, not a forecast." }), /class="banner">Scenario, not a forecast\./);
});
test("reassign select lists agencies except the current owner", () => {
  const html = openActions({ agencies: [{ id: "mcd", name: "MCD" }, { id: "pwd", name: "PWD" }], current: "mcd" });
  assert.match(html, /value="pwd"/); assert.doesNotMatch(html, /value="mcd"/);
});
test("accepted tasks can still be sent back as 'Not ours'", () => {
  assert.match(acceptedActions({ agencies: [{ id: "pwd", name: "PWD" }], current: "mcd" }), /Not ours/);
});
test("a no-owner task offers the admin an assign control", () => {
  assert.match(assignActions({ agencies: [{ id: "pwd", name: "PWD" }] }), /id="assign"/);
});
test("after-photo flags show under the 'Marked done' event", () => {
  const t = { ...T, events: [{ event: "completed", at: "2026-10-09T10:00:00", actor_name: "Off", agency_id: "mcd", note: "", photo_url: "",
    flags: [{ code: "old_photo", level: "warn", detail: "Photo is older than 2 days." }] }] };
  assert.match(taskDetail(t, { banner: "" }), /Marked done[\s\S]*Check needed:<\/strong> Photo is older than 2 days\./);
});
