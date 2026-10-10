// web/tests/glass.test.js — GlassPort contract, chooseGlass rules, liquidGL adapter behaviour (fake window), CDN script pin.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { implement } from "../js/core/port.js";
import { GlassPort } from "../js/ports/index.js";
import { chooseGlass, waitFor } from "../js/core/glass.js";
import { createLiquidGlass } from "../js/adapters/glass-liquidgl.js";
import { createCssGlass } from "../js/adapters/glass-css.js";

const OK = { hasLiquid: true, hasGL: true, reducedMotion: false, deviceMemory: 8, search: "", phone: false };

test("GlassPort lists the four methods", () => assert.deepEqual([...GlassPort.methods], ["mount", "refresh", "destroy", "mode"]));
test("css adapter satisfies the port and reports css", async () => {
  const root = { classList: { add(c) { this.c = c; } } };
  const g = implement(GlassPort, createCssGlass({ documentElement: root }));
  g.mount(".lg"); await g.refresh(); g.destroy();
  assert.equal(g.mode(), "css"); assert.equal(root.classList.c, "glass-css");
});

test("chooseGlass: liquid only when every condition holds", () => assert.equal(chooseGlass(OK), "liquid"));
test("chooseGlass: ?glass=css always wins", () => assert.equal(chooseGlass({ ...OK, search: "?glass=css" }), "css"));
test("chooseGlass: library missing (CDN failed) or no WebGL2/WebGPU -> css", () => {
  assert.equal(chooseGlass({ ...OK, hasLiquid: false }), "css");
  assert.equal(chooseGlass({ ...OK, hasGL: false }), "css");
});
test("chooseGlass: reduced motion -> css, even when forced", () => {
  assert.equal(chooseGlass({ ...OK, reducedMotion: true }), "css");
  assert.equal(chooseGlass({ ...OK, reducedMotion: true, search: "?glass=liquid" }), "css");
});
test("chooseGlass: low memory -> css, unknown memory -> liquid, 4 GB -> liquid", () => {
  assert.equal(chooseGlass({ ...OK, deviceMemory: 2 }), "css");
  assert.equal(chooseGlass({ ...OK, deviceMemory: undefined }), "liquid");
  assert.equal(chooseGlass({ ...OK, deviceMemory: 4 }), "liquid");
});
test("chooseGlass: phones follow the measured default; ?glass=liquid overrides memory and phone", () => {
  assert.equal(chooseGlass({ ...OK, phone: true }, false), "css");
  assert.equal(chooseGlass({ ...OK, phone: true }, true), "liquid");
  assert.equal(chooseGlass({ ...OK, phone: true, deviceMemory: 2, search: "?glass=liquid" }, false), "liquid");
});

test("waitFor resolves true as soon as the predicate holds and false at the deadline (CDN hang)", async () => {
  let t = 0, ok = false;
  const timers = { now: () => t, sleep: async (n) => { t += n; if (t >= 100) ok = true; } };
  assert.equal(await waitFor(() => ok, 1000, 50, timers), true);
  t = 0;
  assert.equal(await waitFor(() => false, 1000, 50, { now: () => t, sleep: async (n) => { t += n; } }), false);
});

// ---- liquid adapter with a fake window ----
const ticks = async (n = 8) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
function rig({ images = [], els = [mkEl()], liquid } = {}) {
  const timers = [], events = [], handlers = {}, calls = [];
  const root = { classes: new Set(["glass-css"]), classList: { add(c) { root.classes.add(c); }, remove(c) { root.classes.delete(c); }, contains: (c) => root.classes.has(c) } };
  const win = {
    document: { documentElement: root, images, querySelectorAll: () => els },
    liquidGL: liquid || ((o) => { calls.push(o); return { destroy() { this.dead = true; } }; }),
    addEventListener: (t, f) => { handlers[t] = f; }, removeEventListener() {},
    dispatchEvent: (e) => { events.push(e.type); return true; }, Event: class { constructor(t) { this.type = t; } },
  };
  const glass = createLiquidGlass(win, { settleMs: 10, imgTimeoutMs: 100, setTimeoutFn: (fn) => { timers.push(fn); } });
  const flush = async () => { await ticks(); while (timers.length) timers.shift()(); await ticks(); };
  return { glass, win, root, events, handlers, calls, els, flush };
}
function mkEl() { const e = { cls: [], isConnected: true }; e.classList = { add: (c) => e.cls.push(c) }; return e; }
const el = mkEl;

