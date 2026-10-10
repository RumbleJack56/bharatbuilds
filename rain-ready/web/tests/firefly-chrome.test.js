// web/tests/firefly-chrome.test.js — avatar menu, tab icons, Lucide sprite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initials } from "../js/ui/format.js";
import { tabsHtml } from "../js/ui/components.js";
import { TABS } from "../js/controllers/index.js";
const web = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const html = web("index.html"), sprite = web("img/icons.svg");

test("initials", () => {
  assert.equal(initials("Riya Sharma"), "RS"); assert.equal(initials("Admin"), "A");
  for (const v of ["", undefined, "  "]) assert.equal(initials(v), "?");
  assert.equal(initials("ravi kumar singh"), "RK");
});
test("tabsHtml marks the active tab, icons, escapes labels", () => {
  const h = tabsHtml([["#/mine", "My <reports>", "list"], ["#/dash", "Dashboard", "layout-dashboard"]], "#/dash/map");
  assert.match(h, /href="#\/dash" class="on" aria-current="page"/);
  assert.match(h, /#i-layout-dashboard/);
  assert.match(h, /<span>My &lt;reports&gt;<\/span>/);
  assert.equal((h.match(/aria-current/g) || []).length, 1);
});
test("every icon in use exists in the sprite, with the licence header", () => {
  const names = new Set(["inbox", "chevron-right", "log-out"]);
  for (const tabs of Object.values(TABS)) for (const t of tabs) { assert.ok(t[2], t[1]); names.add(t[2]); }
  for (const n of names) assert.match(sprite, new RegExp(`<symbol id="i-${n}"`), n);
  assert.match(sprite, /ISC/); assert.match(sprite, /lucide-static@/);
});
test("header markup: popover account menu, no #who", () => {
  assert.match(html, /popovertarget="acct-menu"/);
  assert.match(html, /<div id="acct-menu" class="menu" popover>[\s\S]*id="logout"[\s\S]*<\/div><\/div><\/header>/);
  assert.doesNotMatch(html, /id="who"/);
  assert.match(html, /<header class="top lg">/); assert.match(html, /<nav id="tabs" class="tabs lg"/);
});
test("main.js guards for popover support", () => assert.match(web("js/main.js"), /"popover" in HTMLElement\.prototype/));
test("task rows carry the sprite chevron; the CSS chevron is gone", () => {
  assert.match(web("js/views/official.view.js"), /class="ic chev" aria-hidden="true"><use href="img\/icons\.svg\?v=2#i-chevron-right"/);
  assert.doesNotMatch(web("css/ui.css"), /tasklink::after/);
});
test("flat chrome CSS", () => {
  const app = web("css/app.css"), ui = web("css/ui.css");
  assert.doesNotMatch(app, /border-radius:var\(--radius\) var\(--radius\) 0 0/);
  assert.match(app + ui, /inset 0 -2px var\(--accent\)/);
  assert.match(ui, /\.menu\{/); assert.match(ui, /\.avatar/); assert.match(ui, /\.ic\{width:20px;height:20px/);
});
