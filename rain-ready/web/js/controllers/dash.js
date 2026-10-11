// web/js/controllers/dash.js — public dashboard; one route, sub-tab in params[0].
import { dashShell, TAB_TITLES, accountabilityView, impactView, captureView } from "../views/dash.view.js";
import { errBox } from "../ui/components.js";
import { mapPane } from "./dashmap.js";
import { simPane } from "./sim.js";
import { actionsPane } from "./actions.js";
import { insightsPane } from "./insights.js";
import { homePane } from "./home.js";
import { homeShell } from "../views/home.view.js";

const PANES = {
  map: mapPane,
  actions: actionsPane,
  insights: insightsPane,
  simulator: simPane,
  accountability: async (pane, ctx) => { pane.innerHTML = accountabilityView(await ctx.services.dashboard.accountability()); },
  impact: async (pane, ctx) => { pane.innerHTML = impactView(await ctx.services.dashboard.impact()); },
  capture: async (pane, ctx) => { pane.innerHTML = captureView(await ctx.services.dashboard.opportunities()); },
};

export const dash = {
  path: "dash", roles: null,
  async mount(root, ctx, [tab]) {
    if (!tab) {                                                  // #/dash alone: the phone-app home; every tab keeps its own URL
      root.innerHTML = homeShell();
      const pane = root.querySelector("#pane");
      try { return (await homePane(pane, ctx)) || undefined; } catch (e) { pane.innerHTML = errBox(e); return; }
    }
    const t = TAB_TITLES[tab] ? tab : "map";
    root.innerHTML = dashShell(t);
    const pane = root.querySelector("#pane");
    try { return (await PANES[t](pane, ctx)) || undefined; } catch (e) { pane.innerHTML = errBox(e); }
  },
};
