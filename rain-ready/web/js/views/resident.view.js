// web/js/views/resident.view.js — resident screens: My reports (progress per complaint) and Confirm (before/after check). Pure.
// Photo URLs arrive absolute from services. byTask: task_id -> public log action { status, asset_name, agency_*, timeline }.
import { esc, when } from "../ui/format.js";
import { photos, flagList, stagger, empty, icon } from "../ui/components.js";
import { KINDS, FIELD_RULE, EMPTY } from "../ui/copy.js";
import { stepper } from "./home.view.js";

// The list endpoint may omit held_for_review; a warn flag is what holds a report.
const held = (i) => i.held_for_review ?? (i.flags || []).some(f => f.level === "warn");
const short = (name) => String(name ?? "").split(" (")[0];
// Chip words match the stepper steps, so the status is read as text, never from colour alone.
export const STATUS_LABEL = { open: "Reported", accepted: "Accepted", done: "Work done", confirmed: "Confirmed", disputed: "Disputed", rejected: "Closed" };
const statusChip = (s) => `<span class="chip ${esc(s)}">${esc(STATUS_LABEL[s] || s)}</span>`;
// Last step of the task; the stable sort keeps log order for steps logged in the same second.
const latest = (a) => [...((a && a.timeline) || [])].sort((x, y) => String(x.at).localeCompare(String(y.at))).at(-1);

export function mineSummary(incidents, byTask = {}) {
  const n = incidents.length, done = incidents.filter(i => byTask[i.task_id]?.status === "confirmed").length;
  return `${n} ${n === 1 ? "report" : "reports"}${done ? ` · ${done} confirmed` : ""}`;
}

function reportCard(i, a, n) {
  const where = a ? esc(a.asset_name) : i.asset_id ? `Drain ${esc(i.asset_id)}` : "No drain linked";
  const owner = a ? ` · ${a.agency_id ? `Owner: ${esc(short(a.agency_name))}` : "No owner found"}` : "";
  const last = latest(a), flags = i.flags || [];
  const progress = a ? stepper(a.status) : held(i) ? "" : `<p class="small muted">${i.task_id ? "Progress is not available right now." : "Not linked to a task yet."}</p>`;
  return `<div class="card glass rise" ${stagger(n)}>
    <div class="rep-top">${i.photo_url ? `<img class="rep-thumb" loading="lazy" src="${esc(i.photo_url)}" alt="Your photo">` : ""}
      <div class="rep-main"><p class="rep-title"><strong>${esc(KINDS[i.kind] || i.kind)}</strong>${a ? statusChip(a.status) : ""}</p>
        <p class="small muted">${esc(when(i.created_at))}</p><p class="small rep-where">${where}${owner}</p></div></div>
    ${held(i) ? `<p class="rep-held"><strong>Held for a check</strong> <span class="small">(saved, not counted toward a task yet)</span></p>` : ""}
    ${i.note ? `<p class="rep-note">${esc(i.note)}</p>` : ""}${progress}
    ${last ? `<p class="small rep-last"><span class="muted">Latest:</span> ${esc(last.label)} · ${esc(last.by)} · ${esc(when(last.at))}</p>` : ""}
    ${flags.length ? `<details class="rep-flags"${held(i) ? " open" : ""}><summary>Photo checks (${flags.length})</summary>${flagList(flags)}</details>` : ""}
    ${i.task_id ? `<a class="rep-link" href="#/task/${esc(i.task_id)}">Task ${esc(i.task_id)}: actions and photos${icon("chevron-right", "ic chev")}</a>` : ""}</div>`;
}

export const mineView = (incidents, byTask = {}) => incidents.length
  ? `<div class="screen-head"><div><h1>My reports</h1><p class="screen-sub">${esc(mineSummary(incidents, byTask))}</p></div>
    <a class="btn primary head-act" href="#/report">New report</a></div>
    <div class="stack"><div class="list">${incidents.map((i, n) => reportCard(i, byTask[i.task_id], n)).join("")}</div></div>`
  : `<div class="screen-head"><div><h1>My reports</h1></div></div>` + empty(EMPTY.mine) + `<a class="btn primary" href="#/report">Report a problem</a>`;

export const confirmIntro = () => `<div class="screen-head"><div><h1>Check finished work</h1>
  <p class="screen-sub">Officials say these jobs are done. Look from the footpath, then tell us what you see.</p></div></div>
  <p class="rule">${esc(FIELD_RULE)}</p><div id="list" class="stack"></div>`;

const figure = (cap, url, alt) => `<figure><figcaption>${cap}</figcaption>${url
  ? `<img loading="lazy" src="${esc(url)}" alt="${esc(alt)}">` : `<div class="none">No photo</div>`}</figure>`;

export function confirmCard(t, n = 0) {
  const done = [...(t.events || [])].reverse().find(e => e.event === "completed");
  const inc = t.incidents || [], before = inc.map(i => i.photo_url).filter(Boolean), id = esc(t.id);
  return `<div class="card glass rise" ${stagger(n)} data-task="${id}">
    <p class="check-where">${t.agency_name ? esc(short(t.agency_name)) : "No owner found"}${t.pocket_name ? ` · ${esc(t.pocket_name)}` : ""}</p>
    <h2 class="check-title">${esc(t.asset_name)}</h2>
    <div class="ba">${figure("Before", before[0], "Before: a resident's photo")}${figure("After", done && done.photo_url, "After: the official's photo")}</div>
    ${before.length > 1 ? photos(before.slice(1), "Before") : ""}
    <ul class="ba-notes small">${inc.map(i => `<li>${esc(KINDS[i.kind] || i.kind)}${i.note ? ": " + esc(i.note) : ""}</li>`).join("")}</ul>
    ${done && done.note ? `<p class="small"><span class="muted">Official's note:</span> ${esc(done.note)}</p>` : ""}
    <label for="cn-${id}">Your note (optional)</label><textarea id="cn-${id}" maxlength="300"></textarea>
    <div class="check-acts"><button type="button" class="primary" data-ok="1">Looks fixed</button><button type="button" data-ok="0">Still a problem</button></div>
    <div class="msg"></div></div>`;
}

export const confirmList = (tasks) => tasks.length ? `<div class="list">${tasks.map(confirmCard).join("")}</div>` : empty(EMPTY.confirm);
