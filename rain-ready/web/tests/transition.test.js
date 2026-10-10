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

// ---- router failure paths under a transition (fix round 1) ----
const ctxOf = (glass) => ({ services: { session: { me: async () => ({ role: "admin" }) } }, glass });
const mkRt = (controllers, transition, extra = {}) => {
  const glass = createFakeGlass("liquid"), root = mkEl();
  const router = createRouter({ controllers, root, ctx: ctxOf(glass), home: { admin: "#/a" }, onChrome() {}, errorHtml: (e) => "ERR " + e.message, transition, ...extra });
  return { router, glass, root };
};
const passThrough = { run: async (fn) => fn() };
test("router: a mount that throws inside a transition still shows the error box", async () => {
  env("#/a");
  const bad = { path: "b", roles: null, mount: async () => { throw new Error("boom"); } };
  const { router, root, glass } = mkRt([{ path: "a", roles: null, mount: async () => {} }, bad], passThrough);
  await router.start(); location.hash = "#/b"; await router.refresh();
  assert.equal(root.children[0].innerHTML, "ERR boom");
  assert.equal(glass.calls.length, 2);
});
test("router: a rejecting transition.run leaves the route rendered, focused, glass refreshed, no unhandled rejection", async () => {
  env("#/a");
  let focused = 0, unhandled = 0; const onU = () => unhandled++; process.on("unhandledRejection", onU);
  const a = { path: "a", roles: null, mount: async (h) => { h.innerHTML = "A"; } }, b = { path: "b", roles: null, mount: async (h) => { h.innerHTML = "B"; } };
  const { router, root, glass } = mkRt([a, b], { run: () => Promise.reject(new Error("vt died")) });
  root.focus = () => { focused++; };
  await router.start(); location.hash = "#/b"; await router.refresh();
  await new Promise(r => setTimeout(r, 5)); process.off("unhandledRejection", onU);
  assert.equal(root.children[0].innerHTML, "B"); assert.equal(focused, 2); assert.equal(glass.calls.length, 2); assert.equal(unhandled, 0);
  location.hash = "#/a"; await router.refresh();
  assert.equal(root.children[0].innerHTML, "A", "routing still works");
});
test("adapter: updateCallbackDone rejecting still runs fn exactly once", async () => {
  let n = 0;
  const doc = { startViewTransition(cb) { const p = Promise.resolve().then(cb); return { updateCallbackDone: p.then(() => { throw new Error("skipped"); }) }; } };
  const out = await createViewTransition(doc, win(false)).run(() => { n++; return 7; });
  assert.equal(n, 1); assert.equal(out, 7);
  const doc2 = { startViewTransition() { return { updateCallbackDone: Promise.reject(new Error("never called")) }; } };
  n = 0; await createViewTransition(doc2, win(false)).run(() => { n++; });
  assert.equal(n, 1);
});
test("router: previous route cleanup runs exactly once across a transitioned navigation", async () => {
  env("#/a");
  let cleaned = 0;
  const a = { path: "a", roles: null, mount: async () => () => { cleaned++; } }, b = { path: "b", roles: null, mount: async () => {} };
  const { router } = mkRt([a, b], passThrough);
  await router.start(); location.hash = "#/b"; await router.refresh();
  assert.equal(cleaned, 1);
});
test("router: a stale render inside a transition is dropped and its cleanup still runs", async () => {
  env("#/a");
  let release, cleaned = 0; const gate = new Promise(r => { release = r; });
  const a = { path: "a", roles: null, mount: async (h) => { h.innerHTML = "A"; } };
  const slow = { path: "s", roles: null, mount: async (h) => { await gate; h.innerHTML = "S"; return () => { cleaned++; }; } };
  const b = { path: "b", roles: null, mount: async (h) => { h.innerHTML = "B"; } };
  const { router, root, glass } = mkRt([a, slow, b], passThrough);
  await router.start();
  location.hash = "#/s"; const first = router.refresh(); await new Promise(r => setTimeout(r, 0));
  location.hash = "#/b"; await router.refresh();
  release(); await first;
  assert.equal(cleaned, 1, "stale cleanup ran"); assert.equal(root.children[0].innerHTML, "B"); assert.equal(glass.calls.length, 2);
});
test("router: 401 redirect inside a transition does not focus or refresh the glass", async () => {
  env("#/a");
  let focused = 0, loggedOut = 0;
  const a = { path: "a", roles: null, mount: async () => {} }, b = { path: "b", roles: null, mount: async () => { const e = new Error("no"); e.status = 401; throw e; } };
  const glass = createFakeGlass("liquid"), root = mkEl(); root.focus = () => { focused++; };
  const ctx = { services: { session: { me: async () => ({ role: "admin" }), logout() { loggedOut++; } } }, glass };
  const router = createRouter({ controllers: [a, b], root, ctx, home: { admin: "#/a" }, onChrome() {}, errorHtml: String, transition: passThrough });
  await router.start(); location.hash = "#/b"; await router.refresh();
  assert.equal(loggedOut, 1); assert.equal(focused, 1); assert.equal(glass.calls.length, 1);
});

// ---- stagger ----
test("stagger sets --i and caps at 7 so at most 8 items animate with a delay", () => {
  assert.equal(stagger(0), 'style="--i:0"'); assert.equal(stagger(3), 'style="--i:3"');
  assert.equal(stagger(20), 'style="--i:7"'); assert.equal(stagger(-2), 'style="--i:0"'); assert.equal(stagger(undefined), 'style="--i:0"');
});

test("router: a throwing cleanup is logged and does not freeze navigation; it is not run twice", async () => {
  env("#/a");
  let calls = 0, shownB = null; const logged = [], orig = console.error; console.error = (...a) => logged.push(a);
  const a = { path: "a", roles: null, mount: async () => () => { calls++; throw new Error("cleanup boom"); } };
  const b = { path: "b", roles: null, mount: async (h) => { h.innerHTML = "B"; } };
  const { router, root } = mkRt([a, b], passThrough);
  try { await router.start(); location.hash = "#/b"; await router.refresh(); shownB = root.children[0].innerHTML; location.hash = "#/a"; await router.refresh(); }
  finally { console.error = orig; }
  assert.equal(calls, 1, "ran once"); assert.equal(logged.length, 1); assert.match(String(logged[0][0]), /cleanup boom/);
  assert.equal(shownB, "B", "navigation went on after the throw");
});

test("adapter: a skipped transition (ready/finished reject with AbortError) raises no unhandled rejection", async () => {
  const seen = [], h = (e) => seen.push(e);
  process.on("unhandledRejection", h);
  try {
    const abort = () => Promise.reject(new Error("Transition was skipped"));
    const doc = { startViewTransition(cb) { return { updateCallbackDone: Promise.resolve().then(cb), ready: abort(), finished: abort() }; } };
    assert.equal(await createViewTransition(doc, win(false)).run(async () => 3), 3);
    await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  } finally { process.off("unhandledRejection", h); }
  assert.deepEqual(seen, []);
});
