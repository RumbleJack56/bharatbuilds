// web/js/controllers/city.js — Delhi evidence page (#/city): city summary and insights, loaded in parallel. Public, no login.
import { cityHead, sourceView, summaryView, cityInsightsView } from "../views/city.view.js";
import { errBox } from "../ui/components.js";

const settle = (p) => p.then(v => ({ v }), e => ({ e }));   // one failed call never hides the other

export const city = {
  path: "city", roles: null,
  async mount(root, ctx) {
    const svc = ctx.services.city;
    root.innerHTML = cityHead() + "<p>Loading...</p>";
    const [s, i] = await Promise.all([settle(svc.summary()), settle(svc.insights())]);
    root.innerHTML = cityHead() + sourceView(s.v || i.v)
      + (s.e ? errBox(s.e) : summaryView(s.v))
      + (i.e ? errBox(i.e) : cityInsightsView(i.v));
  },
};
