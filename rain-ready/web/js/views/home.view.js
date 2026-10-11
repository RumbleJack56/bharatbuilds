// web/js/views/home.view.js — the dashboard home, laid out like a phone app: area status on glass cards, the report
// button, my complaints with their progress, who owns the drains, recent actions in the area, and tiles to every tab. Pure.
import { esc, when } from "../ui/format.js";
import { empty, stagger } from "../ui/components.js";
import { KINDS } from "../ui/copy.js";
import { drainLink } from "./drain.view.js";

export const AREA = "Old Rajinder Nagar and Karol Bagh";
export const STEPS = [["open", "Reported"], ["accepted", "Accepted"], ["done", "Work done"], ["confirmed", "Confirmed"]];
const AT = { open: 0, accepted: 1, done: 2, confirmed: 3, disputed: 2, rejected: 0 };
export const STATUS_TEXT = { open: "Reported, waiting for the owner to accept", accepted: "Accepted by the owner", done: "Marked done, waiting for a resident to check",
  confirmed: "Resolved: a different resident confirmed the fix", disputed: "Disputed: a resident says it is still a problem", rejected: "Closed without action" };
const TILES = [["#/dash/map", "Map"], ["#/dash/accountability", "Who is responsible"], ["#/dash/actions", "Actions"], ["#/dash/impact", "Impact"],
  ["#/dash/simulator", "Simulator"], ["#/dash/capture", "Rain capture"], ["#/dash/insights", "Insights"], ["#/projection", "Projection"],
  ["#/city", "Delhi evidence"], ["#/places", "Waterlogging places"]];
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

const cta = (me) => !me ? `<a class="btn primary home-cta" href="#/login">Pick a resident to report a problem</a>`
  : me.role === "official" ? `<a class="btn primary home-cta" href="#/inbox">Open your inbox</a>`
  : `<a class="btn primary home-cta" href="#/report">Report a problem</a>`;

function complaint(i, a, n) {
  const where = a ? `${esc(a.asset_name)} · ${a.agency_id ? `Owner: ${esc(short(a.agency_name))}` : "No owner found"}`
    : i.asset_id ? `Drain ${esc(i.asset_id)}` : "No drain linked yet";
  const held = (i.flags || []).some(f => f.level === "warn");
  return `<a class="card glass rise tasklink complaint" ${stagger(n)} href="${i.task_id ? `#/task/${esc(i.task_id)}` : "#/mine"}">
    <strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="muted small">${esc(when(i.created_at))}</span>
    <p class="small">${where}</p>${a ? stepper(a.status) : `<p class="small">${held ? "Held for a check: saved, not counted toward a task yet" : "Not linked to a task yet"}</p>`}</a>`;
}

const mineBlock = (me, mine, byTask) => !me || me.role !== "resident" ? "" : `<h2>My complaints</h2>${mine && mine.length
  ? `<div class="list">${mine.slice(0, 5).map((i, n) => complaint(i, byTask[i.task_id], n)).join("")}</div>${mine.length > 5 ? `<p><a class="back" href="#/mine">All my reports</a></p>` : ""}`
  : empty("You have not sent a complaint yet. Use Report a problem above.")}`;

const owners = (list = []) => `<h2>Who owns the drains here</h2><p class="muted small">Agency level only. The source of each owner is on the drain page.</p>
  <div class="owners">${list.map(o => `<div class="card glass"><p class="owner-name">${o.agency_id ? esc(short(o.agency_name)) : "No owner found"}</p>
    <p><strong>${esc(o.assets_owned)}</strong> <span class="small">${o.assets_owned === 1 ? "drain" : "drains"}</span></p>
    <p class="small">Open: ${esc((o.tasks && o.tasks.open) || 0)} · overdue: ${esc(o.overdue || 0)}</p></div>`).join("")}</div>`;

const feed = (events) => `<h2>Actions in your area</h2>${events.length ? `<ul class="feed">${events.map(e => `<li><div><strong>${esc(e.label)}</strong> · ${drainLink(e.asset_id, e.asset_name)}
    <br><span class="small muted">${esc(e.by)}${e.agency_id ? ` · ${esc(e.agency_id.toUpperCase())}` : ""} · ${esc(when(e.at))}</span></div></li>`).join("")}</ul>
  <p><a class="back" href="#/board">Full action log on the public board</a></p>` : empty("No actions recorded in the area yet.")}`;

export const homeShell = () => `<div id="pane"><p class="muted">Loading your area...</p></div>`;

export function homeView({ me = null, mine = null, actions = [], owners: list = [] } = {}) {
  const c = areaCounts(actions), byTask = Object.fromEntries(actions.map(a => [a.task_id, a]));
  return `<section class="home-hero"><p class="eyebrow">Your area</p><h1>${esc(AREA)}</h1>
    <div class="area-stats">${[[c.open, "Open"], [c.progress, "In progress"], [c.resolved, "Resolved"]].map(([v, l]) =>
      `<div class="card glass lg" data-lg-css><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join("")}</div>
    ${c.disputed ? `<p class="small">${esc(c.disputed)} disputed by residents</p>` : ""}${cta(me)}</section>
    ${mineBlock(me, mine, byTask)}${owners(list)}${feed(activity(actions))}
    <h2>Explore</h2><nav class="tiles" aria-label="Dashboard sections">${TILES.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join("")}</nav>`;
}
