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
