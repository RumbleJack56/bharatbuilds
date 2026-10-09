// web/tests/final-fixes.test.js — router 401 logout, stale render guard, pin text, login guard, no owner.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRouter } from "../js/core/router.js";
import { createSessionService } from "../js/services/session.service.js";
import { ApiError } from "../js/core/errors.js";
import { createFakeHttp, createMemoryStorage } from "./fakes.js";
import { PIN, BANNED } from "../js/ui/copy.js";
import { report } from "../js/controllers/report.js";
import { login } from "../js/controllers/login.js";
import { taskDetail } from "../js/views/official.view.js";

const mkEl = () => ({ children: [], innerHTML: "", replaceChildren(...c) { this.children = c; }, focus() {}, remove() {} });
function env(hash) {
  globalThis.location = { hash };
  globalThis.addEventListener = () => {};
  globalThis.document = { createElement: mkEl };
}
const tick = () => new Promise(r => setTimeout(r, 0));

test("I1: a 401 during render logs out and goes to #/login", async () => {
  env("#/mine");
  const storage = createMemoryStorage({ user: "gone" });
  const http = createFakeHttp({ "GET /api/me": { id: "gone", role: "resident" } });
  const session = createSessionService(http, storage);
  const ctrl = { path: "mine", roles: ["resident"], mount: async () => { throw new ApiError("Unknown user", 401); } };
  const router = createRouter({ controllers: [ctrl, { path: "login", roles: null, mount: async () => {} }], root: mkEl(),
    ctx: { services: { session } }, home: { resident: "#/mine" }, onChrome() {}, errorHtml: e => `ERR ${e.message}` });
  await router.start();
  assert.equal(storage.get("user"), "");
  assert.equal(location.hash, "#/login");
});

test("I2: a slow earlier render never overwrites a later one, and its cleanup runs", async () => {
  env("#/a");
  const session = { me: async () => ({ role: "admin" }) };
  let release; const gate = new Promise(r => { release = r; });
  const log = [];
  const A = { path: "a", roles: null, mount: async (host) => { await gate; host.innerHTML = "A"; return () => log.push("cleanA"); } };
  const B = { path: "b", roles: null, mount: async (host) => { host.innerHTML = "B"; return () => log.push("cleanB"); } };
  const root = mkEl();
  const router = createRouter({ controllers: [A, B], root, ctx: { services: { session } }, home: { admin: "#/a" },
    onChrome() {}, errorHtml: String });
  const first = router.refresh();
  await tick();
  location.hash = "#/b";
  await router.refresh();
  const hostB = root.children[0];
  release(); await first;
  assert.equal(root.children[0], hostB);
  assert.equal(hostB.innerHTML, "B");
  assert.deepEqual(log, ["cleanA"]);
});

// Fake report page: elements keyed by selector.
function reportRoot() {
  const els = {};
  const el = (s) => els[s] ??= { textContent: "", innerHTML: "", hidden: false, style: {}, files: [], value: "" };
  return { els, innerHTML: "", querySelector: el };
}
test("I3: #coords shows the pin source, and keeps the GPS failure text", async () => {
  const root = reportRoot();
  let clicked;
  const ctx = { map: { available: () => true, create: () => ({ pin() {}, view() {}, destroy() {}, onClick: f => { clicked = f; } }) },
    geo: { current: async () => { throw new Error("Could not get GPS. Tap the map instead."); } },
    toast: { show() {} }, services: {} };
  await report.mount(root, ctx);
  assert.match(root.els["#coords"].textContent, /^Default pin \(Old Rajinder Nagar\)/);
  clicked(28.6, 77.1);
  assert.match(root.els["#coords"].textContent, /Pin you tapped/);
  await root.els["#gps"].onclick({ target: { disabled: false } });
  assert.match(root.els["#coords"].textContent, /Could not get GPS/);
});
test("I3: GPS success shows accuracy; copy has no banned words", async () => {
  const root = reportRoot();
  const ctx = { map: { available: () => false }, toast: { show() {} }, services: {},
    geo: { current: async () => ({ lat: 28.6, lon: 77.1, accuracy_m: 12.4 }) } };
  await report.mount(root, ctx);
  await root.els["#gps"].onclick({ target: { disabled: false } });
  assert.match(root.els["#coords"].textContent, /Your GPS \(± 12 m\)/);
  for (const s of [PIN.default, PIN.tapped, PIN.gps(5)]) assert.doesNotMatch(s, BANNED);
});

test("M1: persona click with a null me or a failing login shows a message, no rejection", async () => {
  const root = { innerHTML: "", querySelectorAll: () => [btn] };
  const btn = { dataset: { id: "x" }, disabled: false, addEventListener(_, f) { this.f = f; } };
  const shown = [];
  const mk = (loginFn) => ({ services: { session: { users: async () => ({ users: [], note: "n" }), login: loginFn } },
    toast: { show: m => shown.push(m) }, nav: { go() {} }, home: {} });
  await login.mount(root, mk(async () => null)); await btn.f();
  await login.mount(root, mk(async () => { throw new Error("down"); })); await btn.f();
  assert.equal(shown.length, 2);
  assert.match(shown[0], /not found|try again/i);
  assert.equal(shown[1], "down");
});

test("M3: task with no owner says so", () => {
  const html = taskDetail({ id: 1, status: "open", asset_name: "D", agency_id: null, agency_name: "", events: [], incidents: [] }, { banner: "", back: "#/x" });
  assert.match(html, /No owner found/);
  assert.doesNotMatch(html, /Owner: <strong><\/strong>/);
});
