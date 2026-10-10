// web/tests/glass-css.test.js — structural checks on the stylesheets (no browser).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const dir = new URL("../css/", import.meta.url);
const css = (f) => readFileSync(new URL(f, dir), "utf8");

test("every stylesheet stays within ~250 lines", () => {
  for (const f of readdirSync(dir).filter(f => f.endsWith(".css"))) assert.ok(css(f).split("\n").length <= 250, f);
});
test("tokens carry the Firefly values", () => {
  const t = css("tokens.css").replace(/\s+/g, "");
  for (const s of ["--bg:#121214", "--s1:#1a1a1d", "--accent-fill:#6d5ce6", "--radius:12px", "--radius-sm:8px", "--top-h:56px",
    "--ease:cubic-bezier(.2,.8,.2,1)", "--dur-fast:120ms", "--dur:220ms"]) assert.ok(t.includes(s), s);
});
test("index.html has no backdrop and links Inter with display=swap", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /class="backdrop"/);
  assert.match(html, /fonts\.googleapis\.com\/css2\?family=Inter[^"]*display=swap/);
});
test("motion.css has no drift keyframes", () => assert.doesNotMatch(css("motion.css"), /@keyframes drift/));
test("glass has the solid fallback when backdrop-filter is unsupported", () => {
  const g = css("glass.css");
  assert.match(g, /@supports not \(\(backdrop-filter:blur\(1px\)\) or \(-webkit-backdrop-filter:blur\(1px\)\)\)/);
  assert.match(g, /-webkit-backdrop-filter/);
});
test("liquid mode drops the CSS blur and keeps a tint on .lg", () => {
  assert.match(css("glass.css"), /html:not\(\.glass-css\) \.lg:not\(\[data-lg-css\]\)\{[^}]*background:var\(--lg-tint\)[^}]*backdrop-filter:none/);
});
test("focus ring and 44 px controls exist", () => {
  const g = css("glass.css");
  assert.match(g, /:focus-visible\{outline:2px solid var\(--accent\)/);
  assert.match(g, /min-height:44px/);
});
test("the legacy light/dark media query is gone", () => assert.doesNotMatch(css("app.css") + css("tokens.css"), /prefers-color-scheme/));
test("motion.css: route fade 180 ms + 8 px rise, 30 ms stagger", () => {
  const m = css("motion.css");
  assert.match(m, /::view-transition-old\(root\)\{[^}]*animation:vt-out 180ms/);
  assert.match(m, /::view-transition-new\(root\)\{[^}]*animation:vt-in 180ms/);
  assert.match(m, /translateY\(8px\)/);
  assert.match(m, /animation-delay:calc\(var\(--i,0\)\*30ms\)/);
});
test("motion.css: reduced motion switches off stagger, view transitions, press scale and transitions", () => {
  const m = css("motion.css"), r = m.slice(m.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(m.includes("@media (prefers-reduced-motion: reduce)"));
  assert.match(r, /\*,\*::before,\*::after\{[^}]*animation:none!important[^}]*transition:none!important/);
  assert.match(r, /::view-transition-group\(\*\),::view-transition-old\(\*\),::view-transition-new\(\*\)\{[^}]*animation:none/);
  assert.match(r, /button:active,\.btn:active\{transform:none/);
});

test("E1: nav comes before main in the DOM; no order: reshuffle of the chrome; no stray ;} in .top", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8"), app = css("app.css");
  assert.ok(html.indexOf('<nav id="tabs"') > 0 && html.indexOf('<nav id="tabs"') < html.indexOf('<main id="view"'));
  assert.doesNotMatch(app, /\.(top|tabs)\{[^}]*order:/);
  assert.doesNotMatch(app, /;\}/);
});
test("E2: the toast clears the fixed tab bar at <= 640 px and honours the safe-area inset", () => {
  const m = css("app.css").match(/\.toast\{[^}]*bottom:calc\((\d+)px \+ env\(safe-area-inset-bottom\)\)/);
  assert.ok(m && Number(m[1]) >= 56 + 8, "tab bar is min 56 px tall plus border");
});
test("the programmatically focused view container shows no focus ring (it is not a control)", () => assert.match(css("glass.css"), /#view:focus-visible\{outline:none\}/));
