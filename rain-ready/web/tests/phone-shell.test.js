// web/tests/phone-shell.test.js — phone-app shell: login groups, tab icon holder, My reports progress, Confirm card, chrome CSS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loginView, personaGroups } from "../js/views/login.view.js";
import { reportForm } from "../js/views/report.view.js";
import { mineView, mineSummary, confirmCard, STATUS_LABEL } from "../js/views/resident.view.js";
import { tabsHtml } from "../js/ui/components.js";
import { mine } from "../js/controllers/resident.js";
import { KINDS, BANNED } from "../js/ui/copy.js";

const css = (f) => readFileSync(new URL("../css/" + f, import.meta.url), "utf8");
const USERS = [{ id: "admin-1", name: "Ward coordinator (demo)", role: "admin", agency_id: null },
  { id: "off-mcd", name: "MCD officer (demo)", role: "official", agency_id: "mcd" },
  { id: "res-1", name: "Resident A (demo)", role: "resident", agency_id: null }, { id: "x-1", name: "Guest", role: "guest" }];

test("login: residents first, then officials, then coordinator; unknown roles land in Other", () => {
  const h = personaGroups(USERS);
  const at = (s) => h.indexOf(s);
  assert.ok(at("Residents") < at("Officials") && at("Officials") < at("Coordinator") && at("Coordinator") < at(">Other<"));
  assert.ok(at('data-id="res-1"') < at('data-id="off-mcd"') && at('data-id="off-mcd"') < at('data-id="admin-1"'));
  assert.match(h, /data-id="x-1"/);
});
test("login rows are buttons with initials, name, role and agency, and a chevron", () => {
  const h = personaGroups(USERS);
  assert.equal((h.match(/<button class="persona" type="button" data-id=/g) || []).length, 4);
  assert.match(h, />MO<\/span>[\s\S]*MCD officer \(demo\)[\s\S]*Official · MCD/);
  assert.equal((h.match(/#i-chevron-right/g) || []).length, 4);
  assert.match(personaGroups([]), /^$/);
});
test("login keeps the demo banner and the public links; no hero break-out markup", () => {
  const h = loginView({ users: USERS, note: "Demo login: <pick>" });
  assert.match(h, /class="banner">Demo login: &lt;pick&gt;/);
  for (const href of ["#/dash", "#/board", "/"]) assert.ok(h.includes(`class="plink" href="${href}"`), href);
  assert.match(h, /<h1 id="signin-h">Clean the right drain first<\/h1>/);
  assert.doesNotMatch(h, /hero-word|class="hero"/);
  assert.doesNotMatch(h.replace(/<[^>]+>/g, " "), BANNED);
});
test("tabs keep the label span and wrap the icon in .tab-ic", () => {
  const h = tabsHtml([["#/report", "Report", "camera"]], "#/report");
  assert.match(h, /<a href="#\/report" class="on" aria-current="page"><span class="tab-ic"><svg class="ic" aria-hidden="true"><use href="img\/icons\.svg\?v=\d+#i-camera"\/><\/svg><\/span><span>Report<\/span><\/a>/);
});
test("report form: three numbered steps, camera label in its own span, ids the controller needs", () => {
  const h = reportForm({ fieldRule: "rule", kinds: KINDS });
  assert.equal((h.match(/class="step-n"/g) || []).length, 3);
  assert.match(h, /id="cam"[^>]*><svg[^>]*>[\s\S]*?<\/svg><span id="camlbl">Take photo<\/span><\/button>/);
  for (const id of ["f", "cam", "camnote", "prev", "rm", "gps", "coords", "mini", "kind", "note", "send", "out"]) assert.match(h, new RegExp(`id="${id}"`), id);
});

const inc = (id, task_id, extra = {}) => ({ id, kind: "blocked_drain", created_at: "2026-10-11T10:03:35+00:00", note: "grate covered", flags: [], asset_id: "DR-1", task_id, photo_url: "https://h/p.jpg", ...extra });
const act = (task_id, status, timeline = []) => ({ task_id, status, asset_name: "Pusa Road drain", agency_id: "pwd", agency_name: "PWD (Public Works Department)", timeline });
test("My reports shows each complaint's progress, a text status chip, the owner and the latest step", () => {
  const tl = [{ label: "Reported and routed", by: "Resident", at: "2026-10-11T10:03:35+00:00" }, { label: "Accepted by the agency", by: "PWD official", at: "2026-10-11T10:03:35+00:00" },
    { label: "Marked done with a photo", by: "PWD official", at: "2026-10-11T10:03:35+00:00" }];
  const h = mineView([inc(1, 4)], { 4: act(4, "done", tl) });
  assert.match(h, /class="stepper"[\s\S]*Work done/);                       // stepper markup itself belongs to home.view.js
  assert.match(h, /class="chip done">Work done</);
  assert.match(h, /Pusa Road drain · Owner: PWD</);
  assert.match(h, /Latest:<\/span> Marked done with a photo · PWD official/);   // same-second steps keep log order
  assert.match(h, /href="#\/task\/4"/); assert.match(h, /href="#\/report"/);
  assert.doesNotMatch(h, BANNED);
});
test("My reports without the public log says so; a held report shows why and opens its photo checks", () => {
  assert.match(mineView([inc(1, 9)], {}), /Progress is not available right now\./);
  assert.match(mineView([inc(1, null, { asset_id: null })], {}), /No drain linked[\s\S]*Not linked to a task yet\./);
  const held = mineView([inc(2, null, { flags: [{ code: "old", level: "warn", detail: "Photo is older than 2 days" }] })], {});
  assert.match(held, /Held for a check/); assert.match(held, /<details class="rep-flags" open>/); assert.doesNotMatch(held, /class="stepper"/);
  assert.equal(STATUS_LABEL.confirmed, "Confirmed");
  assert.equal(mineSummary([inc(1, 1), inc(2, 2)], { 1: act(1, "confirmed") }), "2 reports · 1 confirmed");
  assert.equal(mineSummary([inc(1, 1)], {}), "1 report");
});
test("mine controller: a failing public log never hides the list", async () => {
  const root = { innerHTML: "" };
  await mine.mount(root, { services: { incidents: { mine: async () => [inc(1, 4)] }, dashboard: { transparency: async () => { throw new Error("down"); } } } });
  assert.match(root.innerHTML, /Blocked drain/); assert.match(root.innerHTML, /Progress is not available right now/);
  await mine.mount(root, { services: { incidents: { mine: async () => [inc(1, 4)] }, dashboard: { transparency: async () => ({ actions: [act(4, "accepted")] }) } } });
  assert.match(root.innerHTML, /class="chip accepted">Accepted</);
});
test("confirm card: before and after side by side, a labelled note, two type=button answers", () => {
  const t = { id: 7, asset_name: "Drain", agency_name: "MCD (Municipal Corporation of Delhi)", pocket_name: "Saucer", incidents: [{ kind: "overflow", note: "n", photo_url: "https://h/b.jpg" }], events: [] };
  const h = confirmCard(t);
  assert.match(h, /<figcaption>Before<\/figcaption><img[^>]*b\.jpg/); assert.match(h, /<figcaption>After<\/figcaption><div class="none">No photo<\/div>/);
  assert.match(h, /<label for="cn-7">[^<]*<\/label><textarea id="cn-7"/);
  assert.equal((h.match(/<button type="button"[^>]*data-ok=/g) || []).length, 2);
  assert.match(h, /class="check-where">MCD · Saucer</);
  assert.match(confirmCard({ ...t, agency_name: null }), /No owner found/);
});

test("chrome CSS: attached bottom bar with safe-area insets, 56 px tabs, phone app bar, no 100vw break-out", () => {
  const app = css("app.css"), phone = css("phone.css"), tokens = css("tokens.css");
  assert.match(app, /@media \(max-width:640px\)\{[^@]*\.tabs\{position:fixed;bottom:0;left:0;right:0;[^}]*env\(safe-area-inset-bottom\)/);
  assert.match(app, /\.tabs a\{[^}]*min-height:56px/);
  assert.match(phone, /\.tabs a\.on \.tab-ic\{background:/);
  assert.match(phone, /\.top\{height:calc\(var\(--top-h\) \+ env\(safe-area-inset-top\)\)/);
  assert.match(tokens, /@media \(max-width:640px\)\{:root\{--top-h:56px\}\}/);
  for (const f of ["app.css", "ui.css", "phone.css"]) { assert.doesNotMatch(css(f), /100vw/, f); assert.doesNotMatch(css(f), /\.hero\{/, f); }
});
test("phone.css: login rows and step targets are at least 44 px; rows keep the focus ring inside", () => {
  const phone = css("phone.css");
  assert.match(phone, /\.persona,\.plink\{[^}]*min-height:68px/);
  assert.match(phone, /\.persona:focus-visible,\.plink:focus-visible\{outline-offset:-3px\}/);
  assert.match(phone, /\.rep-link\{[^}]*min-height:48px/);
  assert.match(phone, /\.rep-flags summary\{[^}]*min-height:44px/);
});
