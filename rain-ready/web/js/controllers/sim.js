// web/js/controllers/sim.js — simulator pane. Shows errors instead of swallowing them (B-9); ignores stale responses.
import { simControls, simResults, DEFAULT_RAIN } from "../views/sim.view.js";
import { errBox } from "../ui/components.js";

export async function simPane(pane, ctx) {
  let ref;
  try { ({ reference_rain_mm_h: ref } = await ctx.services.dashboard.map()); }      // the server's reference rain is the starting point
  catch (e) { pane.innerHTML = errBox(e); return; }
  pane.innerHTML = simControls(ref ?? DEFAULT_RAIN, "current", ref != null);
  const res = pane.querySelector("#res");
  let seq = 0;
  const run = async () => {
    const my = ++seq, rain = +pane.querySelector("#rain").value;
    pane.querySelector("#rv").textContent = rain;
    try {
      const d = await ctx.services.dashboard.simulate({ rain, state: pane.querySelector("[name=st]:checked").value });
      if (my === seq) res.innerHTML = simResults(d);
    } catch (e) { if (my === seq) res.innerHTML = errBox(e); }
  };
  pane.querySelector("#rain").oninput = run;
  pane.querySelectorAll("[name=st]").forEach(r => { r.onchange = run; });
  await run();
}
