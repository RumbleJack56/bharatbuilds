// web/js/controllers/admin.js — re-renders after every action so the no-owner list is never stale (B-3).
import { adminView } from "../views/admin.view.js";
import { guard } from "../ui/components.js";

export const admin = {
  path: "admin", roles: ["admin"],
  async mount(root, ctx) {
    const { tasks, dashboard } = ctx.services;
    const agencies = await dashboard.agencies();
    const draw = async (result) => {
      const d = await tasks.list({ agencyId: "none" });
      root.innerHTML = adminView({ tasks: d.tasks, agencies, banner: d.banner, result });
      root.querySelector("#gen").onclick = (e) => guard(e.target, async () => {
        const r = await dashboard.generatePlan(5);
        await draw(r.created_task_ids.length ? `Created ${r.created_task_ids.length} task(s): ${r.created_task_ids.join(", ")}.` : "No new tasks were needed.");
      }, ctx.toast.show);
      root.querySelectorAll("[data-task]").forEach(c => c.querySelector("button").onclick = (e) => guard(e.target, async () => {
        await tasks.assign(c.dataset.task, c.querySelector("select").value);
        ctx.toast.show("Assigned."); await draw(result);
      }, ctx.toast.show));
    };
    await draw("");
  },
};
