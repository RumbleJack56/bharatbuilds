// web/js/views/insights.view.js — rule-based insights and the ward report sections. Pure.
import { esc, hrRange, hrs, when } from "../ui/format.js";
import { banner, empty } from "../ui/components.js";
import { LEVEL, EMPTY } from "../ui/copy.js";
import { icon } from "./dash.view.js";

// Evidence labels with units; values are printed as the API gives them (fill time goes through hrs).
const EVID = { silt_estimate: ["silt estimate (0 to 1)"], time_to_fill_h: ["time to fill", hrs], days_overdue: ["days overdue"], days_since_clean: ["days since last clean"],
  reports: ["resident reports"], bounced: ["tasks handed back"], owner_source: ["owner source"], data_source: ["data source"] };
const evid = (e) => Object.entries(e || {}).map(([k, v]) => { const [label, f] = EVID[k] || [k.replace(/_/g, " ")]; return `${esc(label)}: ${esc(f ? f(v) : v)}`; }).join("; ");
const card = (i) => `<div class="card glass ins">${icon("lightbulb", "ic ins-ic")}<div><p>${esc(i.text)}${/placeholder data/i.test(i.text) ? ' <span class="chip">Placeholder data</span>' : ""}</p>
  <p class="small muted">Why: ${esc(i.why)}<br>Evidence: ${evid(i.evidence)}</p></div></div>`;

export const insightsView = (d) => `${banner(d.banner)}<h2>Rule-based insights</h2>
  ${d.insights.length ? d.insights.map(card).join("") : empty(EMPTY.insights)}`;

export const reportView = (r) => `<h2>Ward report</h2>${banner(r.banner)}<p class="small muted">Generated ${esc(when(r.generated_at))}. ${esc(r.range_note)}</p>
  <div class="card glass rep"><h3>Open tasks by agency</h3>${r.tasks_by_agency.length
    ? `<ul>${r.tasks_by_agency.map(a => `<li>${esc(a.agency_name)}: ${esc(a.open)} open, ${esc(a.overdue)} overdue</li>`).join("")}</ul>` : "<p>No open tasks.</p>"}
  <p>Held for review: <strong>${esc(r.held_reports)}</strong></p>
  <p>Cleans confirmed by a resident in the last 7 days: <strong>${esc(r.confirmed_cleans_7d)}</strong></p></div>
  <div class="card glass rep"><h3>Top drains by fill time gained</h3>${r.top_drains.length
    ? `<ol>${r.top_drains.map(d => `<li>${esc(d.name)}: ${esc(hrRange(d.gain_h_low, d.gain_h_high))} (scenario). Owner: ${esc(d.agency_name)}</li>`).join("")}</ol>` : "<p>No drain would add fill time.</p>"}</div>
  <div class="card glass rep"><h3>Pockets by level</h3>${(lv => lv.length ? `<ul>${lv.map(l => `<li><strong>${esc(LEVEL[l][1])}</strong>: ${r.pockets_by_level[l].map(esc).join(", ")}</li>`).join("")}</ul>` : "<p>No pockets.</p>")(Object.keys(LEVEL).filter(l => (r.pockets_by_level[l] || []).length))}</div>
  <button id="dl" class="primary wide">Download report (Markdown)</button>`;
