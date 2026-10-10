// web/tests/v5b-css.test.js — V5b: the 7-tab dashboard nav wraps at 390 px and bare links are 44 px targets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dashShell } from "../js/views/dash.view.js";
const css = readFileSync(new URL("../css/app.css", import.meta.url), "utf8");
test("dashboard sub-nav wraps instead of hiding tabs off-screen", () => assert.match(css, /\.sub\{[^}]*flex-wrap:wrap/));
test("the brand and back links have a 44 px target", () => { assert.match(css, /\.brand\{[^}]*min-height:44px/); assert.match(css, /\.back\{[^}]*min-height:44px/); });
test("the dashboard has seven tabs and a 44 px switch-persona link", () => {
  const h = dashShell("map");
  assert.equal((h.match(/href="#\/dash\//g) || []).length, 7); assert.match(h, /class="back" href="#\/login"/);
});
