// web/js/views/actions.view.js — the ranked action list, one row per drain. Pure.
import { esc, hrRange } from "../ui/format.js";
import { banner } from "../ui/components.js";
import { ACTION } from "../ui/copy.js";

export const TOPS = [10, 25, 50];

const row = (a) => {
  const owner = a.route.needs_coordinator ? "No owner found" : a.route.agency_name;
  const gain = a.gain_h_high > 0 ? `Fill time gained if cleaned: ${esc(hrRange(a.gain_h_low, a.gain_h_high))} (scenario)` : "No change in fill time at the reference rain (scenario)";
  return `<div class="card"><h3>${esc(a.asset_name)} <span class="chip">${esc(ACTION[a.type] || a.type)}</span></h3>
  <p>${esc(a.text)}</p>
  <p class="small">Owner: ${esc(owner)}<br>Route: ${esc(a.route.agency_name)}. ${esc(a.route.why)}<br>${gain}<br>
  ${a.task_id ? `Task: <a href="#/task/${esc(a.task_id)}">#${esc(a.task_id)}</a> (${esc(a.task_status)})` : "No task yet (proposed)"}</p>
  <ul class="small">${a.evidence.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>`;
};

export const actionRows = (d) => d.actions.length ? d.actions.map(row).join("") : `<p class="muted">No actions to show.</p>`;

export const actionsView = (d, top = 10) => `${banner(d.banner)}<p class="small muted">${esc(d.range_note)} ${esc(d.how_routed)}</p>
  <label for="top">Show</label> <select id="top">${TOPS.map(n => `<option value="${n}" ${n === top ? "selected" : ""}>${n} drains</option>`).join("")}</select>
  <p class="small" aria-live="polite">Showing ${esc(d.actions.length)} of ${esc(d.total)}</p>
  <div id="alist">${actionRows(d)}</div>`;
