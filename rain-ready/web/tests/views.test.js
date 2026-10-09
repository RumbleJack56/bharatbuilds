// web/tests/views.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, hrs } from "../js/ui/format.js";
import { photos, guard } from "../js/ui/components.js";
import * as copy from "../js/ui/copy.js";

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
