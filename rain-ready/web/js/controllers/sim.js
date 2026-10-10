// web/js/controllers/sim.js — simulator pane. Shows errors instead of swallowing them (B-9); ignores stale responses; draws pockets on a map.
import { simControls, simResults, simCaption, DEFAULT_RAIN } from "../views/sim.view.js";
import { pocketCircle } from "../views/dash.view.js";
import { errBox } from "../ui/components.js";

export async function simPane(pane, ctx) {
  let ref;
  try { ({ reference_rain_mm_h: ref } = await ctx.services.dashboard.map()); }      // the server's reference rain is the starting point
  catch (e) { pane.innerHTML = errBox(e); return; }
  pane.innerHTML = simControls(ref ?? DEFAULT_RAIN, "current", ref != null);
  const res = pane.querySelector("#res");
  const view = ctx.map?.available() ? ctx.map.create(pane.querySelector("#m")) : null;
  if (!view) { const m = pane.querySelector("#m"); if (m) m.hidden = true; }
  let seq = 0, fitted = false, gone = false;
  const draw = (results) => {
    if (!view) return;
    view.clear();
    results.forEach(p => view.circle(...pocketCircle(p)));
    if (!fitted && results.length) { view.fit(results.map(p => [p.lat, p.lon])); fitted = true; }   // zoom once so the slider does not move the view
  };
  const run = async () => {
    const my = ++seq, rain = +pane.querySelector("#rain").value;
    pane.querySelector("#rv").textContent = rain;
    try {
      const d = await ctx.services.dashboard.simulate({ rain, state: pane.querySelector("[name=st]:checked").value });
      if (my !== seq || gone) return;
      res.innerHTML = simResults(d);
      pane.querySelector("#cap").textContent = simCaption(rain);
      draw(d.results);
    } catch (e) { if (my === seq && !gone) res.innerHTML = errBox(e); }
  };
  pane.querySelector("#rain").oninput = run;
  pane.querySelectorAll("[name=st]").forEach(r => { r.onchange = run; });
  await run();
  return () => { gone = true; seq++; view?.destroy(); };
}
