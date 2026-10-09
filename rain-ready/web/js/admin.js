import { get, post } from "./api.js";
import { esc, banner, toast, guard, chip } from "./util.js";

export async function renderAdmin(view) {
  const [tl, acc] = await Promise.all([get("/api/tasks?agency_id=none"), get("/api/accountability")]);
  const ag = acc.agencies.filter(a => a.agency_id);
  view.innerHTML = `<h1>Coordinator</h1>${banner(tl.banner)}
    <div class="card"><h2>Ranked plan</h2><p class="small muted">Creates tasks for the top drains by fill time gained, if they have no live task.</p>
      <button class="primary big" id="gen">Generate ranked plan</button><p id="res"></p></div>
    <h2>Tasks with no owner (${tl.tasks.length})</h2><div id="l"></div>`;
  view.querySelector("#gen").onclick = e => guard(e.target, async () => {
    const r = await post("/api/plan/generate?top=5");
    view.querySelector("#res").textContent = r.created_task_ids.length ? `Created ${r.created_task_ids.length} task(s): ${r.created_task_ids.join(", ")}.` : "No new tasks were needed.";
  });
  const l = view.querySelector("#l");
  if (!tl.tasks.length) l.innerHTML = `<p class="muted">Every task has an owner.</p>`;
  tl.tasks.forEach(t => {
    const c = document.createElement("div"); c.className = "card";
    c.innerHTML = `${chip(t.status)} <h3><a href="#/task/${esc(t.id)}">${esc(t.asset_name)}</a></h3>
      <p class="small muted">${esc(t.owner_source || "")}</p><label>Assign to</label>
      <div class="row"><select>${ag.map(a => `<option value="${esc(a.agency_id)}">${esc(a.agency_name)}</option>`).join("")}</select><button class="primary">Assign</button></div>`;
    c.querySelector("button").onclick = e => guard(e.target, async () => {
      await post(`/api/tasks/${t.id}/assign`, { agency_id: c.querySelector("select").value }); toast("Assigned."); c.remove();
    });
    l.append(c);
  });
}
