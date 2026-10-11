// web/tests/inbox-phone.test.js — phone inbox: summary counts, filters, task cards, task page structure, held queue look.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inboxCounts, filterTasks, showing, inboxView, inboxList, taskCard, taskDetail, openActions, disputedActions, acceptedActions, FILTERS }
  from "../js/views/official.view.js";
import { heldView } from "../js/views/held.view.js";
import { inbox } from "../js/controllers/official.js";
import { held } from "../js/controllers/held.js";
import { BANNED, FIELD_RULE } from "../js/ui/copy.js";

const web = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const T = (id, status, o = {}) => ({ id, status, asset_name: "Drain " + id, agency_id: "mcd", agency_name: "MCD (Municipal Corporation of Delhi)",
  pocket_name: "Low point", report_count: 2, rank_score: 2.5 - id / 10, gain_h: 1.5, overdue: false, due_at: "2026-10-18T10:00:00+00:00", ...o });
const TASKS = [T(1, "confirmed"), T(2, "open"), T(3, "accepted", { overdue: true }), T(4, "disputed"), T(5, "done"), T(6, "open", { overdue: true })];
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("inboxCounts derives every status, overdue and need-action from the list alone", () => {
  const c = inboxCounts(TASKS);
  assert.deepEqual([c.all, c.open, c.accepted, c.disputed, c.done, c.confirmed, c.rejected, c.overdue, c.action], [6, 2, 1, 1, 1, 1, 0, 2, 4]);
  assert.deepEqual(inboxCounts([]), { all: 0, overdue: 0, open: 0, accepted: 0, disputed: 0, done: 0, confirmed: 0, rejected: 0, action: 0 });
});
test("filterTasks: by status, overdue, all; next steps first with overdue on top; input untouched", () => {
  const ids = (f) => filterTasks(TASKS, f).map(t => t.id);
  assert.deepEqual(ids("all"), [3, 6, 2, 4, 5, 1]);           // overdue next steps, other next steps (server order), waiting, closed
  assert.deepEqual(ids("open"), [6, 2]); assert.deepEqual(ids("overdue"), [3, 6]); assert.deepEqual(ids("disputed"), [4]);
  assert.deepEqual(ids("rejected"), []); assert.deepEqual(ids("nonsense"), ids("all"));
  assert.deepEqual(TASKS.map(t => t.id), [1, 2, 3, 4, 5, 6]);
  assert.equal(showing(TASKS, "open"), "Open: 2 tasks"); assert.equal(showing(TASKS, "disputed"), "Disputed: 1 task");
  assert.equal(showing(TASKS, "bogus"), "All: 6 tasks");
});
test("inbox: summary hero, one toggle chip per filter with its count, the scenario banner, the list", () => {
  const h = inboxView({ tasks: TASKS, banner: "Scenario, not a forecast." }, { 4: "Still full" }, "overdue");
  assert.match(h, /<p class="eyebrow">MCD<\/p><h1>Inbox<\/h1>/);
  assert.match(text(h), /4 Need action 2 Overdue 1 Waiting check/);
  assert.equal((h.match(/class="ibx-filter"/g) || []).length, FILTERS.length);
  assert.match(h, /data-filter="overdue" aria-pressed="true">Overdue <span class="n">2<\/span>/);
  assert.equal((h.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(h, /role="group" aria-label="Show tasks"/); assert.match(h, /class="banner">Scenario, not a forecast\./);
  assert.match(h, /role="status">Overdue: 2 tasks</);
  assert.equal((h.match(/href="#\/task\//g) || []).length, 2);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /undefined|NaN/);
});
test("inbox: an empty filter offers Show all; an empty inbox has no chips", () => {
  assert.match(inboxList([], {}), /No tasks match this filter\.[\s\S]*data-filter="all">Show all tasks/);
  const e = inboxView({ tasks: [], banner: "" });
  assert.doesNotMatch(e, /ibx-filter|ibx-stats/); assert.match(e, /No tasks for your agency right now\./);
});
test("task card: status word, rank badge, icon meta row, overdue emphasis, quoted dispute note, scenario gain line", () => {
  const c = taskCard(T(3, "accepted", { overdue: true }));
  assert.match(c, /<span class="chip accepted">accepted<\/span><span class="chip overdue">overdue<\/span><span class="ibx-rank">rank 2\.2<\/span>/);
  assert.match(c, /data-overdue/); assert.match(c, /<h3>Drain 3<\/h3>/);
  for (const [i, t] of [["landmark", "MCD"], ["map-pin", "Low point"], ["camera", "2 reports"], ["shield-alert", "Due "]])
    assert.match(c, new RegExp(`#i-${i}"/></svg><span>${t}`), i);
  assert.match(c, /Cleaning this gains about 1\.5 h of fill time \(scenario\)\./);
  assert.doesNotMatch(taskCard(T(2, "open")), /data-overdue|shield-alert/);
  assert.match(taskCard(T(2, "open", { report_count: 1 })), /<span>1 report<\/span>/);
  assert.match(taskCard(T(4, "disputed"), "Still full"), /<blockquote class="quote"><strong>Resident's note:<\/strong> Still full<\/blockquote>/);
  assert.doesNotMatch(taskCard(T(4, "disputed")), /Due /);                                  // no due line once the work is done
  assert.doesNotMatch(taskCard({ ...T(2, "open"), rank_score: undefined }), /ibx-rank|NaN/);
});
test("every sprite icon the inbox, task page and held views use exists in the sprite", () => {
  const sprite = web("img/icons.svg");
  const h = inboxView({ tasks: TASKS, banner: "" }) + taskDetail({ ...T(3, "accepted", { overdue: true }), incidents: [], events: [] }, { banner: "", back: "#/inbox" })
    + acceptedActions({ agencies: [], current: "mcd" }) + heldView({ items: [{ id: 1, asset_id: "DR-1", kind: "blocked_drain", flags: [] }], canReview: true });
  for (const [, id] of h.matchAll(/icons\.svg\?v=\w+#i-([\w-]+)/g)) assert.match(sprite, new RegExp(`<symbol id="i-${id}"`), id);
});
test("task page: header card with stepper, rule before the actions, ids and fixed strings kept", () => {
  const t = { ...T(3, "accepted", { overdue: true }), owner_source: "x".repeat(120), incidents: [], events: [{ event: "created", at: "2026-10-09T10:00:00Z", actor_name: "R" }] };
  const h = taskDetail(t, { banner: "Scenario, not a forecast.", back: "#/inbox" });
  assert.match(h, /class="card glass tk-head"[\s\S]*<ol class="stepper"[\s\S]*<\/section>/);
  assert.match(h, /<details class="tk-src"><summary>Source of this owner<\/summary>/);
  assert.match(h, /Overdue\. Due /);
  assert.ok(h.indexOf(FIELD_RULE) < h.indexOf('id="actions"') && h.indexOf('id="actions"') < h.indexOf("Scenario, not a forecast."));
  assert.match(h, /<ol class="tl2"><li data-ev="created">/);
  assert.doesNotMatch(taskDetail({ ...t, status: "disputed", overdue: false }, { banner: "", back: "#/x" }), /tk-due/);
  assert.match(taskDetail({ ...t, owner_source: "placeholder" }, { banner: "", back: "#/x" }), /<p class="tk-src">Source: placeholder<\/p>/);
});
test("actions: primary in a dock, Not ours folded in a details, after-photo form keeps its ids", () => {
  const o = openActions({ agencies: [{ id: "pwd", name: "PWD" }], current: "mcd" });
  assert.match(o, /<div class="tk-dock"><button class="primary big" id="acc">Accept this task<\/button><\/div>/);
  assert.match(o, /<details class="card glass tk-notours"><summary>[\s\S]*Not ours\?[\s\S]*id="why"[\s\S]*id="to"[\s\S]*id="rej"[\s\S]*<\/details>/);
  assert.match(disputedActions(), /tk-dock[\s\S]*id="acc">Accept to redo/);
  const a = acceptedActions({ agencies: [], current: "mcd" });
  for (const id of ["done", "ph", "camnote", "prev", "nt"]) assert.match(a, new RegExp(`id="${id}"`), id);
  assert.match(a, /<details class="card glass tk-notours">/);
});
test("held: hero with the count, a held chip in words, the note as a quote, review buttons stacked", () => {
  const h = heldView({ items: [{ id: 5, asset_id: "DR-1", kind: "blocked_drain", note: "full", flags: [] }], places: { "DR-1": "Pusa Road" }, canReview: true });
  assert.match(h, /class="ibx-hero"[\s\S]*<h1>Held reports <span class="hld-n">1<\/span><\/h1>/);
  assert.match(h, /<span class="chip held">held for a check<\/span>/); assert.match(h, /<blockquote class="quote">full<\/blockquote>/);
  assert.match(h, /class="hld-acts"[\s\S]*data-act="release"[\s\S]*data-act="reject"/);
  assert.match(heldView({ items: [], canReview: true, result: { text: "Released.", taskId: 9 } }), /class="banner hld-result" role="status" tabindex="-1"/);
});
test("inbox.css: only scoped selectors, 44 px chips, pressed chips filled", () => {
  const css = web("css/inbox.css");
  assert.match(css, /\.ibx \.ibx-filter\{[^}]*min-height:44px/);
  assert.match(css, /\.ibx \.ibx-filter\[aria-pressed=true\][^{]*\{[^}]*background:var\(--accent-fill\)/);
  assert.match(css, /\.tk-dock\{position:sticky;bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)/);
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media[^{]*\{/g, "");
  for (const [, sel] of rules.matchAll(/(?:^|\})\s*([^{}]+)\{/g)) for (const s of sel.split(","))
    assert.match(s.trim(), /^(\.ibx|\.tk|\.hld|\.tl2|details\.tk-src)/, s.trim());
});

// fake DOM for the filter wiring: buttons, list, status line, focus
function inboxRoot() {
  const btn = (f) => ({ dataset: { filter: f }, attrs: {}, focused: false, setAttribute(k, v) { this.attrs[k] = v; }, focus() { this.focused = true; },
    classList: { contains: (c) => c === "ibx-filter" } });
  const chips = FILTERS.map(([k]) => btn(k)), status = { textContent: "" }, list = { innerHTML: "" };
  const box = { handler: null, addEventListener(_, f) { this.handler = f; }, querySelectorAll: () => chips,
    querySelector: (s) => s === ".ibx-showing" ? status : chips.find(c => c.attrs["aria-pressed"] === "true") };
  const root = { innerHTML: "", querySelector: (s) => s === ".ibx" ? box : s === "#ibx-list" ? list : null };
  return { root, box, chips, status, list };
}
test("inbox controller: a chip redraws only the list, presses one chip, updates the status line; Show all refocuses All", async () => {
  const { root, box, chips, status, list } = inboxRoot();
  const tasks = { list: async () => ({ tasks: TASKS.map(t => t.status === "disputed" ? { ...t, dispute_note: "Still full" } : t), banner: "" }),
    get: async () => { throw new Error("no detail call when the list carries the note"); } };
  await inbox.mount(root, { services: { session: { me: async () => ({ agency_id: "mcd" }) }, tasks } });
  assert.match(root.innerHTML, /Still full/);
  const disputed = chips.find(c => c.dataset.filter === "disputed");
  box.handler({ target: { closest: () => disputed } });
  assert.equal(disputed.attrs["aria-pressed"], "true"); assert.equal(chips.filter(c => c.attrs["aria-pressed"] === "true").length, 1);
  assert.equal(status.textContent, "Disputed: 1 task"); assert.match(list.innerHTML, /Drain 4/); assert.doesNotMatch(list.innerHTML, /Drain 2/);
  const all = { dataset: { filter: "all" }, classList: { contains: () => false } };
  box.handler({ target: { closest: () => all } });
  assert.ok(chips.find(c => c.dataset.filter === "all").focused); assert.equal(status.textContent, "All: 6 tasks");
  box.handler({ target: { closest: () => null } });                                          // a tap outside a chip changes nothing
  assert.equal(status.textContent, "All: 6 tasks");
});
test("held controller: after a decision, focus moves to the outcome line", async () => {
  let focused = 0; const result = { focus() { focused++; } }, btns = {};
  const card = { dataset: { inc: "5" }, querySelector: (s) => s === "textarea" ? { value: "" } : btns[s] };
  btns['[data-act="release"]'] = { disabled: false }; btns['[data-act="reject"]'] = { disabled: false };
  let list = [{ id: 5, asset_id: "DR-1", kind: "blocked_drain", flags: [] }];
  const root = { innerHTML: "", querySelector: (s) => s === ".hld-result" ? result : null, querySelectorAll: () => root.innerHTML.includes("data-inc") ? [card] : [] };
  const ctx = { toast: { show() {} }, services: { session: { me: async () => ({ role: "admin" }) }, dashboard: { map: async () => ({ assets: [] }) },
    incidents: { held: async () => list, review: async () => { list = []; return { task_id: 9 }; } } } };
  await held.mount(root, ctx);
  assert.equal(focused, 0);
  await btns['[data-act="release"]'].onclick({ target: btns['[data-act="release"]'] });
  assert.equal(focused, 1); assert.match(root.innerHTML, /#\/task\/9/);
});

import { parseColor, over, ratio, tokens } from "./contrast-lib.js";
test("contrast: the hero, chips, tiles and tinted buttons these screens add meet 4.5:1", () => {
  const k = tokens(web("css/tokens.css")), c = (n) => parseColor(k[n]), white = [255, 255, 255];
  const mix = (a, p, b) => a.map((v, i) => v * p + b[i] * (1 - p));                           // color-mix(in srgb, a p%, b)
  const glow = (bg) => over([255, 255, 255, 0.06], bg), tile = (bg) => over([255, 255, 255, 0.1], bg);   // hero glow, stat tile
  const pairs = {
    "hero text": [white, c("accent")], "stat tile on the glow": [white, tile(glow(c("accent")))], "overdue tile": [c("high"), c("s1")],
    "pressed chip": [white, c("accent-fill")], "pressed count": [c("accent"), c("s1")], "count badge": [c("fg-muted"), c("s2")],
    "camera button": [c("accent"), mix(c("accent-fill"), 0.14, c("s1"))], "held time": [c("fg-muted"), c("s1")],
    "held chip": [c("elev"), mix(c("elev"), 0.16, c("s1"))], "waiting note": [c("fg"), mix(c("info"), 0.08, c("s1"))],
    "no owner": [c("err-ink"), c("err-bg")], "overdue meta": [c("high"), c("s1")],
  };
  for (const [name, [fg, bg]] of Object.entries(pairs)) assert.ok(ratio(fg, bg) >= 4.5, `${name}: ${ratio(fg, bg).toFixed(2)}`);
});
