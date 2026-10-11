// web/js/views/dash.view.js — dashboard shell and the read-only tabs. Pure.
import { esc, hrs } from "../ui/format.js";
import { banner, empty } from "../ui/components.js";
import { LEVEL, USE, EMPTY } from "../ui/copy.js";
import { drainHref } from "./drain.view.js";

export const TAB_TITLES = { map: "Map", accountability: "Who is responsible", impact: "Impact", simulator: "Simulator", capture: "Rain capture", actions: "Actions", insights: "Insights" };
const STATUS = ["open", "accepted", "done", "confirmed", "disputed", "rejected"];

export const dashShell = (tab) => `<h1>Dashboard</h1><nav class="sub" aria-label="Dashboard sections">${Object.entries(TAB_TITLES)
  .map(([k, t]) => `<a href="#/dash/${k}" class="${k === tab ? "on" : ""}">${esc(t)}</a>`).join("")}</nav>
  <nav class="sub" aria-label="More views"><a href="#/projection">Projection</a><a href="#/city">Delhi evidence</a><a href="#/places">Waterlogging places</a></nav>
  <div id="pane">Loading...</div><p class="small muted"><a class="back" href="#/login">Switch persona</a></p>`;

export const mapLegend = (d) => `${banner(d.banner)}<div id="m" class="map tall" data-liquid-ignore></div>
  <p class="small">Levels at ${esc(d.reference_rain_mm_h)} mm/h (reference rain): ${Object.values(LEVEL).map(([, l]) => `<strong>${esc(l)}</strong>`).join(" &middot; ")}
  (each pocket is labelled on the map).<br>Squares: drains (red = No owner found). Numbered markers: open tasks by rank.</p>`;
// Same circle on the Map tab and the Simulator map: level colour, text label, fixed pixel radius.
export const pocketCircle = (p) => { const [color, label] = LEVEL[p.level] || LEVEL.none; return [[p.lat, p.lon], { color, radiusPx: 14, label: `${p.name}: ${label}` }]; };
export const pocketPopup = (p) => `<strong>${esc(p.name)}</strong><br>Level: <strong>${esc(LEVEL[p.level][1])}</strong>
  <br>Time to fill: ${esc(hrs(p.time_to_fill_h))}<br>Assets exposed: ${esc(p.exposed_assets)}
  <br><span class="small">${esc(p.data_source)}, confidence ${esc(p.confidence)}</span>`;
export const taskPopup = (t, rank) => `<strong>Task ${esc(t.id)}</strong> (${esc(t.status)})<br>Rank ${esc(rank)}
  <br><a href="#/task/${esc(t.id)}">Open task</a>`;
export const assetPopup = (a) => `<strong>${esc(a.name)}</strong><br>Owner: ${esc(a.agency_name)}
  <br><span class="small">Source: ${esc(a.owner_source || "none")}</span><br>Last cleaning confirmed: ${esc(a.last_confirmed_clean || "never recorded")}${a.id ? `
  <br><a href="${esc(drainHref(a.id))}">Drain details</a>` : ""}`;

export const accountabilityView = (d) => `<p class="muted small">${esc(d.note)}</p>` + (d.agencies.length ? `<div class="list">` + d.agencies.map(a => {
  const max = Math.max(1, ...d.agencies.map(x => x.assets_owned));
  return `<div class="card glass ${a.agency_id ? "" : "hl"}"><h3>${esc(a.agency_name)}</h3>
  <p>Assets owned: <strong>${esc(a.assets_owned)}</strong></p>
  <div class="bar ${a.agency_id ? "" : "bad"}" aria-hidden="true"><i style="width:${Math.round(100 * a.assets_owned / max)}%"></i></div>
  <p class="small">${STATUS.map(s => `${s}: <strong>${esc(a.tasks[s] || 0)}</strong>`).join(" &middot; ")}</p>
  <p class="small">Overdue: <strong>${esc(a.overdue)}</strong> &middot; Bounced away: <strong>${esc(a.bounced_away)}</strong><br>
  Median time to accept: ${esc(hrs(a.median_hours_to_accept))} &middot; to complete: ${esc(hrs(a.median_hours_to_complete))}</p></div>`;
}).join("") + `</div>` : empty(EMPTY.accountability));

const big = (n, l) => `<div class="card glass"><div class="big-num">${esc(n)}</div><div class="small">${esc(l)}</div></div>`;
export const impactView = (d) => `${banner(d.banner)}<div class="grid">
  ${big(d.ownership.with_owner + " of " + d.ownership.assets, "drains with a named owner")}
  ${big(d.ownership.no_owner_found, "drains with No owner found")}
  ${big(d.reports, "resident reports")}
  ${big(d.exposed_assets_in_pockets, "assets inside " + d.pockets + " low-point pockets (placeholder counts)")}
  ${big(hrs(d.fill_time_gained_h), "fill time gained by confirmed work")}</div>
  <p class="small muted">${esc(d.fill_time_gained_note)}</p>
  <h2>Tasks</h2><div class="grid">${STATUS.map(s => big(d.tasks[s] ?? 0, s)).join("")}</div>
  <h2>Rain capture, cubic metres per year</h2><div class="grid">${Object.entries(d.capture_m3_per_year_by_use).map(([k, v]) => big(v, USE[k] || k)).join("")}</div>
  <p class="small muted">Not claimed: ${esc(d.not_claimed)}</p>`;

export const captureView = (d) => banner(d.banner) + (d.sites.length ? `<div class="list">` + d.sites.map(s => `<div class="card glass"><h3>${esc(s.name)}</h3>
  <p><strong>${esc(USE[s.use] || s.use)}</strong> <span class="chip">${esc(s.rule_id)}</span></p>
  <p>${esc(s.reason)}</p><p>About <strong>${esc(s.annual_m3)}</strong> m&sup3; per year from the roof</p>
  ${s.structure ? `<p class="small">Structure: ${Object.entries(s.structure).map(([k, v]) => `${esc(k.replace(/_/g, " "))} ${esc(v)}`).join(", ")}</p>` : ""}
  ${(s.warnings || []).map(w => `<p class="banner">${esc(w)}</p>`).join("")}
  <p class="small muted">Data: ${esc(s.data_source)}</p></div>`).join("") + `</div>` : empty(EMPTY.capture));
