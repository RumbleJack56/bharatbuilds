// web/js/views/official.view.js — inbox and task page. Pure.
import { esc, hrs, when } from "../ui/format.js";
import { chip, banner, photos, flagList } from "../ui/components.js";
import { KINDS, FIELD_RULE, EVENT, EMPTY } from "../ui/copy.js";

const overdue = (t) => t.overdue ? '<span class="chip overdue">overdue</span>' : "";

// Last event of a kind on a task detail (events arrive oldest first).
const lastEvent = (t, name) => [...(t.events || [])].reverse().find(e => e.event === name);
export const disputeNote = (t) => lastEvent(t, "disputed")?.note || "";

export const taskCard = (t, note = "") => `<a class="card tasklink" href="#/task/${esc(t.id)}">
  <div>${chip(t.status)} ${overdue(t)} <span class="muted small">rank ${esc(Math.round(t.rank_score * 10) / 10)}</span></div>
  <h3>${esc(t.asset_name)}</h3>
  <p class="small muted">${esc(t.agency_name)} - ${esc(t.pocket_name || "no pocket")} - ${esc(t.report_count)} report(s)</p>
  ${t.status === "disputed" ? `<p class="small"><strong>Resident's note:</strong> ${esc(note || "(no note)")}</p>` : ""}
  <p class="small">Cleaning this gains ${esc(hrs(t.gain_h))} of fill time (scenario).</p></a>`;

export const inboxView = ({ tasks, banner: b }, notes = {}) => `<h1>Inbox</h1>${banner(b)}` +
  (tasks.length ? tasks.map(t => taskCard(t, notes[t.id])).join("") : `<p class="muted">${EMPTY.inbox}</p>`);

const eventItem = (e) => `<li><strong>${esc(EVENT[e.event] || e.event)}</strong>
    <span class="small muted">${esc(when(e.at))} - ${esc(e.actor_name)}${e.agency_id ? " - " + esc(e.agency_id.toUpperCase()) : ""}</span>
    ${e.note ? `<br>${esc(e.note)}` : ""}${photos([e.photo_url], "Photo")}${flagList(e.flags)}</li>`;

// A disputed job shows the resident's note; a reworked one (accepted again) shows the "to be redone" note.
function redoBanner(t) {
  if (t.status === "disputed") return `<p class="banner redo"><strong>Resident's note:</strong> ${esc(disputeNote(t) || "(no note)")}</p>`;
  const again = t.status === "accepted" && lastEvent(t, "accepted");
  return again && again.note ? `<p class="banner redo"><strong>To be redone:</strong> ${esc(again.note)}${disputeNote(t) ? ` (resident's note: ${esc(disputeNote(t))})` : ""}</p>` : "";
}

export const taskDetail = (t, { banner: b, back }) => `<p><a href="${esc(back)}">Back</a></p>
  <h1>${esc(t.asset_name)}</h1><div>${chip(t.status)} ${overdue(t)}</div>
  <p>Owner: <strong>${esc(t.agency_name || "No owner found")}</strong>${t.owner_source ? `<br><span class="small muted">Source: ${esc(t.owner_source)}</span>` : ""}</p>
  ${banner(b)}${redoBanner(t)}<p>${esc(t.pocket_name || "")} - cleaning this gains ${esc(hrs(t.gain_h))} of fill time.</p>
  ${t.due_at ? `<p class="small muted">Due ${esc(when(t.due_at))}</p>` : ""}
  <p class="rule">${esc(FIELD_RULE)}</p><div id="actions"></div>
  <h2>Reports (${t.incidents.length})</h2>
  ${t.incidents.length ? t.incidents.map(i => `<div class="card"><strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="small muted">${esc(when(i.created_at))}</span>
    ${i.note ? `<p>${esc(i.note)}</p>` : ""}${photos([i.photo_url], "Report photo")}</div>`).join("") : `<p class="muted">${EMPTY.reports}</p>`}
  <h2>History</h2>${t.events.length ? `<ul class="tl">${t.events.map(eventItem).join("")}</ul>` : `<p class="muted">${EMPTY.history}</p>`}`;

const options = (agencies, current) => agencies.filter(a => a.id !== current)
  .map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");
const notOurs = (agencies, current) => `<h3 class="gap">Not ours?</h3>
  <label for="why">Reason</label><input type="text" id="why" placeholder="For example: this drain belongs to PWD">
  <label for="to">Send to</label><select id="to"><option value="">No other agency (reject)</option>${options(agencies, current)}</select>
  <p><button id="rej" class="wide">Not ours</button></p>`;

export const openActions = ({ agencies, current }) =>
  `<div class="card"><button class="primary big" id="acc">Accept this task</button>${notOurs(agencies, current)}</div>`;
export const disputedActions = () => `<div class="card"><p>A resident said the work is not done. Accept to redo it.</p>
  <button class="primary big" id="acc">Accept to redo</button></div>`;
export const acceptedActions = ({ agencies, current }) => `<form class="card" id="done"><h3>Mark as done</h3>
  <p class="small muted">Photograph the finished work from the footpath.</p>
  <button type="button" id="ph" class="big primary">Take after-photo</button>
  <p class="small muted">The photo is location and time stamped.</p>
  <p class="small" id="camnote" role="alert"></p><div id="prev" class="photos"></div>
  <label for="nt">Note</label><textarea id="nt" maxlength="300"></textarea>
  <button class="primary big" type="submit">Submit with after-photo</button></form>
  <div class="card">${notOurs(agencies, current)}</div>`;
export const assignActions = ({ agencies }) => `<div class="card"><p class="banner">No owner found for this drain.</p>
  <label for="ag">Assign to</label><select id="ag">${options(agencies, null)}</select>
  <p><button class="primary wide" id="assign">Assign</button></p></div>`;
export const waitingActions = () => `<p class="banner">Waiting for a resident to check the work.</p>`;
