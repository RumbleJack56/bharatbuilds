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
