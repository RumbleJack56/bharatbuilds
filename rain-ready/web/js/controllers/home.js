// web/js/controllers/home.js — dashboard home pane: the public action log, owners, and (for a resident) their own complaints.
import { homeView } from "../views/home.view.js";

export async function homePane(pane, ctx) {
  const { dashboard, session, incidents } = ctx.services;
  const me = await session.me().catch(() => null);
  const [log, acc, mine] = await Promise.all([
    dashboard.transparency({ limit: 200 }),
    dashboard.accountability(),
    me && me.role === "resident" ? incidents.mine().catch(() => []) : Promise.resolve(null),   // a failed list never hides the area view
  ]);
  pane.innerHTML = homeView({ me, mine, actions: log.actions || [], owners: acc.agencies || [] });
}
