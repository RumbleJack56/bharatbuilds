// web/js/views/insights.view.js — rule-based insights and the ward report sections. Pure.
import { esc, hrRange } from "../ui/format.js";
import { banner } from "../ui/components.js";
import { LEVEL } from "../ui/copy.js";

const evid = (e) => Object.entries(e || {}).map(([k, v]) => `${esc(k.replace(/_/g, " "))}: ${esc(v)}`).join("; ");
const card = (i) => `<div class="card"><p>${esc(i.text)}${/placeholder data/i.test(i.text) ? ' <span class="chip">Placeholder data</span>' : ""}</p>
  <p class="small">Why: ${esc(i.why)}<br>Evidence: ${evid(i.evidence)}</p></div>`;

export const insightsView = (d) => `${banner(d.banner)}<h2>Insights</h2>
  ${d.insights.length ? d.insights.map(card).join("") : '<p class="muted">No insights from the current rules.</p>'}`;

export const reportView = (r) => `<h2>Ward report</h2>${banner(r.banner)}<p class="small muted">Generated ${esc(r.generated_at)}. ${esc(r.range_note)}</p>
  <div class="card"><h3>Open tasks by agency</h3>${r.tasks_by_agency.length
    ? `<ul>${r.tasks_by_agency.map(a => `<li>${esc(a.agency_name)}: ${esc(a.open)} open, ${esc(a.overdue)} overdue</li>`).join("")}</ul>` : "<p>No open tasks.</p>"}
  <p>Held for review: <strong>${esc(r.held_reports)}</strong></p>
  <p>Cleans confirmed by a resident in the last 7 days: <strong>${esc(r.confirmed_cleans_7d)}</strong></p></div>
  <div class="card"><h3>Top drains by fill time gained</h3>${r.top_drains.length
    ? `<ol>${r.top_drains.map(d => `<li>${esc(d.name)}: ${esc(hrRange(d.gain_h_low, d.gain_h_high))} (scenario). Owner: ${esc(d.agency_name)}</li>`).join("")}</ol>` : "<p>No drain would add fill time.</p>"}</div>
  <div class="card"><h3>Pockets by level</h3><ul>${Object.keys(LEVEL).filter(l => r.pockets_by_level[l])
    .map(l => `<li><strong>${esc(LEVEL[l][1])}</strong>: ${r.pockets_by_level[l].map(esc).join(", ")}</li>`).join("")}</ul></div>
  <button id="dl" class="primary">Download report (Markdown)</button>`;
