# Rain-Ready Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `CLAUDE.md` first; its architecture rule is the summary of section 2 below.

**Goal:** Rebuild `web/` as layered modules (controller → interface → implementation) so any library, device feature or backend can be swapped without touching screens, and fix every bug found in the V1 walk on the way.

**Architecture:** One composition root (`main.js`) builds adapters, checks each against its port, and hands a single `ctx` object to controllers. Controllers fetch data through services, render pure views, and bind events. Only adapters touch platform APIs (`fetch`, Leaflet, GPS, localStorage, DOM toast).

**Tech Stack:** Plain ES modules in the browser, no build step. Leaflet 1.9.4 from cdnjs. Tests run with Node 22's built-in runner (`node --test web/tests`), which imports the same `.js` files the browser loads.

**Spec:** `SCOPE.md` (what to build, honesty rules), `TASKS.md` (V1-V8, ownership), `docs/API.md` (endpoints). Backend shapes come from the running server's `/docs`.

**Owner:** Aarush owns everything in `web/`. Section 7 lists backend items for Ujjwal; nothing in this plan edits backend files.

---

## Global Constraints

- No build step, no npm dependency in `web/`. Leaflet stays on `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/`.
- Only `web/js/adapters/http-fetch.js` calls `fetch`. Only `web/js/adapters/map-leaflet.js` touches `L`. Only `web/js/main.js` imports adapters.
- `localStorage` key stays `rr_user`, so existing logins survive the migration.
- Every file stays at about 250 lines or fewer; comments stay short.
- Banned in any UI string: the bare word "safe", "guarantee", "desilted", "removed", "cm deep" (`SCOPE.md` section 7).
- The scenario banner shows wherever simulator, rank or gain numbers show. Time reads "about X h".
- Status is never colour-only: every coloured mark has a text label.
- Branch per task: `aarush/<topic>`; commit prefix `[aarush] area: what`; run `make test` and `node --test web/tests` before every merge. Do not push unless Aarush asks.
- `main` keeps working after every task: legacy screens stay mounted until their task replaces them.

## Review Focus

Inputs the spec implies but a happy-path click-through never meets, and the behaviour a user would expect:

1. **GPS denied or unavailable.** The report still sends from the default pin or a tapped pin, and the screen says so. Test: Task 5 (`geo-browser` rejects with a readable message) and Task 7 (report controller keeps the pin).
2. **Server unreachable or slow.** Every screen shows "Cannot reach the server. Check your connection." instead of a blank view. Test: Task 2 (`http-fetch` maps a thrown fetch to `ApiError` with status 0).
3. **A persona that no longer exists** (DB reset while logged in). The app logs out and shows the login screen. Test: Task 4 (`session.me()` clears storage on 401).
4. **APK origin.** Photo URLs and API calls use `API_BASE`, so the Android app loads `https://<host>/media/...` rather than `https://localhost/media/...`. Test: Task 3 (services resolve every `photo_url` through `http.url`).
5. **Double tap on a submit button.** One request goes out. Test: Task 6 (`guard` keeps the button disabled until the promise settles).

---

## 1. Where we are (V1 walk, 9 Oct 2026, fresh DB, 390×844 headless Chromium)

The whole loop works through the UI: report → task → accept → complete → confirm → impact shows "about 1.2 h fill time gained". Bugs found, with the task that fixes each:

| # | Bug | Cause | Fixed in |
|---|---|---|---|
| B-1 | Pocket circles invisible on the dashboard map | `L.circle` radius is 35 **metres**; the fit zoom (~z14) makes it ~4 px | Task 11 |
| B-2 | "Log out" shows when nobody is logged in | `button{display:inline-flex}` overrides `[hidden]` | Task 6 |
| B-3 | Admin "Tasks with no owner" list is stale after "Generate ranked plan" | list rendered once, never refreshed | Task 10 |
| B-4 | Bedrock triage can never run from the report screen | kind select defaults to "Blocked drain"; backend only asks the AI when kind is empty | Task 7 |
| B-5 | Simulator radio buttons render broken | global `input` style (44 px, padding, border) hits radios | Task 6 |
| B-6 | Reassign select built from `/api/accountability` | `/api/agencies` exists and is the right source | Task 9 |
| B-7 | Task page: "Not ours" only while `open`; no assign control for an admin on a no-owner task; no scenario banner | screen gaps | Task 9 |
| B-8 | `/favicon.ico` 404 in the console | no icon link | Task 6 |
| B-9 | Simulator swallows errors (`.catch(()=>{})`) | silent failure | Task 11 |
| B-10 | `official.js` reloads by dispatching a fake `hashchange` | no router refresh API | Task 4 |

Not a web bug, but it shapes the simulator screen: with the seed data every pocket is "High" at 35 mm/h in "As they are now". Agree the fix with Ujjwal (section 7).

---

## 2. Architecture

### 2.1 Layers and the dependency rule

```
main.js (composition root)  ── the only file that imports adapters
   │ builds ctx = { services, map, geo, toast, nav }
   ▼
controllers/   one per route: mount(root, ctx, params) → cleanup?
   │ calls ctx.services.*, renders views, binds DOM events
   ▼
views/         pure: model → HTML string. No DOM, no network, no globals
ui/            pure shared pieces: format, components, copy
services/      domain calls over HttpPort; build URLs; resolve photo URLs
ports/         interfaces: a name + required methods, checked at startup
adapters/      implementations: fetch, Leaflet, GPS, localStorage, DOM toast
core/          port.js, errors.js, router.js (pure parts tested in Node)
```

Allowed imports (enforced by `web/tests/architecture.test.js`, Task 1):

| Folder | May import |
|---|---|
| `core/` | `core/` |
| `ports/` | `core/` |
| `adapters/` | `core/` |
| `services/` | `core/` |
| `ui/` | `ui/` |
| `views/` | `ui/`, `views/` |
| `controllers/` | `controllers/`, `views/`, `ui/`, `core/` |
| `main.js` | anything |

Controllers never import adapters or services directly; they receive them in `ctx`. That is the swap point: replace Leaflet with MapLibre by writing `adapters/map-maplibre.js` and changing one line in `main.js`.

### 2.2 Contracts

**Port** (`core/port.js`): a frozen `{ name, methods }`. `implement(port, impl)` throws at startup if a method is missing, so a broken swap fails loudly on load, not in a click.

**Ports** (`ports/index.js`):

| Port | Methods | Implementation today | Likely swap |
|---|---|---|---|
| `HttpPort` | `request(method, path, {json, form}) → data`, `url(path) → absolute` | `adapters/http-fetch.js` | fake for tests; offline queue |
| `StoragePort` | `get(key) → string`, `set(key, value)`, `remove(key)` | `adapters/storage-local.js` | Capacitor Preferences |
| `GeoPort` | `current() → {lat, lon, accuracy_m}` (rejects with a readable message) | `adapters/geo-browser.js` | Capacitor Geolocation |
| `MapPort` | `available() → bool`, `create(el, {center, zoom}) → MapView` | `adapters/map-leaflet.js` | MapLibre |
| `MapViewPort` | `circle`, `badge`, `pin`, `onClick`, `view`, `fit`, `destroy` | returned by `create` | — |
| `ToastPort` | `show(message)` | `adapters/toast-dom.js` | native toast |

**Controller** (`controllers/*.js`): a plain object.

```js
/** @typedef {{ path: string, roles: string[] | null, mount: (root: HTMLElement, ctx: object, params: string[]) => Promise<void | (() => void)> }} Controller */
```

`roles: null` means public. `mount` may return a cleanup function (the map controllers return `() => mapView.destroy()`).

**Services** (`services/*.js`): factories `createXService(http)` returning plain async functions. They own URLs and query strings, and return data with every `photo_url` made absolute with `http.url`.

**Views** (`views/*.js`): `(model) → string`. All interpolated text goes through `esc`.

### 2.3 Target file map

```
web/
  index.html            loads Leaflet, config.js, js/main.js; favicon link
  config.js             window.API_BASE ("" on the web; set by mobile/build.sh)
  css/app.css           tokens + components (fixes B-2, B-5)
  js/
    main.js             composition root + chrome (header, tabs)
    core/port.js        definePort, implement
    core/errors.js      ApiError
    core/router.js      parseHash, resolve (pure) + createRouter (DOM)
    ports/index.js      HttpPort, StoragePort, GeoPort, MapPort, MapViewPort, ToastPort
    adapters/http-fetch.js
    adapters/storage-local.js
    adapters/geo-browser.js
    adapters/map-leaflet.js
    adapters/toast-dom.js
    services/session.service.js
    services/incidents.service.js
    services/tasks.service.js
    services/dashboard.service.js
    ui/format.js        esc, hrs, when
    ui/components.js    chip, banner, errBox, photos, guard
    ui/copy.js          KINDS, FIELD_RULE, EVENT, LEVEL, ROLE, USE, BANNED
    views/login.view.js
    views/report.view.js
    views/resident.view.js
    views/official.view.js
    views/admin.view.js
    views/dash.view.js  dashboard shell + accountability, impact, capture
    views/sim.view.js   simulator controls + results
    controllers/index.js   CONTROLLERS, TABS, HOME
    controllers/login.js  report.js  resident.js  official.js  admin.js  dash.js  dashmap.js  sim.js
  tests/
    architecture.test.js
    fakes.js            createFakeHttp, createMemoryStorage
    core.test.js  adapters.test.js  services.test.js  views.test.js
    fixtures/*.json     captured from the seed server (Task 3)
```

Files deleted at the end (Task 12): `js/api.js`, `js/util.js`, `js/app.js`, `js/dashmap.js`, `js/dashmore.js` (old locations).

### 2.4 Migration strategy

The new router can mount an old `render*` function through `legacy(path, roles, fn)`. Task 4 switches the app to the new router with every screen still legacy; Tasks 7-11 replace one legacy entry each. The app works after every task.

---

## 3. Tasks

### Task 1: Test harness and architecture guard

**Files:**
- Create: `web/tests/architecture.test.js`, `web/tests/fakes.js`

**Interfaces:**
- Produces: `createFakeHttp(routes)` → `{ calls, request, url }`; `createMemoryStorage()` → `StoragePort`; the import-rule test used by every later task.

- [ ] **Step 1: Write the architecture test**

```js
// web/tests/architecture.test.js — enforces PLAN.md section 2.1. LEGACY files are exempt until Task 12 deletes them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const JS = fileURLToPath(new URL("../js/", import.meta.url));
const LEGACY = new Set(["api.js", "util.js", "app.js", "dashmap.js", "dashmore.js", "login.js", "report.js",
  "resident.js", "official.js", "admin.js", "dash.js"]);
const ALLOWED = { core: ["core"], ports: ["core"], adapters: ["core"], services: ["core"], ui: ["ui"],
  views: ["ui", "views"], controllers: ["controllers", "views", "ui", "core"] };

const files = (dir) => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".js") ? [p] : [];
});
const layer = (p) => relative(JS, p).split(sep).length > 1 ? relative(JS, p).split(sep)[0] : "";

for (const file of files(JS)) {
  const rel = relative(JS, file);
  if (LEGACY.has(rel)) continue;
  const src = readFileSync(file, "utf8");
  test(`imports follow the layer rule: ${rel}`, () => {
    const from = layer(file);
    if (from === "") return;                        // main.js is the composition root
    for (const [, spec] of src.matchAll(/from\s+"(\.[^"]+)"/g)) {
      const to = layer(resolve(dirname(file), spec));
      assert.ok(ALLOWED[from].includes(to), `${rel} (${from}) must not import ${spec} (${to || "root"})`);
    }
  });
  test(`platform APIs stay in their adapter: ${rel}`, () => {
    if (rel !== join("adapters", "http-fetch.js")) assert.doesNotMatch(src, /\bfetch\(/, "fetch only in adapters/http-fetch.js");
    if (rel !== join("adapters", "map-leaflet.js")) assert.doesNotMatch(src, /\bL\.\w+\(/, "Leaflet only in adapters/map-leaflet.js");
  });
}
```

