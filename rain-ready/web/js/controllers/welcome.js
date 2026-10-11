// web/js/controllers/welcome.js — the landing page inside the app (#/welcome): draw at once, then fill counts and agencies.
import { welcomeView, countsFrom } from "../views/welcome.view.js";

export const welcome = {
  path: "welcome", roles: null,
  async mount(root, ctx) {
    root.innerHTML = welcomeView();
    const { dashboard } = ctx.services;
    const [map, acc, ag] = await Promise.allSettled([dashboard.map(), dashboard.accountability(), dashboard.agencies()]);
    const counts = map.status === "fulfilled" && acc.status === "fulfilled" ? countsFrom(map.value, acc.value) : null;
    root.innerHTML = welcomeView({ counts, agencies: ag.status === "fulfilled" ? ag.value : [], offline: !counts });
  },
};
