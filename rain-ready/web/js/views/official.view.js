// web/js/views/official.view.js — the official's inbox (summary, filters, task cards) and the task page. Pure.
import { esc, when, gainPhrase, rankPhrase } from "../ui/format.js";
import { chip, banner, photos, flagList, stagger, empty, icon } from "../ui/components.js";
import { KINDS, FIELD_RULE, EVENT, EMPTY, NO_OWNER } from "../ui/copy.js";
import { drainLink } from "./drain.view.js";
import { stepper } from "./home.view.js";

const overdue = (t) => t.overdue ? '<span class="chip overdue">overdue</span>' : "";
const short = (name) => String(name ?? "").split(" (")[0];
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const day = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString([], { day: "numeric", month: "short" }); };

// Last event of a kind on a task detail (events arrive oldest first).
const lastEvent = (t, name) => [...(t.events || [])].reverse().find(e => e.event === name);
export const disputeNote = (t) => lastEvent(t, "disputed")?.note || "";

// ---- inbox: counts and filters are derived from the task list alone
export const FILTERS = [["all", "All"], ["open", "Open"], ["accepted", "Accepted"], ["disputed", "Disputed"], ["overdue", "Overdue"],
  ["done", "Waiting check"], ["confirmed", "Confirmed"]];
const STATUSES = ["open", "accepted", "disputed", "done", "confirmed", "rejected"];

export function inboxCounts(tasks = []) {
  const c = Object.fromEntries([["all", tasks.length], ["overdue", 0], ...STATUSES.map(s => [s, 0])]);
  for (const t of tasks) { if (STATUSES.includes(t.status)) c[t.status]++; if (t.overdue) c.overdue++; }
  c.action = c.open + c.accepted + c.disputed;          // the official has a next step on these
  return c;
}
// Next steps first (overdue ones on top), then work waiting for a resident, then closed; the server's rank order within each.
const GROUP = { disputed: 1, open: 1, accepted: 1, done: 2, confirmed: 3, rejected: 3 };
const place = (t) => (GROUP[t.status] ?? 3) * 2 - (t.overdue ? 1 : 0);
export const filterTasks = (tasks = [], f = "all") => (f === "overdue" ? tasks.filter(t => t.overdue)
  : STATUSES.includes(f) ? tasks.filter(t => t.status === f) : [...tasks]).sort((a, b) => place(a) - place(b));
const known = (f) => FILTERS.some(([k]) => k === f) ? f : "all";
export const showing = (tasks, f = "all") => {
  const label = FILTERS.find(([k]) => k === known(f))[1];
  return `${label}: ${count(filterTasks(tasks, known(f)).length, "task", "tasks")}`;
};

const meta = (t) => `<ul class="ibx-meta">
  <li>${icon("landmark")}<span>${esc(short(t.agency_name) || "No owner found")}</span></li>
  ${t.pocket_name ? `<li>${icon("map-pin")}<span>${esc(t.pocket_name)}</span></li>` : ""}
  <li>${icon("camera")}<span>${count(Number(t.report_count) || 0, "report", "reports")}</span></li>
  ${t.due_at && ["open", "accepted"].includes(t.status) ? `<li class="${t.overdue ? "od" : ""}">${icon(t.overdue ? "shield-alert" : "list-checks")}<span>Due ${esc(day(t.due_at))}</span></li>` : ""}</ul>`;