- [ ] **Step 2: Write the fakes**

```js
// web/tests/fakes.js — test doubles that satisfy the ports.
import { ApiError } from "../js/core/errors.js";

export function createFakeHttp(routes = {}, base = "https://api.test") {
  const calls = [];
  return {
    calls,
    async request(method, path, opts = {}) {
      calls.push({ method, path, ...opts });
      const h = routes[`${method} ${path}`];
      if (h === undefined) throw new ApiError(`no fake for ${method} ${path}`, 404);
      if (h instanceof ApiError) throw h;
      return typeof h === "function" ? h(opts) : structuredClone(h);
    },
    url: (p) => !p ? "" : /^https?:/.test(p) ? p : base + p,
  };
}

export function createMemoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { get: k => m.get(k) ?? "", set: (k, v) => m.set(k, String(v)), remove: k => m.delete(k) };
}
```

- [ ] **Step 3: Run** `node --test web/tests` from `rain-ready/`. Expected: FAIL, because `web/js/core/errors.js` does not exist yet (fakes import it). Task 2 makes it pass; commit both together.

### Task 2: Core (ports, errors) and the HTTP adapter

**Files:**
- Create: `web/js/core/port.js`, `web/js/core/errors.js`, `web/js/ports/index.js`, `web/js/adapters/http-fetch.js`
- Test: `web/tests/core.test.js`, `web/tests/adapters.test.js`

**Interfaces:**
- Produces: `definePort(name, methods)`, `implement(port, impl)`, `class ApiError(message, status)`, the six ports in section 2.2, `createFetchHttp({ base, getUserId, fetchImpl })`.

- [ ] **Step 1: Write failing tests**

```js
// web/tests/core.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { definePort, implement } from "../js/core/port.js";

test("implement accepts a complete adapter and freezes it", () => {
  const P = definePort("P", ["a", "b"]);
  const impl = implement(P, { a() {}, b() {} });
  assert.ok(Object.isFrozen(impl));
});
test("implement names every missing method", () => {
  const P = definePort("P", ["a", "b", "c"]);
  assert.throws(() => implement(P, { a() {} }), /P: missing b, c/);
});
```

```js
// web/tests/adapters.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFetchHttp } from "../js/adapters/http-fetch.js";

const res = (status, body) => ({ ok: status < 400, status, json: async () => body });

test("sends X-User-Id and JSON body to base + path", async () => {
  let seen;
  const http = createFetchHttp({ base: "https://h/", getUserId: () => "res-1",
    fetchImpl: async (url, init) => { seen = { url, init }; return res(200, { ok: 1 }); } });
  assert.deepEqual(await http.request("POST", "/api/x", { json: { a: 1 } }), { ok: 1 });
  assert.equal(seen.url, "https://h/api/x");
  assert.equal(seen.init.headers["X-User-Id"], "res-1");
  assert.equal(seen.init.body, '{"a":1}');
});
test("maps FastAPI detail to ApiError with status", async () => {
  const http = createFetchHttp({ fetchImpl: async () => res(403, { detail: "role resident cannot do this" }) });
  await assert.rejects(http.request("GET", "/api/x"), e => e.status === 403 && /cannot do this/.test(e.message));
});
test("network failure becomes status 0 with a readable message", async () => {
  const http = createFetchHttp({ fetchImpl: async () => { throw new TypeError("Failed to fetch"); } });
  await assert.rejects(http.request("GET", "/api/x"), e => e.status === 0 && /Cannot reach the server/.test(e.message));
});
test("url() prefixes relative paths and keeps absolute ones", () => {
  const http = createFetchHttp({ base: "https://h", fetchImpl: async () => res(200, {}) });
  assert.equal(http.url("/media/a.png"), "https://h/media/a.png");
  assert.equal(http.url("https://s3/x"), "https://s3/x");
  assert.equal(http.url(null), "");
});
```

- [ ] **Step 2: Run** `node --test web/tests`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

```js
// web/js/core/port.js — a port is a named list of required methods; implement() checks an adapter at startup.
export function definePort(name, methods) {
  return Object.freeze({ name, methods: Object.freeze([...methods]) });
}
export function implement(port, impl) {
  const missing = port.methods.filter(m => typeof impl?.[m] !== "function");
  if (missing.length) throw new TypeError(`${port.name}: missing ${missing.join(", ")}`);
  return Object.freeze(impl);
}
```

```js
// web/js/core/errors.js
export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = "ApiError"; this.status = status; }
}
```

```js
// web/js/ports/index.js — the interfaces adapters implement. See PLAN.md section 2.2.
import { definePort } from "../core/port.js";

export const HttpPort = definePort("HttpPort", ["request", "url"]);
export const StoragePort = definePort("StoragePort", ["get", "set", "remove"]);
export const GeoPort = definePort("GeoPort", ["current"]);
export const MapPort = definePort("MapPort", ["available", "create"]);
export const MapViewPort = definePort("MapViewPort", ["circle", "badge", "pin", "onClick", "view", "fit", "destroy"]);
export const ToastPort = definePort("ToastPort", ["show"]);
```

```js
// web/js/adapters/http-fetch.js — HttpPort over fetch. The ONLY file in web/ that calls fetch.
import { ApiError } from "../core/errors.js";

function detailText(d) {
  if (!d) return "Something went wrong.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(x => (x.loc ? x.loc.slice(1).join(".") + ": " : "") + (x.msg || "")).join("; ");
  return JSON.stringify(d);
}

export function createFetchHttp({ base = "", getUserId = () => "", fetchImpl = (...a) => globalThis.fetch(...a) } = {}) {
  const root = base.replace(/\/$/, "");
  return {
    async request(method, path, { json, form } = {}) {
      const headers = {};
      const uid = getUserId();
      if (uid) headers["X-User-Id"] = uid;
      let body;
      if (json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
      else if (form) body = form;
      let res;
      try { res = await fetchImpl(root + path, { method, headers, body }); }
      catch { throw new ApiError("Cannot reach the server. Check your connection.", 0); }
      let data = null;
      try { data = await res.json(); } catch { /* empty body */ }
      if (!res.ok) throw new ApiError(detailText(data && data.detail), res.status);
      return data;
    },
    url: (p) => !p ? "" : /^https?:/.test(p) ? p : root + p,
  };
}
```

- [ ] **Step 4: Run** `node --test web/tests`. Expected: PASS (core, adapters, architecture).
- [ ] **Step 5: Commit** `git add web/js/core web/js/ports web/js/adapters/http-fetch.js web/tests && git commit -m "[aarush] web: ports, ApiError, fetch adapter, architecture test"`

### Task 3: Services and fixtures

**Files:**
- Create: `web/js/services/session.service.js`, `incidents.service.js`, `tasks.service.js`, `dashboard.service.js`, `web/tests/fixtures/*.json`
- Test: `web/tests/services.test.js`

**Interfaces:**
- Consumes: `HttpPort`, `StoragePort` (Task 2), fakes (Task 1).
- Produces:
  - `createSessionService(http, storage)` → `{ userId(), me(), login(id), logout(), users() }`. `me()` caches; on 401 it calls `logout()` and returns `null`.
  - `createIncidentsService(http)` → `{ create({lat, lon, kind, note, photo}), mine() }`
  - `createTasksService(http)` → `{ list({agencyId, status}), get(id), accept(id), reject(id, {reason, reassignTo}), assign(id, agencyId), complete(id, {photo, note}), confirm(id, {ok, note}) }`
  - `createDashboardService(http)` → `{ map(), simulate({rain, state, atH}), accountability(), impact(), opportunities(), agencies(), generatePlan(top) }`
  - Every returned `photo_url` is absolute (`http.url`).

- [ ] **Step 1: Capture fixtures from the seed server**

```bash
cd rain-ready && make reset && (make run &) && sleep 3
mkdir -p web/tests/fixtures
for p in users map accountability impact opportunities agencies; do curl -s localhost:8010/api/$p > web/tests/fixtures/$p.json; done
curl -s -X POST localhost:8010/api/simulate -H 'content-type: application/json' -d '{"rain_mm_h":35,"drain_state":"current"}' > web/tests/fixtures/simulate.json
curl -s -X POST localhost:8010/api/plan/generate -H 'X-User-Id: admin-1' > /dev/null
curl -s localhost:8010/api/tasks > web/tests/fixtures/tasks.json
curl -s localhost:8010/api/tasks/1 > web/tests/fixtures/task.json
```
Stop the server (Ctrl+C), then `make reset` so the dev DB is clean again.

- [ ] **Step 2: Write failing tests**

```js
// web/tests/services.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp, createMemoryStorage } from "./fakes.js";
import { ApiError } from "../js/core/errors.js";
import { createSessionService } from "../js/services/session.service.js";
import { createTasksService } from "../js/services/tasks.service.js";
import { createIncidentsService } from "../js/services/incidents.service.js";
import { createDashboardService } from "../js/services/dashboard.service.js";

test("session.me returns null with no persona and caches a found one", async () => {
  const http = createFakeHttp({ "GET /api/me": { id: "res-1", role: "resident" } });
  const s = createSessionService(http, createMemoryStorage());
  assert.equal(await s.me(), null);
  await s.login("res-1");
  assert.equal((await s.me()).role, "resident");
  await s.me();
  assert.equal(http.calls.filter(c => c.path === "/api/me").length, 1);
});
test("session.me logs out on 401 (persona gone after a DB reset)", async () => {
  const store = createMemoryStorage({ user: "ghost" });
  const s = createSessionService(createFakeHttp({ "GET /api/me": new ApiError("no", 401) }), store);
  assert.equal(await s.me(), null);
  assert.equal(store.get("user"), "");
});
test("tasks.list builds the query and resolves nothing it should not", async () => {
  const http = createFakeHttp({ "GET /api/tasks?agency_id=none&status=open": { tasks: [], banner: "b" } });
  await createTasksService(http).list({ agencyId: "none", status: "open" });
  assert.equal(http.calls[0].path, "/api/tasks?agency_id=none&status=open");
});
test("tasks.get makes every photo_url absolute", async () => {
  const http = createFakeHttp({ "GET /api/tasks/7": { id: 7, events: [{ photo_url: "/media/a.png" }, { photo_url: null }],
    incidents: [{ photo_url: "/media/b.png" }] } });
  const t = await createTasksService(http).get(7);
  assert.equal(t.events[0].photo_url, "https://api.test/media/a.png");
  assert.equal(t.events[1].photo_url, "");
  assert.equal(t.incidents[0].photo_url, "https://api.test/media/b.png");
});
test("tasks.reject sends reassign_to as null when empty", async () => {
  const http = createFakeHttp({ "POST /api/tasks/3/reject": { id: 3 } });
  await createTasksService(http).reject(3, { reason: "PWD inlet", reassignTo: "" });
  assert.deepEqual(http.calls[0].json, { reason: "PWD inlet", reassign_to: null });
});
test("incidents.create sends multipart with an empty kind when the user is unsure", async () => {
  const http = createFakeHttp({ "POST /api/incidents": { incident: { photo_url: "/media/c.png" } } });
  const r = await createIncidentsService(http).create({ lat: 28.6, lon: 77.2, kind: "", note: "n" });
  assert.equal(http.calls[0].form.get("kind"), "");
  assert.equal(r.incident.photo_url, "https://api.test/media/c.png");
});
test("dashboard.simulate maps names to the API body", async () => {
  const http = createFakeHttp({ "POST /api/simulate": { results: [] } });
  await createDashboardService(http).simulate({ rain: 40, state: "clean" });
  assert.deepEqual(http.calls[0].json, { rain_mm_h: 40, drain_state: "clean" });
});
```

