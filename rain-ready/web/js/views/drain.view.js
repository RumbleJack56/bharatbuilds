// web/js/views/drain.view.js — one drain's page: owner and its source, silt estimate, illustrative curve, pockets, cleaning history. Pure.
import { esc, hrs, when, gainPhrase } from "../ui/format.js";
import { banner, empty, chip, errBox } from "../ui/components.js";
import { LEVEL, EVENT, NO_OWNER } from "../ui/copy.js";

// Links into this page from other views (actions list, map popup, task detail).
export const drainHref = (id) => "#/drain/" + encodeURIComponent(id);
export const drainLink = (id, name) => id ? `<a href="${esc(drainHref(id))}">${esc(name || id)}</a>` : esc(name);
// Same square the dashboard map uses for a drain.
export const drainMarker = (a) => `<div class="drain ${a.agency_id ? "" : "noowner"}" title="${a.agency_id ? "Drain" : "Drain, no owner found"}"></div>`;

const NOT_FOUND = "We could not find that drain. Pick one from the map or the action list.";
const BACK = `<p><a class="back" href="#/dash/map">Back to the map</a></p>`;
export const drainMissing = (e) => `${BACK}<h1>Drain</h1>${errBox(!e || e.status === 404 ? NOT_FOUND : e)}`;

const num = (v) => typeof v === "number" && Number.isFinite(v);
const pct = (f) => num(f) ? `${Math.round(f * 100)}%` : "not available";
const width = (f) => num(f) ? Math.max(0, Math.min(100, Math.round(f * 100))) : 0;
const bar = (f) => `<div class="bar" aria-hidden="true"><i style="width:${width(f)}%"></i></div>`;
const or = (v, fallback) => v == null || v === "" ? fallback : v;

const ownerCard = (a) => {
  const owned = !!a.agency_id;
  return `<div class="card glass${owned ? "" : " hl"}"><p>Agency: <strong>${esc(owned ? a.agency_name : "No owner found")}</strong></p>
  ${owned ? "" : `<p>${esc(NO_OWNER)}</p>`}
  <p class="small"><strong>Owner source:</strong> ${esc(or(a.owner_source, "none recorded"))}</p>
  <p class="small"><strong>Citation:</strong> ${esc(or(a.citation, "none recorded"))}</p>
  <p class="small"><strong>Data source:</strong> ${esc(or(a.data_source, "not stated"))} &middot; <strong>Confidence:</strong> ${esc(or(a.confidence, "not stated"))}</p>
  ${a.note ? `<p class="small muted"><strong>Note:</strong> ${esc(a.note)}</p>` : ""}</div>`;
};

const days = (n) => `${n} ${n === 1 ? "day" : "days"} ago`;
const siltNow = (d) => `<div class="card glass"><p class="small muted">Silt now (model estimate)</p>
  <div class="big-num">${esc(pct(d.silt_now))}</div>
  <p class="small">Estimated share of the drain filled with silt. A model estimate, not a measurement.</p>${bar(d.silt_now)}
  <p>${num(d.days_since_clean) ? `Last confirmed clean: ${esc(or((d.asset || {}).last_confirmed_clean, "date not recorded"))} (${esc(days(d.days_since_clean))})`
    : "No confirmed clean on record"}</p>
  ${d.silt_note ? `<p class="small muted">${esc(d.silt_note)}</p>` : ""}</div>`;

const HORIZON = { 0: "Today", 30: "In 30 days", 60: "In 60 days", 90: "In 90 days" };
const siltLater = (d) => {
  const p = d.silt_if_not_cleaned || {};
  const keys = Object.keys(HORIZON).filter(k => num(p[k]));
  if (!keys.length) return "";
  const held = num(d.days_since_clean) ? "" : " With no confirmed clean on record the model holds its starting estimate, so the figure stays the same.";
  return `<h3 class="gap">If not cleaned (model estimate)</h3><p class="small muted">Silt share at each date if nobody cleans the drain.${held}</p>
  <div class="grid">${keys.map(k => `<div class="card glass"><div class="big-num">${esc(pct(p[k]))}</div>
  <p class="small">${esc(HORIZON[k])}</p>${bar(p[k])}</div>`).join("")}</div>`;
};

