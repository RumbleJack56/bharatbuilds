// web/js/views/home.view.js — the dashboard home, laid out like a phone app: area status on glass cards, the report
// button, my complaints with their progress, who owns the drains, a timeline of actions in the area, and icon tiles. Pure.
import { esc, when } from "../ui/format.js";
import { empty, stagger } from "../ui/components.js";
import { KINDS, EMPTY } from "../ui/copy.js";
import { drainLink } from "./drain.view.js";
import { TAB_TITLES, TAB_ICONS, MORE_VIEWS, icon } from "./dash.view.js";

export const AREA = "Old Rajinder Nagar and Karol Bagh";
export const STEPS = [["open", "Reported"], ["accepted", "Accepted"], ["done", "Work done"], ["confirmed", "Confirmed"]];
const AT = { open: 0, accepted: 1, done: 2, confirmed: 3, disputed: 2, rejected: 0 };
export const STATUS_TEXT = { open: "Reported, waiting for the owner to accept", accepted: "Accepted by the owner", done: "Marked done, waiting for a resident to check",
  confirmed: "Resolved: a different resident confirmed the fix", disputed: "Disputed: a resident says it is still a problem", rejected: "Closed without action" };
// Timeline dot per event, named after the task status it moves to (the label beside it always says what happened).
export const EVENT_TONE = { created: "open", report_added: "open", accepted: "accepted", assigned: "accepted", reassigned: "accepted",
  completed: "done", confirmed: "confirmed", disputed: "disputed", bounced: "disputed", rejected: "rejected" };
export const TILES = [...Object.entries(TAB_TITLES).map(([k, t]) => [`#/dash/${k}`, t, TAB_ICONS[k]]), ...MORE_VIEWS];
const MINE_SHOWN = 3, FEED_SHOWN = 6;
const short = (name) => String(name ?? "").split(" (")[0];

export function areaCounts(actions = []) {
  const c = { open: 0, progress: 0, resolved: 0, disputed: 0 };
  for (const a of actions) {
    if (a.status === "open") c.open++;
    else if (a.status === "accepted" || a.status === "done") c.progress++;
    else if (a.status === "confirmed") c.resolved++;
    else if (a.status === "disputed") c.disputed++;
  }
  return c;
}

// Four steps; the current one is bold and every step carries its word, so progress never rests on colour alone.
export function stepper(status) {
  const at = AT[status] ?? 0, closed = status === "rejected";
  return `<ol class="stepper" aria-label="Progress">${STEPS.map(([, label], i) =>
    `<li class="${!closed && i <= at ? "on" : ""}${!closed && i === at ? " now" : ""}"${!closed && i === at ? ' aria-current="step"' : ""}>${esc(label)}</li>`).join("")}</ol>
    <p class="small">${esc(STATUS_TEXT[status] || status)}</p>`;
}

// Newest first: every step of every task in the area, from the public log (roles and agencies, never names).
export function activity(actions = [], limit = 10) {
  return actions.flatMap(a => (a.timeline || []).map(e => ({ ...e, task_id: a.task_id, asset_id: a.asset_id, asset_name: a.asset_name })))
    .sort((x, y) => String(y.at).localeCompare(String(x.at))).slice(0, limit);
}

const secHead = (title, link) => `<div class="sec-head"><h2>${esc(title)}</h2>${link ? `<a href="${link[0]}">${esc(link[1])}${icon("chevron-right")}</a>` : ""}</div>`;
const stamp = (iso) => `<time datetime="${esc(iso)}">${esc(when(iso))}</time>`;

const cta = (me) => !me ? `<a class="btn primary home-cta" href="#/login">Pick a resident to report a problem</a>`
  : me.role === "official" ? `<a class="btn primary home-cta" href="#/inbox">Open your inbox</a>`
  : `<a class="btn primary home-cta" href="#/report">Report a problem</a>`;

