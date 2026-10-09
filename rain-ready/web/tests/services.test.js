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
test("incidents.create sends accuracy_m only when it is a number", async () => {
  const http = createFakeHttp({ "POST /api/incidents": { incident: {} } });
  const svc = createIncidentsService(http);
  await svc.create({ lat: 1, lon: 2, kind: "x", accuracy_m: 12.5 });
  await svc.create({ lat: 1, lon: 2, kind: "x" });
  await svc.create({ lat: 1, lon: 2, kind: "x", accuracy_m: undefined });
  assert.equal(http.calls[0].form.get("accuracy_m"), "12.5");
  assert.equal(http.calls[1].form.has("accuracy_m"), false);
  assert.equal(http.calls[2].form.has("accuracy_m"), false);
});
