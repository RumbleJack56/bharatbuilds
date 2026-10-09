// web/js/views/login.view.js — persona picker. Pure.
import { esc } from "../ui/format.js";
import { ROLE } from "../ui/copy.js";

export const loginView = ({ users, note }) => `<h1>Who are you?</h1><p class="banner">${esc(note)}</p>
  ${users.map(u => `<button class="card persona" data-id="${esc(u.id)}" style="width:100%;text-align:left">
    <strong>${esc(u.name)}</strong><br><span class="muted small">${esc(ROLE[u.role] || u.role)}${u.agency_id ? " - " + esc(u.agency_id.toUpperCase()) : ""}</span></button>`).join("")}
  <p><a class="btn" href="#/dash">Open the public dashboard</a></p>`;
