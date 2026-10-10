// web/tests/v12-messages.test.js — V12 server messages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { confirm } from "../js/controllers/resident.js";
import { photoError } from "../js/ui/components.js";
import { ApiError } from "../js/core/errors.js";

// ---- V12
test("V12: photoError uses the server's detail, and keeps the kind hint for the kind-required 422", () => {
  const bad = new ApiError("the photo could not be read as an image; please take it again", 422);
  assert.match(photoError(bad, ""), /could not be read as an image; please take it again/);
  assert.match(photoError(bad, "blocked_drain"), /could not be read as an image/);
  const kind = new ApiError("kind is required (one of a, b) when the photo could not be classified", 422);
  assert.match(photoError(kind, ""), /pick what you see/);
  assert.match(photoError(new ApiError("down", 500), ""), /down/);
});
test("V12: confirm screen shows the server's 403 text as it is", async () => {
  const card = { dataset: { task: "3" }, _b: [], remove() {}, querySelector: (s) => s === "textarea" ? { value: "" } : msg };
  const msg = { innerHTML: "" };
  const btn = { dataset: { ok: "1" }, disabled: false }; card.querySelectorAll = () => [btn];
  const list = { innerHTML: "", querySelectorAll: () => [card] };
  const root = { innerHTML: "", querySelector: () => list };
  const ctx = { toast: { show() {} }, services: { tasks: { list: async () => ({ tasks: [{ id: 3 }] }), get: async () => ({ id: 3, asset_name: "D", incidents: [], events: [] }),
    confirm: async () => { throw new ApiError("you reported this problem, so someone else has to check the fix", 403); } } } };
  await confirm.mount(root, ctx);
  await btn.onclick();
  assert.match(msg.innerHTML, /you reported this problem, so someone else has to check the fix/);
  assert.doesNotMatch(msg.innerHTML, /You cannot check this one/);
});
