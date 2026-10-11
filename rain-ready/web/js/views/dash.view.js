// web/js/views/dash.view.js — dashboard shell (title and one scrollable tab strip) and the read-only tabs. Pure.
import { esc, hrs } from "../ui/format.js";
import { banner, empty } from "../ui/components.js";
import { LEVEL, USE, EMPTY } from "../ui/copy.js";
import { drainHref } from "./drain.view.js";

export const TAB_TITLES = { map: "Map", accountability: "Who is responsible", actions: "Actions", impact: "Impact", simulator: "Simulator", capture: "Rain capture", insights: "Insights" };
export const TAB_ICONS = { map: "map", accountability: "building-2", actions: "list-checks", impact: "chart-column", simulator: "sliders-horizontal", capture: "droplets", insights: "lightbulb" };
// Pages outside the dashboard route that the strip and the home tiles also open.
export const MORE_VIEWS = [["#/projection", "Projection", "trending-up"], ["#/city", "Delhi evidence", "landmark"], ["#/places", "Waterlogging places", "map-pin"]];
const STATUS = ["open", "accepted", "done", "confirmed", "disputed", "rejected"];
export const SPRITE = "img/icons.svg?v=4";
export const icon = (name, cls = "ic") => `<svg class="${cls}" aria-hidden="true"><use href="${SPRITE}#i-${esc(name)}"/></svg>`;

// One row of chips: Overview, the seven tabs, then the three pages outside the dashboard (marked with an arrow).
export const tabStrip = (tab) => `<nav class="dtabs" aria-label="Dashboard sections"><a href="#/dash" class="dtab">Overview</a>${Object.entries(TAB_TITLES)
  .map(([k, t]) => `<a href="#/dash/${k}" class="dtab${k === tab ? " on" : ""}"${k === tab ? ' aria-current="page"' : ""}>${esc(t)}</a>`).join("")}<span class="dtab-sep" aria-hidden="true"></span>${MORE_VIEWS
  .map(([h, t]) => `<a href="${h}" class="dtab more">${esc(t)}${icon("arrow-up-right")}</a>`).join("")}</nav>`;
// Scroll offset that centres the active chip in the strip, kept inside the scroll range.
export const centerOffset = (view, left, width, total) => Math.max(0, Math.min(Math.max(0, total - view), Math.round(left - (view - width) / 2)));

export const dashShell = (tab) => `<div class="dash"><header class="dash-head"><p class="eyebrow">Dashboard</p><h1>${esc(TAB_TITLES[tab] || "Dashboard")}</h1></header>
  ${tabStrip(tab)}<div id="pane" class="dash-pane"><p class="muted">Loading...</p></div>
  <p class="small muted dash-foot"><a class="back" href="#/login">Switch persona</a></p></div>`;

const swatch = (color, label, shape = "dot") => `<li><span class="sw ${shape}" style="background:${esc(color)}"></span>${esc(label)}</li>`;
export const mapLegend = (d) => `${banner(d.banner)}<div id="m" class="map tall" data-liquid-ignore></div>
  <div class="card glass legend"><p class="small"><strong>Levels at ${esc(d.reference_rain_mm_h)} mm/h (reference rain)</strong></p>
  <ul class="swatches small">${Object.values(LEVEL).map(([c, l]) => swatch(c, l)).join("")}</ul>
  <ul class="swatches small">${swatch("#0b5cad", "Drain", "sq")}${swatch("#b3261e", "Drain, No owner found", "sq")}<li><span class="sw rk">1</span>Open task, by rank</li></ul>
  <p class="small muted">Each pocket is labelled on the map. Tap a marker for details.</p></div>`;
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

// Task counts per status with a status dot; the word carries the meaning, not the colour. row: compact pills, zeros muted.
export const statusCounts = (tasks = {}, row = false) => `<ul class="${row ? "st-row" : "st-grid"}">${STATUS.map(s => { const n = tasks[s] || 0;
  return `<li class="st ${s}${n ? "" : " zero"}"><strong>${esc(n)}</strong><span>${esc(s)}</span></li>`; }).join("")}</ul>`;
const kv = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;

export const accountabilityView = (d) => `<p class="muted small">${esc(d.note)}</p>` + (d.agencies.length ? `<div class="list acc">` + d.agencies.map(a => {
  const max = Math.max(1, ...d.agencies.map(x => x.assets_owned));
  return `<div class="card glass ${a.agency_id ? "" : "hl"}"><div class="acc-top"><h3>${esc(a.agency_name)}</h3>
  <p class="acc-num"><strong>${esc(a.assets_owned)}</strong> <span class="small">${a.assets_owned === 1 ? "drain" : "drains"} owned</span></p></div>
  <div class="bar ${a.agency_id ? "" : "bad"}" aria-hidden="true"><i style="width:${Math.round(100 * a.assets_owned / max)}%"></i></div>
  ${statusCounts(a.tasks, true)}
  ${kv([["Overdue", a.overdue], ["Bounced away", a.bounced_away], ["Median time to accept", hrs(a.median_hours_to_accept)], ["Median time to complete", hrs(a.median_hours_to_complete)]])}</div>`;
}).join("") + `</div>` : empty(EMPTY.accountability));

const stat = (n, l, extra = "", cls = "") => `<div class="card glass stat${cls}"><p class="stat-n">${esc(n)}</p><p class="stat-l">${esc(l)}</p>${extra}</div>`;
export const impactView = (d) => { const o = d.ownership, pct = o.assets ? Math.round(100 * o.with_owner / o.assets) : 0;
  return `${banner(d.banner)}<div class="stats">
  ${stat(o.with_owner + " of " + o.assets, "drains with a named owner", `<div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`, " wide")}
  ${stat(o.no_owner_found, "drains with No owner found", "", o.no_owner_found ? " warn" : "")}
  ${stat(d.reports, "resident reports")}
  ${stat(d.exposed_assets_in_pockets, "assets inside " + d.pockets + " low-point pockets (placeholder counts)")}
  ${stat(hrs(d.fill_time_gained_h), "fill time gained by confirmed work", `<p class="small muted">${esc(d.fill_time_gained_note)}</p>`)}</div>
  <h2>Tasks</h2><div class="card glass">${statusCounts(d.tasks)}</div>
  <h2>Rain capture, cubic metres per year</h2><div class="stats">${Object.entries(d.capture_m3_per_year_by_use).map(([k, v]) => stat(v, USE[k] || k)).join("")}</div>
  <p class="small muted">Not claimed: ${esc(d.not_claimed)}</p>`; };

export const captureView = (d) => banner(d.banner) + (d.sites.length ? `<div class="sites">` + d.sites.map(s => `<div class="card glass site">
  <div class="site-top"><h3>${esc(s.name)}</h3><span class="chip">${esc(s.rule_id)}</span></div>
  <p class="site-use">${esc(USE[s.use] || s.use)}</p>
  <p class="site-num">About <strong>${esc(s.annual_m3)}</strong> m&sup3; per year from the roof</p><p>${esc(s.reason)}</p>
  ${s.structure ? `<p class="small">Structure: ${Object.entries(s.structure).map(([k, v]) => `${esc(k.replace(/_/g, " "))} ${esc(v)}`).join(", ")}</p>` : ""}
  ${(s.warnings || []).length ? `<ul class="warns">${s.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
  <p class="small muted">Data: ${esc(s.data_source)}</p></div>`).join("") + `</div>` : empty(EMPTY.capture));
