// web/landing/pocket.js — the template's project detail page for one pocket (?id=), from GET /api/map. Drains link to the app's drain page.
import { get, esc, hrs, span, rain, levelText, agencyParts, plural } from "/landing/site.js?v=3";

const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
const num = (v, unit) => v == null ? "not stated" : `${v} ${unit}`;

async function load() {
  const id = new URLSearchParams(location.search).get("id") || "";
  const [map, ag] = await Promise.all([get("/api/map"), get("/api/agencies")]);
  const p = map.pockets.find(x => x.id === id);
  const box = document.getElementById("detail");
  if (!p) { box.innerHTML = `<p class="note">We could not find that pocket. Pick one from the <a href="/landing/pockets.html">pockets list</a>.</p>`; return; }
  document.title = `${p.name} · Rain-Ready`;
  document.getElementById("title").textContent = p.name;
  if (map.banner) document.getElementById("banner").textContent = map.banner;
  const names = Object.fromEntries(ag.agencies.map(a => [a.id, agencyParts(a.name)[0]]));
  const drains = (p.linked_asset_ids || []).map(aid => map.assets.find(a => a.id === aid) || { id: aid, name: aid });
  box.innerHTML = `<dl class="facts">
      ${fact("Level", levelText(p.level))}
      ${fact(`Fill time at ${rain(map.reference_rain_mm_h)}`, p.time_to_fill_h == null ? "does not fill" : hrs(p.time_to_fill_h))}
      ${fact("Range", span(p.time_to_fill_h_low, p.time_to_fill_h_high))}
      ${fact("Catchment", num(p.catchment_ha, "ha"))}
      ${fact("Storage before it overflows", num(p.storage_m3, "m³"))}
      ${fact("Drain capacity", num(p.drain_mm_h, "mm/h"))}
      ${fact("Data source", p.data_source || "not stated")}
      ${fact("Confidence", p.confidence || "not stated")}
    </dl>
    <h2>Linked drains</h2>
    <p class="note">${esc(plural(drains.length, "drain"))} drain this pocket. Owner is shown at agency level.</p>
    <ul class="drains">${drains.map(d => `<li><a href="/app#/drain/${encodeURIComponent(d.id)}">${esc(d.name)}</a>
      <span>${d.agency_id ? `Owner: ${esc(names[d.agency_id] || d.agency_id.toUpperCase())}` : "No owner found"}</span></li>`).join("") || `<li>No linked drain on record.</li>`}</ul>
    <div class="actions"><a class="btn" href="/app#/dash/map"><span class="t">Open on the map</span><span class="i" aria-hidden="true"><svg><use href="#up"/></svg></span></a>
      <a class="back" href="/landing/pockets.html">All pockets</a></div>`;
}

load().catch(() => { document.getElementById("detail").innerHTML = `<p class="note">This pocket is not available right now.</p>`; });