- [ ] **Step 3: Run** `node --test web/tests`. Expected: FAIL (services missing).

- [ ] **Step 4: Implement**

```js
// web/js/services/session.service.js — who is logged in. Persona id lives in StoragePort under "user".
export function createSessionService(http, storage) {
  let cached = null;
  const userId = () => storage.get("user");
  const logout = () => { storage.remove("user"); cached = null; };
  async function me() {
    if (!userId()) return null;
    if (cached) return cached;
    try { cached = await http.request("GET", "/api/me"); }
    catch (e) { if (e.status === 401) { logout(); return null; } throw e; }
    return cached;
  }
  return {
    userId, me, logout,
    async login(id) { storage.set("user", id); cached = null; return me(); },
    users: () => http.request("GET", "/api/users"),
  };
}
```

```js
// web/js/services/incidents.service.js — resident reports.
export function createIncidentsService(http) {
  const fix = (i) => ({ ...i, photo_url: http.url(i.photo_url) });
  return {
    async create({ lat, lon, kind = "", note = "", photo }) {
      const fd = new FormData();
      fd.append("lat", lat); fd.append("lon", lon); fd.append("kind", kind); fd.append("note", note);
      if (photo) fd.append("photo", photo);
      const r = await http.request("POST", "/api/incidents", { form: fd });
      return { ...r, incident: fix(r.incident) };
    },
    async mine() {
      const d = await http.request("GET", "/api/incidents?mine=true");
      return d.incidents.map(fix);
    },
  };
}
```

```js
// web/js/services/tasks.service.js — task lifecycle. Returns tasks with absolute photo URLs.
export function createTasksService(http) {
  const fixPhotos = (t) => ({ ...t,
    events: (t.events || []).map(e => ({ ...e, photo_url: http.url(e.photo_url) })),
    incidents: (t.incidents || []).map(i => ({ ...i, photo_url: http.url(i.photo_url) })) });
  const id = (x) => encodeURIComponent(x);
  return {
    list({ agencyId, status } = {}) {
      const q = new URLSearchParams();
      if (agencyId) q.set("agency_id", agencyId);
      if (status) q.set("status", status);
      return http.request("GET", "/api/tasks" + (q.size ? "?" + q : ""));
    },
    async get(tid) { return fixPhotos(await http.request("GET", `/api/tasks/${id(tid)}`)); },
    async accept(tid) { return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/accept`)); },
    async reject(tid, { reason, reassignTo }) {
      return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/reject`, { json: { reason, reassign_to: reassignTo || null } }));
    },
    async assign(tid, agencyId) { return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/assign`, { json: { agency_id: agencyId } })); },
    async complete(tid, { photo, note = "" }) {
      const fd = new FormData(); fd.append("photo", photo); fd.append("note", note);
      return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/complete`, { form: fd }));
    },
    async confirm(tid, { ok, note = "" }) { return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/confirm`, { json: { ok, note } })); },
  };
}
```

```js
// web/js/services/dashboard.service.js — public dashboard data and the coordinator's plan.
export function createDashboardService(http) {
  return {
    map: () => http.request("GET", "/api/map"),
    simulate: ({ rain, state = "current", atH }) =>
      http.request("POST", "/api/simulate", { json: { rain_mm_h: rain, drain_state: state, ...(atH == null ? {} : { at_h: atH }) } }),
    accountability: () => http.request("GET", "/api/accountability"),
    impact: () => http.request("GET", "/api/impact"),
    opportunities: () => http.request("GET", "/api/opportunities"),
    agencies: async () => (await http.request("GET", "/api/agencies")).agencies,
    generatePlan: (top = 5) => http.request("POST", `/api/plan/generate?top=${encodeURIComponent(top)}`),
  };
}
```

- [ ] **Step 5: Run** `node --test web/tests`. Expected: PASS.
- [ ] **Step 6: Commit** `[aarush] web: services over HttpPort, seed fixtures`

### Task 4: Router, composition root, other adapters (all screens still legacy)

**Files:**
- Create: `web/js/core/router.js`, `web/js/main.js`, `web/js/controllers/index.js`, `web/js/adapters/storage-local.js`, `adapters/geo-browser.js`, `adapters/toast-dom.js`, `adapters/map-leaflet.js`
- Modify: `web/index.html` (load `js/main.js` instead of `js/app.js`), `web/tests/architecture.test.js` (add `"controllers/index.js"` to `LEGACY`)
- Test: `web/tests/core.test.js` (router), `web/tests/adapters.test.js` (storage, geo)

**Interfaces:**
- Consumes: ports and services (Tasks 2-3).
- Produces: `parseHash(hash) → { name, params }`; `resolve(controllers, name, role) → { controller } | { redirect: true }`; `createRouter({ controllers, root, ctx, home, onChrome })` → `{ start(), refresh() }`; `legacy(path, roles, fn)`; `ctx` with `services`, `map`, `geo`, `toast`, `nav: { go(hash), refresh() }`.

- [ ] **Step 1: Failing tests for the pure router parts and adapters**

```js
// append to web/tests/core.test.js
import { parseHash, resolve } from "../js/core/router.js";
const C = [{ path: "login", roles: null }, { path: "dash", roles: null }, { path: "report", roles: ["resident", "admin"] }];
test("parseHash splits name and params", () => {
  assert.deepEqual(parseHash("#/task/12"), { name: "task", params: ["12"] });
  assert.deepEqual(parseHash(""), { name: "", params: [] });
});
test("resolve: public routes need no role; guarded routes need a listed role", () => {
  assert.equal(resolve(C, "dash", null).controller.path, "dash");
  assert.ok(resolve(C, "report", null).redirect);
  assert.ok(resolve(C, "report", "official").redirect);
  assert.equal(resolve(C, "report", "admin").controller.path, "report");
  assert.ok(resolve(C, "nope", "admin").redirect);
});
```

```js
// append to web/tests/adapters.test.js
import { createBrowserGeo } from "../js/adapters/geo-browser.js";
test("geo resolves coordinates with accuracy", async () => {
  const geo = createBrowserGeo({ getCurrentPosition: (ok) => ok({ coords: { latitude: 28.6, longitude: 77.2, accuracy: 12 } }) });
  assert.deepEqual(await geo.current(), { lat: 28.6, lon: 77.2, accuracy_m: 12 });
});
test("geo rejects with a readable message when denied or missing", async () => {
  await assert.rejects(createBrowserGeo({ getCurrentPosition: (_, fail) => fail({ code: 1 }) }).current(), /Could not get GPS/);
  await assert.rejects(createBrowserGeo(null).current(), /No GPS/);
});
```

- [ ] **Step 2: Run** `node --test web/tests`. Expected: FAIL.

- [ ] **Step 3: Implement the router**

```js
// web/js/core/router.js — hash router. parseHash/resolve are pure; createRouter touches window and the DOM.
export function parseHash(hash) {
  const [, name = "", ...params] = (hash || "#/").split("/");
  return { name, params };
}

export function resolve(controllers, name, role) {
  const c = controllers.find(x => x.path === name);
  if (!c || (c.roles && !c.roles.includes(role))) return { redirect: true };
  return { controller: c };
}

export function createRouter({ controllers, root, ctx, home, onChrome, errorHtml }) {
  let cleanup = null;
  async function render() {
    const { name, params } = parseHash(location.hash);
    const me = await ctx.services.session.me().catch(() => null);
    const hit = resolve(controllers, name, me ? me.role : null);
    const target = me ? home[me.role] : "#/login";
    if (hit.redirect && location.hash !== target) { location.hash = target; return; }
    const controller = hit.controller || controllers.find(c => c.path === "login");
    onChrome(me, location.hash);
    if (cleanup) { cleanup(); cleanup = null; }
    try { cleanup = (await controller.mount(root, ctx, params)) || null; }
    catch (e) { root.innerHTML = errorHtml(e); }
    root.focus();
  }
  return {
    start() { addEventListener("hashchange", render); return render(); },
    refresh: render,
  };
}

// Adapter for screens not yet migrated: wraps an old render(view, me, arg) function as a controller.
export function legacy(path, roles, fn) {
  return { path, roles, mount: async (root, ctx, params) => fn(root, await ctx.services.session.me(), params[0]) };
}
```

- [ ] **Step 4: Implement the remaining adapters**

```js
// web/js/adapters/storage-local.js — StoragePort over localStorage; survives blocked storage (private mode).
export function createLocalStorage(prefix = "rr_") {
  const ls = () => { try { return globalThis.localStorage; } catch { return null; } };
  return {
    get: (k) => { try { return ls()?.getItem(prefix + k) ?? ""; } catch { return ""; } },
    set: (k, v) => { try { ls()?.setItem(prefix + k, v); } catch { /* blocked */ } },
    remove: (k) => { try { ls()?.removeItem(prefix + k); } catch { /* blocked */ } },
  };
}
```

```js
// web/js/adapters/geo-browser.js — GeoPort over navigator.geolocation.
export function createBrowserGeo(geo = globalThis.navigator?.geolocation) {
  return {
    current: () => new Promise((resolve, reject) => {
      if (!geo) return reject(new Error("No GPS on this device. Tap the map instead."));
      geo.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy_m: p.coords.accuracy }),
        () => reject(new Error("Could not get GPS. Tap the map to move the pin.")),
        { enableHighAccuracy: true, timeout: 10000 });
    }),
  };
}
```

```js
// web/js/adapters/toast-dom.js — ToastPort over the #toast element.
export function createDomToast(el) {
  let timer;
  return { show(msg) { el.textContent = msg; el.hidden = false; clearTimeout(timer); timer = setTimeout(() => { el.hidden = true; }, 4000); } };
}
```

```js
// web/js/adapters/map-leaflet.js — MapPort over Leaflet. The ONLY file in web/ that touches L.
import { definePort, implement } from "../core/port.js";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MapView = definePort("MapViewPort", ["circle", "badge", "pin", "onClick", "view", "fit", "destroy"]);

