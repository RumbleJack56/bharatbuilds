// web/js/controllers/projection.js — rain and silt projection. Fetches once; the rain and day pickers re-render locally.
import { projectionView, projectionBody, initialPick } from "../views/projection.view.js";

export const projection = {
  path: "projection", roles: null,
  async mount(root, ctx, params = []) {
    const d = await ctx.services.projection.projection();     // a failed fetch is an error for the router
    let pick = initialPick(d, params);
    root.innerHTML = projectionView(d, pick);
    const body = root.querySelector("#pj");
    body.onclick = (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;   // let a new-tab click open the link
      const a = e.target?.closest?.("[data-rain],[data-horizon]");
      if (!a) return;
      e.preventDefault();                                     // stay on this route: a hash change would refetch
      const kind = a.dataset.rain != null ? "rain" : "horizon";
      pick = { ...pick, [kind]: +a.dataset[kind] };
      body.innerHTML = projectionBody(d, pick);
      body.querySelector(`[data-${kind}="${pick[kind]}"]`)?.focus();   // keep keyboard focus on the picker
    };
  },
};
