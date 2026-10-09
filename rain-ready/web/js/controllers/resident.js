// web/js/controllers/resident.js — My reports and Confirm (check finished work).
import { mineView, confirmIntro, confirmCard } from "../views/resident.view.js";
import { errBox, guard } from "../ui/components.js";
import { esc } from "../ui/format.js";

export const mine = {
  path: "mine", roles: ["resident"],
  async mount(root, ctx) { root.innerHTML = mineView(await ctx.services.incidents.mine()); },
};

export const confirm = {
  path: "confirm", roles: ["resident"],
  async mount(root, ctx) {
    const { tasks } = await ctx.services.tasks.list({ status: "done" });
    const full = await Promise.all(tasks.map(t => ctx.services.tasks.get(t.id)));
    root.innerHTML = confirmIntro();
    const list = root.querySelector("#list");
    list.innerHTML = full.length ? full.map(confirmCard).join("") : `<p class="muted">Nothing to check right now.</p>`;
    list.querySelectorAll("[data-task]").forEach(card => card.querySelectorAll("button").forEach(b => b.onclick = () => guard(b, async () => {
      try {
        await ctx.services.tasks.confirm(card.dataset.task, { ok: b.dataset.ok === "1", note: card.querySelector("textarea").value });
        ctx.toast.show("Thank you. Your answer is recorded."); card.remove();
      } catch (e) {
        card.querySelector(".msg").innerHTML = e.status === 403
          ? `<p class="err" role="alert">You cannot check this one: ${esc(e.message)}. Another resident will need to.</p>` : errBox(e);
      }
    }, ctx.toast.show)));
  },
};
