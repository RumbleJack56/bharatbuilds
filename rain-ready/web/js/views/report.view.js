// web/js/views/report.view.js — report form (three step cards: photo, place, details) and the result card. Pure.
import { esc } from "../ui/format.js";
import { flagList, icon } from "../ui/components.js";
import { NO_OWNER, NEAREST } from "../ui/copy.js";

const stepHead = (n, id, title, hint = "") =>
  `<h2 class="step-h" id="${id}"><span class="step-n" aria-hidden="true">${n}</span>${esc(title)}${hint ? ` <small>${esc(hint)}</small>` : ""}</h2>`;

export function reportForm({ fieldRule, kinds }) {
  return `<div class="screen-head"><div><h1>Report a problem</h1><p class="screen-sub">A photo, the place, and what you see.</p></div></div>
  <p class="rule">${esc(fieldRule)}</p>
  <form id="f" class="steps">
    <section class="card glass step" aria-labelledby="st-photo">${stepHead(1, "st-photo", "Photo", "from the footpath")}
      <button type="button" id="cam" class="big primary lg" data-lg-css>${icon("camera")}<span id="camlbl">Take photo</span></button>
      <p class="small err-note" id="camnote" role="alert"></p>
      <div id="prev" class="photos"></div>
      <button type="button" id="rm" hidden>Remove photo</button>
      <p class="small muted">The photo is location and time stamped.</p></section>
    <section class="card glass step" aria-labelledby="st-where">${stepHead(2, "st-where", "Where is it?")}
      <button type="button" id="gps">Use my location</button>
      <p class="small muted" id="coords" aria-live="polite"></p>
      <div id="mini" class="map mini" data-liquid-ignore></div>
      <p class="small muted">Tap the map to move the pin.</p></section>
    <section class="card glass step" aria-labelledby="st-what">${stepHead(3, "st-what", "Details")}
      <label for="kind">What do you see?</label>
      <select id="kind"><option value="">Not sure (the app suggests from the photo)</option>
        ${Object.entries(kinds).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select>
      <label for="note">Note (optional)</label>
      <textarea id="note" maxlength="500" placeholder="For example: leaves and plastic block the grate"></textarea></section>
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
  return `<section class="card glass result" aria-labelledby="res-h" tabindex="-1"><h2 id="res-h">Report received</h2><p>${esc(r.message)}</p>
    ${ai ? `<p><strong>Suggested from your photo:</strong> ${esc(ai.summary)} <span class="small muted">(automatic; check it)</span></p>` : ""}
    ${r.linked_asset ? `<p>Linked drain: <strong>${esc(r.linked_asset)}</strong> (${esc(r.distance_m)} m away)</p>` : nearest ? `<p>${esc(NEAREST(nearest.drain.name, nearest.m))}</p>` : ""}
    ${r.linked_asset && ownerless ? `<p>${esc(NO_OWNER)}</p>` : ""}
    ${task}${flagList(r.flags)}
    <div class="result-acts"><a class="btn primary" href="#/mine">Follow it in My reports</a>${r.task_id ? `<a class="btn" href="#/task/${esc(r.task_id)}">See the task</a>` : ""}</div>
    <p class="rule">${esc(r.field_rule)}</p></section>`;
}
