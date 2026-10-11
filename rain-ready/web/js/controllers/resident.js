// web/js/controllers/resident.js — My reports (with each task's progress from the public log) and Confirm (check finished work).
import { mineView, confirmIntro, confirmList } from "../views/resident.view.js";
import { errBox, guard } from "../ui/components.js";

export const mine = {
  path: "mine", roles: ["resident"],
  async mount(root, ctx) {
    const { incidents, dashboard } = ctx.services;
    const [list, log] = await Promise.all([
      incidents.mine(),
      dashboard ? dashboard.transparency({ limit: 200 }).catch(() => null) : null,   // progress is extra: a failed log never hides the list
    ]);
    const byTask = Object.fromEntries(((log && log.actions) || []).map(a => [a.task_id, a]));
    root.innerHTML = mineView(list, byTask);
  },
};

export const confirm = {
  path: "confirm", roles: ["resident"],
  async mount(root, ctx) {
    const { tasks } = await ctx.services.tasks.list({ status: "done" });
    const full = await Promise.all(tasks.map(t => ctx.services.tasks.get(t.id)));
    root.innerHTML = confirmIntro();
    const list = root.querySelector("#list");
    list.innerHTML = confirmList(full);
    list.querySelectorAll("[data-task]").forEach(card => card.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => guard(b, async () => {
      try {
        await ctx.services.tasks.confirm(card.dataset.task, { ok: b.dataset.ok === "1", note: card.querySelector("textarea").value });
        ctx.toast.show("Thank you. Your answer is recorded."); card.remove();
      } catch (e) {
        card.querySelector(".msg").innerHTML = errBox(e);               // the server's text, e.g. 403 "you reported this problem, so someone else has to check the fix"
      }
    }, ctx.toast.show)));
  },
};
