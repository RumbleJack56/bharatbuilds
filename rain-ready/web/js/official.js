import { get, post, postForm, photoUrl } from "./api.js";
import { esc, KINDS, FIELD_RULE, when, chip, hrs, banner, toast, guard, errBox, photosHtml } from "./util.js";

const EVENT = { created: "Task created", report_added: "Another report added", accepted: "Accepted", bounced: "Sent back: wrong owner",
  reassigned: "Reassigned", assigned: "Assigned", rejected: "Rejected", completed: "Marked done", confirmed: "Confirmed by a resident", disputed: "Disputed by a resident" };

export const taskCard = t => `<a class="card" style="display:block;text-decoration:none;color:inherit" href="#/task/${esc(t.id)}">
  <div>${chip(t.status)} ${t.overdue ? '<span class="chip overdue">overdue</span>' : ""} <span class="muted small">rank ${esc(Math.round(t.rank_score * 10) / 10)}</span></div>
  <h3>${esc(t.asset_name)}</h3>
  <p class="small muted">${esc(t.agency_name)} - ${esc(t.pocket_name || "no pocket")} - ${esc(t.report_count ?? "")} ${t.report_count == null ? "" : "report(s)"}</p>
  <p class="small">Cleaning this gains ${esc(hrs(t.gain_h))} of fill time (scenario).</p></a>`;

export async function renderInbox(view, me) {
  const d = await get("/api/tasks?agency_id=" + encodeURIComponent(me.agency_id));
  view.innerHTML = `<h1>Inbox</h1>${banner(d.banner)}` +
    (d.tasks.length ? d.tasks.map(taskCard).join("") : `<p class="muted">No tasks for your agency right now.</p>`);
}

export async function renderTask(view, me, id) {
  const t = await get("/api/tasks/" + encodeURIComponent(id));
  const canAct = me.role === "admin" || (me.role === "official" && me.agency_id === t.agency_id);
  view.innerHTML = `<p><a href="${me.role === "official" ? "#/inbox" : me.role === "admin" ? "#/admin" : "#/mine"}">Back</a></p>
    <h1>${esc(t.asset_name)}</h1>
    <div>${chip(t.status)} ${t.overdue ? '<span class="chip overdue">overdue</span>' : ""}</div>
    <p>Owner: <strong>${esc(t.agency_name)}</strong>${t.owner_source ? `<br><span class="small muted">Source: ${esc(t.owner_source)}</span>` : ""}</p>
    <p>${esc(t.pocket_name || "")} - cleaning this gains ${esc(hrs(t.gain_h))} of fill time. <span class="small muted">Scenario at illustrative values.</span></p>
    ${t.due_at ? `<p class="small muted">Due ${esc(when(t.due_at))}</p>` : ""}
    <p class="rule">${esc(FIELD_RULE)}</p>
    <div id="actions"></div>
    <h2>Reports (${t.incidents.length})</h2>
    ${t.incidents.map(i => `<div class="card"><strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="small muted">${esc(when(i.created_at))}</span>
      ${i.note ? `<p>${esc(i.note)}</p>` : ""}${photosHtml([photoUrl(i.photo_url)], "Report photo")}</div>`).join("")}
    <h2>History</h2><ul class="tl">${t.events.map(e => `<li><strong>${esc(EVENT[e.event] || e.event)}</strong>
      <span class="small muted">${esc(when(e.at))} - ${esc(e.actor_name)}${e.agency_id ? " - " + esc(e.agency_id.toUpperCase()) : ""}</span>
      ${e.note ? `<br>${esc(e.note)}` : ""}${photosHtml([photoUrl(e.photo_url)], "After photo")}</li>`).join("")}</ul>`;
  if (canAct) await actions(view, t);
}

async function actions(view, t) {
  const box = view.querySelector("#actions");
  const reload = () => { location.hash = "#/task/" + t.id; window.dispatchEvent(new HashChangeEvent("hashchange")); };
  if (t.status === "open") {
    if (!t.agency_id) { box.innerHTML = `<p class="banner">No owner found. A ward coordinator must assign an agency first.</p>`; return; }
    const ag = (await get("/api/accountability")).agencies.filter(a => a.agency_id && a.agency_id !== t.agency_id);
    box.innerHTML = `<div class="card"><button class="primary big" id="acc">Accept this task</button>
      <h3 style="margin-top:14px">Not ours?</h3><label for="why">Reason</label><input type="text" id="why" placeholder="For example: this drain belongs to PWD">
      <label for="to">Send to</label><select id="to"><option value="">No other agency (reject)</option>
      ${ag.map(a => `<option value="${esc(a.agency_id)}">${esc(a.agency_name)}</option>`).join("")}</select>
      <p><button id="rej" style="width:100%">Not ours</button></p></div>`;
    box.querySelector("#acc").onclick = e => guard(e.target, async () => { await post(`/api/tasks/${t.id}/accept`); toast("Accepted."); reload(); });
    box.querySelector("#rej").onclick = e => guard(e.target, async () => {
      const reason = box.querySelector("#why").value.trim();
      if (!reason) return toast("Please give a short reason.");
      await post(`/api/tasks/${t.id}/reject`, { reason, reassign_to: box.querySelector("#to").value || null });
      toast("Sent back."); reload();
    });
  } else if (t.status === "accepted") {
    box.innerHTML = `<form class="card"><h3>Mark as done</h3><p class="small muted">Photograph the finished work from the footpath.</p>
      <input type="file" id="ph" accept="image/*" capture="environment" required>
      <label for="nt">Note</label><textarea id="nt" maxlength="300"></textarea>
      <button class="primary big" type="submit">Submit with after-photo</button></form>`;
    box.querySelector("form").onsubmit = ev => {
      ev.preventDefault();
      const f = box.querySelector("#ph").files[0];
      if (!f) return toast("An after-photo is required.");
      guard(ev.submitter || box.querySelector("button"), async () => {
        const fd = new FormData(); fd.append("photo", f); fd.append("note", box.querySelector("#nt").value);
        await postForm(`/api/tasks/${t.id}/complete`, fd); toast("Marked done. A resident will check it."); reload();
      });
    };
  } else if (t.status === "done") box.innerHTML = `<p class="banner">Waiting for a resident to check the work.</p>`;
}
