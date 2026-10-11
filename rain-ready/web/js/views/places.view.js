// web/js/views/places.view.js — city waterlogging places (Traffic Police lists) and one PWD inventory road. Pure.
import { esc } from "../ui/format.js";
import { stagger, empty, errBox } from "../ui/components.js";

export const OWNERS = [["", "All"], ["mcd", "MCD"], ["pwd", "PWD"], ["unresolved", "No owner found"]];
export const MIN_DATES = [[1, "Any"], [2, "2 or more"], [3, "3 or more"], [5, "5 or more"], [10, "10 or more"]];
export const LIMITS = [20, 50, 100, 200];
export const EMPTY_PLACES = "No places match these filters.";
const MATCH = { exact: "road name found in the PWD inventory", close: "close spelling of a PWD inventory road",
  ambiguous: "same-named PWD roads disagree on the owner", none: "road not found in the PWD inventory" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NA = "not listed";

// "2024-09-12" -> "12 Sep 2024"; anything else prints as given.
const day = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m && MON[+m[2] - 1] ? `${+m[3]} ${MON[+m[2] - 1]} ${m[1]}` : (s || NA); };
const count = (x, one) => `${esc(x ?? 0)} ${x === 1 ? one : one + "s"}`;
const owner = (id) => id ? String(id).toUpperCase() : "No owner found";
const roadHref = (code) => "#/road/" + encodeURIComponent(code);
const opt = ([v, t], cur) => `<option value="${esc(v)}"${String(v) === String(cur ?? "") ? " selected" : ""}>${esc(t)}</option>`;
const sourceNote = (d) => `<p class="small muted">Source: ${esc(d.source || NA)}${d.note ? `<br>${esc(d.note)}` : ""}</p>`;
const back = `<p><a class="back" href="#/places">Back to places</a></p>`;

export const placesShell = (f = {}) => `<p class="eyebrow">City records</p><h1>Waterlogging places</h1>
  <p class="muted">Places in Delhi that the Traffic Police listed as waterlogged, merged across the yearly lists.
  A place is chronic when it was listed on dates in 3 or more different years.</p>
  <form id="pf" class="card glass" role="search" aria-label="Filter places">
    <label class="opt"><input type="checkbox" id="pc"${f.chronic ? " checked" : ""}> Only chronic places</label>
    <div class="row">
      <div><label for="po">Owner</label><select id="po">${OWNERS.map(o => opt(o, f.owner)).join("")}</select></div>
      <div><label for="pm">Minimum dates</label><select id="pm">${MIN_DATES.map(o => opt(o, f.minDates)).join("")}</select></div>
      <div><label for="pl">Show</label><select id="pl">${LIMITS.map(v => opt([v, v + " places"], f.limit)).join("")}</select></div>
    </div>
    <label for="pr">Road name contains</label>
    <input type="text" id="pr" value="${esc(f.road)}" placeholder="For example Ring Road" autocomplete="off">
    <button class="primary gap" type="submit">Search</button>
  </form>
  <div id="pres" aria-live="polite">Loading...</div>`;

const listRows = (rows) => (rows || []).map(r =>
  `${esc(r.list)} list, row ${esc(r.row_no)}${r.pdf_page == null ? "" : ` (PDF page ${esc(r.pdf_page)})`}`).join("; ");

function placeRow(p, i) {
  const years = (p.years || []).map(esc).join(", ");
  const match = MATCH[p.match] || p.match || NA;
  return `<div class="card glass rise" ${stagger(i)}><h3>${esc(p.place || "Place not named in the list")}${p.chronic ? ' <span class="chip">Chronic</span>' : ""}</h3>
  <p class="small muted">${esc(p.road || "Road not named in the list")}</p>
  <p>Listed on <strong>${count(p.n_dates, "date")}</strong> in ${count(p.n_years, "year")}${years ? `: ${years}` : ""}<br>
  <span class="small">First listed ${esc(day(p.first_date))}, last listed ${esc(day(p.last_date))}</span></p>
  <p class="small">Owner: <strong>${esc(owner(p.agency_id))}</strong>${p.row_m == null ? "" : ` (Right of Way ${esc(p.row_m)} m)`}<br>
  Name match: ${esc(match)}${p.pwd_code ? ` - <a href="${esc(roadHref(p.pwd_code))}">Road record ${esc(p.pwd_code)}</a>` : ""}
  ${(p.rows || []).length ? `<br><span class="muted">In the lists: ${listRows(p.rows)}</span>` : ""}</p></div>`;
}

// Results for one query: source and note first, then the count and the rows (API order: most dates first).
export function placesResults(d, f = {}) {
  const list = d.places || [];
  const shown = list.length && list.length === Number(f.limit)
    ? `Showing the first ${esc(list.length)} places, most dates first. Narrow the filters or show more.`
    : `Showing ${count(list.length, "place")}, most dates first.`;
  return `${sourceNote(d)}<p class="small"><strong>${shown}</strong></p>
  ${list.length ? `<div class="list">${list.map(placeRow).join("")}</div>` : empty(EMPTY_PLACES)}`;
}

const val = (v, unit = "") => v == null || v === "" ? NA : v + unit;
const stat = (label, v, unit) => `<div class="card glass">${v == null || v === ""
  ? `<p><strong>${NA}</strong></p>` : `<div class="big-num">${esc(v)}${unit ? `<span class="small"> ${esc(unit)}</span>` : ""}</div>`}
  <div class="small">${esc(label)}</div></div>`;

// Plain words for the 60 ft rule result; the API gives the flag and the rule text.
function ruleLine(r) {
  if (r.pwd_by_rule) return `Applies by rule: <strong>Yes</strong>. By this rule its drains are with PWD (Right of Way ${esc(val(r.row_m, " m"))}).`;
  if (r.row_m == null) return "Applies by rule: <strong>No</strong>. The inventory lists no Right of Way for this road, so the rule does not place its drains with PWD.";
  return `Applies by rule: <strong>No</strong>. Right of Way ${esc(r.row_m)} m: the rule does not place its drains with PWD.`;
}

export const roadView = (r) => `${back}<p class="eyebrow">PWD road inventory</p>
  <h1>${esc(r.road_name || r.asset_code)}</h1><p class="muted">PWD inventory code ${esc(r.asset_code)}</p>
  <div class="grid">${stat("Right of Way", r.row_m, "m")}${stat("Length", r.length_km, "km")}${stat("Lanes", r.lanes)}</div>
  <div class="card glass"><h3>Road record</h3><p class="small">
  From: <strong>${esc(val(r.starting_point))}</strong><br>To: <strong>${esc(val(r.end_point))}</strong><br>
  PWD division: <strong>${esc(val(r.division))}</strong><br>Status in the inventory: <strong>${esc(val(r.status))}</strong><br>
  Road code: <strong>${esc(val(r.asset_code))}</strong><br>Name key used for matching: <strong>${esc(val(r.road_key))}</strong></p></div>
  <h2>Drain owner by the 60 ft rule</h2>
  <div class="card glass"><p>${ruleLine(r)}</p><p class="small">Rule: ${esc(r.rule || NA)}</p>
  <p class="small muted">Owner shown at agency level. Places are linked to this road by name; the road segment is not checked on the ground.</p></div>
  <p class="small muted">Source: PWD Delhi road inventory.</p>`;

export const NOT_IN_INVENTORY = (code) => `Road ${code} is not in the PWD inventory. Check the code, or go back to the places list.`;
export const NO_CODE = "No road code given. Pick a road from the places list.";
export const roadError = (e) => `${back}<p class="eyebrow">PWD road inventory</p><h1>Road record</h1>${errBox(e)}`;
