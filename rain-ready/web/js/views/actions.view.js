// web/js/views/actions.view.js — the ranked action list, one card per drain; the evidence folds away. Pure.
import { esc, hrRange } from "../ui/format.js";
import { banner, stagger, empty } from "../ui/components.js";
import { ACTION, EMPTY } from "../ui/copy.js";
import { drainLink } from "./drain.view.js";

export const TOPS = [10, 25, 50];

const row = (a, n = 0) => {
  const owner = a.route.needs_coordinator ? "No owner found" : a.route.agency_name;
  const gain = a.gain_h_high > 0 ? `Fill time gained if cleaned: ${esc(hrRange(a.gain_h_low, a.gain_h_high))} (scenario)` : "No change in fill time at the reference rain (scenario)";
  return `<div class="card glass rise" ${stagger(n)}><div class="act-top"><h3>${drainLink(a.asset_id, a.asset_name)}</h3><span class="chip">${esc(ACTION[a.type] || a.type)}</span></div>
  <p>${esc(a.text)}</p>
  <ul class="facts small"><li>Owner: ${esc(owner)}</li><li>Route: ${esc(a.route.agency_name)}. ${esc(a.route.why)}</li><li class="gain">${gain}</li>
  <li>${a.task_id ? `Task: <a href="#/task/${esc(a.task_id)}">#${esc(a.task_id)}</a> <span class="chip ${esc(a.task_status)}">${esc(a.task_status)}</span>` : "No task yet (proposed)"}</li></ul>
  ${a.evidence.length ? `<details class="why"><summary>Evidence (${a.evidence.length})</summary><ul class="small">${a.evidence.map(e => `<li>${esc(e)}</li>`).join("")}</ul></details>` : ""}</div>`;
};

export const actionRows = (d) => d.actions.length ? `<div class="list">${d.actions.map(row).join("")}</div>` : empty(EMPTY.actions);

export const actionsView = (d, top = 10) => `${banner(d.banner)}<p class="small muted">${esc(d.range_note)} ${esc(d.how_routed)}</p>
  <div class="toolbar"><label for="top">Show</label><select id="top">${TOPS.map(n => `<option value="${n}" ${n === top ? "selected" : ""}>${n} drains</option>`).join("")}</select>
  <p class="small" aria-live="polite">Showing ${esc(d.actions.length)} of ${esc(d.total)}</p></div>
  <div id="alist">${actionRows(d)}</div>`;
