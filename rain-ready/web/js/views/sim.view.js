// web/js/views/sim.view.js — simulator controls and results. Pure.
import { esc, hrs } from "../ui/format.js";
import { banner } from "../ui/components.js";
import { LEVEL } from "../ui/copy.js";

const STATES = [["clean", "All cleaned"], ["silted", "All silted"], ["current", "As they are now"]];

export const DEFAULT_RAIN = 25;             // slider start when the server sends no reference rain

export const simCaption = (rain) => `Levels at ${rain} mm/h (scenario)`;

export const simControls = (rain = DEFAULT_RAIN, state = "current", isReference = true) => `<div class="card glass sim-ctl">
  <div class="sim-rain"><label for="rain">Rain</label><p class="sim-val"><strong id="rv">${esc(rain)}</strong> mm/h</p></div>
  <input id="rain" type="range" min="0" max="120" step="5" value="${esc(rain)}" class="wide">
  <div class="sim-scale small muted" aria-hidden="true"><span>0</span><span>60</span><span>120</span></div>
  <p class="small muted">${isReference ? `Reference rain: ${esc(rain)} mm/h. Drag` : "Drag"} to try other values.</p>
  <fieldset class="plain seg"><legend>Drains</legend><div class="seg-row">
  ${STATES.map(([v, t]) => `<label class="opt"><input type="radio" name="st" value="${v}" ${v === state ? "checked" : ""}> ${esc(t)}</label>`).join("")}
  </div></fieldset></div>
  <p class="sim-cap" id="cap">${esc(simCaption(rain))}</p><div id="m" class="map" data-liquid-ignore></div><div id="res"></div>`;

// One row per pocket: the level in words beside its colour, time to fill, and how full it is at the shown hour.
export const simResults = (d) => `${banner(d.banner)}<p class="small muted">Fill level shown at ${esc(d.scenario.at_h ?? 1)} h of rain.</p>` +
  (d.results.length ? `<div class="list pockets">${d.results.map(p => `<div class="card glass pocket"><div class="pk-top"><strong>${p.fill_order ? esc(p.fill_order) + ". " : ""}${esc(p.name)}</strong>
    <span class="lvl ${esc(p.level)}">${esc(LEVEL[p.level][1])}</span></div>
    <p class="small">${p.time_to_fill_h == null ? "Does not fill in this scenario." : "Fills in " + esc(hrs(p.time_to_fill_h))}</p>
    <div class="bar lv-${esc(p.level)}" aria-hidden="true"><i style="width:${Math.min(100, p.fill_pct_at)}%"></i></div>
    <p class="small muted">${esc(Math.round(p.fill_pct_at))}% full${p.spills_to ? ` - spills toward ${esc(p.spills_to)}` : ""}</p></div>`).join("")}</div>` : "");
