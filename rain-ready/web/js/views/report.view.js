// web/js/views/report.view.js — report form and result card. Pure.
import { esc } from "../ui/format.js";
import { flagList } from "../ui/components.js";

export function reportForm({ fieldRule, kinds }) {
  return `<h1>Report a problem</h1><p class="rule">${esc(fieldRule)}</p>
  <form id="f">
    <label for="photo">Photo (from the footpath)</label>
    <input id="photo" type="file" accept="image/*" capture="environment" hidden>
    <button type="button" id="cam" class="big primary">Take or choose a photo</button>
    <div id="prev" class="photos"></div>
    <label>Where is it?</label>
    <div class="row"><button type="button" id="gps">Use my location</button></div>
    <p class="small muted" id="coords"></p>
    <div id="mini" class="map mini"></div>
    <p class="small muted">Tap the map to move the pin.</p>
    <label for="kind">What do you see?</label>
    <select id="kind"><option value="">Not sure (the app suggests from the photo)</option>
      ${Object.entries(kinds).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select>
    <label for="note">Note (optional)</label>
    <textarea id="note" maxlength="500" placeholder="For example: leaves and plastic block the grate"></textarea>
    <button class="primary big" id="send" type="submit">Send report</button>
  </form><div id="out"></div>`;
}

export function reportResult(r) {
  const ai = r.incident && r.incident.ai;
  const task = r.held_for_review
    ? "<p><strong>This report is saved and linked to the drain, but it is held for a check</strong> before it creates or adds to a task.</p>"
    : r.task_id == null ? "<p>No task was created.</p>" : r.task_created
      ? "<p><strong>A new task was created</strong> for this drain.</p>"
      : "<p><strong>This drain already had a task.</strong> Your report was added to it.</p>";
  return `<div class="card"><h2>Report received</h2><p>${esc(r.message)}</p>
    ${ai ? `<p><strong>Suggested from your photo:</strong> ${esc(ai.summary)} <span class="small muted">(automatic; check it)</span></p>` : ""}
    ${r.linked_asset ? `<p>Linked drain: <strong>${esc(r.linked_asset)}</strong> (${esc(r.distance_m)} m away)</p>` : ""}
    ${task}${flagList(r.flags)}${r.task_id ? `<p><a href="#/task/${esc(r.task_id)}">See the task</a></p>` : ""}
    <p class="rule">${esc(r.field_rule)}</p></div>`;
}