// Inline SVG line chart of the illustrative series. Colours come from the text colour (currentColor), no inline colour styles.
const W = 360, H = 170, L = 40, R = 12, T = 10, B = 30;
export function siltChart(series) {
  const pts = ((series && series.points) || []).filter(p => num(p.days) && num(p.silt_fraction));
  if (pts.length < 2) return "";
  const maxD = Math.max(...pts.map(p => p.days)) || 1;
  const maxY = Math.max(0.1, Math.ceil(Math.max(...pts.map(p => p.silt_fraction)) * 10) / 10);
  const x = (v) => (L + (v / maxD) * (W - L - R)).toFixed(1), y = (v) => (T + (1 - v / maxY) * (H - T - B)).toFixed(1);
  const ys = [0, maxY / 2, maxY], xs = [0, Math.round(maxD / 2), maxD];
  const first = pts[0], last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-labelledby="silt-t silt-d" focusable="false">
  <title id="silt-t">Illustrative silt curve</title>
  <desc id="silt-d">Illustrative share of a drain filled with silt by days since a confirmed clean: ${esc(pct(first.silt_fraction))} at ${esc(first.days)} days,
  ${esc(pct(last.silt_fraction))} at ${esc(last.days)} days. Not a measurement.</desc>
  <g class="muted" stroke="currentColor" stroke-opacity=".35">${ys.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`).join("")}</g>
  <g class="muted" fill="currentColor" font-size="11">${ys.map(v => `<text x="${L - 6}" y="${y(v)}" dy="4" text-anchor="end">${esc(pct(v))}</text>`).join("")}
  ${xs.map(v => `<text x="${x(v)}" y="${H - B + 18}" text-anchor="middle">${esc(v)} d</text>`).join("")}</g>
  <polyline fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"
    points="${pts.map(p => `${x(p.days)},${y(p.silt_fraction)}`).join(" ")}"/></svg>`;
}
const chartCard = (s) => {
  const svg = siltChart(s);
  return svg ? `<h3 class="gap">How silt builds after a clean <span class="chip">Illustrative</span></h3>
  <div class="card glass">${svg}<p class="small muted">Days since a confirmed clean (across) and share of the drain filled with silt (up).</p>
  <p class="small"><strong>Illustrative.</strong> ${esc(or(s.note, "Not a measurement."))}</p></div>` : "";
};

const pocketRow = (p) => {
  const lv = LEVEL[p.level] ? p.level : "none";
  return `<div class="card glass"><h3>${esc(p.name)}</h3>
  <p class="small">Level at the reference rain: <span class="lvl ${esc(lv)}">${esc(LEVEL[lv][1])}</span> &middot; Time to fill: ${esc(hrs(p.time_to_fill_h))} (scenario)</p>
  <p class="small muted"><strong>Data source:</strong> ${esc(or(p.data_source, "not stated"))}${p.citation ? `<br><strong>Citation:</strong> ${esc(p.citation)}` : ""}</p></div>`;
};
const pocketList = (ps) => ps && ps.length ? `<div class="list">${ps.map(pocketRow).join("")}</div>`
  : empty("This drain is not linked to a low-point pocket.");

const historyItem = (h) => `<li><strong>Task <a href="#/task/${esc(h.task_id)}">#${esc(h.task_id)}</a></strong> ${chip(h.status)}
  ${h.completed_at ? `<br><span class="small">${esc(EVENT.completed)}: ${esc(when(h.completed_at))}</span>` : ""}
  ${h.verified_at ? `<br><span class="small">${esc(h.status === "disputed" ? EVENT.disputed : EVENT.confirmed)}: ${esc(when(h.verified_at))}</span>`
    : `<br><span class="small muted">Not yet checked by a resident.</span>`}
  ${h.agency_id ? `<br><span class="small">Agency: ${esc(String(h.agency_id).toUpperCase())}</span>` : ""}
  ${num(h.gain_h) ? `<br><span class="small">Cleaning this ${esc(gainPhrase(h.gain_h))} (scenario).</span>` : ""}</li>`;
const historyList = (hs) => hs && hs.length ? `<ul class="tl">${hs.map(historyItem).join("")}</ul>`
  : empty("No cleaning work on record for this drain yet.");

const mapBlock = (a) => num(a.lat) && num(a.lon)
  ? `<div id="dm" class="map mini" data-liquid-ignore></div><p class="small muted">Position from the drain record: ${esc(a.lat.toFixed(5))}, ${esc(a.lon.toFixed(5))}</p>`
  : `<p class="small muted">No map position on record.</p>`;

export const drainView = (d) => {
  const a = d.asset || {};
  return `${BACK}<p class="eyebrow">Drain record</p><h1>${esc(a.name || a.id)}</h1>
  <p class="small muted">${esc(a.id)}${a.type ? ` &middot; ${esc(String(a.type).replace(/_/g, " "))}` : ""}</p>${banner(d.banner)}
  <h2>Who owns it</h2>${ownerCard(a)}
  <h2>Silt</h2>${siltNow(d)}${siltLater(d)}${chartCard(d.silt_series_illustrative)}
  <h2>Linked low-point pockets</h2>${pocketList(d.pockets)}
  <h2>Cleaning history</h2>${historyList(d.cleaning_history)}
  <h2>Reports</h2><p>Resident reports linked to this drain: <strong>${esc(num(d.reports) ? d.reports : 0)}</strong></p>
  <h2>Where it is</h2>${mapBlock(a)}
  <p class="gap"><a class="btn go" href="#/dash/actions"><span>See the action list</span><i aria-hidden="true"></i></a></p>`;
};
