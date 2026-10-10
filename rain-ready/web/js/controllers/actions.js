// web/js/controllers/actions.js — actions pane: one row per drain; the "Show" select refetches.
import { actionsView } from "../views/actions.view.js";
import { errBox } from "../ui/components.js";

export async function actionsPane(pane, ctx) {
  const load = async (top) => { pane.innerHTML = actionsView(await ctx.services.dashboard.actions(top), top); bind(); };
  let seq = 0;
  const bind = () => {
    const sel = pane.querySelector("#top");
    sel.onchange = async () => {
      const my = ++seq, top = +sel.value;
      try { const d = await ctx.services.dashboard.actions(top); if (my === seq) { pane.innerHTML = actionsView(d, top); bind(); } }
      catch (e) { if (my === seq) pane.querySelector("#alist").innerHTML = errBox(e); }
    };
  };
  try { await load(10); } catch (e) { pane.innerHTML = errBox(e); }
}