function complaint(i, a, n) {
  const where = a ? `${esc(a.asset_name)} · ${a.agency_id ? `Owner: ${esc(short(a.agency_name))}` : "No owner found"}`
    : i.asset_id ? `Drain ${esc(i.asset_id)}` : "No drain linked yet";
  const held = (i.flags || []).some(f => f.level === "warn");
  return `<a class="card glass rise tasklink complaint" ${stagger(n)} href="${i.task_id ? `#/task/${esc(i.task_id)}` : "#/mine"}">
    <span class="c-top"><strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="muted small">${stamp(i.created_at)}</span></span>
    <p class="small c-where">${where}</p>${a ? stepper(a.status) : `<p class="small c-note">${held ? "Held for a check: saved, not counted toward a task yet" : "Not linked to a task yet"}</p>`}
    ${icon("chevron-right", "ic chev")}</a>`;
}

const mineBlock = (me, mine, byTask) => !me || me.role !== "resident" ? ""
  : `${secHead("My complaints", mine && mine.length > MINE_SHOWN ? ["#/mine", "All my reports"] : null)}${mine && mine.length
    ? `<div class="list">${mine.slice(0, MINE_SHOWN).map((i, n) => complaint(i, byTask[i.task_id], n)).join("")}</div>`
    : empty("You have not sent a complaint yet. Use Report a problem above.")}`;

const owners = (list = []) => `${secHead("Who owns the drains here")}<p class="muted small sec-note">Agency level only. The source of each owner is on the drain page.</p>
  ${list.length ? `<ul class="owners" role="list" tabindex="0" aria-label="Drain owners">${list.map(o => `<li class="card glass owner${o.agency_id ? "" : " none"}">
    <p class="owner-name">${o.agency_id ? esc(short(o.agency_name)) : "No owner found"}</p>
    <p class="owner-num"><strong>${esc(o.assets_owned)}</strong> <span class="small">${o.assets_owned === 1 ? "drain" : "drains"}</span></p>
    <p class="small owner-meta"><span>Open: ${esc((o.tasks && o.tasks.open) || 0)}</span><span${o.overdue ? ' class="late"' : ""}>Overdue: ${esc(o.overdue || 0)}</span></p></li>`).join("")}</ul>` : empty(EMPTY.accountability)}`;

const feed = (events) => `${secHead("Actions in your area")}${events.length ? `<div class="card glass feed-card"><ol class="feed">${events.map(e =>
  `<li class="ev ${EVENT_TONE[e.event] || "open"}"><p class="ev-label">${esc(e.label)}</p><p class="ev-where">${drainLink(e.asset_id, e.asset_name)}</p>
    <p class="small muted ev-meta">${esc(e.by)}${e.agency_id ? ` · <span class="ag">${esc(e.agency_id.toUpperCase())}</span>` : ""} · ${stamp(e.at)}</p></li>`).join("")}</ol>
  <a class="back feed-more" href="#/board">Full action log on the public board${icon("chevron-right")}</a></div>` : empty("No actions recorded in the area yet.")}`;

const tiles = () => `${secHead("Explore")}<nav class="tiles" aria-label="Dashboard sections">${TILES.map(([h, t, i]) =>
  `<a href="${h}"><span class="tile-ic">${icon(i)}</span><span>${esc(t)}</span></a>`).join("")}</nav>`;

// The hero paints at once with the area name, so the page does not jump when the counts arrive.
export const homeShell = () => `<div id="pane"><div class="home"><section class="home-hero" aria-busy="true"><p class="eyebrow">Your area</p>
  <h1>${esc(AREA)}</h1><p class="small">Loading your area...</p></section></div></div>`;

export function homeView({ me = null, mine = null, actions = [], owners: list = [] } = {}) {
  const c = areaCounts(actions), byTask = Object.fromEntries(actions.map(a => [a.task_id, a]));
  return `<div class="home"><section class="home-hero"><p class="eyebrow">Your area</p><h1>${esc(AREA)}</h1>
    <div class="area-stats">${[["open", "Open"], ["progress", "In progress"], ["resolved", "Resolved"]].map(([k, l]) =>
      `<div class="card glass lg" data-lg-css><strong>${esc(c[k])}</strong><span class="st ${k}">${esc(l)}</span></div>`).join("")}</div>
    ${c.disputed ? `<p class="hero-note small">${esc(c.disputed)} disputed by residents</p>` : ""}${cta(me)}</section>
    ${mineBlock(me, mine, byTask)}${owners(list)}${feed(activity(actions, FEED_SHOWN))}${tiles()}</div>`;
}
