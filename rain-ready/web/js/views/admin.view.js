// web/js/views/admin.view.js — coordinator screen. Pure.
import { esc } from "../ui/format.js";
import { chip, banner } from "../ui/components.js";
import { EMPTY } from "../ui/copy.js";

export const adminView = ({ tasks, agencies, banner: b, result = "" }) => `<h1>Coordinator</h1>${banner(b)}
  <div class="card glass"><h2>Ranked plan</h2><p class="small muted">Creates tasks for the top drains by fill time gained, if they have no live task.</p>
    <button class="primary big" id="gen">Generate ranked plan</button><p id="res">${esc(result)}</p></div>
  <h2>Tasks with no owner (${tasks.length})</h2>
  ${tasks.length ? tasks.map(t => `<div class="card glass" data-task="${esc(t.id)}">${chip(t.status)}
    <h3><a href="#/task/${esc(t.id)}">${esc(t.asset_name)}</a></h3><p class="small muted">${esc(t.owner_source || "")}</p>
    <label>Assign to</label><div class="row"><select>${agencies.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("")}</select>
    <button class="primary">Assign</button></div></div>`).join("") : `<p class="muted">${EMPTY.admin}</p>`}`;