export const taskCard = (t, note = "", n = 0) => `<a class="card glass rise tasklink" ${stagger(n)}${t.overdue ? " data-overdue" : ""} href="#/task/${esc(t.id)}">
  <div class="ibx-top">${chip(t.status)}${overdue(t)}${typeof t.rank_score === "number" ? `<span class="ibx-rank">${esc(rankPhrase(t.rank_score))}</span>` : ""}</div>
  <h3>${esc(t.asset_name)}</h3>${meta(t)}
  ${t.status === "disputed" ? `<blockquote class="quote"><strong>Resident's note:</strong> ${esc(note || "(no note)")}</blockquote>` : ""}
  <p class="ibx-gain">${icon("droplets")}<span>Cleaning this ${esc(gainPhrase(t.gain_h))} (scenario).</span></p>
  <svg class="ic chev" aria-hidden="true"><use href="img/icons.svg?v=6#i-chevron-right"/></svg></a>`;

// The list region the controller redraws when a filter changes.
export const inboxList = (tasks, notes = {}) => tasks.length
  ? `<div class="list">${tasks.map((t, n) => taskCard(t, notes[t.id], n)).join("")}</div>`
  : `<div class="ibx-none">${empty("No tasks match this filter.")}<button type="button" class="link" data-filter="all">Show all tasks</button></div>`;

const stat = (n, label, cls = "") => `<p class="${cls}"><strong>${esc(n)}</strong> <span>${esc(label)}</span></p>`;
const hero = (c, agency) => `<header class="ibx-hero"><p class="eyebrow">${esc(agency ? short(agency) : "Your agency")}</p><h1>Inbox</h1>
  ${c.all ? `<div class="ibx-stats">${stat(c.action, "Need action")}${stat(c.overdue, "Overdue", c.overdue ? "od" : "")}${stat(c.done, "Waiting check")}</div>` : ""}</header>`;
const filterBar = (c, f) => `<div class="ibx-filters" role="group" aria-label="Show tasks" data-filters>${FILTERS.map(([k, label]) =>
  `<button type="button" class="ibx-filter" data-filter="${k}" aria-pressed="${k === f}">${esc(label)} <span class="n">${esc(c[k])}</span></button>`).join("")}</div>`;

export function inboxView({ tasks = [], banner: b }, notes = {}, filter = "all") {
  const f = known(filter), c = inboxCounts(tasks);
  if (!tasks.length) return `<div class="ibx">${hero(c, "")}${banner(b)}<div class="ibx-empty">${empty(EMPTY.inbox)}
    <p class="small muted">Tasks for drains your agency owns arrive here.</p></div></div>`;
  return `<div class="ibx">${hero(c, tasks[0].agency_name)}${filterBar(c, f)}${banner(b)}
    <p class="ibx-showing" role="status">${esc(showing(tasks, f))}</p>
    <div id="ibx-list">${inboxList(filterTasks(tasks, f), notes)}</div></div>`;
}

// ---- task page
const eventItem = (e) => `<li data-ev="${esc(e.event)}"><p class="tl-h"><strong>${esc(EVENT[e.event] || e.event)}</strong>
    <span class="small muted">${esc(when(e.at))} - ${esc(e.actor_name)}${e.agency_id ? " - " + esc(e.agency_id.toUpperCase()) : ""}</span></p>
    ${e.note ? `<p>${esc(e.note)}</p>` : ""}${photos([e.photo_url], "Photo")}${flagList(e.flags)}</li>`;
const reportItem = (i) => `<li data-ev="report"><p class="tl-h"><strong>${esc(KINDS[i.kind] || i.kind)}</strong>
    <span class="small muted">${esc(when(i.created_at))}</span></p>${i.note ? `<p>${esc(i.note)}</p>` : ""}${photos([i.photo_url], "Report photo")}</li>`;
const timeline = (items, item, none) => items.length ? `<ol class="tl2">${items.map(item).join("")}</ol>` : empty(none);

// A disputed job shows the resident's note; a reworked one (accepted again) shows the "to be redone" note.
function redoBanner(t) {
  if (t.status === "disputed") return `<p class="banner redo"><strong>Resident's note:</strong> ${esc(disputeNote(t) || "(no note)")}</p>`;
  const again = t.status === "accepted" && lastEvent(t, "accepted");
  return again && again.note ? `<p class="banner redo"><strong>To be redone:</strong> ${esc(again.note)}${disputeNote(t) ? ` (resident's note: ${esc(disputeNote(t))})` : ""}</p>` : "";
}

// Long owner sources fold away; short ones stay in line. Either way the source is one tap from the owner.
const source = (s) => !s ? "" : s.length <= 90 ? `<p class="tk-src">Source: ${esc(s)}</p>`
  : `<details class="tk-src"><summary>Source of this owner</summary><p>${esc(s)}</p></details>`;

