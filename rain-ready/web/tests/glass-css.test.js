// web/tests/glass-css.test.js — structural checks on the stylesheets (no browser).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const dir = new URL("../css/", import.meta.url);
const css = (f) => readFileSync(new URL(f, dir), "utf8");

test("every stylesheet stays within ~250 lines", () => {
  for (const f of readdirSync(dir).filter(f => f.endsWith(".css"))) assert.ok(css(f).split("\n").length <= 250, f);
});
test("tokens carry the spec values", () => {
  const t = css("tokens.css");
  for (const s of ["--glass-bg-strong:rgba(16,26,40,.72)", "--glass-border:rgba(255,255,255,.14)", "--glass-blur:16px", "--glass-sat:140%", "--radius:18px",
    "--radius-sm:12px", "--fg:#eef4f8", "--fg-muted:#a9bccb", "--accent:#5ad1e6", "--high:#ff7a6b", "--elev:#ffb547", "--low:#5ad1a0", "--info:#7fb6ff",
    "--ease:cubic-bezier(.2,.8,.2,1)", "--dur-fast:120ms", "--dur:220ms"]) assert.ok(t.includes(s), s);
});
test("glass has the solid fallback when backdrop-filter is unsupported", () => {
  const g = css("glass.css");
  assert.match(g, /@supports not \(\(backdrop-filter:blur\(1px\)\) or \(-webkit-backdrop-filter:blur\(1px\)\)\)/);
  assert.match(g, /-webkit-backdrop-filter/);
});
test("liquid mode drops the CSS blur and keeps a tint on .lg", () => {
  assert.match(css("glass.css"), /html:not\(\.glass-css\) \.lg\{[^}]*background:var\(--lg-tint\)[^}]*backdrop-filter:none/);
});
test("focus ring and 44 px controls exist", () => {
  const g = css("glass.css");
  assert.match(g, /:focus-visible\{outline:2px solid var\(--accent\)/);
  assert.match(g, /min-height:44px/);
});
test("the legacy light/dark media query is gone", () => assert.doesNotMatch(css("app.css") + css("tokens.css"), /prefers-color-scheme/));
