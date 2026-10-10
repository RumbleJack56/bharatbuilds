// web/tests/firefly-ui.test.js — Firefly components: empty(), row lists, ui.css and app.css structure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { empty } from "../js/ui/components.js";
import { mineView, confirmList } from "../js/views/resident.view.js";
import { inboxView } from "../js/views/official.view.js";
import { heldView } from "../js/views/held.view.js";
import { actionRows } from "../js/views/actions.view.js";

const css = (f) => readFileSync(new URL("../css/" + f, import.meta.url), "utf8");
const ui = css("ui.css"), app = css("app.css");
const LIST = /<div class="list">[\s\S]*class="card glass rise[\s\S]*<\/div>$/;

test("empty() renders the centred inbox state with escaped text", () => {
  const h = empty("No <b>reports</b> yet.");
  assert.match(h, /class="empty"/); assert.match(h, /#i-inbox/); assert.match(h, /No &lt;b&gt;reports&lt;\/b&gt; yet\./);
});
const inc = (n) => ({ id: n, kind: "blocked_drain", created_at: "2026-10-09T10:00:00Z", note: "", flags: [], asset_id: "DR-1", task_id: n });
const t = (id) => ({ id, status: "open", asset_name: "A", agency_name: "MCD", incidents: [], events: [] });
test("list views wrap their items in .list", () => {
  assert.match(mineView([inc(1), inc(2)]), LIST);
  assert.match(inboxView({ tasks: [t(1), t(2)] }, {}), LIST);
  assert.match(heldView({ items: [{ id: 1, flags: [] }], canReview: false }), LIST);
  assert.match(confirmList([t(1), t(2)]), LIST);
  const a = { asset_name: "D", type: "clean", text: "x", route: { agency_name: "MCD", why: "y" }, gain_h_high: 0, evidence: [] };
  assert.match(actionRows({ actions: [a] }), LIST);
});
test("empty lists use the empty state, not a list", () => {
  const h = mineView([]);
  assert.match(h, /class="empty"/); assert.doesNotMatch(h, /class="list"/);
});
test("ui.css: chips, buttons, sub-nav, list rows", () => {
  assert.match(ui, /\.chip\{[^}]*color-mix\(in srgb, ?var\(--chip/);
  assert.match(ui, /button\.primary[^{]*\{[^}]*var\(--accent-fill\)/);
  const on = ui.match(/\.sub a\.on\{[^}]*\}/)[0];
  assert.match(on, /var\(--s2\)/); assert.doesNotMatch(on, /--accent-fill/);
  assert.match(ui, /\.list>\.card[^{]*\{[^}]*border-radius:0/);
});
test("ui.css: backdrop-filter only on .top, .tabs and .lg; solid fallback", () => {
  for (const [, sel] of ui.matchAll(/([^{}]+)\{[^}]*backdrop-filter:blur/g))
    assert.match(sel.trim().replace(/^.*\}/, ""), /^(\.top|\.tabs)(,\.(top|tabs|lg))*$|^\.lg$|^\.top,\.tabs/, sel);
  const fb = ui.slice(ui.indexOf("@supports not"));
  assert.match(fb, /\.top,\.tabs[^{]*\{[^}]*background:var\(--bg\)/);
});
test("app.css: 760px content column; sub-nav still wraps", () => {
  assert.match(app, /main\{[^}]*max-width:760px/); assert.match(app, /\.sub\{[^}]*flex-wrap:wrap/);
});
