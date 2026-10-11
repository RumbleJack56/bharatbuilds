// web/tests/welcome.test.js — the landing page inside the app: sections, live counts, logos or badges, offline, guest start route.
import { test } from "node:test";
import assert from "node:assert/strict";
import { welcomeView, countsFrom, agencyStrip, LOGOS } from "../js/views/welcome.view.js";
import { welcome } from "../js/controllers/welcome.js";
import { createRouter } from "../js/core/router.js";
import { BANNED } from "../js/ui/copy.js";

const AG = [{ id: "mcd", name: "MCD (Municipal Corporation of Delhi)" }, { id: "pwd", name: "PWD (Public Works Department)" }, { id: "x", name: "X <b>" }];
const MAP = { pockets: [{}, {}, {}], assets: [{}, {}] };
const ACC = { agencies: [{ agency_id: "mcd", assets_owned: 1 }, { agency_id: null, assets_owned: 4 }] };

test("countsFrom reads pockets, drains and No owner found; null without data", () => {
  assert.deepEqual(countsFrom(MAP, ACC), { pockets: 3, drains: 2, unowned: 4 });
  assert.equal(countsFrom(null, ACC), null);
});

test("agency strip: logo for MCD, initials badge for PWD, names escaped", () => {
  const h = agencyStrip(AG);
  assert.match(h, new RegExp(`src="${LOGOS.mcd}"`)); assert.match(h, /alt="Municipal Corporation of Delhi logo"/);
  assert.match(h, /class="w-mono" aria-hidden="true">PWD/); assert.match(h, /X &lt;b&gt;/); assert.doesNotMatch(h, /X <b>/);
});

test("view: hero with Get started, counts, steps, who, board link, credits, relative image paths, honest copy", () => {
  const h = welcomeView({ counts: { pockets: 6, drains: 9, unowned: 3 }, agencies: AG });
  assert.match(h, /href="#\/login"><span>Get started/); assert.match(h, /href="#\/dash"/); assert.match(h, /href="#\/board"/);
  assert.match(h, /<strong>6<\/strong><span>Low-point pockets mapped/); assert.match(h, /not affiliated with any agency/);
  assert.match(h, /src="landing\/img\/about-delhi\.jpg"/); assert.doesNotMatch(h, /src="\/landing/);   // relative: works in the APK bundle
  assert.match(h, /A scenario, not a forecast/); assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /undefined|NaN/);
  assert.doesNotMatch(h, /class="card(?![^"]*\bglass\b)/);
});

test("view while loading or offline: dashes, no agency section, and an honest note", () => {
  const h = welcomeView({ offline: true });
  assert.equal((h.match(/<strong>–<\/strong>/g) || []).length, 3); assert.doesNotMatch(h, /Agencies in the pilot ward/);
  assert.match(h, /Live counts are not available right now/);
});

test("controller fills counts and agencies, and a failed call still leaves a usable page", async () => {
  const root = { innerHTML: "" };
  const ok = { services: { dashboard: { map: async () => MAP, accountability: async () => ACC, agencies: async () => AG } } };
  await welcome.mount(root, ok);
  assert.match(root.innerHTML, /<strong>3<\/strong><span>Low-point pockets/); assert.match(root.innerHTML, /Agencies in the pilot ward/);
  const down = { services: { dashboard: { map: async () => { throw new Error("down"); }, accountability: async () => ACC, agencies: async () => AG } } };
  await welcome.mount(root, down);
  assert.match(root.innerHTML, /Live counts are not available right now/); assert.match(root.innerHTML, /Get started/);
});

const mkEl = () => ({ children: [], innerHTML: "", replaceChildren(...c) { this.children = c; }, focus() {}, remove() {} });
function env(hash) { globalThis.location = { hash }; globalThis.addEventListener = () => {}; globalThis.document = { createElement: mkEl }; }
const router = (guest) => createRouter({ controllers: [{ path: "login", roles: null, mount: async () => {} }, { path: "welcome", roles: null, mount: async () => {} },
  { path: "mine", roles: ["resident"], mount: async () => {} }], root: mkEl(), ctx: { services: { session: { me: async () => null } } },
  home: { resident: "#/mine" }, onChrome() {}, errorHtml: String, ...(guest ? { guest } : {}) });

test("a visitor with no route lands on the guest screen; protected routes still go to sign-in; default stays #/login", async () => {
  env(""); await router("#/welcome").start(); assert.equal(location.hash, "#/welcome");
  env("#/mine"); await router("#/welcome").start(); assert.equal(location.hash, "#/login");
  env(""); await router().start(); assert.equal(location.hash, "#/login");
});
