// web/js/controllers/official.js — inbox and the task page with role-aware actions.
import { inboxView, inboxList, filterTasks, showing, taskDetail, disputeNote, openActions, disputedActions, acceptedActions, assignActions, waitingActions } from "../views/official.view.js";
import { guard } from "../ui/components.js";
import { esc } from "../ui/format.js";
import { CAMERA } from "../ui/copy.js";

const BACK = { official: "#/inbox", admin: "#/admin", resident: "#/mine" };
let filter = "all";                 // the last inbox filter, kept for the session so Back returns to the same view

export const inbox = {
  path: "inbox", roles: ["official"],
  async mount(root, ctx) {
    const me = await ctx.services.session.me();
    const data = await ctx.services.tasks.list({ agencyId: me.agency_id });
    // The list carries each disputed task's note (dispute_note); without it the note comes from the detail.
    const notes = {};
    await Promise.all(data.tasks.filter(t => t.status === "disputed").map(async t => {
      notes[t.id] = typeof t.dispute_note === "string" ? t.dispute_note : await ctx.services.tasks.get(t.id).then(disputeNote, () => "");   // one failure leaves that note empty
    }));
    root.innerHTML = inboxView(data, notes, filter);
    // Filters run on the loaded list: only the list redraws, so focus stays on the pressed chip.
    const box = root.querySelector(".ibx"), list = root.querySelector("#ibx-list");
    if (!box || !list) return;                                             // an empty inbox has no filters
    box.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      filter = btn.dataset.filter;
      box.querySelectorAll(".ibx-filter").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === filter)));
      box.querySelector(".ibx-showing").textContent = showing(data.tasks, filter);
      list.innerHTML = inboxList(filterTasks(data.tasks, filter), notes);
      if (!btn.classList.contains("ibx-filter")) box.querySelector(".ibx-filter[aria-pressed=true]").focus();   // "Show all" was redrawn away
    });
  },
};

export const task = {
  path: "task", roles: ["official", "admin", "resident"],
  async mount(root, ctx, [id]) {
    // Workaround: task detail has no banner; the empty list response carries it. Switch to t.banner when the API adds it.
    const [me, t, banner] = await Promise.all([ctx.services.session.me(), ctx.services.tasks.get(id),
      ctx.services.tasks.list({ status: "__none__" }).then(d => d.banner).catch(() => "")]);
    root.innerHTML = taskDetail(t, { banner, back: BACK[me.role] });
    const box = root.querySelector("#actions");
    const isAdmin = me.role === "admin";
    const canAct = isAdmin || (me.role === "official" && me.agency_id === t.agency_id);
    if (!canAct) return;
    const agencies = await ctx.services.dashboard.agencies();
    const act = (btn, fn, msg) => guard(btn, async () => { await fn(); ctx.toast.show(msg); ctx.nav.refresh(); }, ctx.toast.show);

    if (t.status === "open" && !t.agency_id) {
      box.innerHTML = assignActions({ agencies });
      box.querySelector("#assign").addEventListener("click", e =>
        act(e.target, () => ctx.services.tasks.assign(t.id, box.querySelector("#ag").value), "Assigned."));
      return;
    }
    if (t.status === "open") box.innerHTML = openActions({ agencies, current: t.agency_id });
    else if (t.status === "accepted") box.innerHTML = acceptedActions({ agencies, current: t.agency_id });
    else if (t.status === "disputed") box.innerHTML = disputedActions();
    else if (t.status === "done") { box.innerHTML = waitingActions(); return; }
    else return;

    box.querySelector("#acc")?.addEventListener("click", e => act(e.target, () => ctx.services.tasks.accept(t.id), "Accepted."));
    box.querySelector("#rej")?.addEventListener("click", e => {
      const reason = box.querySelector("#why").value.trim();
      if (!reason) return ctx.toast.show("Please give a short reason.");
      act(e.target, () => ctx.services.tasks.reject(t.id, { reason, reassignTo: box.querySelector("#to").value }), "Sent back.");
    });
    // After-photo: live camera, stamped; officials get no capture token.
    let photo = null, url = "";
    const cam = box.querySelector("#ph");
    if (cam && !ctx.camera.available()) { cam.disabled = true; box.querySelector("#camnote").textContent = CAMERA.none; }
    if (cam) cam.onclick = (ev) => guard(ev.target, async () => {
      try {
        const p = await ctx.services.capture.takePhoto({ withToken: false });
        if (url) URL.revokeObjectURL(url);
        photo = p; url = URL.createObjectURL(p.blob);
        box.querySelector("#prev").innerHTML = `<img alt="After-photo, location and time stamped" src="${esc(url)}">`;
        cam.textContent = "Retake after-photo"; box.querySelector("#camnote").textContent = "";
      } catch (e) { if (!e.cancelled) { box.querySelector("#camnote").textContent = e.message; ctx.toast.show(e.message); } }
    }, ctx.toast.show);
    box.querySelector("#done")?.addEventListener("submit", ev => {
      ev.preventDefault();
      if (!photo) return ctx.toast.show("An after-photo is required.");
      act(ev.submitter || box.querySelector("#done button[type=submit]"), async () => {
        try { await ctx.services.tasks.complete(t.id, { photo: photo.blob, note: box.querySelector("#nt").value }); }
        catch (e) { box.querySelector("#camnote").textContent = e.message; throw e; }          // 422: the server's "take it again" text stays on screen
      },
        "Marked done. A resident will check it.");
    });
  },
};
