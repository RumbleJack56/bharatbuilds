// web/js/views/resident.view.js — resident screens. Pure. Photo URLs arrive absolute from services.
import { esc, when } from "../ui/format.js";
import { photos, flagList, stagger } from "../ui/components.js";
import { KINDS, FIELD_RULE, EMPTY } from "../ui/copy.js";

// The list endpoint returns flags but no held_for_review; a warn flag is what holds a report.
const held = (i) => i.held_for_review ?? (i.flags || []).some(f => f.level === "warn");

export const mineView = (incidents) => `<h1>My reports</h1>` + (incidents.length ? incidents.map((i, n) => `<div class="card glass rise" ${stagger(n)}>
    <strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="muted small">${esc(when(i.created_at))}</span>
    ${held(i) ? `<p><strong>Held for a check</strong> <span class="small muted">(saved, not counted toward a task yet)</span></p>` : ""}
    ${i.note ? `<p>${esc(i.note)}</p>` : ""}${photos([i.photo_url], "Your photo")}${flagList(i.flags)}
    <p class="small">${i.asset_id ? `Drain ${esc(i.asset_id)}` : "No drain linked"}
    ${i.task_id ? ` - <a href="#/task/${esc(i.task_id)}">Task ${esc(i.task_id)}</a>` : ""}</p></div>`).join("")
  : `<p class="muted">${EMPTY.mine}</p><a class="btn primary" href="#/report">Report a problem</a>`);

export const confirmIntro = () => `<h1>Check finished work</h1>
  <p class="muted">Officials say these jobs are done. Look from the footpath, then tell us what you see.</p>
  <p class="rule">${esc(FIELD_RULE)}</p><div id="list"></div>`;

export function confirmCard(t, n = 0) {
  const done = [...(t.events || [])].reverse().find(e => e.event === "completed");
  return `<div class="card glass rise" ${stagger(n)} data-task="${esc(t.id)}"><h3>${esc(t.asset_name)}</h3>
    <p class="small muted">${esc(t.agency_name)} - ${esc(t.pocket_name || "")}</p>
    <h3>Before (resident reports)</h3>${photos(t.incidents.map(i => i.photo_url), "Before")}
    <ul>${t.incidents.map(i => `<li>${esc(KINDS[i.kind] || i.kind)}${i.note ? ": " + esc(i.note) : ""}</li>`).join("")}</ul>
    <h3>After (from the official)</h3>${photos([done && done.photo_url], "After")}
    ${done && done.note ? `<p>${esc(done.note)}</p>` : ""}
    <label>Note (optional)</label><textarea maxlength="300"></textarea>
    <div class="row"><button class="primary" data-ok="1">Looks fixed</button><button data-ok="0">Still a problem</button></div>
    <div class="msg"></div></div>`;
}

export const confirmList = (tasks) => tasks.length ? tasks.map(confirmCard).join("") : `<p class="muted">${EMPTY.confirm}</p>`;
