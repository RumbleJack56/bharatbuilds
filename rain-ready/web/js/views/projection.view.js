// web/js/views/projection.view.js — rain and silt projection: pickers, pocket rows, illustrative silt chart, glossary. Pure.
import { esc, hrs, hrRange } from "../ui/format.js";
import { banner, empty } from "../ui/components.js";
import { LEVEL } from "../ui/copy.js";

const uniq = (xs) => [...new Set(xs.filter(Number.isFinite))].sort((a, b) => a - b);
const num = (x) => Number.isFinite(x) ? String(Math.round(x * 10) / 10) : "not available";
const pct = (f) => Number.isFinite(f) ? `about ${Math.round(f * 100)}%` : "not available";
const fin = (p) => Number.isFinite(p?.days) && Number.isFinite(p?.silt_fraction);
const TERMS = { utilisation_pct: "Drain use (%)", silt_fraction: "Silt (%)" };

export const horizonLabel = (h) => +h === 0 ? "Today" : `In ${h} days`;

// Rains (mm/h) and horizons (days) present in the response, sorted.
export const options = (d) => ({ rains: uniq((d.scenarios || []).map(s => s.rain_mm_h)), horizons: uniq((d.scenarios || []).map(s => s.horizon_days)) });

// Starting pick: hash params when they match the data, else the reference rain and today, else the first of each.
export function initialPick(d, [rain, horizon] = []) {
  const { rains, horizons } = options(d);
  const has = (xs, v) => v != null && v !== "" && xs.includes(+v);
  return {
    rain: has(rains, rain) ? +rain : rains.includes(d.reference_rain_mm_h) ? d.reference_rain_mm_h : rains[0],
    horizon: has(horizons, horizon) ? +horizon : horizons.includes(0) ? 0 : horizons[0],
  };
}

const find = (d, rain, horizon) => (d.scenarios || []).find(s => s.rain_mm_h === rain && s.horizon_days === horizon);

// Fill time in words. A null upper bound means the slow end of the range does not fill.
export function fillPhrase({ time_to_fill_h: mid, time_to_fill_h_low: lo, time_to_fill_h_high: hi }) {
  if (lo != null && hi != null) return `Fills in ${hrRange(lo, hi)}${mid == null ? "" : ` (middle estimate ${hrs(mid)})`}.`;
  if (lo != null) return (mid == null ? "Does not fill at the middle estimate" : `Fills in ${hrs(mid)} at the middle estimate`) +
    `; ${hrs(lo)} at the quick end of the range, and at the slow end it does not fill.`;
  if (mid != null) return `Fills in ${hrs(mid)}.`;
  return "Does not fill in this scenario.";
}

// Utilisation in words: over capacity is said, not only coloured.
export function useLine(u) {
  if (!Number.isFinite(u)) return "Drain use: not available (no drain capacity in this scenario).";
  const r = Math.round(u);
  return `Drain use: about ${r}% of what the drain can carry` + (r > 100 ? " - over capacity." : r === 100 ? " - at capacity." : " - within capacity.");
}

const useBar = (u) => Number.isFinite(u)
  ? `<div class="bar${u > 100 ? " bad" : ""}" aria-hidden="true"><i style="width:${Math.min(100, Math.max(0, Math.round(u)))}%"></i></div>` : "";

function siltLine(p, today, horizon) {
  const now = `Silt: ${pct(p.silt_fraction)} of the drain's depth (estimate)`;
  if (!horizon || !today || !Number.isFinite(today.silt_fraction)) return now + ".";
  return now + (today.silt_fraction === p.silt_fraction ? ", the same as today." : `; today ${pct(today.silt_fraction)}.`);
}

const levelHtml = (l) => LEVEL[l] ? `<span class="lvl ${esc(l)}">Level: ${esc(LEVEL[l][1])}</span>` : `<span class="lvl">Level: not available</span>`;

const row = (p, today, horizon, names) => `<div class="card glass"><strong>${esc(p.name)}</strong> ${levelHtml(p.level)}
  <p>${esc(fillPhrase(p))}</p>${useBar(p.utilisation_pct)}
  <p class="small">${esc(useLine(p.utilisation_pct))}</p>
  <p class="small muted">Runoff ${esc(num(p.runoff_mm_h))} mm/h; the drain can carry ${esc(num(p.capacity_mm_h))} mm/h with this silt.
  ${esc(siltLine(p, today, horizon))}${p.spills_to ? ` Spills toward ${esc(names[p.spills_to] || p.spills_to)}.` : ""}</p></div>`;

// Segmented picker; links carry the pick so a copied link reopens it.
const seg = (label, kind, vals, on, text, href) => `<p class="small"><strong>${esc(label)}</strong></p>
  <div class="sub" role="group" aria-label="${esc(label)}">${vals.map(v => `<a href="${esc(href(v))}" data-${kind}="${esc(v)}"${v === on
    ? ' class="on" aria-current="true"' : ""}>${esc(text(v))}</a>`).join("")}</div>`;

