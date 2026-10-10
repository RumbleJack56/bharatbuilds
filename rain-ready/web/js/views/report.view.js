// web/js/views/report.view.js — report form and result card. Pure.
import { esc } from "../ui/format.js";
import { flagList } from "../ui/components.js";
import { NO_OWNER, NEAREST } from "../ui/copy.js";

export function reportForm({ fieldRule, kinds }) {
  return `<h1>Report a problem</h1><p class="rule">${esc(fieldRule)}</p>
  <form id="f">
    <label>Photo (from the footpath)</label>
    <button type="button" id="cam" class="big primary lg" data-lg-css>Take photo</button>
    <p class="small err-note" id="camnote" role="alert"></p>
    <p class="small muted">The photo is location and time stamped.</p>
    <div id="prev" class="photos"></div>
    <button type="button" id="rm" hidden>Remove photo</button>
    <label>Where is it?</label>
    <div class="row"><button type="button" id="gps">Use my location</button></div>
    <p class="small muted" id="coords"></p>
    <div id="mini" class="map mini" data-liquid-ignore></div>
    <p class="small muted">Tap the map to move the pin.</p>
    <label for="kind">What do you see?</label>
    <select id="kind"><option value="">Not sure (the app suggests from the photo)</option>
      ${Object.entries(kinds).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select>
    <label for="note">Note (optional)</label>
    <textarea id="note" maxlength="500" placeholder="For example: leaves and plastic block the grate"></textarea>
    <button class="primary big lg fab" data-lg-css id="send" type="submit">Send report</button>
  </form><div id="out"></div>`;
}

// extra: { nearest: {drain, m} when nothing linked, ownerless: the linked drain has no agency }
export function reportResult(r, { nearest, ownerless } = {}) {
  const ai = r.incident && r.incident.ai;
  const task = r.held_for_review
    ? "<p><strong>This report is saved and linked to the drain, but it is held for a check</strong> before it creates or adds to a task.</p>"
    : r.task_id == null ? "<p>No task was created.</p>" : r.task_created
      ? "<p><strong>A new task was created</strong> for this drain.</p>"
      : "<p><strong>This drain already had a task.</strong> Your report was added to it.</p>";
  return `<div class="card glass"><h2>Report received</h2><p>${esc(r.message)}</p>
    ${ai ? `<p><strong>Suggested from your photo:</strong> ${esc(ai.summary)} <span class="small muted">(automatic; check it)</span></p>` : ""}
    ${r.linked_asset ? `<p>Linked drain: <strong>${esc(r.linked_asset)}</strong> (${esc(r.distance_m)} m away)</p>` : nearest ? `<p>${esc(NEAREST(nearest.drain.name, nearest.m))}</p>` : ""}
    ${r.linked_asset && ownerless ? `<p>${esc(NO_OWNER)}</p>` : ""}
    ${task}${flagList(r.flags)}${r.task_id ? `<p><a href="#/task/${esc(r.task_id)}">See the task</a></p>` : ""}
    <p class="rule">${esc(r.field_rule)}</p></div>`;
}
