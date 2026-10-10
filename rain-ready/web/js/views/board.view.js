// web/js/views/board.view.js — public leaderboard and action log. Pure. Roles only, never names.
import { esc, hrs, when } from "../ui/format.js";
import { banner, photos, flagList } from "../ui/components.js";

const STATUS = ["open", "accepted", "done", "confirmed", "disputed", "rejected"];
const LIMITS = [20, 50, 100, 200];
const pct = (v) => v == null ? "no data yet" : Math.round(v * 100) + "%";
const demoNote = (n) => esc(String(n || "").replace(/^Rehearsal data\.?\s*/, ""));
const demoLabel = (d) => d.demo ? `<p class="banner demo"><span class="chip">Rehearsal data</span> ${demoNote(d.demo_note)}</p>` : "";

function agencyCard(a) {
  const c = a.components, i = a.inputs, eligible = i.received - i.handed_back - i.still_in_window;
  return `<div class="card"><h3>${esc(a.agency_name)} <span class="chip">${a.ranked ? "Rank " + esc(a.rank) : "Not ranked yet"}</span></h3>
  <p>Score: <strong>${a.score == null ? "no score yet" : esc(a.score) + " of 100"}</strong></p>
  ${a.score == null ? "" : `<div class="bar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, a.score))}%"></i></div>`}
  <ul class="small plain">
    <li>Accepted within 48 h: <strong>${pct(c.response)}</strong> (${esc(i.accepted_in_48h)} of ${esc(eligible)}${i.still_in_window ? `, ${esc(i.still_in_window)} still in their window` : ""})</li>
    <li>Done on time: <strong>${pct(c.delivery)}</strong> (${esc(i.completed_in_window)} of ${esc(i.completed + i.late_open)})</li>
    <li>Confirmed by residents: <strong>${pct(c.verified)}</strong> (${esc(i.confirmed)} yes, ${esc(i.disputed)} no)</li>
    <li>Open tasks not overdue: <strong>${pct(c.timeliness)}</strong> (${esc(i.overdue_now)} overdue of ${esc(i.open_now)} open)</li></ul>
  <p class="small muted">Received ${esc(i.received)} - handed back ${esc(i.handed_back)} - median time to accept ${esc(hrs(a.median_hours_to_accept))}, to complete ${esc(hrs(a.median_hours_to_complete))}</p></div>`;
}

const unassigned = (u) => `<div class="card hl"><h3>No owner found</h3>${u.tasks
  ? `<p><strong>${esc(u.tasks)}</strong> task(s) have no owner and are not scored. The oldest has waited ${esc(u.oldest_days)} days (median ${esc(u.median_days)} days). The ward coordinator assigns them.</p>`
  : `<p>No task is waiting without an owner.</p>`}</div>`;

const method = (m) => `<div class="card small"><p>${esc(m.score)}</p><ul>${Object.values(m.measures).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
  <p><strong>Not scored:</strong></p><ul>${m.not_scored.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p>${esc(m.minimum)}</p></div>`;

export const boardShell = (lb) => `<h1>Who acts, how fast</h1>${banner(lb.banner)}${demoLabel(lb)}
  <p class="small muted">Public, no login. Agencies are scored from the task log by the formula printed below. No person is named.</p>
  <h2>Agency scores</h2>${lb.agencies.map(agencyCard).join("")}${unassigned(lb.unassigned)}
  <h2>How the score works</h2>${method(lb.method)}
  <h2>Action log</h2>
  <div class="row"><div><label for="fa">Agency</label><select id="fa"><option value="">All</option>${lb.agencies.map(a => `<option value="${esc(a.agency_id)}">${esc(a.agency_name)}</option>`).join("")}<option value="none">No owner found</option></select></div>
  <div><label for="fs">Status</label><select id="fs"><option value="">All</option>${STATUS.map(s => `<option>${s}</option>`).join("")}</select></div>
  <div><label for="fl">Show</label><select id="fl">${LIMITS.map(n => `<option value="${n}" ${n === 50 ? "selected" : ""}>${n} tasks</option>`).join("")}</select></div></div>
  <div id="log" aria-live="polite">Loading...</div>`;

const step = (e) => `<li><strong>${esc(e.label)}</strong> <span class="small muted">${esc(when(e.at))} - ${esc(e.by)}${e.agency_id ? " - " + esc(e.agency_id.toUpperCase()) : ""}</span>
  ${e.note ? `<br>${esc(e.note)}` : ""}${photos([e.photo_url], "Photo")}${flagList(e.flags)}</li>`;

const item = (x) => `<details class="card"><summary><strong>#${esc(x.task_id)} ${esc(x.asset_name)}</strong>
  <span class="chip ${esc(x.status)}">${esc(x.status)}</span>${x.overdue ? ' <span class="chip overdue">overdue</span>' : ""} <span class="small muted">to ${esc(x.agency_name)}</span></summary>
  <p class="small">Why routed: ${esc(x.why_routed)}<br>Evidence: ${esc(x.reports)} report(s); drain data from ${esc(x.asset_data_source)}.<br>
  Cleaning gains ${esc(hrs(x.fill_time_gain_h))} of fill time (scenario).${x.due_at ? ` Due ${esc(when(x.due_at))}.` : ""}</p>
  <ol class="tl">${x.timeline.map(step).join("")}</ol></details>`;

export const logView = (tr) => `${tr.demo ? `<p><span class="chip">Rehearsal data</span></p>` : ""}
  ${tr.actions.length ? tr.actions.map(item).join("") : `<p class="muted">No tasks match.</p>`}
  <p class="small muted">${esc(tr.gain_note)}</p>`;
