// web/js/views/login.view.js — hero (EcoPower Framer look) and the persona picker. Pure.
import { esc, initials } from "../ui/format.js";
import { ROLE } from "../ui/copy.js";

const go = (href, text) => `<a class="btn go" href="${href}"><span>${text}</span><i aria-hidden="true"></i></a>`;

export const loginView = ({ users, note }) => `<section class="hero" aria-labelledby="hero-h">
  <p class="hero-word" aria-hidden="true">Rain-Ready</p>
  <div class="hero-body"><h1 id="hero-h">Clean the right drain first</h1>
    <div><p>A shared action list for monsoon waterlogging: what to clean, who owns it, who did it, who checked, and did it help.</p>${go("/", "About the project")}</div></div>
  </section>
  <p class="eyebrow">Demo login</p><h2>Who are you?</h2><p class="banner">${esc(note)}</p>
  <div class="personas">${users.map(u => `<button class="card glass persona" data-id="${esc(u.id)}"><span class="initials" aria-hidden="true">${esc(initials(u.name))}</span>
    <span><strong>${esc(u.name)}</strong><span class="muted small">${esc(ROLE[u.role] || u.role)}${u.agency_id ? " - " + esc(u.agency_id.toUpperCase()) : ""}</span></span></button>`).join("")}</div>
  <div class="links">${go("#/dash", "Open the public dashboard")}<a class="btn" href="#/board">Who acts, how fast</a></div>`;
