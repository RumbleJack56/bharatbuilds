// web/js/views/sim.view.js — simulator controls and results. Pure.
import { esc, hrs } from "../ui/format.js";
import { banner } from "../ui/components.js";
import { LEVEL } from "../ui/copy.js";

const STATES = [["clean", "All cleaned"], ["silted", "All silted"], ["current", "As they are now"]];

export const DEFAULT_RAIN = 25;             // slider start when the server sends no reference rain

export const simControls = (rain = DEFAULT_RAIN, state = "current", isReference = true) => `<div class="card glass">
  <label for="rain">Rain: <strong id="rv">${esc(rain)}</strong> mm/h</label>
  <input id="rain" type="range" min="0" max="120" step="5" value="${esc(rain)}" class="wide">
  <p class="small muted">${isReference ? `Reference rain: ${esc(rain)} mm/h. Drag` : "Drag"} to try other values.</p>
  <fieldset class="plain"><legend><strong>Drains</strong></legend>
  ${STATES.map(([v, t]) => `<label class="opt"><input type="radio" name="st" value="${v}" ${v === state ? "checked" : ""}> ${esc(t)}</label>`).join("")}
  </fieldset></div><div id="res"></div>`;

export const simResults = (d) => `${banner(d.banner)}<p class="small muted">Fill level shown at ${esc(d.scenario.at_h ?? 1)} h of rain.</p>` +
  d.results.map(p => `<div class="card glass"><strong>${p.fill_order ? esc(p.fill_order) + ". " : ""}${esc(p.name)}</strong>
    <span class="lvl ${esc(p.level)}"> ${esc(LEVEL[p.level][1])}</span>
    <p>${p.time_to_fill_h == null ? "Does not fill in this scenario." : "Fills in " + esc(hrs(p.time_to_fill_h))}</p>
    <div class="bar" aria-hidden="true"><i style="width:${Math.min(100, p.fill_pct_at)}%"></i></div>
    <p class="small muted">${esc(Math.round(p.fill_pct_at))}% full${p.spills_to ? ` - spills toward ${esc(p.spills_to)}` : ""}</p></div>`).join("");
