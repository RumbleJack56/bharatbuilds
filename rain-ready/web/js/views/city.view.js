// web/js/views/city.view.js — Delhi evidence page: what the public waterlogging lists record city-wide. Pure. Agency level only.
import { esc } from "../ui/format.js";
import { banner, empty, stagger } from "../ui/components.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const AGENCY = { mcd: "MCD", pwd: "PWD", ifc: "I&FC", djb: "DJB" };
const OWNERS = ["unresolved", "mcd", "pwd"];   // shown first, in this order; any other agency follows
const KIND = { recurrence: "Repeat places", ownership: "Ownership", context: "Pilot ward", season: "Season", severity: "Extreme days",
  concentration: "Corridors", quality: "Data quality" };
const TOP = 5;   // evidence rows shown per insight
const TILES = [["location_dates", "location-dates (one place listed on one date)"], ["days", "days with at least one listing"],
  ["places", "places listed"], ["chronic_places", "chronic places (listed in 3 or more years)"], ["roads_in_inventory", "roads in the PWD inventory"]];

// Counts as text: anything that is not a number reads "not available", never NaN or undefined.
const ok = (n) => n != null && n !== "" && Number.isFinite(Number(n));
const num = (n) => ok(n) ? Number(n).toLocaleString("en-IN") : "not available";
const count = (n, word) => `${num(n)} ${word}${Number(n) === 1 ? "" : "s"}`;
const owner = (id) => id && id !== "unresolved" ? AGENCY[id] || String(id).toUpperCase() : "No owner found";

export const cityHead = () => `<p class="eyebrow">Delhi evidence</p><h1>Waterlogging across Delhi</h1>
  <p class="muted">What the public waterlogging lists record across the city, and what the records point to before the next monsoon.</p>`;

// Source and note from whichever response arrived; shown in full, never folded away.
export const sourceView = (d) => d && (d.source || d.note) ? `<div class="card glass small">
  ${d.source ? `<p><strong>Source:</strong> ${esc(d.source)}</p>` : ""}${d.note ? `<p class="muted">${esc(d.note)}</p>` : ""}</div>` : "";

const tile = (n, label) => `<div class="card glass"><div class="big-num">${esc(num(n))}</div><div class="small">${esc(label)}</div></div>`;

// Labelled bar rows [label, value, extra class]: the count is text, the bar only scales it against the largest row.
function bars(rows) {
  const max = Math.max(1, ...rows.map(([, v]) => ok(v) ? Number(v) : 0));
  return rows.map(([label, v, cls = ""]) => `<p class="small">${esc(label)}: <strong>${esc(num(v))}</strong></p>
  <div class="bar ${cls}" aria-hidden="true"><i style="width:${Math.round(100 * (ok(v) ? Number(v) : 0) / max)}%"></i></div>`).join("");
}
const chart = (title, caption, rows, none) => `<h2>${esc(title)}</h2>${rows.length
  ? `<div class="card glass"><p class="small muted">${esc(caption)}</p>${bars(rows)}</div>` : empty(none)}`;

const yearRows = (by = {}) => Object.entries(by).sort(([a], [b]) => String(a).localeCompare(String(b)));
// All twelve months: a month missing from the counts had no listing.
const monthRows = (by = {}) => Object.keys(by).length ? MONTHS.map((m, i) => [m, by[i + 1] ?? 0]) : [];
const ownerRows = (by = {}) => [...OWNERS.filter(k => k in by), ...Object.keys(by).filter(k => !OWNERS.includes(k))]
  .map(k => [owner(k), by[k], k === "unresolved" ? "bad" : ""]);

export const summaryView = (s = {}) => `<div class="grid">${TILES.map(([k, l]) => tile(s[k], l)).join("")}</div>
  ${chart("By year", "Location-dates per year of listing.", yearRows(s.by_year), "No dated listings to show.")}
  ${chart("By month", "Location-dates per calendar month, all years together.", monthRows(s.by_month), "No dated listings to show.")}
  ${chart("Who owns the road", "Location-dates by the agency that owns the road, matched by road name. No owner found: public records do not name an owner for the road.",
    ownerRows(s.location_dates_by_owner), "No owner data to show.")}`;

// Where a place sits in the source lists: list year, row number, PDF page.
const rowRef = (r) => `${esc(r.list)} list${r.row_no != null ? `, row ${esc(r.row_no)}` : ""}${r.pdf_page != null ? `, PDF page ${esc(r.pdf_page)}` : ""}`;
const roadLink = (code) => code ? ` <a href="#/road/${esc(encodeURIComponent(code))}">Road ${esc(code)}</a>` : "";

// One line per evidence row, by evidence key. Keys not listed here are summarised by the insight text itself.
const EVID = {
  places: ["Places", (p) => `<strong>${esc(p.road)}</strong>, ${esc(p.place)}: ${esc(count(p.dates, "date"))} in ${esc((p.years || []).join(", ") || "no year given")}.
    Owner: ${esc(owner(p.agency_id))}.${(p.rows || []).length ? ` <span class="muted">Listed in: ${p.rows.slice(0, 3).map(rowRef).join("; ")}.</span>` : ""}${roadLink(p.pwd_code)}`],
  top_roads: ["Roads", (r) => `<strong>${esc(r.road)}</strong>: ${esc(count(r.location_dates, "location-date"))} at ${esc(count(r.places, "place"))}`],
  busiest_days: ["Busiest days", ([n, day] = []) => `<strong>${esc(day)}</strong>: ${esc(count(n, "listing"))}`],
  pilot: ["Pilot ward places", (p) => `<strong>${esc(p.short)}</strong>: ${p.coverage_gap ? "in no list" : esc(count(p.n_dates, "date"))}`],
};
const evidence = (ev = {}) => Object.entries(EVID).filter(([k]) => Array.isArray(ev[k]) && ev[k].length).map(([k, [title, line]]) =>
  `<p class="small"><strong>${esc(title)}</strong>${ev[k].length > TOP ? ` (showing ${TOP} of ${esc(ev[k].length)})` : ""}</p>
  <ul class="tl small">${ev[k].slice(0, TOP).map(x => `<li>${line(x)}</li>`).join("")}</ul>`).join("");

const insightCard = (i, n) => `<div class="card glass rise" ${stagger(n)}>
  ${i.kind ? `<p><span class="chip">${esc(KIND[i.kind] || String(i.kind).replace(/_/g, " "))}</span></p>` : ""}
  <p>${esc(i.text)}</p>${i.why ? `<p class="small">Why: ${esc(i.why)}</p>` : ""}
  ${i.action && i.action.text ? `<p class="small"><strong>What to do:</strong> ${esc(i.action.text)}</p>` : ""}
  ${evidence(i.evidence)}</div>`;

export const cityInsightsView = (d = {}) => `<h2>What the records show</h2>${banner(d.banner)}
  ${(d.insights || []).length ? `<div class="list">${d.insights.map(insightCard).join("")}</div>` : empty("No city insights to show.")}`;
