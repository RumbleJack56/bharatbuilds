import { get, setUserId } from "./api.js";
import { esc, $ } from "./util.js";

const ROLE = { resident: "Resident", official: "Official", admin: "Coordinator" };

export async function renderLogin(view, done) {
  const d = await get("/api/users");
  view.innerHTML = `<h1>Who are you?</h1><p class="banner">${esc(d.note)}</p>
    ${d.users.map(u => `<button class="card persona" data-id="${esc(u.id)}" style="width:100%;text-align:left">
      <strong>${esc(u.name)}</strong><br><span class="muted small">${esc(ROLE[u.role] || u.role)}${u.agency_id ? " - " + esc(u.agency_id.toUpperCase()) : ""}</span></button>`).join("")}
    <p><a class="btn" href="#/dash">Open the public dashboard</a></p>`;
  view.querySelectorAll(".persona").forEach(b => b.addEventListener("click", () => { setUserId(b.dataset.id); done(); }));
}
