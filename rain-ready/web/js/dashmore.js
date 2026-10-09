import { get, post } from "./api.js";
import { esc, banner, hrs } from "./util.js";
import { levelLabel } from "./dashmap.js";

const STATUS = ["open", "accepted", "done", "confirmed", "disputed", "rejected"];

export async function accountTab(pane) {
  const d = await get("/api/accountability");
  const maxA = Math.max(1, ...d.agencies.map(a => a.assets_owned));
  pane.innerHTML = `<p class="muted small">${esc(d.note)}</p>` + d.agencies.map(a => `
    <div class="card ${a.agency_id ? "" : "hl"}"><h3>${esc(a.agency_name)}</h3>
    <p>Assets owned: <strong>${esc(a.assets_owned)}</strong></p>
    <div class="bar ${a.agency_id ? "" : "bad"}" aria-hidden="true"><i style="width:${Math.round(100 * a.assets_owned / maxA)}%"></i></div>
    <p class="small">${STATUS.map(s => `${s}: <strong>${esc(a.tasks[s] || 0)}</strong>`).join(" &middot; ")}</p>
    <p class="small">Overdue: <strong>${esc(a.overdue)}</strong> &middot; Bounced away: <strong>${esc(a.bounced_away)}</strong><br>
    Median time to accept: ${esc(hrs(a.median_hours_to_accept))} &middot; to complete: ${esc(hrs(a.median_hours_to_complete))}</p></div>`).join("");
}

export async function impactTab(pane) {
  const d = await get("/api/impact");
  const big = (n, l) => `<div class="card"><div class="big-num">${esc(n)}</div><div class="small">${esc(l)}</div></div>`;
  const use = { store_reuse: "Store and reuse", detain: "Detain", recharge: "Recharge", needs_data_or_tank: "Needs data" };
  pane.innerHTML = `${banner(d.banner)}<div class="grid">
    ${big(d.ownership.with_owner + " of " + d.ownership.assets, "drains with a named owner")}
    ${big(d.ownership.no_owner_found, "drains with No owner found")}
    ${big(d.reports, "resident reports")}
    ${big(d.exposed_assets_in_pockets, "assets inside " + d.pockets + " low-point pockets (placeholder counts)")}
    ${big(hrs(d.fill_time_gained_h), "fill time gained by confirmed work")}</div>
    <p class="small muted">${esc(d.fill_time_gained_note)}</p>
    <h2>Tasks</h2><div class="grid">${STATUS.map(s => big(d.tasks[s] ?? 0, s)).join("")}</div>
    <h2>Rain capture, cubic metres per year</h2><div class="grid">${Object.entries(d.capture_m3_per_year_by_use).map(([k, v]) => big(v, use[k] || k)).join("")}</div>
    <p class="small muted">Not claimed: ${esc(d.not_claimed)}</p>`;
}

export async function simTab(pane) {
  pane.innerHTML = `<div id="bn"></div><div class="card"><label for="rain">Rain: <strong id="rv">35</strong> mm/h</label>
    <input id="rain" type="range" min="0" max="120" step="5" value="35" style="width:100%;min-height:44px">
    <fieldset style="border:0;padding:0;margin:8px 0"><legend><strong>Drains</strong></legend>
    ${[["clean", "All cleaned"], ["silted", "All silted"], ["current", "As they are now"]].map(([v, t]) =>
      `<label style="font-weight:400"><input type="radio" name="st" value="${v}" ${v === "current" ? "checked" : ""}> ${t}</label>`).join("")}</fieldset></div>
    <div id="res"></div>`;
  let seq = 0;
  const run = async () => {
    const my = ++seq, rain = +pane.querySelector("#rain").value;
    pane.querySelector("#rv").textContent = rain;
    const d = await post("/api/simulate", { rain_mm_h: rain, drain_state: pane.querySelector("[name=st]:checked").value });
    if (my !== seq) return;
    pane.querySelector("#bn").innerHTML = banner(d.banner);
    pane.querySelector("#res").innerHTML = `<p class="small muted">Fill level shown at ${esc(d.scenario.at_h)} h of rain.</p>` + d.results.map(p => `
      <div class="card"><strong>${p.fill_order ? esc(p.fill_order) + ". " : ""}${esc(p.name)}</strong>
      <span class="lvl ${esc(p.level)}"> ${esc(levelLabel(p.level))}</span>
      <p>${p.time_to_fill_h == null ? "Does not fill in this scenario." : "Fills in " + esc(hrs(p.time_to_fill_h))}</p>
      <div class="bar" aria-hidden="true"><i style="width:${Math.min(100, p.fill_pct_at)}%"></i></div>
      <p class="small muted">${esc(Math.round(p.fill_pct_at))}% full at ${esc(d.scenario.at_h)} h${p.spills_to ? ` - spills toward ${esc(p.spills_to)}` : ""}</p></div>`).join("");
  };
  pane.querySelector("#rain").oninput = () => run().catch(() => {});
  pane.querySelectorAll("[name=st]").forEach(r => r.onchange = () => run().catch(() => {}));
  await run();
}

export async function captureTab(pane) {
  const d = await get("/api/opportunities");
  const USE = { store_reuse: "Store and reuse", detain: "Detain only", recharge: "Recharge", needs_data_or_tank: "Needs data" };
  pane.innerHTML = `${banner(d.banner)}` + d.sites.map(s => `<div class="card"><h3>${esc(s.name)}</h3>
    <p><strong>${esc(USE[s.use] || s.use)}</strong> <span class="chip">${esc(s.rule_id)}</span></p>
    <p>${esc(s.reason)}</p><p>About <strong>${esc(s.annual_m3)}</strong> m&sup3; per year from the roof</p>
    ${s.structure ? `<p class="small">Structure: ${Object.entries(s.structure).map(([k, v]) => `${esc(k.replace(/_/g, " "))} ${esc(v)}`).join(", ")}</p>` : ""}
    ${(s.warnings || []).map(w => `<p class="banner">${esc(w)}</p>`).join("")}
    <p class="small muted">Data: ${esc(s.data_source)}</p></div>`).join("");
}
