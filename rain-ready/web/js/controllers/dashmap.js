// web/js/controllers/dashmap.js — map pane: pockets as labelled pixel-radius circles (B-1), drains, ranked tasks.
import { mapLegend, pocketCircle, pocketPopup, assetPopup, taskPopup } from "../views/dash.view.js";

export async function mapPane(pane, ctx) {
  const d = await ctx.services.dashboard.map();
  pane.innerHTML = mapLegend(d);
  if (!ctx.map.available()) { pane.querySelector("#m").textContent = "The map library could not load."; return null; }
  const view = ctx.map.create(pane.querySelector("#m"));
  const pts = [];
  d.pockets.forEach(p => {
    const [at, o] = pocketCircle(p);
    view.circle(at, { ...o, popup: pocketPopup(p) });
    pts.push([p.lat, p.lon]);
  });
  d.assets.forEach(a => {
    view.badge([a.lat, a.lon], { size: 14, popup: assetPopup(a),
      html: `<div class="drain ${a.agency_id ? "" : "noowner"}" title="${a.agency_id ? "Drain" : "Drain, no owner found"}"></div>` });
    pts.push([a.lat, a.lon]);
  });
  d.tasks.slice().sort((x, y) => y.rank_score - x.rank_score).forEach((t, i) =>
    view.badge([t.lat + 0.00012, t.lon + 0.00012], { size: 28, html: `<div class="rank">${i + 1}</div>`,
      popup: taskPopup(t, i + 1) }));
  view.fit(pts);
  return () => view.destroy();
}
