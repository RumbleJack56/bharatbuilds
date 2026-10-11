// web/landing/landing.js — fills the public site from the API: counts and agencies. HTTP goes through the shared adapter; no number is hard-coded.
import { get, esc, agencyParts } from "/landing/site.js?v=3";

const set = (key, text) => document.querySelectorAll(`[data-stat="${key}"]`).forEach(el => { el.textContent = text; });

async function counts() {
  const [map, acc] = await Promise.all([get("/api/map"), get("/api/accountability")]);
  const noOwner = acc.agencies.find(a => a.agency_id == null);
  set("pockets", String(map.pockets.length));
  set("drains", String(map.assets.length));
  set("unowned", String(noOwner ? noOwner.assets_owned : 0));
}

// Each agency's own logo where it has one. PWD and I&FC only use the State Emblem of India, which may not be reused here,
// so they get a plain initials badge instead.
const LOGOS = { mcd: "/landing/img/logos/mcd.png", djb: "/landing/img/logos/djb.png" };

async function agencies() {
  const { agencies: list } = await get("/api/agencies");
  document.getElementById("agencies").innerHTML = list.map(a => {
    const [short, full] = agencyParts(a.name);
    const mark = LOGOS[a.id] ? `<img src="${LOGOS[a.id]}" width="120" height="120" alt="${esc(full)} logo">` : `<b class="mono" aria-hidden="true">${esc(short)}</b>`;
    return `<li>${mark}<span><strong>${esc(short)}</strong>${esc(full)}</span></li>`;
  }).join("");
}


counts().catch(() => { document.getElementById("stats-note").textContent = "Live counts are not available right now."; });
agencies().catch(() => { document.querySelector(".logos").hidden = true; });
