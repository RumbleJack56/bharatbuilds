// web/js/controllers/held.js — held queue. Admin decides; an official only reads. Re-renders after every decision.
import { heldView } from "../views/held.view.js";
import { guard } from "../ui/components.js";

export const held = {
  path: "held", roles: ["admin", "official"],
  async mount(root, ctx) {
    const { session, incidents, dashboard } = ctx.services;
    const canReview = (await session.me()).role === "admin";
    // Place names come from the public map (the incident carries only the drain id); fall back to the id.
    const places = await dashboard.map().then(m => Object.fromEntries(m.assets.map(a => [a.id, a.name])), () => ({}));
    const draw = async (result = null) => {
      root.innerHTML = heldView({ items: await incidents.held(), places, canReview, result });
      root.querySelectorAll("[data-inc]").forEach(c => ["release", "reject"].forEach(decision => {
        const btn = c.querySelector(`[data-act="${decision}"]`);
        if (!btn) return;
        btn.onclick = (e) => guard(e.target, async () => {
          let r;
          try { r = await incidents.review(c.dataset.inc, { decision, note: c.querySelector("textarea").value.trim() }); }
          catch (err) { if (err.status === 404 || err.status === 409) return draw({ error: err.message }); throw err; }
          await draw(decision === "release"
            ? { text: "Released: the report now counts toward the task.", taskId: r.task_id }
            : { text: "Rejected: the report stays visible and is not counted." });
        }, ctx.toast.show);
      }));
    };
    await draw();
  },
};
