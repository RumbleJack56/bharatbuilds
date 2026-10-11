// web/js/controllers/insights.js — insights and ward report pane; the button saves the Markdown report via ctx.download.
import { insightsView, reportView } from "../views/insights.view.js";
import { guard, errBox } from "../ui/components.js";

export async function insightsPane(pane, ctx) {
  const { dashboard } = ctx.services;
  const [ins, rep] = await Promise.all([dashboard.insights(), dashboard.wardReport().catch(e => ({ failed: e }))]);   // a failed report never hides the insights
  pane.innerHTML = insightsView(ins) + (rep.failed ? `<h2>Ward report</h2>${errBox(rep.failed)}` : reportView(rep));
  const btn = pane.querySelector("#dl");
  if (rep.failed || !btn) return;
  btn.addEventListener("click", () => guard(btn, async () => {
    const md = await dashboard.wardReportMd();
    ctx.download.save("ward-report.md", new Blob([md], { type: "text/markdown;charset=utf-8" }));
  }, (m) => ctx.toast.show(m)));
}
