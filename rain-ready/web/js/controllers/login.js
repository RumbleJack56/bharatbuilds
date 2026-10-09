// web/js/controllers/login.js — persona picker.
import { loginView } from "../views/login.view.js";

export const login = {
  path: "login", roles: null,
  async mount(root, ctx) {
    root.innerHTML = loginView(await ctx.services.session.users());
    root.querySelectorAll(".persona").forEach(b => b.addEventListener("click", async () => {
      const me = await ctx.services.session.login(b.dataset.id);
      ctx.nav.go(ctx.home[me.role]);
    }));
  },
};
