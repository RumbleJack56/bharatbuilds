// web/landing/pockets.js — the template's "Projects" list, filled with the low-point pockets from GET /api/map. No number is typed in here.
import { get, esc, hrs, span, rain, levelText, plural } from "/landing/site.js?v=3";

const PHOTOS = ["stat-pockets", "who-simulator", "stat-drains", "about-delhi", "cta", "loop"].map(n => `/landing/img/${n}.jpg`);
const up = `<span class="i" aria-hidden="true"><svg><use href="#up"/></svg></span>`;

const row = (p, i, ref) => `<article class="row">
  <div><h3>${esc(p.name)}</h3>
    <p>Level: <strong>${esc(levelText(p.level))}</strong>. ${p.time_to_fill_h == null ? "Does not fill" : `Fills in ${esc(hrs(p.time_to_fill_h))}`} at ${esc(rain(ref))} in the scenario
      (range ${esc(span(p.time_to_fill_h_low, p.time_to_fill_h_high))}). ${esc(plural((p.linked_asset_ids || []).length, "linked drain"))}.</p>
    <a class="btn" href="/landing/pocket.html?id=${encodeURIComponent(p.id)}"><span class="t">View details</span>${up}</a>
    <p class="where">Data: ${esc(p.data_source || "not stated")} · confidence ${esc(p.confidence || "not stated")}</p></div>
  <img src="${PHOTOS[i % PHOTOS.length]}" width="960" height="640" loading="lazy" alt="Illustrative photo, not of this pocket">
</article>`;

async function load() {
  const map = await get("/api/map");
  if (map.banner) document.getElementById("banner").textContent = map.banner;
  const list = [...map.pockets].sort((a, b) => (a.time_to_fill_h ?? 1e9) - (b.time_to_fill_h ?? 1e9));
  document.getElementById("count").textContent = `${plural(list.length, "pocket")}, quickest to fill first. Photos are illustrative.`;
  document.getElementById("list").innerHTML = list.length ? list.map((p, i) => row(p, i, map.reference_rain_mm_h)).join("") : `<p class="note">No pockets on record.</p>`;
}

load().catch(() => { document.getElementById("list").innerHTML = `<p class="note">The pockets are not available right now.</p>`; });
