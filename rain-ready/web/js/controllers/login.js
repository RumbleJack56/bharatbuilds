// web/js/controllers/login.js — persona picker.
import { loginView } from "../views/login.view.js";
import { guard } from "../ui/components.js";

export const login = {
  path: "login", roles: null,
  async mount(root, ctx) {
    root.innerHTML = loginView(await ctx.services.session.users());
    root.querySelectorAll(".persona").forEach(b => b.addEventListener("click", () => guard(b, async () => {
      const me = await ctx.services.session.login(b.dataset.id);
      if (!me) return ctx.toast.show("That person was not found. Please try again.");
      ctx.nav.go(ctx.home[me.role]);
    }, ctx.toast.show)));
  },
};
