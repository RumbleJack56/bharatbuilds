// web/tests/transition.test.js — TransitionPort adapters, router integration (transition + glass refresh), stagger helper.
import { test } from "node:test";
import assert from "node:assert/strict";
import { implement } from "../js/core/port.js";
import { TransitionPort } from "../js/ports/index.js";
import { createViewTransition, createInstantTransition } from "../js/adapters/transition-vt.js";
import { createRouter } from "../js/core/router.js";
import { stagger } from "../js/ui/components.js";
import { createFakeGlass } from "./fakes.js";

const win = (reduced) => ({ matchMedia: () => ({ matches: reduced }) });
const vtDoc = (log) => ({ startViewTransition(cb) { log.push("start"); return { updateCallbackDone: Promise.resolve().then(cb) }; } });

test("TransitionPort has run", () => assert.deepEqual([...TransitionPort.methods], ["run"]));
test("instant adapter runs fn once and returns its value", async () => {
  const t = implement(TransitionPort, createInstantTransition());
  assert.equal(await t.run(() => 7), 7);
});
test("view-transition adapter wraps fn in startViewTransition and returns its value", async () => {
  const log = [], t = implement(TransitionPort, createViewTransition(vtDoc(log), win(false)));
  assert.equal(await t.run(async () => { log.push("fn"); return 5; }), 5);
  assert.deepEqual(log, ["start", "fn"]);
});
test("reduced motion: no view transition, fn still runs", async () => {
  const log = [], t = createViewTransition(vtDoc(log), win(true));
  await t.run(() => log.push("fn"));
  assert.deepEqual(log, ["fn"]);
});
test("unsupported browser: fn still runs once", async () => {
  let n = 0; await createViewTransition({}, win(false)).run(() => { n++; });
  assert.equal(n, 1);
});
test("startViewTransition throwing before the callback falls back to running fn once", async () => {
  let n = 0;
  await createViewTransition({ startViewTransition() { throw new Error("InvalidStateError"); } }, win(false)).run(() => { n++; });
  assert.equal(n, 1);
});

// ---- router ----
const mkEl = () => ({ children: [], innerHTML: "", replaceChildren(...c) { this.children = c; }, focus() {}, remove() {} });
function env(hash) { globalThis.location = { hash }; globalThis.addEventListener = () => {}; globalThis.document = { createElement: mkEl }; }
const mk = (extra = {}) => {
  const ctrl = { path: "a", roles: null, mount: async (h) => { h.innerHTML = "A"; } };
  const glass = createFakeGlass("liquid"), runs = [];
  const transition = { run: async (fn) => { runs.push("run"); return fn(); } };
  const router = createRouter({ controllers: [ctrl, { path: "b", roles: null, mount: async () => {} }], root: mkEl(), ctx: { services: { session: { me: async () => ({ role: "admin" }) } }, glass },
    home: { admin: "#/a" }, onChrome() {}, errorHtml: String, transition, ...extra });
  return { router, glass, runs };
};
test("router: first paint is not animated, later route changes run through the transition, glass refreshes after each render", async () => {
  env("#/a");
  const { router, glass, runs } = mk();
  await router.start();
  assert.deepEqual(runs, []); assert.deepEqual(glass.calls, [["refresh"]]);
  location.hash = "#/b"; await router.refresh();
  assert.deepEqual(runs, ["run"]); assert.equal(glass.calls.length, 2);
});
test("router: a stale render does not refresh the glass snapshot", async () => {
  env("#/a");
  let release; const gate = new Promise(r => { release = r; });
  const slow = { path: "a", roles: null, mount: async () => { await gate; } }, fast = { path: "b", roles: null, mount: async () => {} };
  const glass = createFakeGlass("liquid");
  const router = createRouter({ controllers: [slow, fast], root: mkEl(), ctx: { services: { session: { me: async () => ({ role: "admin" }) } }, glass },
    home: { admin: "#/a" }, onChrome() {}, errorHtml: String });
  const first = router.refresh(); await new Promise(r => setTimeout(r, 0));
  location.hash = "#/b"; await router.refresh();
  release(); await first;
  assert.equal(glass.calls.length, 1, "only the live render refreshed");
});
test("router works without transition or glass (old contexts)", async () => {
  env("#/a");
  const router = createRouter({ controllers: [{ path: "a", roles: null, mount: async () => {} }], root: mkEl(), ctx: { services: { session: { me: async () => ({ role: "admin" }) } } },
    home: { admin: "#/a" }, onChrome() {}, errorHtml: String });
  await router.start();
});

// ---- stagger ----
test("stagger sets --i and caps at 7 so at most 8 items animate with a delay", () => {
  assert.equal(stagger(0), 'style="--i:0"'); assert.equal(stagger(3), 'style="--i:3"');
  assert.equal(stagger(20), 'style="--i:7"'); assert.equal(stagger(-2), 'style="--i:0"'); assert.equal(stagger(undefined), 'style="--i:0"');
});
