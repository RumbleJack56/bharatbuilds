// web/js/views/held.view.js — reports held for a check. Pure. Reporters are never named.
import { esc, when } from "../ui/format.js";
import { photos, flagList } from "../ui/components.js";
import { KINDS, EMPTY } from "../ui/copy.js";

const resultLine = (r) => !r ? "" : r.error ? `<p class="err" role="alert">${esc(r.error)}</p>`
  : `<p class="banner" role="status">${esc(r.text)}${r.taskId ? ` <a href="#/task/${esc(r.taskId)}">Open task ${esc(r.taskId)}</a>` : ""}</p>`;

const reviewBox = (i) => `<label for="n${esc(i.id)}">Note (optional)</label><textarea id="n${esc(i.id)}" maxlength="500"></textarea>
  ${i.asset_id ? "" : `<p class="small muted">No drain is linked to this report, so it cannot be released into a task.</p>`}
  <div class="row"><button class="primary" data-act="release" ${i.asset_id ? "" : "disabled"}>Release into the task list</button>
  <button data-act="reject">Reject (keep, not counted)</button></div>`;

const card = (i, places, canReview) => `<div class="card" data-inc="${esc(i.id)}">
  <h3>${esc(places[i.asset_id] || i.asset_id || "No drain linked")}</h3>
  <p class="small muted">${esc(KINDS[i.kind] || i.kind || "Kind not given")} - sent ${esc(when(i.created_at))} - held for a check</p>
  ${i.note ? `<p>${esc(i.note)}</p>` : ""}${photos([i.photo_url], "Report photo")}${flagList(i.flags)}${canReview ? reviewBox(i) : ""}</div>`;

export const heldView = ({ items, places = {}, canReview, result = null }) => `<h1>Held reports (${items.length})</h1>
  <p class="small muted">Saved and linked to a drain, but not counted toward a task until a coordinator decides.${canReview ? "" : " You can read them; only the coordinator decides."}</p>
  ${resultLine(result)}${items.length ? items.map(i => card(i, places, canReview)).join("") : `<p class="muted">${EMPTY.held}</p>`}`;
