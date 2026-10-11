// web/js/controllers/places.js — city waterlogging places explorer (#/places) and one PWD road (#/road/<code>). Public, read only.
import { placesShell, placesResults, roadView, roadError, NOT_IN_INVENTORY, NO_CODE } from "../views/places.view.js";
import { errBox } from "../ui/components.js";

export const DEFAULT_FILTER = { chronic: false, owner: "", road: "", minDates: 1, limit: 50 };
const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export const places = {
  path: "places", roles: null,
  async mount(root, ctx) {
    const svc = ctx.services.places;
    root.innerHTML = placesShell(DEFAULT_FILTER);
    const $ = (s) => root.querySelector(s), out = $("#pres");
    // The form holds the filter state; every query reads it afresh.
    const read = () => ({ chronic: $("#pc").checked, owner: $("#po").value, road: $("#pr").value.trim(),
      minDates: Number($("#pm").value) || 1, limit: Number($("#pl").value) || DEFAULT_FILTER.limit });
    let seq = 0, last = "";
    const load = async () => {
      const f = read(), key = JSON.stringify(f);
      if (key === last) return;                       // Enter in the road box fires change and submit: query once
      last = key;
      const my = ++seq;
      try { const d = await svc.places(f); if (my === seq) out.innerHTML = placesResults(d, f); }
      catch (e) { if (my === seq) { last = ""; out.innerHTML = errBox(e); } }
    };
    const form = $("#pf");
    form.addEventListener("change", load);
    form.addEventListener("submit", (e) => { e.preventDefault(); load(); });
    await load();
  },
};

export const road = {
  path: "road", roles: null,
  async mount(root, ctx, params = []) {
    const code = decode(params[0] || "").trim();
    if (!code) { root.innerHTML = roadError(NO_CODE); return; }
    try { root.innerHTML = roadView(await ctx.services.places.road(code)); }
    catch (e) { root.innerHTML = roadError(e && e.status === 404 ? NOT_IN_INVENTORY(code) : e); }
  },
};
