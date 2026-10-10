// web/tests/views-glass.test.js — views carry the glass classes; list items stagger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { mineView, confirmList } from "../js/views/resident.view.js";
import { actionRows } from "../js/views/actions.view.js";
import { heldView } from "../js/views/held.view.js";
import { inboxView } from "../js/views/official.view.js";

const dir = new URL("../js/views/", import.meta.url);
test("no view renders a bare card: every class=\"card gets glass", () => {
  for (const f of readdirSync(dir)) assert.doesNotMatch(readFileSync(new URL(f, dir), "utf8"), /class="card(?![^"]*\bglass\b)/, f);
});
const inc = (n) => ({ id: n, kind: "blocked_drain", created_at: "2026-10-09T10:00:00Z", note: "", flags: [], asset_id: "DR-1", task_id: n });
test("mineView staggers items and caps --i at 7", () => {
  const h = mineView(Array.from({ length: 12 }, (_, i) => inc(i + 1)));
  assert.match(h, /class="card glass rise" style="--i:0"/); assert.match(h, /style="--i:7"/); assert.doesNotMatch(h, /--i:8/);
  assert.equal((h.match(/class="card glass rise"/g) || []).length, 12);
});
test("confirmList, held, actions and inbox items stagger", () => {
  const t = (id) => ({ id, asset_name: "A", agency_name: "MCD", incidents: [], events: [] });
  assert.match(confirmList([t(1), t(2)]), /class="card glass rise" style="--i:1" data-task="2"/);
  const held = heldView({ items: [{ id: 1, flags: [] }, { id: 2, flags: [] }], canReview: false });
  assert.match(held, /class="card glass rise" style="--i:1" data-inc="2"/);
  const a = { asset_name: "D", type: "clean", text: "x", route: { agency_name: "MCD", why: "y" }, gain_h_high: 0, evidence: [] };
  assert.match(actionRows({ actions: [a, a] }), /class="card glass rise" style="--i:1"/);
  assert.match(inboxView({ tasks: [{ id: 1, status: "open", asset_name: "A", incidents: [] }, { id: 2, status: "open", asset_name: "B", incidents: [] }] }, {}), /class="card glass rise tasklink" style="--i:1"/);
});
