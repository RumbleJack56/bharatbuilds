// web/js/controllers/board.js — public accountability screen: leaderboard, method, filterable action log. No login.
import { boardShell, logView } from "../views/board.view.js";
import { errBox } from "../ui/components.js";

export const board = {
  path: "board", roles: null,
  async mount(root, ctx) {
    const { dashboard } = ctx.services;
    const [lb, tr] = await Promise.all([dashboard.leaderboard(), dashboard.transparency()]);
    root.innerHTML = boardShell(lb);
    const log = root.querySelector("#log");
    log.innerHTML = logView(tr);
    let seq = 0;
    const refilter = async () => {
      const my = ++seq;
      const f = { agencyId: root.querySelector("#fa").value, status: root.querySelector("#fs").value, limit: +root.querySelector("#fl").value };
      try { const d = await dashboard.transparency(f); if (my === seq) log.innerHTML = logView(d); }
      catch (e) { if (my === seq) log.innerHTML = errBox(e); }
    };
    ["#fa", "#fs", "#fl"].forEach(s => { root.querySelector(s).onchange = refilter; });
  },
};
