import { get, post, photoUrl } from "./api.js";
import { esc, KINDS, when, chip, toast, guard, errBox, photosHtml, FIELD_RULE } from "./util.js";

export async function renderMine(view) {
  const { incidents } = await get("/api/incidents?mine=true");
  view.innerHTML = `<h1>My reports</h1>` + (incidents.length ? incidents.map(i => `<div class="card">
      <strong>${esc(KINDS[i.kind] || i.kind)}</strong> <span class="muted small">${esc(when(i.created_at))}</span>
      ${i.note ? `<p>${esc(i.note)}</p>` : ""}${photosHtml([photoUrl(i.photo_url)], "Your photo")}
      <p class="small">${i.asset_id ? `Drain ${esc(i.asset_id)}` : "No drain linked"}
      ${i.task_id ? ` - <a href="#/task/${esc(i.task_id)}">Task ${esc(i.task_id)}</a>` : ""}</p></div>`).join("")
    : `<p class="muted">You have not sent any reports yet.</p><a class="btn primary" href="#/report">Report a problem</a>`);
}

export async function renderConfirm(view) {
  const { tasks } = await get("/api/tasks?status=done");
  const full = await Promise.all(tasks.map(t => get("/api/tasks/" + t.id)));
  view.innerHTML = `<h1>Check finished work</h1><p class="muted">Officials say these jobs are done. Go and look from the footpath, then tell us what you see.</p>
    <p class="rule">${esc(FIELD_RULE)}</p><div id="list"></div>`;
  const list = view.querySelector("#list");
  if (!full.length) list.innerHTML = `<p class="muted">Nothing to check right now.</p>`;
  full.forEach(t => {
    const done = [...t.events].reverse().find(e => e.event === "completed");
    const el = document.createElement("div"); el.className = "card";
    el.innerHTML = `<h3>${esc(t.asset_name)}</h3><p class="small muted">${esc(t.agency_name)} - ${esc(t.pocket_name || "")}</p>
      <h3>Before (resident reports)</h3>${photosHtml(t.incidents.map(i => photoUrl(i.photo_url)), "Before")}
      <ul>${t.incidents.map(i => `<li>${esc(KINDS[i.kind] || i.kind)}${i.note ? ": " + esc(i.note) : ""}</li>`).join("")}</ul>
      <h3>After (from the official)</h3>${photosHtml([done && photoUrl(done.photo_url)], "After")}
      ${done && done.note ? `<p>${esc(done.note)}</p>` : ""}
      <label>Note (optional)</label><textarea maxlength="300"></textarea>
      <div class="row"><button class="primary" data-ok="1">Looks fixed</button><button data-ok="0">Still a problem</button></div>
      <div class="msg"></div>`;
    el.querySelectorAll("button").forEach(b => b.onclick = () => guard(b, async () => {
      try {
        await post(`/api/tasks/${t.id}/confirm`, { ok: b.dataset.ok === "1", note: el.querySelector("textarea").value });
        toast("Thank you. Your answer is recorded."); el.remove();
      } catch (e) {
        el.querySelector(".msg").innerHTML = e.status === 403 && /did the work/.test(e.message)
          ? `<p class="err">You cannot check this one: the person who did the work cannot confirm it. Another resident will need to.</p>` : errBox(e);
      }
    }));
    list.append(el);
  });
}
