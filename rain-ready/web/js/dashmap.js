import { get } from "./api.js";
import { esc, banner, hrs } from "./util.js";

export const LEVEL = { high: ["#b3261e", "High"], elevated: ["#d9822b", "Elevated"], watch: ["#c9b100", "Watch"], none: ["#6b7b88", "None"] };
export const levelLabel = l => (LEVEL[l] || LEVEL.none)[1];

export async function mapTab(pane) {
  const d = await get("/api/map");
  pane.innerHTML = `${banner(d.banner)}<div id="m" class="map" style="height:420px"></div>
    <p class="small">Pockets at ${esc(d.reference_rain_mm_h)} mm/h: ${Object.keys(LEVEL).map(k => `<span class="lvl ${k}">&#9679; ${LEVEL[k][1]}</span>`).join(" &nbsp; ")}
    <br>Squares: drains. Numbered markers: open tasks (number is rank order).</p>`;
  if (!window.L) { pane.querySelector("#m").textContent = "The map library could not load."; return; }
  const map = L.map(pane.querySelector("#m"));
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
  const pts = [];
  d.pockets.forEach(p => {
    const [col, lab] = LEVEL[p.level] || LEVEL.none;
    L.circle([p.lat, p.lon], { radius: 35, color: col, fillColor: col, fillOpacity: .35, weight: 3 }).addTo(map)
      .bindPopup(`<strong>${esc(p.name)}</strong><br>Level: <strong>${esc(lab)}</strong><br>Time to fill: ${esc(hrs(p.time_to_fill_h))}
        <br>Assets exposed: ${esc(p.exposed_assets)}<br><span class="small">${esc(p.data_source)}, confidence ${esc(p.confidence)}</span>`);
    pts.push([p.lat, p.lon]);
  });
  d.assets.forEach(a => {
    const owner = a.agency_id ? a.agency_name : "No owner found";
    L.marker([a.lat, a.lon], { icon: L.divIcon({ className: "", html: `<div style="width:14px;height:14px;background:${a.agency_id ? "#0b5cad" : "#b3261e"};border:2px solid #fff"></div>`, iconSize: [14, 14] }) })
      .addTo(map).bindPopup(`<strong>${esc(a.name)}</strong><br>Owner: ${esc(owner)}<br><span class="small">Source: ${esc(a.owner_source || "none")}</span>
        <br>Last cleaning confirmed: ${esc(a.last_confirmed_clean || "never recorded")}`);
    pts.push([a.lat, a.lon]);
  });
  const ranked = d.tasks.slice().sort((x, y) => y.rank_score - x.rank_score);
  ranked.forEach((t, i) => {
    L.marker([t.lat + 0.00012, t.lon + 0.00012], { icon: L.divIcon({ className: "", iconSize: [28, 28],
      html: `<div style="width:28px;height:28px;border-radius:50%;background:#fff;color:#16202a;border:3px solid #b3261e;text-align:center;line-height:22px;font-weight:700">${i + 1}</div>` }) })
      .addTo(map).bindPopup(`<strong>Task ${esc(t.id)}</strong> (${esc(t.status)})<br>Rank ${i + 1}, gain ${esc(hrs(t.gain_h))}<br><a href="#/task/${esc(t.id)}">Open task</a>`);
  });
  pts.length ? map.fitBounds(pts, { padding: [30, 30], maxZoom: 17 }) : map.setView([28.6433, 77.1846], 16);
  setTimeout(() => map.invalidateSize(), 100);
}
