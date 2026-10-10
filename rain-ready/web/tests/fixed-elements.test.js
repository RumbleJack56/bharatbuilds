// web/tests/fixed-elements.test.js — which elements are lens targets, layout of the bars, Leaflet excluded from the snapshot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const web = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const html = web("index.html"), app = web("css/app.css"), glass = web("css/ui.css");

test("top bar and tab bar are the only persistent lens targets; the toast keeps the look via CSS only", () => {
  assert.match(html, /<header class="top glass lg">/);
  assert.match(html, /<nav id="tabs" class="tabs glass lg" aria-label="Main">/);
  assert.match(html, /<div id="toast" class="toast glass-strong lg" data-lg-css role="status"/);
});
test("tabs: fixed bottom bar at <= 640 px, sticky row under the top bar on wider screens", () => {
  assert.match(app, /@media \(max-width:640px\)\{[^@]*\.tabs\{position:fixed;bottom:0/);
  assert.match(app, /@media \(min-width:641px\)\{[^@]*\.tabs\{position:sticky;top:var\(--top-h\)/);
  assert.match(app, /@media \(min-width:641px\)\{[^@]*body\{padding-bottom:16px/);
});
test("a fixed bottom tab bar never covers content: body reserves room at <= 640 px", () => assert.match(app, /@media \(max-width:640px\)\{[^@]*body\{padding-bottom:calc\(/));
test(".fab is sticky above the tab bar", () => assert.match(app, /\.fab\{position:sticky;bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)/));
test("primary floating actions are .lg .fab with a CSS-only look (data-lg-css): Send report, Take photo, Submit", () => {
  assert.match(web("js/views/report.view.js"), /<button class="primary big lg fab" data-lg-css id="send" type="submit">Send report<\/button>/);
  assert.match(web("js/views/report.view.js"), /id="cam" class="big primary lg" data-lg-css/);
  assert.match(web("js/views/official.view.js"), /<button class="primary big lg fab" data-lg-css type="submit">Submit with after-photo<\/button>/);
});
test("every per-route .lg in a view opts out of the lens (lenses cannot be destroyed)", () => {
  for (const f of readdirSync(new URL("../js/views/", import.meta.url))) for (const [tag] of web("js/views/" + f).matchAll(/<[a-z]+[^>]*class="[^"]*\blg\b[^"]*"[^>]*>/g))
    assert.match(tag, /data-lg-css/, `${f}: ${tag}`);
});
test("camera bar is glass-strong .lg but opts out of the lens (it sits above every lens canvas)", () => {
  const src = web("js/adapters/camera-media.js");
  assert.match(src, /className: "cam-bar glass-strong lg"/); assert.match(src, /setAttribute\("data-lg-css", ""\)/);
  assert.match(src, /className: "cam-overlay"/);
});
test("every Leaflet container is excluded from the liquidGL snapshot", () => {
  for (const f of readdirSync(new URL("../js/views/", import.meta.url))) {
    for (const [tag] of web("js/views/" + f).matchAll(/<div[^>]*class="map[^"]*"[^>]*>/g)) assert.match(tag, /data-liquid-ignore/, `${f}: ${tag}`);
  }
});
test("edge bars get a single edge border only (ui.css must not reset app.css border-width)", () => {
  assert.doesNotMatch(glass, /\.cam-bar[^{]*\{[^}]*border:1px/);
  assert.match(glass, /\.top\.lg\{border-width:0 0 1px\}/); assert.match(glass, /\.tabs\.lg,\.cam-bar\.lg\{border-width:1px 0 0\}/);
});
test("textarea keeps min-height 80px (ui.css must not force 44px)", () => assert.match(glass, /textarea\{min-height:80px\}/));