export function pickers(d, pick) {
  const { rains, horizons } = options(d), ref = d.reference_rain_mm_h;
  return seg("Rain", "rain", rains, pick.rain, r => `${r} mm/h${r === ref ? " (reference)" : ""}`, r => `#/projection/${r}/${pick.horizon}`) +
    (Number.isFinite(ref) ? `<p class="small muted">Reference rain: ${esc(ref)} mm/h, the rain the map and the action ranking use.</p>` : "") +
    seg("When", "horizon", horizons, pick.horizon, horizonLabel, h => `#/projection/${pick.rain}/${h}`) +
    `<p class="small muted">Today uses the drains as they are now. Later days assume no drain is cleaned in between.</p>`;
}

// The part that changes with the pick: pickers, a summary number and one row per pocket.
export function projectionBody(d, pick) {
  if (!options(d).rains.length) return empty("No pockets to show.");
  const s = find(d, pick.rain, pick.horizon), ps = s?.pockets || [];
  if (!ps.length) return pickers(d, pick) + empty("No pockets to show for this rain and day.");
  const today = new Map((find(d, pick.rain, 0)?.pockets || []).map(p => [p.id, p]));
  const names = Object.fromEntries(ps.map(p => [p.id, p.name]));
  const fills = ps.filter(p => p.time_to_fill_h != null).length;
  return pickers(d, pick) + `<div class="card glass"><div class="big-num">${fills} of ${ps.length}</div>
    <div class="small">pockets fill at ${esc(pick.rain)} mm/h, ${esc(horizonLabel(pick.horizon).toLowerCase())} (middle estimate; a scenario, not a forecast).</div></div>
    ${d.range_note ? `<p class="small muted">${esc(d.range_note)}</p>` : ""}
    <div class="list">${ps.map(p => row(p, today.get(p.id), pick.horizon, names)).join("")}</div>`;
}

// Inline SVG line chart of the illustrative silt series, with the model curve dashed behind it.
const W = 400, H = 200, L = 44, R = 12, T = 12, B = 40;
export function siltChart(d) {
  const ill = d.silt_curve_illustrative || {}, pts = (ill.points || []).filter(fin), model = (d.silt_curve || []).filter(fin);
  if (pts.length < 2) return "";
  const all = [...pts, ...model], maxX = Math.max(...all.map(p => p.days)) || 1;
  const maxY = Math.max(0.1, Math.ceil(Math.max(...all.map(p => p.silt_fraction)) * 10) / 10);
  const x = (v) => (L + (v / maxX) * (W - L - R)).toFixed(1), y = (v) => (T + (1 - v / maxY) * (H - T - B)).toFixed(1);
  const path = (ps) => ps.map((p, i) => `${i ? "L" : "M"}${x(p.days)} ${y(p.silt_fraction)}`).join(" ");
  const xt = [0, 1, 2, 3].map(i => Math.round(maxX * i / 3)), yt = [0, maxY / 2, maxY];
  const last = pts[pts.length - 1];
  return `<h2>Silt after a clean</h2><div class="card glass"><p><span class="chip">Illustrative</span></p>
  <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-labelledby="silt-t"><title id="silt-t">Illustrative silt series: silt as a share of
  drain depth against days since a confirmed clean, from ${esc(pct(pts[0].silt_fraction))} at day ${esc(pts[0].days)} to ${esc(pct(last.silt_fraction))} at day ${esc(last.days)}.</title>
  <g stroke="var(--line)">${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`).join("")}</g>
  <g class="muted" fill="currentColor" font-size="12">${yt.map(v => `<text x="${L - 6}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${Math.round(v * 100)}%</text>`).join("")}
  ${xt.map(v => `<text x="${x(v)}" y="${H - B + 16}" text-anchor="middle">${v}</text>`).join("")}
  <text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle">Days since a confirmed clean</text></g>
  ${model.length > 1 ? `<path d="${path(model)}" fill="none" stroke="var(--fg-muted)" stroke-width="1.5" stroke-dasharray="4 4"/>` : ""}
  <path d="${path(pts)}" fill="none" stroke="var(--accent-fill)" stroke-width="2.5" stroke-linejoin="round"/></svg>
  <p class="small">Up: silt, % of the drain's depth. Across: days since a confirmed clean.
  Solid line: illustrative series${model.length > 1 ? ". Dashed line: the model curve" : ""}.</p>
  ${ill.note ? `<p class="small muted">${esc(ill.note)}</p>` : ""}</div>`;
}

export function glossary(d) {
  const m = Object.entries(d.meaning || {});
  return m.length ? `<h2>What the numbers mean</h2><div class="card glass"><dl>${m.map(([k, v]) =>
    `<dt><strong>${esc(TERMS[k] || k.replace(/_/g, " "))}</strong></dt><dd class="small">${esc(v)}</dd>`).join("")}</dl></div>` : "";
}

export const projectionView = (d, pick) => `<p class="eyebrow">Scenario</p><h1>If no drain is cleaned</h1>
  <p class="muted">How each waterlogging pocket behaves under a chosen rain, today and on later days as silt builds up.</p>
  ${banner(d.banner)}<div id="pj">${projectionBody(d, pick)}</div>${siltChart(d)}${glossary(d)}`;
