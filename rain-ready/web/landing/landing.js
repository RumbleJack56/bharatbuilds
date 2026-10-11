// web/landing/landing.js — fills the public site from the API: counts and agencies. HTTP goes through the shared adapter; no number is hard-coded.
import { get, esc, hrs, agencyParts } from "/landing/site.js?v=3";

const set = (key, text) => document.querySelectorAll(`[data-stat="${key}"]`).forEach(el => { el.textContent = text; });

async function counts() {
  const [map, acc] = await Promise.all([get("/api/map"), get("/api/accountability")]);
  const noOwner = acc.agencies.find(a => a.agency_id == null);
  set("pockets", String(map.pockets.length));
  set("drains", String(map.assets.length));
  set("unowned", String(noOwner ? noOwner.assets_owned : 0));
  set("rain", `${map.reference_rain_mm_h} mm/h`);
  const fills = map.pockets.filter(p => p.time_to_fill_h != null).sort((a, b) => a.time_to_fill_h - b.time_to_fill_h);
  if (fills.length) {
    set("fastest", hrs(fills[0].time_to_fill_h));
    set("fastest-name", `Fastest pocket to fill: ${fills[0].name}`);
  }
  if (map.banner) document.getElementById("banner").textContent = map.banner;
}

async function agencies() {
  const { agencies: list } = await get("/api/agencies");
  document.getElementById("agencies").innerHTML = list.map(a => {
    const [short, full] = agencyParts(a.name);
    return `<li><strong>${esc(short)}</strong><span>${esc(full)}</span></li>`;
  }).join("");
}


counts().catch(() => { document.getElementById("stats-note").textContent = "Live counts are not available right now."; });
agencies().catch(() => { document.querySelector(".logos").hidden = true; });