const head = (t) => `<section class="card glass tk-head" aria-labelledby="tk-title">
  <div class="tk-chips">${chip(t.status)}${overdue(t)}</div>
  <h1 id="tk-title">${drainLink(t.asset_id, t.asset_name)}</h1>
  <div class="tk-owner">${icon("landmark")}<div><p>Owner: <strong>${esc(t.agency_name || "No owner found")}</strong></p>${source(t.owner_source)}</div></div>
  ${t.agency_id ? "" : `<p class="tk-noowner">${esc(NO_OWNER)}</p>`}
  ${t.due_at && ["open", "accepted"].includes(t.status) ? `<p class="tk-due${t.overdue ? " od" : ""}">${icon(t.overdue ? "shield-alert" : "list-checks")}<span>${t.overdue ? "Overdue. " : ""}Due ${esc(when(t.due_at))}</span></p>` : ""}
  ${stepper(t.status)}</section>`;

export const taskDetail = (t, { banner: b, back }) => `<div class="tk"><p class="tk-back"><a class="back" href="${esc(back)}">${icon("chevron-right", "ic flip")}Back</a></p>
  ${head(t)}${redoBanner(t)}<p class="rule">${esc(FIELD_RULE)}</p><div id="actions"></div>
  <div class="tk-scn">${banner(b)}<p class="tk-gain">${icon("droplets")}<span>${t.pocket_name ? esc(t.pocket_name) + " - cleaning" : "Cleaning"} this ${esc(gainPhrase(t.gain_h))}.</span></p></div>
  <h2>Reports (${t.incidents.length})</h2>${timeline(t.incidents, reportItem, EMPTY.reports)}
  <h2>History</h2>${timeline(t.events, eventItem, EMPTY.history)}</div>`;

const options = (agencies, current) => agencies.filter(a => a.id !== current)
  .map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");
const notOurs = (agencies, current) => `<details class="card glass tk-notours"><summary>${icon("chevron-right")}<span>Not ours?</span></summary><div class="tk-fold">
  <p class="small muted">Say why, and pass it to the agency that owns it if you know.</p>
  <label for="why">Reason</label><input type="text" id="why" placeholder="For example: this drain belongs to PWD">
  <label for="to">Send to</label><select id="to"><option value="">No other agency (reject)</option>${options(agencies, current)}</select>
  <p><button id="rej" class="wide">Not ours</button></p></div></details>`;

// The primary button sits in a dock that stays above the tab bar until the page scrolls past it.
const dock = (id, label) => `<div class="tk-dock"><button class="primary big" id="${id}">${esc(label)}</button></div>`;
export const openActions = ({ agencies, current }) => `<h2 class="tk-next">Next step</h2>
  <p class="small muted">Accept to take this drain on for your agency.</p>${dock("acc", "Accept this task")}${notOurs(agencies, current)}`;
export const disputedActions = () => `<h2 class="tk-next">Next step</h2>
  <p>A resident said the work is not done. Accept to redo it.</p>${dock("acc", "Accept to redo")}`;
export const acceptedActions = ({ agencies, current }) => `<form class="card glass tk-done" id="done"><h2>Mark as done</h2>
  <p class="small muted">Photograph the finished work from the footpath.</p>
  <button type="button" id="ph" class="big tk-cam">Take after-photo</button>
  <p class="small muted">The photo is location and time stamped.</p>
  <p class="small" id="camnote" role="alert"></p><div id="prev" class="photos"></div>
  <label for="nt">Note</label><textarea id="nt" maxlength="300"></textarea>
  <button class="primary big lg fab" data-lg-css type="submit">Submit with after-photo</button></form>
  ${notOurs(agencies, current)}`;
export const assignActions = ({ agencies }) => `<div class="card glass tk-assign"><p class="banner">No owner found for this drain.</p>
  <label for="ag">Assign to</label><select id="ag">${options(agencies, null)}</select>
  <p><button class="primary wide" id="assign">Assign</button></p></div>`;
export const waitingActions = () => `<p class="banner tk-wait">Waiting for a resident to check the work.</p>`;