export function createLeafletMap(L = globalThis.L) {
  return {
    available: () => !!L,
    create(el, { center, zoom = 16 } = {}) {
      const map = L.map(el);
      L.tileLayer(TILES, { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      if (center) map.setView(center, zoom);
      setTimeout(() => map.invalidateSize(), 100);
      let pin = null;
      return implement(MapView, {
        // radius in screen pixels so a pocket stays visible at any zoom (fixes B-1)
        circle([lat, lon], { color, radiusPx = 12, label, popup }) {
          const m = L.circleMarker([lat, lon], { radius: radiusPx, color, fillColor: color, fillOpacity: 0.45, weight: 3 }).addTo(map);
          if (label) m.bindTooltip(label, { permanent: true, direction: "right", className: "map-label" });
          if (popup) m.bindPopup(popup);
        },
        badge([lat, lon], { html, size = 28, popup }) {
          const m = L.marker([lat, lon], { icon: L.divIcon({ className: "", html, iconSize: [size, size] }) }).addTo(map);
          if (popup) m.bindPopup(popup);
        },
        pin([lat, lon]) { pin ? pin.setLatLng([lat, lon]) : (pin = L.marker([lat, lon]).addTo(map)); },
        onClick(fn) { map.on("click", e => fn(e.latlng.lat, e.latlng.lng)); },
        view([lat, lon], z = 17) { map.setView([lat, lon], z); },
        fit(points, maxZoom = 17) { if (points.length) map.fitBounds(points, { padding: [30, 30], maxZoom }); },
        destroy() { map.remove(); },
      });
    },
  };
}
```

(`MapViewPort` is defined in `ports/index.js` too; the adapter keeps its own copy because adapters may only import `core/`. Keep both lists identical; Task 12 adds a test that compares them.)

- [ ] **Step 5: Composition root and route table**

```js
// web/js/controllers/index.js — route table. Each entry is a Controller (PLAN.md 2.2); legacy() until migrated.
import { legacy } from "../core/router.js";
import { renderLogin } from "../login.js";
import { renderReport } from "../report.js";
import { renderMine, renderConfirm } from "../resident.js";
import { renderInbox, renderTask } from "../official.js";
import { renderAdmin } from "../admin.js";
import { renderDash } from "../dash.js";

export const CONTROLLERS = [
  legacy("login", null, (root) => renderLogin(root, () => location.reload())),   // reload: legacy login writes storage behind the session cache
  legacy("dash", null, (root, _me, tab) => renderDash(root, tab)),
  legacy("report", ["resident", "admin"], renderReport),
  legacy("mine", ["resident"], renderMine),
  legacy("confirm", ["resident"], renderConfirm),
  legacy("inbox", ["official"], renderInbox),
  legacy("task", ["official", "admin", "resident"], renderTask),
  legacy("admin", ["admin"], renderAdmin),
];
export const TABS = {
  resident: [["#/report", "Report"], ["#/mine", "My reports"], ["#/confirm", "Confirm"], ["#/dash", "Dashboard"]],
  official: [["#/inbox", "Inbox"], ["#/dash", "Dashboard"]],
  admin: [["#/admin", "Admin"], ["#/dash", "Dashboard"]],
};
export const HOME = { resident: "#/report", official: "#/inbox", admin: "#/admin" };
```

The legacy files sit in `js/` root, so `controllers/index.js` importing `../login.js` breaks the layer rule. That is expected: add `"controllers/index.js"` to `LEGACY` in `architecture.test.js` in this task, and remove it in Task 12 when the last legacy import goes.

```js
// web/js/main.js — composition root: the only file that picks implementations. Swap an adapter here.
import { implement } from "./core/port.js";
import { createRouter } from "./core/router.js";
import { HttpPort, StoragePort, GeoPort, MapPort, ToastPort } from "./ports/index.js";
import { createFetchHttp } from "./adapters/http-fetch.js";
import { createLocalStorage } from "./adapters/storage-local.js";
import { createBrowserGeo } from "./adapters/geo-browser.js";
import { createLeafletMap } from "./adapters/map-leaflet.js";
import { createDomToast } from "./adapters/toast-dom.js";
import { createSessionService } from "./services/session.service.js";
import { createIncidentsService } from "./services/incidents.service.js";
import { createTasksService } from "./services/tasks.service.js";
import { createDashboardService } from "./services/dashboard.service.js";
import { CONTROLLERS, TABS, HOME } from "./controllers/index.js";
import { esc } from "./ui/format.js";
import { errBox } from "./ui/components.js";

const $ = (s) => document.querySelector(s);
const storage = implement(StoragePort, createLocalStorage());
const http = implement(HttpPort, createFetchHttp({ base: window.API_BASE || "", getUserId: () => storage.get("user") }));
const session = createSessionService(http, storage);
const nav = { go: (hash) => { location.hash = hash; }, refresh: () => router.refresh() };
const ctx = Object.freeze({
  services: { session, incidents: createIncidentsService(http), tasks: createTasksService(http), dashboard: createDashboardService(http) },
  map: implement(MapPort, createLeafletMap()),
  geo: implement(GeoPort, createBrowserGeo()),
  toast: implement(ToastPort, createDomToast($("#toast"))),
  home: HOME,
  nav,
});

function drawChrome(me, hash) {
  $("#who").textContent = me ? me.name : "";
  $("#logout").hidden = !me;
  $("#tabs").innerHTML = me ? TABS[me.role].map(([h, t]) =>
    `<a href="${h}" class="${hash.startsWith(h) ? "on" : ""}">${esc(t)}</a>`).join("") : "";
}

const router = createRouter({ controllers: CONTROLLERS, root: $("#view"), ctx, home: HOME, onChrome: drawChrome, errorHtml: errBox });
$("#logout").addEventListener("click", () => { session.logout(); nav.go("#/login"); });
router.start();
```

`main.js` imports `ui/format.js` and `ui/components.js`, so run Task 6 before this task (execution order is in section 5).

- [ ] **Step 6: Point the page at the new root.** In `web/index.html`, replace `<script type="module" src="js/app.js"></script>` with `<script type="module" src="js/main.js"></script>`.
- [ ] **Step 7: Run** `node --test web/tests` (PASS) and the browser walk (section 4). Expected: every screen behaves as before.
- [ ] **Step 8: Commit** `[aarush] web: router, composition root, adapters; screens still legacy`

### Task 5: Session switching check

The legacy login writes `rr_user` through `api.js`, behind the session service's cache, so Task 4 makes it reload the page after a pick. This task proves switching and logout work before any screen migrates.

**Files:** none changed unless a check fails.

- [ ] **Step 1: Browser check:** log in as `res-1` → tabs Report / My reports / Confirm / Dashboard. Log out → login screen, no tabs, no "Log out". Log in as `off-mcd` → Inbox / Dashboard. Open `#/report` as `off-mcd` → redirected to `#/inbox`.
- [ ] **Step 2: Persona gone:** with `res-1` logged in, run `make reset` and restart the server, then reload. Expected: login screen (Review Focus 3).
- [ ] **Step 3:** No commit if nothing changed; otherwise `[aarush] web: session switching fixes`.

### Task 6: Shared UI kit and CSS fixes (B-2, B-5, B-8)

**Files:**
- Create: `web/js/ui/format.js`, `web/js/ui/components.js`, `web/js/ui/copy.js`
- Modify: `web/css/app.css`, `web/index.html`
- Test: `web/tests/views.test.js`

**Interfaces:**
- Produces: `esc(s)`, `hrs(h)` → "about X h" | "not available", `when(iso)`; `chip(status)`, `banner(text)`, `errBox(e)`, `photos(urls, alt)`, `guard(btn, fn, onError)`; `KINDS`, `FIELD_RULE`, `EVENT`, `LEVEL`, `ROLE`, `USE`, `BANNED`.

- [ ] **Step 1: Failing tests**

```js
// web/tests/views.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, hrs } from "../js/ui/format.js";
import { photos, guard } from "../js/ui/components.js";
import * as copy from "../js/ui/copy.js";

test("esc escapes HTML", () => assert.equal(esc(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;"));
test("hrs reads 'about X h' and handles null", () => {
  assert.equal(hrs(1.234), "about 1.2 h");
  assert.equal(hrs(12.6), "about 13 h");
  assert.equal(hrs(null), "not available");
});
test("photos drops empty URLs", () => assert.equal(photos(["", null], "x"), ""));
test("guard keeps the button disabled until the action settles (double tap sends once)", async () => {
  const btn = { disabled: false };
  let calls = 0, release;
  const p = guard(btn, () => { calls++; return new Promise(r => { release = r; }); }, () => {});
  assert.equal(btn.disabled, true);
  guard(btn, () => { calls++; }, () => {});          // second tap while disabled
  release(); await p;
  assert.equal(calls, 1);
  assert.equal(btn.disabled, false);
});
test("no banned word in any fixed UI string", () => {
  const strings = Object.values(copy).flatMap(v => typeof v === "string" ? [v] : v instanceof RegExp ? [] :
    Object.values(v).flatMap(x => Array.isArray(x) ? x.filter(s => typeof s === "string") : [x]));
  for (const s of strings) assert.doesNotMatch(String(s), copy.BANNED, s);
});
```

- [ ] **Step 2: Run** `node --test web/tests`. Expected: FAIL.

- [ ] **Step 3: Implement** (content moved from `util.js`, plus the double-tap guard)

```js
// web/js/ui/format.js — pure text helpers.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const hrs = (h) => h == null ? "not available" : "about " + (h < 10 ? Math.round(h * 10) / 10 : Math.round(h)) + " h";
export function when(iso) {
  try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso || ""; }
}
```

```js
// web/js/ui/components.js — pure HTML snippets plus guard() for buttons.
import { esc } from "./format.js";

export const chip = (status) => `<span class="chip ${esc(status)}">${esc(status)}</span>`;
export const banner = (t) => t ? `<p class="banner">${esc(t)}</p>` : "";
export const errBox = (e) => `<p class="err" role="alert">${esc(e && e.message || e)}</p>`;
export function photos(urls, alt) {
  const list = (urls || []).filter(Boolean);
  return list.length ? `<div class="photos">${list.map(u => `<img loading="lazy" src="${esc(u)}" alt="${esc(alt)}">`).join("")}</div>` : "";
}
// Runs fn once per tap: ignores taps while busy, re-enables after, reports errors to onError (usually ctx.toast.show).
export async function guard(btn, fn, onError) {
  if (btn.disabled) return;
  btn.disabled = true;
  try { return await fn(); } catch (e) { onError(e.message || String(e)); } finally { btn.disabled = false; }
}
```

```js
// web/js/ui/copy.js — fixed UI strings. Safety text mirrors core/copy.py; never generated.
export const BANNED = /\bsafe\b|guarantee|desilted|removed|cm deep/i;
export const FIELD_RULE = "Do not open manholes, enter drains, or go near drains during or after rain. Photograph from the footpath.";
export const KINDS = { blocked_drain: "Blocked drain", standing_water: "Standing water", overflow: "Drain overflowing", other: "Something else" };
export const ROLE = { resident: "Resident", official: "Official", admin: "Coordinator" };
export const EVENT = { created: "Task created", report_added: "Another report added", accepted: "Accepted", bounced: "Sent back: wrong owner",
  reassigned: "Reassigned", assigned: "Assigned", rejected: "Rejected", completed: "Marked done", confirmed: "Confirmed by a resident",
  disputed: "Disputed by a resident" };
export const LEVEL = { high: ["#b3261e", "High"], elevated: ["#d9822b", "Elevated"], watch: ["#c9b100", "Watch"], none: ["#6b7b88", "None"] };
export const USE = { store_reuse: "Store and reuse", detain: "Detain only", recharge: "Recharge", needs_data_or_tank: "Needs data" };
```

- [ ] **Step 4: CSS fixes** in `web/css/app.css`:

```css
[hidden]{display:none!important}                       /* B-2: a display rule must never beat the hidden attribute */
input[type=radio],input[type=checkbox]{min-height:auto;width:auto;padding:0;margin:0 8px 0 0;border:0}   /* B-5 */
label.opt{display:flex;align-items:center;font-weight:400;min-height:44px;margin:0}
.map-label{font-weight:700;font-size:.75rem}
```

and in `web/index.html` `<head>`: `<link rel="icon" href="data:,">` (B-8).

- [ ] **Step 5: Run** `node --test web/tests` (PASS). Browser: logged out, "Log out" is gone; simulator radios sit inline.
- [ ] **Step 6: Commit** `[aarush] web: ui kit (format, components, copy); fix hidden, radios, favicon`

### Task 7: Login and Report controllers (B-4)

**Files:**
- Create: `web/js/views/login.view.js`, `web/js/views/report.view.js`, `web/js/controllers/login.js`, `web/js/controllers/report.js`
- Modify: `web/js/controllers/index.js` (replace two legacy entries)
- Test: `web/tests/views.test.js`

**Interfaces:**
- Consumes: `ctx.services.session`, `ctx.services.incidents`, `ctx.geo`, `ctx.map`, `ctx.toast`, `ctx.nav`, `ctx.home`.
- Produces: `loginView({ users, note })`; `reportForm({ fieldRule, kinds })`; `reportResult(r)`; controllers `login`, `report`.

- [ ] **Step 1: Failing view tests**

```js
// append to web/tests/views.test.js
import { reportForm, reportResult } from "../js/views/report.view.js";
test("report form offers 'Not sure' first so the photo can be classified", () => {
  const html = reportForm({ fieldRule: "rule", kinds: copy.KINDS });
  assert.match(html, /<option value="">Not sure/);
});
test("report result shows the AI suggestion, labelled", () => {
  const html = reportResult({ message: "Linked.", linked_asset: "DR-RN-001", distance_m: 3, task_id: 4, task_created: true,
    field_rule: "rule", incident: { kind: "blocked_drain", ai: { kind: "blocked_drain", summary: "Grate covered in plastic." } } });
  assert.match(html, /Suggested from your photo/);
  assert.match(html, /Grate covered in plastic\./);
  assert.match(html, /#\/task\/4/);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Views**

```js
// web/js/views/report.view.js — report form and result card. Pure.
import { esc } from "../ui/format.js";

export function reportForm({ fieldRule, kinds }) {
  return `<h1>Report a problem</h1><p class="rule">${esc(fieldRule)}</p>
  <form id="f">
    <label for="photo">Photo (from the footpath)</label>
    <input id="photo" type="file" accept="image/*" capture="environment" hidden>
    <button type="button" id="cam" class="big primary">Take or choose a photo</button>
    <div id="prev" class="photos"></div>
    <label>Where is it?</label>
    <div class="row"><button type="button" id="gps">Use my location</button></div>
    <p class="small muted" id="coords"></p>
    <div id="mini" class="map mini"></div>
    <p class="small muted">Tap the map to move the pin.</p>
    <label for="kind">What do you see?</label>
    <select id="kind"><option value="">Not sure (the app suggests from the photo)</option>
      ${Object.entries(kinds).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select>
    <label for="note">Note (optional)</label>
    <textarea id="note" maxlength="500" placeholder="For example: leaves and plastic block the grate"></textarea>
    <button class="primary big" id="send" type="submit">Send report</button>
  </form><div id="out"></div>`;
}

export function reportResult(r) {
  const ai = r.incident && r.incident.ai;
  const task = r.task_id == null ? "<p>No task was created.</p>" : r.task_created
    ? "<p><strong>A new task was created</strong> for this drain.</p>"
    : "<p><strong>This drain already had a task.</strong> Your report was added to it.</p>";
  return `<div class="card"><h2>Report received</h2><p>${esc(r.message)}</p>
    ${ai ? `<p><strong>Suggested from your photo:</strong> ${esc(ai.summary)} <span class="small muted">(automatic; check it)</span></p>` : ""}
    ${r.linked_asset ? `<p>Linked drain: <strong>${esc(r.linked_asset)}</strong> (${esc(r.distance_m)} m away)</p>` : ""}
    ${task}${r.task_id ? `<p><a href="#/task/${esc(r.task_id)}">See the task</a></p>` : ""}
    <p class="rule">${esc(r.field_rule)}</p></div>`;
}
```

```js
// web/js/views/login.view.js — persona picker. Pure.
import { esc } from "../ui/format.js";
import { ROLE } from "../ui/copy.js";

export const loginView = ({ users, note }) => `<h1>Who are you?</h1><p class="banner">${esc(note)}</p>
  ${users.map(u => `<button class="card persona" data-id="${esc(u.id)}" style="width:100%;text-align:left">
    <strong>${esc(u.name)}</strong><br><span class="muted small">${esc(ROLE[u.role] || u.role)}${u.agency_id ? " - " + esc(u.agency_id.toUpperCase()) : ""}</span></button>`).join("")}
  <p><a class="btn" href="#/dash">Open the public dashboard</a></p>`;
```

- [ ] **Step 4: Controllers**

```js
// web/js/controllers/login.js
import { loginView } from "../views/login.view.js";

export const login = {
  path: "login", roles: null,
  async mount(root, ctx) {
    root.innerHTML = loginView(await ctx.services.session.users());
    root.querySelectorAll(".persona").forEach(b => b.addEventListener("click", async () => {
      const me = await ctx.services.session.login(b.dataset.id);
      ctx.nav.go(ctx.home[me.role]);
    }));
  },
};
```

```js
// web/js/controllers/report.js — resident report: photo, GPS or tapped pin, kind (or "not sure"), note.
import { reportForm, reportResult } from "../views/report.view.js";
import { KINDS, FIELD_RULE } from "../ui/copy.js";
import { errBox, guard } from "../ui/components.js";

const DEFAULT = [28.6433, 77.1846];       // Old Rajinder Nagar, the pilot ward

export const report = {
  path: "report", roles: ["resident", "admin"],
  async mount(root, ctx) {
    root.innerHTML = reportForm({ fieldRule: FIELD_RULE, kinds: KINDS });
    const $ = (s) => root.querySelector(s);
    let pos = DEFAULT.slice();
    const mapView = ctx.map.available() ? ctx.map.create($("#mini"), { center: pos, zoom: 16 }) : null;
    if (!mapView) $("#mini").hidden = true;
    const setPos = (lat, lon, fly) => {
      pos = [lat, lon];
      $("#coords").textContent = `Location: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      mapView?.pin(pos);
      if (fly) mapView?.view(pos, 17);
    };
    mapView?.onClick((lat, lon) => setPos(lat, lon));
    setPos(...pos);

    $("#cam").onclick = () => $("#photo").click();
    $("#photo").onchange = (e) => {
      const f = e.target.files[0];
      $("#prev").innerHTML = f ? `<img alt="Your photo" src="${URL.createObjectURL(f)}">` : "";
      $("#cam").textContent = f ? "Change photo" : "Take or choose a photo";
    };
    $("#gps").onclick = (ev) => guard(ev.target, async () => {
      try { const g = await ctx.geo.current(); setPos(g.lat, g.lon, true); }
      catch (e) { ctx.toast.show(e.message); }                       // pin stays where it was
    }, ctx.toast.show);
    $("#f").onsubmit = (ev) => {
      ev.preventDefault();
      const photo = $("#photo").files[0], kind = $("#kind").value;
      if (!photo && !kind) return ctx.toast.show("Add a photo, or pick what you see.");
      guard($("#send"), async () => {
        try {
          const r = await ctx.services.incidents.create({ lat: pos[0], lon: pos[1], kind, note: $("#note").value, photo });
          $("#out").innerHTML = reportResult(r);
          $("#f").reset(); $("#prev").innerHTML = "";
          $("#out").scrollIntoView();
        } catch (e) {
          $("#out").innerHTML = e.status === 422 && !kind ? errBox("We could not tell from the photo. Please pick what you see.") : errBox(e);
        }
      }, ctx.toast.show);
    };
    return () => mapView?.destroy();
  },
};
```

- [ ] **Step 5:** In `controllers/index.js` import `{ login }` and `{ report }` and replace the two legacy entries.
- [ ] **Step 6: Run** `node --test web/tests` (PASS) and the browser walk: report with a photo and "Not sure" in `TRIAGE_MODE=manual` shows the 422 hint; with a kind it links to DR-RN-001.
- [ ] **Step 7: Commit** `[aarush] web: login and report controllers; 'Not sure' lets Bedrock classify`

### Task 8: Resident controllers (My reports, Confirm)

**Files:**
- Create: `web/js/views/resident.view.js`, `web/js/controllers/resident.js`
- Modify: `web/js/controllers/index.js`
- Test: `web/tests/views.test.js`

**Interfaces:**
- Consumes: `ctx.services.incidents.mine()`, `ctx.services.tasks.list({status:"done"})`, `tasks.get(id)`, `tasks.confirm(id, {ok, note})`.
- Produces: `mineView(incidents)`, `confirmCard(task)`; controllers `mine`, `confirm`.

- [ ] **Step 1: Failing tests**

```js
// append to web/tests/views.test.js
import { mineView, confirmCard } from "../js/views/resident.view.js";
test("mine shows an empty state with a link to report", () => assert.match(mineView([]), /#\/report/));
test("confirm card shows before and after photos and both answers", () => {
  const t = { id: 2, asset_name: "Drain", agency_name: "MCD", pocket_name: "Saucer",
    incidents: [{ kind: "blocked_drain", note: "plastic", photo_url: "https://h/media/b.png" }],
    events: [{ event: "completed", note: "cleared", photo_url: "https://h/media/a.png" }] };
  const html = confirmCard(t);
  assert.match(html, /media\/b\.png/); assert.match(html, /media\/a\.png/);
  assert.match(html, /Looks fixed/); assert.match(html, /Still a problem/);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Views**

```js
// web/js/views/resident.view.js — resident screens. Pure. Photo URLs arrive absolute from services.
import { esc, when } from "../ui/format.js";
import { photos } from "../ui/components.js";
import { KINDS, FIELD_RULE } from "../ui/copy.js";

export const mineView = (incidents) => `<h1>My reports</h1>` + (incidents.length ? incidents.map(i => `<div class="card">
    <strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="muted small">${esc(when(i.created_at))}</span>
    ${i.note ? `<p>${esc(i.note)}</p>` : ""}${photos([i.photo_url], "Your photo")}
    <p class="small">${i.asset_id ? `Drain ${esc(i.asset_id)}` : "No drain linked"}
    ${i.task_id ? ` - <a href="#/task/${esc(i.task_id)}">Task ${esc(i.task_id)}</a>` : ""}</p></div>`).join("")
  : `<p class="muted">You have not sent any reports yet.</p><a class="btn primary" href="#/report">Report a problem</a>`);

export const confirmIntro = () => `<h1>Check finished work</h1>
  <p class="muted">Officials say these jobs are done. Look from the footpath, then tell us what you see.</p>
  <p class="rule">${esc(FIELD_RULE)}</p><div id="list"></div>`;

export function confirmCard(t) {
  const done = [...(t.events || [])].reverse().find(e => e.event === "completed");
  return `<div class="card" data-task="${esc(t.id)}"><h3>${esc(t.asset_name)}</h3>
    <p class="small muted">${esc(t.agency_name)} - ${esc(t.pocket_name || "")}</p>
    <h3>Before (resident reports)</h3>${photos(t.incidents.map(i => i.photo_url), "Before")}
    <ul>${t.incidents.map(i => `<li>${esc(KINDS[i.kind] || i.kind)}${i.note ? ": " + esc(i.note) : ""}</li>`).join("")}</ul>
    <h3>After (from the official)</h3>${photos([done && done.photo_url], "After")}
    ${done && done.note ? `<p>${esc(done.note)}</p>` : ""}
    <label>Note (optional)</label><textarea maxlength="300"></textarea>
    <div class="row"><button class="primary" data-ok="1">Looks fixed</button><button data-ok="0">Still a problem</button></div>
    <div class="msg"></div></div>`;
}
```

- [ ] **Step 4: Controllers**

```js
// web/js/controllers/resident.js
import { mineView, confirmIntro, confirmCard } from "../views/resident.view.js";
import { errBox, guard } from "../ui/components.js";

export const mine = {
  path: "mine", roles: ["resident"],
  async mount(root, ctx) { root.innerHTML = mineView(await ctx.services.incidents.mine()); },
};

export const confirm = {
  path: "confirm", roles: ["resident"],
  async mount(root, ctx) {
    const { tasks } = await ctx.services.tasks.list({ status: "done" });
    const full = await Promise.all(tasks.map(t => ctx.services.tasks.get(t.id)));
    root.innerHTML = confirmIntro();
    const list = root.querySelector("#list");
    list.innerHTML = full.length ? full.map(confirmCard).join("") : `<p class="muted">Nothing to check right now.</p>`;
    list.querySelectorAll("[data-task]").forEach(card => card.querySelectorAll("button").forEach(b => b.onclick = () => guard(b, async () => {
      try {
        await ctx.services.tasks.confirm(card.dataset.task, { ok: b.dataset.ok === "1", note: card.querySelector("textarea").value });
        ctx.toast.show("Thank you. Your answer is recorded."); card.remove();
      } catch (e) {
        card.querySelector(".msg").innerHTML = e.status === 403
          ? `<p class="err">You cannot check this one: ${e.message}. Another resident will need to.</p>` : errBox(e);
      }
    }, ctx.toast.show)));
  },
};
```

- [ ] **Step 5:** Replace the `mine` and `confirm` legacy entries. **Run** tests and the browser walk (confirm as `res-2` → toast, card disappears).
- [ ] **Step 6: Commit** `[aarush] web: resident controllers`

### Task 9: Official controllers (Inbox, Task) (B-6, B-7, B-10)

**Files:**
- Create: `web/js/views/official.view.js`, `web/js/controllers/official.js`
- Modify: `web/js/controllers/index.js`
- Test: `web/tests/views.test.js`

**Interfaces:**
- Consumes: `tasks.list({agencyId})`, `tasks.get/accept/reject/assign/complete`, `dashboard.agencies()`, `ctx.nav.refresh()`.
- Produces: `taskCard(t)`, `inboxView({tasks, banner})`, `taskDetail(t, {banner, back})`, `openActions({agencies, current})`, `acceptedActions({agencies, current})`, `assignActions({agencies})`, `waitingActions()`; controllers `inbox`, `task`. Only an official of the owning agency or an admin sees actions; an admin on a no-owner task gets the assign control.

- [ ] **Step 1: Failing tests**

```js
// append to web/tests/views.test.js
import { taskDetail, openActions, acceptedActions, assignActions } from "../js/views/official.view.js";
const T = { id: 5, status: "open", agency_id: "mcd", agency_name: "MCD", asset_name: "Drain", pocket_name: "Saucer", gain_h: 1.2,
  owner_source: "placeholder", due_at: null, overdue: false, incidents: [], events: [] };
test("task page carries the scenario banner next to the gain number", () => {
  assert.match(taskDetail(T, { banner: "Scenario, not a forecast." }), /class="banner">Scenario, not a forecast\./);
});
test("reassign select lists agencies except the current owner", () => {
  const html = openActions({ agencies: [{ id: "mcd", name: "MCD" }, { id: "pwd", name: "PWD" }], current: "mcd" });
  assert.match(html, /value="pwd"/); assert.doesNotMatch(html, /value="mcd"/);
});
test("accepted tasks can still be sent back as 'Not ours'", () => {
  assert.match(acceptedActions({ agencies: [{ id: "pwd", name: "PWD" }], current: "mcd" }), /Not ours/);
});
test("a no-owner task offers the admin an assign control", () => {
  assert.match(assignActions({ agencies: [{ id: "pwd", name: "PWD" }] }), /id="assign"/);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Views**

```js
// web/js/views/official.view.js — inbox and task page. Pure.
import { esc, hrs, when } from "../ui/format.js";
import { chip, banner, photos } from "../ui/components.js";
import { KINDS, FIELD_RULE, EVENT } from "../ui/copy.js";

const overdue = (t) => t.overdue ? '<span class="chip overdue">overdue</span>' : "";

export const taskCard = (t) => `<a class="card tasklink" href="#/task/${esc(t.id)}">
  <div>${chip(t.status)} ${overdue(t)} <span class="muted small">rank ${esc(Math.round(t.rank_score * 10) / 10)}</span></div>
  <h3>${esc(t.asset_name)}</h3>
  <p class="small muted">${esc(t.agency_name)} - ${esc(t.pocket_name || "no pocket")} - ${esc(t.report_count)} report(s)</p>
  <p class="small">Cleaning this gains ${esc(hrs(t.gain_h))} of fill time (scenario).</p></a>`;

export const inboxView = ({ tasks, banner: b }) => `<h1>Inbox</h1>${banner(b)}` +
  (tasks.length ? tasks.map(taskCard).join("") : `<p class="muted">No tasks for your agency right now.</p>`);

export const taskDetail = (t, { banner: b, back }) => `<p><a href="${esc(back)}">Back</a></p>
  <h1>${esc(t.asset_name)}</h1><div>${chip(t.status)} ${overdue(t)}</div>
  <p>Owner: <strong>${esc(t.agency_name)}</strong>${t.owner_source ? `<br><span class="small muted">Source: ${esc(t.owner_source)}</span>` : ""}</p>
  ${banner(b)}<p>${esc(t.pocket_name || "")} - cleaning this gains ${esc(hrs(t.gain_h))} of fill time.</p>
  ${t.due_at ? `<p class="small muted">Due ${esc(when(t.due_at))}</p>` : ""}
  <p class="rule">${esc(FIELD_RULE)}</p><div id="actions"></div>
  <h2>Reports (${t.incidents.length})</h2>
  ${t.incidents.map(i => `<div class="card"><strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="small muted">${esc(when(i.created_at))}</span>
    ${i.note ? `<p>${esc(i.note)}</p>` : ""}${photos([i.photo_url], "Report photo")}</div>`).join("")}
  <h2>History</h2><ul class="tl">${t.events.map(e => `<li><strong>${esc(EVENT[e.event] || e.event)}</strong>
    <span class="small muted">${esc(when(e.at))} - ${esc(e.actor_name)}${e.agency_id ? " - " + esc(e.agency_id.toUpperCase()) : ""}</span>
    ${e.note ? `<br>${esc(e.note)}` : ""}${photos([e.photo_url], "Photo")}</li>`).join("")}</ul>`;

const options = (agencies, current) => agencies.filter(a => a.id !== current)
  .map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");
const notOurs = (agencies, current) => `<h3 class="gap">Not ours?</h3>
  <label for="why">Reason</label><input type="text" id="why" placeholder="For example: this drain belongs to PWD">
  <label for="to">Send to</label><select id="to"><option value="">No other agency (reject)</option>${options(agencies, current)}</select>
  <p><button id="rej" class="wide">Not ours</button></p>`;

export const openActions = ({ agencies, current }) =>
  `<div class="card"><button class="primary big" id="acc">Accept this task</button>${notOurs(agencies, current)}</div>`;
export const acceptedActions = ({ agencies, current }) => `<form class="card" id="done"><h3>Mark as done</h3>
  <p class="small muted">Photograph the finished work from the footpath.</p>
  <input type="file" id="ph" accept="image/*" capture="environment">
  <label for="nt">Note</label><textarea id="nt" maxlength="300"></textarea>
  <button class="primary big" type="submit">Submit with after-photo</button></form>
  <div class="card">${notOurs(agencies, current)}</div>`;
export const assignActions = ({ agencies }) => `<div class="card"><p class="banner">No owner found for this drain.</p>
  <label for="ag">Assign to</label><select id="ag">${options(agencies, null)}</select>
  <p><button class="primary wide" id="assign">Assign</button></p></div>`;
export const waitingActions = () => `<p class="banner">Waiting for a resident to check the work.</p>`;
```

Add to `app.css`: `.tasklink{display:block;text-decoration:none;color:inherit}.wide{width:100%}.gap{margin-top:14px}`.

- [ ] **Step 4: Controllers**

```js
// web/js/controllers/official.js — inbox and the task page with role-aware actions.
import { inboxView, taskDetail, openActions, acceptedActions, assignActions, waitingActions } from "../views/official.view.js";
import { guard } from "../ui/components.js";

const BACK = { official: "#/inbox", admin: "#/admin", resident: "#/mine" };

export const inbox = {
  path: "inbox", roles: ["official"],
  async mount(root, ctx) {
    const me = await ctx.services.session.me();
    root.innerHTML = inboxView(await ctx.services.tasks.list({ agencyId: me.agency_id }));
  },
};

export const task = {
  path: "task", roles: ["official", "admin", "resident"],
  async mount(root, ctx, [id]) {
    const [me, t, banner] = await Promise.all([ctx.services.session.me(), ctx.services.tasks.get(id),
      ctx.services.tasks.list({ status: "__none__" }).then(d => d.banner).catch(() => "")]);
    root.innerHTML = taskDetail(t, { banner, back: BACK[me.role] });
    const box = root.querySelector("#actions");
    const isAdmin = me.role === "admin";
    const canAct = isAdmin || (me.role === "official" && me.agency_id === t.agency_id);
    if (!canAct) return;
    const agencies = await ctx.services.dashboard.agencies();
    const act = (btn, fn, msg) => guard(btn, async () => { await fn(); ctx.toast.show(msg); ctx.nav.refresh(); }, ctx.toast.show);

    if (t.status === "open" && !t.agency_id) {
      box.innerHTML = assignActions({ agencies });
      box.querySelector("#assign").addEventListener("click", e =>
        act(e.target, () => ctx.services.tasks.assign(t.id, box.querySelector("#ag").value), "Assigned."));
      return;
    }
    if (t.status === "open") box.innerHTML = openActions({ agencies, current: t.agency_id });
    else if (t.status === "accepted") box.innerHTML = acceptedActions({ agencies, current: t.agency_id });
    else if (t.status === "done") { box.innerHTML = waitingActions(); return; }
    else return;

    box.querySelector("#acc")?.addEventListener("click", e => act(e.target, () => ctx.services.tasks.accept(t.id), "Accepted."));
    box.querySelector("#rej").addEventListener("click", e => {
      const reason = box.querySelector("#why").value.trim();
      if (!reason) return ctx.toast.show("Please give a short reason.");
      act(e.target, () => ctx.services.tasks.reject(t.id, { reason, reassignTo: box.querySelector("#to").value }), "Sent back.");
    });
    box.querySelector("#done")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const photo = box.querySelector("#ph").files[0];
      if (!photo) return ctx.toast.show("An after-photo is required.");
      act(ev.submitter || box.querySelector("#done button"), () => ctx.services.tasks.complete(t.id, { photo, note: box.querySelector("#nt").value }),
        "Marked done. A resident will check it.");
    });
  },
};
```

The task page needs the scenario banner text. `GET /api/tasks/{id}` does not return it; `GET /api/tasks?status=__none__` returns an empty list plus the banner. That is a workaround: ask Ujjwal to add `banner` to the task detail response (section 7, item 1) and switch to `t.banner` when it lands.

- [ ] **Step 5:** Replace the `inbox` and `task` legacy entries. **Run** tests, then the browser: `off-mcd` accepts, then bounces an accepted task to PWD; `admin-1` assigns the no-owner task from its task page.
- [ ] **Step 6: Commit** `[aarush] web: official controllers; agencies select, Not ours when accepted, admin assign, banner`

### Task 10: Admin controller (B-3)

**Files:**
- Create: `web/js/views/admin.view.js`, `web/js/controllers/admin.js`
- Modify: `web/js/controllers/index.js`
- Test: `web/tests/views.test.js`

**Interfaces:**
- Consumes: `tasks.list({agencyId:"none"})`, `dashboard.agencies()`, `dashboard.generatePlan(5)`, `tasks.assign`.
- Produces: `adminView({ tasks, agencies, banner, result })`; controller `admin`.

- [ ] **Step 1: Failing test**

```js
// append to web/tests/views.test.js
import { adminView } from "../js/views/admin.view.js";
test("admin view lists no-owner tasks with an assign control and shows the last plan result", () => {
  const html = adminView({ banner: "b", result: "Created 4 task(s): 2, 3, 4, 5.",
    agencies: [{ id: "pwd", name: "PWD" }], tasks: [{ id: 5, status: "open", asset_name: "Inlet", owner_source: "disputed" }] });
  assert.match(html, /Tasks with no owner \(1\)/);
  assert.match(html, /data-task="5"/);
  assert.match(html, /Created 4 task\(s\)/);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: View and controller**

```js
// web/js/views/admin.view.js — coordinator screen. Pure.
import { esc } from "../ui/format.js";
import { chip, banner } from "../ui/components.js";

export const adminView = ({ tasks, agencies, banner: b, result = "" }) => `<h1>Coordinator</h1>${banner(b)}
  <div class="card"><h2>Ranked plan</h2><p class="small muted">Creates tasks for the top drains by fill time gained, if they have no live task.</p>
    <button class="primary big" id="gen">Generate ranked plan</button><p id="res">${esc(result)}</p></div>
  <h2>Tasks with no owner (${tasks.length})</h2>
  ${tasks.length ? tasks.map(t => `<div class="card" data-task="${esc(t.id)}">${chip(t.status)}
    <h3><a href="#/task/${esc(t.id)}">${esc(t.asset_name)}</a></h3><p class="small muted">${esc(t.owner_source || "")}</p>
    <label>Assign to</label><div class="row"><select>${agencies.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("")}</select>
    <button class="primary">Assign</button></div></div>`).join("") : `<p class="muted">Every task has an owner.</p>`}`;
```

```js
// web/js/controllers/admin.js — re-renders after every action so the no-owner list is never stale (B-3).
import { adminView } from "../views/admin.view.js";
import { guard } from "../ui/components.js";

export const admin = {
  path: "admin", roles: ["admin"],
  async mount(root, ctx) {
    const { tasks, dashboard } = ctx.services;
    const agencies = await dashboard.agencies();
    const draw = async (result) => {
      const d = await tasks.list({ agencyId: "none" });
      root.innerHTML = adminView({ tasks: d.tasks, agencies, banner: d.banner, result });
      root.querySelector("#gen").onclick = (e) => guard(e.target, async () => {
        const r = await dashboard.generatePlan(5);
        await draw(r.created_task_ids.length ? `Created ${r.created_task_ids.length} task(s): ${r.created_task_ids.join(", ")}.` : "No new tasks were needed.");
      }, ctx.toast.show);
      root.querySelectorAll("[data-task]").forEach(c => c.querySelector("button").onclick = (e) => guard(e.target, async () => {
        await tasks.assign(c.dataset.task, c.querySelector("select").value);
        ctx.toast.show("Assigned."); await draw(result);
      }, ctx.toast.show));
    };
    await draw("");
  },
};
```

- [ ] **Step 4:** Replace the `admin` legacy entry. **Run** tests; browser on a fresh DB: Generate → "Tasks with no owner (1)" appears without a reload.
- [ ] **Step 5: Commit** `[aarush] web: admin controller re-renders after plan and assign`

### Task 11: Dashboard controllers (B-1, B-9)

**Files:**
- Create: `web/js/views/dash.view.js`, `web/js/views/sim.view.js`, `web/js/controllers/dash.js`, `web/js/controllers/dashmap.js`, `web/js/controllers/sim.js`
- Modify: `web/js/controllers/index.js`
- Test: `web/tests/views.test.js` (uses `fixtures/*.json`)

**Interfaces:**
- Consumes: `dashboard.map/accountability/impact/simulate/opportunities`, `ctx.map`.
- Produces: `dashShell(tab)`, `mapLegend(d)`, `pocketPopup(p)`, `assetPopup(a)`, `taskPopup(t, rank)`, `accountabilityView(d)`, `impactView(d)`, `captureView(d)`, `simControls()`, `simResults(d)`; controller `dash` (one route, sub-tab in `params[0]`) delegating to `mapPane(pane, ctx)`, `simPane(pane, ctx)`.

- [ ] **Step 1: Failing tests on real fixtures**

```js
// append to web/tests/views.test.js
import { readFileSync } from "node:fs";
import { accountabilityView, impactView, captureView, mapLegend } from "../js/views/dash.view.js";
import { simResults } from "../js/views/sim.view.js";
const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)));

test("every dashboard view renders seed data without banned words", () => {
  const html = [accountabilityView(fx("accountability")), impactView(fx("impact")), captureView(fx("opportunities")),
    mapLegend(fx("map")), simResults(fx("simulate"))].join("");
  assert.doesNotMatch(html, copy.BANNED);
});
test("accountability shows the No owner found row", () => assert.match(accountabilityView(fx("accountability")), /No owner found/));
test("simulator results carry a text level on every pocket, never colour alone", () => {
  const d = fx("simulate");
  const html = simResults(d);
  for (const p of d.results) assert.match(html, new RegExp(copy.LEVEL[p.level][1]));
  assert.match(html, /class="banner"/);
});
test("capture shows the rule id and the experimental banner", () => {
  const html = captureView(fx("opportunities"));
  assert.match(html, /R2/); assert.match(html, /Experimental/);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Views** (logic moved from `dashmore.js`; `simResults` now includes the banner so it can never be dropped)

```js
// web/js/views/dash.view.js — dashboard shell and the read-only tabs. Pure.
import { esc, hrs } from "../ui/format.js";
import { banner } from "../ui/components.js";
import { LEVEL, USE } from "../ui/copy.js";

export const TAB_TITLES = { map: "Map", accountability: "Who is responsible", impact: "Impact", simulator: "Simulator", capture: "Rain capture" };
const STATUS = ["open", "accepted", "done", "confirmed", "disputed", "rejected"];

export const dashShell = (tab) => `<h1>Dashboard</h1><nav class="sub" aria-label="Dashboard sections">${Object.entries(TAB_TITLES)
  .map(([k, t]) => `<a href="#/dash/${k}" class="${k === tab ? "on" : ""}">${esc(t)}</a>`).join("")}</nav>
  <div id="pane">Loading...</div><p class="small muted"><a href="#/login">Switch persona</a></p>`;

export const mapLegend = (d) => `${banner(d.banner)}<div id="m" class="map tall"></div>
  <p class="small">Pockets at ${esc(d.reference_rain_mm_h)} mm/h: ${Object.values(LEVEL).map(([, l]) => `<strong>${esc(l)}</strong>`).join(" &middot; ")}
  (each pocket is labelled on the map).<br>Squares: drains (red = No owner found). Numbered markers: open tasks by rank.</p>`;
export const pocketPopup = (p) => `<strong>${esc(p.name)}</strong><br>Level: <strong>${esc(LEVEL[p.level][1])}</strong>
  <br>Time to fill: ${esc(hrs(p.time_to_fill_h))}<br>Assets exposed: ${esc(p.exposed_assets)}
  <br><span class="small">${esc(p.data_source)}, confidence ${esc(p.confidence)}</span>`;
export const taskPopup = (t, rank) => `<strong>Task ${esc(t.id)}</strong> (${esc(t.status)})<br>Rank ${esc(rank)}
  <br><a href="#/task/${esc(t.id)}">Open task</a>`;
export const assetPopup = (a) => `<strong>${esc(a.name)}</strong><br>Owner: ${esc(a.agency_name)}
  <br><span class="small">Source: ${esc(a.owner_source || "none")}</span><br>Last cleaning confirmed: ${esc(a.last_confirmed_clean || "never recorded")}`;

export const accountabilityView = (d) => `<p class="muted small">${esc(d.note)}</p>` + d.agencies.map(a => {
  const max = Math.max(1, ...d.agencies.map(x => x.assets_owned));
  return `<div class="card ${a.agency_id ? "" : "hl"}"><h3>${esc(a.agency_name)}</h3>
  <p>Assets owned: <strong>${esc(a.assets_owned)}</strong></p>
  <div class="bar ${a.agency_id ? "" : "bad"}" aria-hidden="true"><i style="width:${Math.round(100 * a.assets_owned / max)}%"></i></div>
  <p class="small">${STATUS.map(s => `${s}: <strong>${esc(a.tasks[s] || 0)}</strong>`).join(" &middot; ")}</p>
  <p class="small">Overdue: <strong>${esc(a.overdue)}</strong> &middot; Bounced away: <strong>${esc(a.bounced_away)}</strong><br>
  Median time to accept: ${esc(hrs(a.median_hours_to_accept))} &middot; to complete: ${esc(hrs(a.median_hours_to_complete))}</p></div>`;
}).join("");

const big = (n, l) => `<div class="card"><div class="big-num">${esc(n)}</div><div class="small">${esc(l)}</div></div>`;
export const impactView = (d) => `${banner(d.banner)}<div class="grid">
  ${big(d.ownership.with_owner + " of " + d.ownership.assets, "drains with a named owner")}
  ${big(d.ownership.no_owner_found, "drains with No owner found")}
  ${big(d.reports, "resident reports")}
  ${big(d.exposed_assets_in_pockets, "assets inside " + d.pockets + " low-point pockets (placeholder counts)")}
  ${big(hrs(d.fill_time_gained_h), "fill time gained by confirmed work")}</div>
  <p class="small muted">${esc(d.fill_time_gained_note)}</p>
  <h2>Tasks</h2><div class="grid">${STATUS.map(s => big(d.tasks[s] ?? 0, s)).join("")}</div>
  <h2>Rain capture, cubic metres per year</h2><div class="grid">${Object.entries(d.capture_m3_per_year_by_use).map(([k, v]) => big(v, USE[k] || k)).join("")}</div>
  <p class="small muted">Not claimed: ${esc(d.not_claimed)}</p>`;

export const captureView = (d) => banner(d.banner) + d.sites.map(s => `<div class="card"><h3>${esc(s.name)}</h3>
  <p><strong>${esc(USE[s.use] || s.use)}</strong> <span class="chip">${esc(s.rule_id)}</span></p>
  <p>${esc(s.reason)}</p><p>About <strong>${esc(s.annual_m3)}</strong> m&sup3; per year from the roof</p>
  ${s.structure ? `<p class="small">Structure: ${Object.entries(s.structure).map(([k, v]) => `${esc(k.replace(/_/g, " "))} ${esc(v)}`).join(", ")}</p>` : ""}
  ${(s.warnings || []).map(w => `<p class="banner">${esc(w)}</p>`).join("")}
  <p class="small muted">Data: ${esc(s.data_source)}</p></div>`).join("");
```

```js
// web/js/views/sim.view.js — simulator controls and results. Pure.
import { esc, hrs } from "../ui/format.js";
import { banner } from "../ui/components.js";
import { LEVEL } from "../ui/copy.js";

const STATES = [["clean", "All cleaned"], ["silted", "All silted"], ["current", "As they are now"]];

export const simControls = (rain = 35, state = "current") => `<div class="card">
  <label for="rain">Rain: <strong id="rv">${esc(rain)}</strong> mm/h</label>
  <input id="rain" type="range" min="0" max="120" step="5" value="${esc(rain)}" class="wide">
  <fieldset class="plain"><legend><strong>Drains</strong></legend>
  ${STATES.map(([v, t]) => `<label class="opt"><input type="radio" name="st" value="${v}" ${v === state ? "checked" : ""}> ${esc(t)}</label>`).join("")}
  </fieldset></div><div id="res"></div>`;

export const simResults = (d) => `${banner(d.banner)}<p class="small muted">Fill level shown at ${esc(d.scenario.at_h ?? 1)} h of rain.</p>` +
  d.results.map(p => `<div class="card"><strong>${p.fill_order ? esc(p.fill_order) + ". " : ""}${esc(p.name)}</strong>
    <span class="lvl ${esc(p.level)}"> ${esc(LEVEL[p.level][1])}</span>
    <p>${p.time_to_fill_h == null ? "Does not fill in this scenario." : "Fills in " + esc(hrs(p.time_to_fill_h))}</p>
    <div class="bar" aria-hidden="true"><i style="width:${Math.min(100, p.fill_pct_at)}%"></i></div>
    <p class="small muted">${esc(Math.round(p.fill_pct_at))}% full${p.spills_to ? ` - spills toward ${esc(p.spills_to)}` : ""}</p></div>`).join("");
```

Add to `app.css`: `.map.tall{height:420px}fieldset.plain{border:0;padding:0;margin:8px 0}`.

- [ ] **Step 4: Controllers**

```js
// web/js/controllers/dashmap.js — map pane: pockets as labelled pixel-radius circles (B-1), drains, ranked tasks.
import { mapLegend, pocketPopup, assetPopup, taskPopup } from "../views/dash.view.js";
import { LEVEL } from "../ui/copy.js";

export async function mapPane(pane, ctx) {
  const d = await ctx.services.dashboard.map();
  pane.innerHTML = mapLegend(d);
  if (!ctx.map.available()) { pane.querySelector("#m").textContent = "The map library could not load."; return null; }
  const view = ctx.map.create(pane.querySelector("#m"));
  const pts = [];
  d.pockets.forEach(p => {
    const [color, label] = LEVEL[p.level] || LEVEL.none;
    view.circle([p.lat, p.lon], { color, radiusPx: 14, label: `${p.name}: ${label}`, popup: pocketPopup(p) });
    pts.push([p.lat, p.lon]);
  });
  d.assets.forEach(a => {
    view.badge([a.lat, a.lon], { size: 14, popup: assetPopup(a),
      html: `<div class="drain ${a.agency_id ? "" : "noowner"}" title="${a.agency_id ? "Drain" : "Drain, no owner found"}"></div>` });
    pts.push([a.lat, a.lon]);
  });
  d.tasks.slice().sort((x, y) => y.rank_score - x.rank_score).forEach((t, i) =>
    view.badge([t.lat + 0.00012, t.lon + 0.00012], { size: 28, html: `<div class="rank">${i + 1}</div>`,
      popup: taskPopup(t, i + 1) }));
  view.fit(pts);
  return () => view.destroy();
}
```

```js
// web/js/controllers/sim.js — simulator pane. Shows errors instead of swallowing them (B-9); ignores stale responses.
import { simControls, simResults } from "../views/sim.view.js";
import { errBox } from "../ui/components.js";

export async function simPane(pane, ctx) {
  pane.innerHTML = simControls();
  const res = pane.querySelector("#res");
  let seq = 0;
  const run = async () => {
    const my = ++seq, rain = +pane.querySelector("#rain").value;
    pane.querySelector("#rv").textContent = rain;
    try {
      const d = await ctx.services.dashboard.simulate({ rain, state: pane.querySelector("[name=st]:checked").value });
      if (my === seq) res.innerHTML = simResults(d);
    } catch (e) { if (my === seq) res.innerHTML = errBox(e); }
  };
  pane.querySelector("#rain").oninput = run;
  pane.querySelectorAll("[name=st]").forEach(r => { r.onchange = run; });
  await run();
}
```

```js
// web/js/controllers/dash.js — public dashboard; one route, sub-tab in params[0].
import { dashShell, TAB_TITLES, accountabilityView, impactView, captureView } from "../views/dash.view.js";
import { errBox } from "../ui/components.js";
import { mapPane } from "./dashmap.js";
import { simPane } from "./sim.js";

const PANES = {
  map: mapPane,
  simulator: simPane,
  accountability: async (pane, ctx) => { pane.innerHTML = accountabilityView(await ctx.services.dashboard.accountability()); },
  impact: async (pane, ctx) => { pane.innerHTML = impactView(await ctx.services.dashboard.impact()); },
  capture: async (pane, ctx) => { pane.innerHTML = captureView(await ctx.services.dashboard.opportunities()); },
};

export const dash = {
  path: "dash", roles: null,
  async mount(root, ctx, [tab]) {
    const t = TAB_TITLES[tab] ? tab : "map";
    root.innerHTML = dashShell(t);
    const pane = root.querySelector("#pane");
    try { return (await PANES[t](pane, ctx)) || undefined; } catch (e) { pane.innerHTML = errBox(e); }
  },
};
```

Add to `app.css`: `.drain{width:14px;height:14px;background:#0b5cad;border:2px solid #fff}.drain.noowner{background:#b3261e}`, `.rank{width:28px;height:28px;border-radius:50%;background:#fff;color:#16202a;border:3px solid #b3261e;text-align:center;line-height:22px;font-weight:700}`.

- [ ] **Step 5:** Replace the `dash` legacy entry. **Run** tests. Browser: the map shows five labelled pocket circles at the fit zoom; after a confirmation, "Rajinder Nagar saucer" changes from High to Elevated.
- [ ] **Step 6: Commit** `[aarush] web: dashboard controllers; visible labelled pockets; simulator shows errors`

### Task 12: Delete legacy, final guard, end-to-end walk

**Files:**
- Delete: `web/js/api.js`, `util.js`, `app.js`, `login.js`, `report.js`, `resident.js`, `official.js`, `admin.js`, `dash.js`, `dashmap.js`, `dashmore.js`
- Modify: `web/js/controllers/index.js` (import real controllers only), `web/tests/architecture.test.js` (empty `LEGACY`), `CLAUDE.md` rule 3 already names `adapters/http-fetch.js`
- Create: `web/tests/e2e/walk.mjs` (copy of the V1 walk script, kept for the stranger test and the video run)
- Test: add a ports-parity test

- [ ] **Step 1:** `controllers/index.js` final form:

```js
// web/js/controllers/index.js — route table: every entry is a Controller (PLAN.md 2.2).
import { login } from "./login.js";
import { report } from "./report.js";
import { mine, confirm } from "./resident.js";
import { inbox, task } from "./official.js";
import { admin } from "./admin.js";
import { dash } from "./dash.js";

export const CONTROLLERS = [login, dash, report, mine, confirm, inbox, task, admin];
export const TABS = {
  resident: [["#/report", "Report"], ["#/mine", "My reports"], ["#/confirm", "Confirm"], ["#/dash", "Dashboard"]],
  official: [["#/inbox", "Inbox"], ["#/dash", "Dashboard"]],
  admin: [["#/admin", "Admin"], ["#/dash", "Dashboard"]],
};
export const HOME = { resident: "#/report", official: "#/inbox", admin: "#/admin" };
```

- [ ] **Step 2:** Ports parity test, appended to `web/tests/core.test.js`:

```js
import { readFileSync } from "node:fs";
import { MapViewPort } from "../js/ports/index.js";
test("map adapter's MapViewPort copy matches ports/index.js", () => {
  const src = readFileSync(new URL("../js/adapters/map-leaflet.js", import.meta.url), "utf8");
  for (const m of MapViewPort.methods) assert.match(src, new RegExp(`"${m}"`));
});
```

- [ ] **Step 3: Run** `node --test web/tests` and `make test`. Expected: PASS, with `LEGACY` empty.
- [ ] **Step 4: End-to-end walk** (section 4). Expected: all screenshots match the done-whens of V2-V5 in `TASKS.md`.
- [ ] **Step 5: Commit** `[aarush] web: remove legacy modules; architecture guard covers all of web/js`

---

## 4. How to verify a task

1. `node --test web/tests` from `rain-ready/` (unit, views, architecture).
2. `make test` (backend; must stay green, though this plan touches no backend file).
3. Browser walk on a fresh DB: `make reset`, `make run`, then either click through at 390 px width or run the Playwright walk: `node web/tests/e2e/walk.mjs http://localhost:8010` (needs `npm i -D playwright` in a scratch folder and `PW_CHROME` pointing at a Chromium binary; the script writes screenshots and a log of console errors and 4xx/5xx responses).
4. Done means: tests green, zero console errors, zero unexpected 4xx/5xx in the walk log, and the task's own browser check passes.

## 5. Execution order and timing

| Order | Task | V-task | Estimate |
|---|---|---|---|
| 1 | Task 1 + Task 2 (one commit) | V1 foundation | 30 min |
| 2 | Task 3 services + fixtures | — | 30 min |
| 3 | Task 6 UI kit + CSS fixes | V5b (B-2, B-5, B-8) | 25 min |
| 4 | Task 4 router + main.js | — | 40 min |
| 5 | Task 5 login refresh | — | 10 min |
| 6 | Task 7 login + report | V2 (B-4) | 40 min |
| 7 | Task 8 resident | V4 | 30 min |
| 8 | Task 9 official | V3 (B-6, B-7) | 50 min |
| 9 | Task 10 admin | V5 (B-3) | 20 min |
| 10 | Task 11 dashboard | V5b (B-1, B-9) | 50 min |
| 11 | Task 12 cleanup + e2e | V6 prep | 25 min |

About 6 hours. If time runs short, stop after any task: the app works at every step. Cut order: Task 12's legacy deletion (keep legacy files, harmless) → Task 10 → Task 8. Never cut Task 6's CSS fixes or Task 11's map fix: both are visible in the video.

## 6. Good-to-haves after the plan (V7)

Each is one new adapter or service function plus a view, so none touches existing screens:

| Item (SCOPE 4.x) | Where it plugs in |
|---|---|
| Offline report queue | new `adapters/http-queue.js` wrapping `HttpPort`; chosen in `main.js` |
| Client-side photo shrink | new `adapters/image-canvas.js` behind an `ImagePort { shrink(file) }`, called by the report controller |
| Native camera and GPS in the APK | `adapters/geo-capacitor.js` (and later a `PhotoPort`), selected in `main.js` when `window.Capacitor` exists |
| Per-report timeline | `views/resident.view.js` + `tasks.get` (no new endpoint) |
| Filter by agency/status, CSV export | `views/dash.view.js` + a pure `toCsv(rows)` in `ui/format.js` |

## 7. Backend items for Ujjwal (his files; send as the B5 list)

1. Add `banner` to `GET /api/tasks/{id}` (Task 9 uses a workaround until then).
2. Add `asset_name` and `last_confirmed_clean` to `/api/map` tasks.
3. Enforce "a **different** resident confirms" (block the reporter of the task, not only `done_by`); today the `done_by` check can never trigger.
4. Seed tuning so "As they are now" is not all High at 35 mm/h, and move the out-of-ward demo underpass so it does not rank #1.
5. Add `node --test web/tests` to the root `.github/workflows/test.yml` and a `make test-web` target.
6. `docs/DEPLOY.md`: APK build needs the Android SDK and JDK 17.
7. Same layering on the backend: routers = controllers, `app/service.py` = application services, `core/` = pure functions, `app/storage.py` and `ai/triage.py` = adapters picked by config. A `typing.Protocol` for `PhotoStore` and `Triage` would make that swap point explicit.
8. **Photos do not open on the live server (blocks the video).** `app/storage.py` `presigned()` signs URLs for the global host `<bucket>.s3.amazonaws.com`. A new ap-south-1 bucket answers there with `TemporaryRedirect`, and the redirected request fails with 403 because the signature is for the other host. Fix, tested with the live bucket (returns 200 image/png):
   `boto3.client("s3", region_name=config.AWS_REGION, endpoint_url=f"https://s3.{config.AWS_REGION}.amazonaws.com", config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}))`. Use the same client in `save_photo()` and `app/checks.py`.
9. `scripts/bootstrap-ec2.sh`: the latest Compose plugin needs buildx 0.17 or later ("compose build requires buildx 0.17.0 or later"). Install `docker-buildx` into `/usr/local/lib/docker/cli-plugins` too, or pin the Compose version. On the live server it was installed by hand (buildx v0.38.0).
10. Deploy playbook step B8: `git archive --format=tar HEAD:rain-ready` must run from the repo root. Run from `rain-ready/` it sends an empty archive without an error.

### Live deployment (9 Oct 2026, Aarush's AWS account, ap-south-1)
- URL: https://15-207-177-122.sslip.io (Caddy HTTPS). `/api/health?deep=1` returns `ok: true`, `storage: s3`, `aws: {s3: ok}`, `triage: manual`.
- EC2 `i-02d1bc6b65cbad783` (t3.small, AL2023), Elastic IP 15.207.177.122, bucket `rainready-photos-896128818776`, role and instance profile `rainready-ec2`, first AMI `ami-0a18e29223db65238`, hourly DB backup to `s3://<bucket>/backup/` by cron.
- Redeploy: from the repo root, `git archive --format=tar HEAD:rain-ready | ssh -i rain-ready/rainready.pem ec2-user@15.207.177.122 'tar -x -C bharatbuilds/rain-ready'`, then `ssh ... 'cd bharatbuilds/rain-ready && docker compose up -d --build'`. The server `.env` and `var/` are kept. Aarush shares the SSH key privately.
- Bedrock is not on yet (model access pending). One test report (id 1, outside the ward) is in the DB; clear it before recording.
