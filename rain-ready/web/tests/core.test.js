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
