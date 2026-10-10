// web/tests/contrast.test.js — every text token on every glass surface over the darkest and the brightest backdrop >= 4.5:1.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseColor, over, ratio, tokens } from "./contrast-lib.js";

const t = tokens(readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8"));
const rgb = (k) => parseColor(t[k]).slice(0, 3);
const BACKDROPS = { darkest: rgb("bd-darkest"), brightest: rgb("bd-brightest") };
const SURFACES = { glass: "glass-bg", "glass-strong": "glass-bg-strong", "lg-tint": "lg-tint" };
const TEXT = ["fg", "fg-muted", "accent", "high", "elev", "low", "info", "watch"];

for (const [sn, sk] of Object.entries(SURFACES)) for (const [bn, bd] of Object.entries(BACKDROPS)) for (const tx of TEXT) {
  test(`${tx} on ${sn} over the ${bn} backdrop is >= 4.5:1`, () => {
    const r = ratio(rgb(tx), over(parseColor(t[sk]), bd));
    assert.ok(r >= 4.5, `${tx} on ${sn}/${bn} = ${r.toFixed(2)}`);
  });
}
test("the brightest backdrop token equals the teal end under two overlapping blobs", () => {
  const blob = parseColor(t.blob).slice(0, 3), a = Number(t["blob-a"]);
  const two = over([...blob, a], over([...blob, a], rgb("bd-3")));
  two.forEach((v, i) => assert.ok(Math.abs(v - BACKDROPS.brightest[i]) <= 4, `channel ${i}: ${v} vs ${BACKDROPS.brightest[i]}`));
});
test("blobs stay at or below 0.35 opacity", () => assert.ok(Number(t["blob-a"]) <= 0.35));
test("banner and error ink are readable on their tinted strong glass", () => {
  for (const [ink, tint] of [["warn-ink", "warn-bg"], ["err-ink", "err-bg"]]) for (const bd of Object.values(BACKDROPS)) {
    const bg = over(parseColor(t[tint]), over(parseColor(t["glass-bg-strong"]), bd));
    assert.ok(ratio(rgb(ink), bg) >= 4.5, `${ink} = ${ratio(rgb(ink), bg).toFixed(2)}`);
  }
});
test("primary button ink is readable on both accent stops", () => {
  for (const k of ["accent", "accent-2"]) assert.ok(ratio(rgb("accent-ink"), rgb(k)) >= 4.5, k);
});
test("the High status dot is >= 3:1 non-text contrast on every glass surface over both backdrops", () => {
  for (const sk of Object.values(SURFACES)) for (const bd of Object.values(BACKDROPS)) {
    const r = ratio(rgb("high-dot"), over(parseColor(t[sk]), bd));
    assert.ok(r >= 3, `high-dot on ${sk} = ${r.toFixed(2)}`);
  }
});
test("field borders are >= 3:1 against the glass behind them", () => {
  for (const bd of Object.values(BACKDROPS)) {
    const glass = over(parseColor(t["glass-bg"]), bd);
    assert.ok(ratio(over(parseColor(t["field-border"]), glass), glass) >= 3);
  }
});