test("liquid adapter satisfies the port; mount creates one lens per element with the spec options and clears glass-css", () => {
  const e = el(), r = rig({ els: [e] });
  implement(GlassPort, r.glass);
  r.glass.mount(".lg");
  assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].snapshot, "body"); assert.equal(r.calls[0].resolution, 1.5); assert.match(r.calls[0].target, /^\.lgl-\d+$/);
  assert.equal(r.glass.mode(), "liquid"); assert.equal(r.root.classes.has("glass-css"), false);
  r.glass.mount(".lg");
  assert.equal(r.calls.length, 1, "an element is mounted once");
});

test("a throwing liquidGL (bad engine, CDN script half-loaded) falls back to css instead of breaking boot", () => {
  const r = rig({ els: [el()], liquid: () => { throw new Error("boom"); } });
  r.glass.mount(".lg");
  assert.equal(r.glass.mode(), "css"); assert.equal(r.root.classes.has("glass-css"), true);
});

test("webglcontextlost (phone GPU reset) -> css look returns and lenses are destroyed", () => {
  const lenses = [];
  const r = rig({ els: [el()], liquid: () => { const l = { destroy() { l.dead = true; } }; lenses.push(l); return l; } });
  r.glass.mount(".lg");
  r.handlers.webglcontextlost({});
  assert.equal(r.glass.mode(), "css"); assert.equal(r.root.classes.has("glass-css"), true); assert.equal(lenses[0].dead, true);
});

test("refresh waits for an image that is still loading, then re-snapshots once via a resize event", async () => {
  const fire = {}, img = { complete: false, addEventListener: (t, f) => { fire[t] = f; } };
  const r = rig({ images: [img] });
  r.glass.mount(".lg");
  const p = r.glass.refresh();
  await ticks();
  assert.deepEqual(r.events, [], "nothing before the image settles");
  fire.load(); await r.flush(); await p;
  assert.deepEqual(r.events, ["resize"]);
});

test("refresh gives up on an image that never loads after the timeout", async () => {
  const img = { complete: false, addEventListener() {} };
  const r = rig({ images: [img] });
  r.glass.mount(".lg");
  const p = r.glass.refresh();
  for (let i = 0; i < 3; i++) await r.flush();
  await p;
  assert.deepEqual(r.events, ["resize"]);
});

test("only the last of several quick refreshes re-snapshots", async () => {
  const r = rig();
  r.glass.mount(".lg");
  const a = r.glass.refresh(), b = r.glass.refresh();
  for (let i = 0; i < 3; i++) await r.flush();
  await Promise.all([a, b]);
  assert.equal(r.events.length, 1);
});

test("refresh destroys lenses of removed nodes and mounts new ones", async () => {
  const e1 = el(), els = [e1], lenses = [];
  const r = rig({ els, liquid: () => { const l = { destroy() { l.dead = true; } }; lenses.push(l); return l; } });
  r.glass.mount(".lg");
  e1.isConnected = false; const e2 = el(); els.splice(0, 1, e2);
  const p = r.glass.refresh(); for (let i = 0; i < 3; i++) await r.flush(); await p;
  assert.equal(lenses[0].dead, true); assert.equal(lenses.length, 2);
});

test("in css mode refresh is a no-op that resolves", async () => {
  const r = rig({ els: [el()], liquid: () => { throw new Error("x"); } });
  r.glass.mount(".lg");
  await r.glass.refresh();
  assert.deepEqual(r.events, []);
});

// ---- index.html: pinned, non-blocking script ----
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
test("liquidGL loads from the exact pinned URL with async (a module script, because the minified file ends in `export default`; never defer: a hung CDN must not block the app)", () => {
  assert.match(html, /<script async type="module" src="https:\/\/cdn\.jsdelivr\.net\/npm\/liquid-gl@2\.2\.4\/liquidGL\.min\.js"><\/script>/);
  assert.doesNotMatch(html, /liquid-gl@(latest|\^|~|\d+(\.\d+)?["\/])/);
});
test("glass adapters are in the import map", () => {
  for (const m of ["glass-liquidgl", "glass-css"]) assert.match(html, new RegExp(`"./js/adapters/${m}\\.js": "./js/adapters/${m}\\.js\\?v=`));
  assert.match(html, /"\.\/js\/core\/glass\.js": "\.\/js\/core\/glass\.js\?v=/);
});
