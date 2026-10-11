// web/js/controllers/drain.js — public drain page (#/drain/<asset_id>): one GET, then an optional mini map.
import { drainView, drainMissing, drainMarker } from "../views/drain.view.js";

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export const drain = {
  path: "drain", roles: null,
  async mount(root, ctx, [raw] = []) {
    const id = decode(raw || "").trim();
    if (!id) { root.innerHTML = drainMissing(null); return; }
    let d;
    try { d = await ctx.services.drains.asset(id); }
    catch (e) { root.innerHTML = drainMissing(e); return; }   // unknown id (404) or no connection: say so, keep the back link
    root.innerHTML = drainView(d);
    const el = root.querySelector("#dm");
    if (!el) return;                                           // no position on record
    if (!ctx.map.available()) { el.hidden = true; return; }
    const at = [d.asset.lat, d.asset.lon];
    const view = ctx.map.create(el, { center: at, zoom: 17 });
    view.badge(at, { size: 14, html: drainMarker(d.asset) });
    return () => view.destroy();
  },
};
