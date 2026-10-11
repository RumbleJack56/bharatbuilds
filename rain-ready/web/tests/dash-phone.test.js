// web/tests/dash-phone.test.js — phone dashboard: one tab strip, centred active chip, compact status pills, icon tiles, timeline, owners row.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dashShell, tabStrip, centerOffset, statusCounts, accountabilityView, impactView, TAB_TITLES, MORE_VIEWS, TAB_ICONS } from "../js/views/dash.view.js";
import { homeView, TILES, EVENT_TONE } from "../js/views/home.view.js";
import { actionRows } from "../js/views/actions.view.js";
import { simResults } from "../js/views/sim.view.js";
import { showActiveTab } from "../js/controllers/dash.js";
import { insightsPane } from "../js/controllers/insights.js";
import { homeShell, AREA } from "../js/views/home.view.js";
import { BANNED } from "../js/ui/copy.js";

const web = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const sprite = web("img/icons.svg"), css = web("css/dash.css");

test("tab strip: Overview, seven tabs, three related pages; only the active tab is marked", () => {
  const h = tabStrip("impact");
  assert.match(h, /^<nav class="dtabs" aria-label="Dashboard sections">/);
  assert.match(h, /href="#\/dash" class="dtab">Overview</);
  assert.equal((h.match(/href="#\/dash\//g) || []).length, Object.keys(TAB_TITLES).length);
  assert.equal((h.match(/aria-current="page"/g) || []).length, 1);
  assert.match(h, /href="#\/dash\/impact" class="dtab on" aria-current="page">Impact</);
  for (const [href, label] of MORE_VIEWS) assert.match(h, new RegExp(`href="${href}" class="dtab more">${label}<svg`));
  assert.ok(h.indexOf("dtab-sep") > h.indexOf("#/dash/insights") && h.indexOf("dtab-sep") < h.indexOf("#/projection"));
});
test("shell: the tab title is the page heading, one nav (no second wrapping row), the pane and the persona link", () => {
  const h = dashShell("accountability");
  assert.match(h, /<h1>Who is responsible<\/h1>/); assert.equal((h.match(/<nav /g) || []).length, 1);
  assert.doesNotMatch(h, /class="sub"/); assert.match(h, /id="pane"/); assert.match(h, /class="back" href="#\/login"/);
});
test("centerOffset centres the chip and stays inside the scroll range", () => {
  assert.equal(centerOffset(390, 500, 90, 1400), 350);
  assert.equal(centerOffset(390, 16, 98, 1400), 0);           // first chip: no negative scroll
  assert.equal(centerOffset(390, 1300, 100, 1400), 1010);     // last chip: clamp to scrollWidth - clientWidth
  assert.equal(centerOffset(728, 300, 80, 700), 0);           // nothing to scroll on a wide screen
});
test("showActiveTab scrolls the strip to the active chip and ignores a missing strip", () => {
  const strip = { clientWidth: 390, scrollWidth: 1400, scrollLeft: 0, querySelector: () => ({ offsetLeft: 500, offsetWidth: 90 }) };
  showActiveTab(strip); assert.equal(strip.scrollLeft, 350);
  assert.doesNotThrow(() => showActiveTab(null));
  const none = { scrollLeft: 7, querySelector: () => null }; showActiveTab(none); assert.equal(none.scrollLeft, 7);
});
test("status pills: every status in words, zeros marked so they can be muted", () => {
  const h = statusCounts({ open: 2, confirmed: 1 }, true);
  assert.match(h, /^<ul class="st-row">/);
  for (const s of ["open", "accepted", "done", "confirmed", "disputed", "rejected"]) assert.match(h, new RegExp(`<span>${s}</span>`));
  assert.match(h, /class="st open"><strong>2</); assert.match(h, /class="st accepted zero"><strong>0</);
  assert.match(statusCounts({}), /^<ul class="st-grid">/);
  assert.match(accountabilityView({ note: "n", agencies: [{ agency_id: null, agency_name: "No owner found", assets_owned: 1, tasks: {}, overdue: 0, bounced_away: 0 }] }),
    /class="card glass hl"[\s\S]*No owner found[\s\S]*1<\/strong> <span class="small">drain owned[\s\S]*class="st-row"[\s\S]*<dt>Median time to accept<\/dt><dd>not available/);
});
test("impact keeps the placeholder and scenario labels next to their numbers", () => {
  const h = impactView({ ownership: { assets: 9, with_owner: 6, no_owner_found: 3 }, tasks: {}, reports: 6, fill_time_gained_h: 13, fill_time_gained_note: "Scenario at 25 mm/h.",
    pockets: 6, exposed_assets_in_pockets: 15, capture_m3_per_year_by_use: {}, banner: "Scenario, not a forecast.", not_claimed: "x" });
  assert.match(h, /class="banner">Scenario, not a forecast\./); assert.match(h, /placeholder counts/);
  assert.match(h, /about 13 h<\/p><p class="stat-l">fill time gained by confirmed work<\/p><p class="small muted">Scenario at 25 mm\/h\./);
  assert.match(h, /style="width:67%"/); assert.match(h, /class="card glass stat warn"><p class="stat-n">3</);
});
test("home tiles: every tab and related page, each with a sprite icon that exists", () => {
  const h = homeView({ actions: [], owners: [] });
  assert.equal(TILES.length, Object.keys(TAB_TITLES).length + MORE_VIEWS.length);
  for (const [href, , ic] of TILES) {
    assert.match(h, new RegExp(`href="${href}"><span class="tile-ic"><svg class="ic" aria-hidden="true"><use href="img/icons\\.svg\\?v=\\d+#i-${ic}"/>`));
    assert.match(sprite, new RegExp(`<symbol id="i-${ic}"`), ic);
  }
  for (const ic of [...Object.values(TAB_ICONS), "arrow-up-right", "chevron-right"]) assert.match(sprite, new RegExp(`<symbol id="i-${ic}"`), ic);
});
test("home timeline: tone by event, role and agency in words, machine-readable time; owners row is a labelled, focusable list", () => {
  const actions = [{ task_id: 1, asset_id: "DR-1", asset_name: "D1", status: "disputed", agency_id: "pwd", agency_name: "PWD (x)",
    timeline: [{ event: "disputed", label: "Disputed by a different resident", at: "2026-10-10T06:00:00+00:00", by: "Resident", agency_id: "pwd" }] }];
  const owners = [{ agency_id: "pwd", agency_name: "PWD (Public Works Department)", assets_owned: 4, tasks: { open: 1 }, overdue: 2 }];
  const h = homeView({ actions, owners });
  assert.equal(EVENT_TONE.disputed, "disputed");
  assert.match(h, /<li class="ev disputed"><p class="ev-label">Disputed by a different resident<\/p>/);
  assert.match(h, /Resident · <span class="ag">PWD<\/span> · <time datetime="2026-10-10T06:00:00\+00:00">/);
  assert.match(h, /<ul class="owners" role="list" tabindex="0" aria-label="Drain owners">/);
  assert.match(h, /<span class="late">Overdue: 2<\/span>/); assert.match(h, /owner-name">PWD</);
  assert.doesNotMatch(h, BANNED);
});
test("home shows three complaints and links to all of them when there are more", () => {
  const inc = (id) => ({ id, kind: "blocked_drain", created_at: "2026-10-10T08:00:00+00:00", task_id: null, asset_id: null, flags: [] });
  const me = { role: "resident" };
  const h = homeView({ me, mine: [1, 2, 3, 4].map(inc), actions: [], owners: [] });
  assert.equal((h.match(/class="card glass rise tasklink complaint"/g) || []).length, 3);
  assert.match(h, /href="#\/mine">All my reports/);
  assert.doesNotMatch(homeView({ me, mine: [1, 2].map(inc), actions: [], owners: [] }), /All my reports/);
});
test("actions fold the evidence into a disclosure with a count; sim with no results draws no empty list", () => {
  const a = { asset_name: "D", type: "clean", text: "x", route: { agency_name: "MCD", why: "y" }, gain_h_high: 0, evidence: ["e1", "e2"], task_id: 4, task_status: "open" };
  const h = actionRows({ actions: [a] });
  assert.match(h, /<details class="why"><summary>Evidence \(2\)<\/summary><ul class="small"><li>e1<\/li>/);
  assert.match(h, /Task: <a href="#\/task\/4">#4<\/a> <span class="chip open">open<\/span>/);
  assert.doesNotMatch(actionRows({ actions: [{ ...a, evidence: [] }] }), /<details/);
  assert.doesNotMatch(simResults({ banner: "b", scenario: {}, results: [] }), /class="list/);
});
test("dash.css: strip scrolls on a phone with snap and 44 px chips, sticks under the top bar, wraps on wider screens", () => {
  assert.match(css, /\.dtabs\{[^}]*overflow-x:auto[^}]*scroll-snap-type:x/);
  assert.match(css, /\.dtab\{[^}]*min-height:44px/);
  assert.match(css, /@media \(max-width:640px\)\{\.dtabs\{position:sticky;top:var\(--top-h\)/);
  assert.match(css, /@media \(min-width:641px\)\{[\s\S]*\.dtabs\{flex-wrap:wrap/);
  const sels = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media[^{]*\{/g, "").match(/[^{}]+(?=\{)/g).map(s => s.trim()).filter(Boolean);
  for (const sel of sels) for (const one of sel.split(",")) assert.match(one.trim(), /^(\.home|\.dash|\.dtab|#alist)/, one);   // scoped: never restyles shared chrome
});
test("home shell paints the hero with the area name while loading", () => {
  assert.match(homeShell(), new RegExp(`<div id="pane"><div class="home"><section class="home-hero" aria-busy="true">[\\s\\S]*${AREA}[\\s\\S]*Loading your area`));
});
test("insights still show when the ward report fails; the error sits in the report's place", async () => {
  const pane = { innerHTML: "", querySelector: () => null };
  const INS = { banner: "b", insights: [{ id: "x", text: "Insight one", why: "w", evidence: {} }] };
  await insightsPane(pane, { services: { dashboard: { insights: async () => INS, wardReport: async () => { throw new Error("report is down"); } } } });
  assert.match(pane.innerHTML, /Insight one/); assert.match(pane.innerHTML, /<h2>Ward report<\/h2><p class="err" role="alert">report is down/);
  assert.doesNotMatch(pane.innerHTML, /id="dl"/);
});
