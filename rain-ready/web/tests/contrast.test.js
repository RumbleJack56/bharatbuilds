// web/tests/contrast.test.js — Firefly surfaces: every text token on bg, s1 and s2 >= 4.5:1, plus tonal pills, fills, dots and borders.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseColor, over, ratio, tokens } from "./contrast-lib.js";

const t = tokens(readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8"));
const rgb = (k) => parseColor(t[k]).slice(0, 3);
const SURFACES = ["bg", "s1", "s2"];
const TEXT = ["fg", "body", "fg-muted", "accent", "high", "elev", "low", "info", "watch"];

for (const sn of SURFACES) for (const tx of TEXT) {
  test(`${tx} on ${sn} is >= 4.5:1`, () => {
    const r = ratio(rgb(tx), rgb(sn));
    assert.ok(r >= 4.5, `${tx} on ${sn} = ${r.toFixed(2)}`);
  });
}
for (const h of ["high", "elev", "low", "info", "accent"]) {
  test(`${h} on its 16% tonal pill over s1 is >= 4.5:1`, () => {
    const pill = over([...rgb(h), 0.16], rgb("s1"));
    const r = ratio(rgb(h), pill);
    assert.ok(r >= 4.5, `${h} pill = ${r.toFixed(2)}`);
  });
}
test("white on accent-fill and its hover is >= 4.5:1", () => {
  assert.ok(ratio([255, 255, 255], rgb("accent-fill")) >= 4.5);
  assert.ok(ratio([255, 255, 255], parseColor(t["accent-fill-hover"]).slice(0, 3)) >= 4.5, "accent-fill-hover");
});
test("high-dot and field-border on s1 are >= 3:1", () => {
  for (const k of ["high-dot", "field-border"]) assert.ok(ratio(rgb(k), rgb("s1")) >= 3, k);
});
test("banner and error ink are readable on their fills", () => {
  for (const [ink, bg] of [["warn-ink", "warn-bg"], ["err-ink", "err-bg"]]) assert.ok(ratio(rgb(ink), rgb(bg)) >= 4.5, ink);
});
test("bar-bg over bg keeps fg and fg-muted >= 4.5:1", () => {
  const bar = over(parseColor(t["bar-bg"]), rgb("bg"));
  for (const k of ["fg", "fg-muted"]) assert.ok(ratio(rgb(k), bar) >= 4.5, k);
});
