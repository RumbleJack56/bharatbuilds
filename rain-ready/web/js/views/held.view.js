// web/js/views/held.view.js — reports held for a check, in the inbox look. Pure. Reporters are never named.
import { esc, when } from "../ui/format.js";
import { photos, flagList, stagger, empty, icon } from "../ui/components.js";
import { KINDS, EMPTY } from "../ui/copy.js";

// tabindex=-1: the controller moves focus here after a decision redraws the list.
const resultLine = (r) => !r ? "" : r.error ? `<p class="err hld-result" role="alert" tabindex="-1">${esc(r.error)}</p>`
  : `<p class="banner hld-result" role="status" tabindex="-1">${esc(r.text)}${r.taskId ? ` <a href="#/task/${esc(r.taskId)}">Open task ${esc(r.taskId)}</a>` : ""}</p>`;

const reviewBox = (i) => `<div class="hld-review"><label for="n${esc(i.id)}">Note (optional)</label><textarea id="n${esc(i.id)}" maxlength="500"></textarea>
  ${i.asset_id ? "" : `<p class="small muted">No drain is linked to this report, so it cannot be released into a task.</p>`}
  <div class="hld-acts"><button class="primary" data-act="release" ${i.asset_id ? "" : "disabled"}>Release into the task list</button>
  <button data-act="reject">Reject (keep, not counted)</button></div></div>`;

const card = (i, places, canReview, n = 0) => `<div class="card glass rise" ${stagger(n)} data-inc="${esc(i.id)}">
  <div class="ibx-top"><span class="chip held">held for a check</span><span class="hld-when">Sent ${esc(when(i.created_at))}</span></div>
  <h3>${esc(places[i.asset_id] || i.asset_id || "No drain linked")}</h3>
  <ul class="ibx-meta"><li>${icon("camera")}<span>${esc(KINDS[i.kind] || i.kind || "Kind not given")}</span></li>
  ${i.asset_id ? `<li>${icon("map-pin")}<span>${esc(i.asset_id)}</span></li>` : ""}</ul>
  ${i.note ? `<blockquote class="quote">${esc(i.note)}</blockquote>` : ""}${photos([i.photo_url], "Report photo")}${flagList(i.flags)}${canReview ? reviewBox(i) : ""}</div>`;

export const heldView = ({ items, places = {}, canReview, result = null }) => `<div class="hld">
  <header class="ibx-hero"><p class="eyebrow">Coordinator queue</p><h1>Held reports <span class="hld-n">${items.length}</span></h1>
  <p class="hld-why">Saved and linked to a drain, but not counted toward a task until a coordinator decides.${canReview ? "" : " You can read them; only the coordinator decides."}</p></header>
  ${resultLine(result)}${items.length ? `<div class="list">${items.map((i, n) => card(i, places, canReview, n)).join("")}</div>` : `<div class="ibx-empty">${empty(EMPTY.held)}</div>`}</div>`;
