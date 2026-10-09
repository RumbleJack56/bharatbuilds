import { esc, errBox } from "./util.js";
import { mapTab } from "./dashmap.js";
import { accountTab, impactTab, simTab, captureTab } from "./dashmore.js";

const TABS = { map: ["Map", mapTab], accountability: ["Who is responsible", accountTab], impact: ["Impact", impactTab],
  simulator: ["Simulator", simTab], capture: ["Rain capture", captureTab] };

export async function renderDash(view, tab) {
  if (!TABS[tab]) tab = "map";
  view.innerHTML = `<h1>Dashboard</h1><nav class="sub" aria-label="Dashboard sections">${Object.entries(TABS).map(([k, [t]]) =>
    `<a href="#/dash/${k}" class="${k === tab ? "on" : ""}">${esc(t)}</a>`).join("")}</nav><div id="pane">Loading...</div>
    <p class="small muted"><a href="#/login">Switch persona</a></p>`;
  const pane = view.querySelector("#pane");
  try { await TABS[tab][1](pane); } catch (e) { pane.innerHTML = errBox(e); }
}
