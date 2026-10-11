// web/js/views/login.view.js — phone-app welcome: photo header, then the demo persona picker grouped by role. Pure.
import { esc, initials } from "../ui/format.js";
import { ROLE } from "../ui/copy.js";
import { icon } from "../ui/components.js";

// Residents first (they send complaints), then officials, then the coordinator. Unknown roles land in "Other".
export const GROUPS = [
  ["resident", "Residents", "Send complaints, follow them, and check finished work."],
  ["official", "Officials", "Accept tasks for your agency and mark them done with a photo."],
  ["admin", "Coordinator", "Assign owners and look at reports held for a check."],
];

const who = (u) => `${ROLE[u.role] || u.role}${u.agency_id ? " · " + String(u.agency_id).toUpperCase() : ""}`;
const row = (u) => `<li><button class="persona" type="button" data-id="${esc(u.id)}">
  <span class="initials ${esc(u.role)}" aria-hidden="true">${esc(initials(u.name))}</span>
  <span class="persona-text"><strong>${esc(u.name)}</strong><span>${esc(who(u))}</span></span>${icon("chevron-right", "ic chev")}</button></li>`;

export function personaGroups(users = []) {
  const known = new Set(GROUPS.map(([r]) => r));
  return [...GROUPS, ["", "Other", ""]]
    .map(([role, title, sub]) => [title, sub, users.filter(u => role ? u.role === role : !known.has(u.role))])
    .filter(([, , list]) => list.length)
    .map(([title, sub, list], n) => `<h3 class="group-h" id="pg-${n}">${esc(title)}</h3>${sub ? `<p class="group-sub">${esc(sub)}</p>` : ""}
    <ul class="plist" aria-labelledby="pg-${n}">${list.map(row).join("")}</ul>`).join("");
}

const link = (href, ic, title, sub) => `<a class="plink" href="${href}"><span class="plink-ic${ic ? "" : " drop"}" aria-hidden="true">${ic ? icon(ic) : ""}</span>
  <span class="persona-text"><strong>${esc(title)}</strong><span>${esc(sub)}</span></span>${icon("chevron-right", "ic chev")}</a>`;

export const loginView = ({ users = [], note = "" } = {}) => `<div class="signin">
  <section class="signin-hero" aria-labelledby="signin-h"><p class="signin-tag">Monsoon waterlogging · Delhi</p>
    <h1 id="signin-h">Clean the right drain first</h1><p>A shared action list for monsoon waterlogging.</p></section>
  <section class="signin-panel" aria-labelledby="who-h"><h2 id="who-h">Who are you?</h2>
    <p class="banner">${esc(note)}</p>${personaGroups(users)}
    <h3 class="group-h" id="pg-open">Look around first</h3>
    <nav class="plist" aria-labelledby="pg-open">${link("#/dash", "layout-dashboard", "Open the public dashboard", "Area status, drain owners and recent actions")}
      ${link("#/board", "trophy", "Who acts, how fast", "Every agency's record from the public log")}
      ${link("/", "", "About the project", "What Rain-Ready is and how it works")}</nav>
  </section></div>`;
