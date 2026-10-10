// web/tests/d3-insights.test.js — V17 insights and ward report.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { createFetchHttp } from "../js/adapters/http-fetch.js";
import { createDomDownload } from "../js/adapters/download-dom.js";
import { implement } from "../js/core/port.js";
import { DownloadPort } from "../js/ports/index.js";
import { BANNED } from "../js/ui/copy.js";
import { createDashboardService } from "../js/services/dashboard.service.js";
import { insightsView, reportView } from "../js/views/insights.view.js";
import { TAB_TITLES } from "../js/views/dash.view.js";
import { insightsPane } from "../js/controllers/insights.js";

const INS = { insights: [{ id: "no-owner:DR-2", text: "2 report(s) near Orphan drain, and no owner was found for this drain (placeholder data).", why: "Nobody to accept.", evidence: { asset_id: "DR-2", reports: 2 } },
  { id: "bounces:mcd", text: "MCD sent 3 tasks back.", why: "Owner data needs a check.", evidence: { agency_id: "mcd", bounced: 3 } }], banner: "Scenario, not a forecast." };
const R = { title: "Rain-Ready ward report", generated_at: "2026-10-10T10:00:00", banner: "Scenario, not a forecast.", range_note: "A range.",
  tasks_by_agency: [{ agency_id: "mcd", agency_name: "MCD", open: 4, overdue: 1 }], held_reports: 2, confirmed_cleans_7d: 3,
  top_drains: [{ id: "DR-1", name: "Pusa barrel", gain_h: 1.5, gain_h_low: 1, gain_h_high: 2.4, agency_name: "MCD", data_source: "MCD" }],
  pockets_by_level: { high: ["Minto Bridge"], watch: ["Pusa"] }, insights: INS.insights };

test("V17: http text option returns the body as text", async () => {
  const http = createFetchHttp({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => "# hi", json: async () => { throw new Error("no"); } }) });
  assert.equal(await http.request("GET", "/api/reports/ward?format=md", { text: true }), "# hi");
});
test("V17: download adapter saves a Blob as a named file through an anchor", () => {
  const log = [];
  const a = { click: () => log.push("click"), remove: () => log.push("remove") };
  const doc = { createElement: () => a, body: { appendChild: () => log.push("append") } };
  const urls = { createObjectURL: (b) => { log.push("url:" + b.size); return "blob:x"; }, revokeObjectURL: () => log.push("revoke") };
  const dl = implement(DownloadPort, createDomDownload(doc, urls));
  dl.save("ward-report.md", new Blob(["abc"]));
  assert.equal(a.download, "ward-report.md"); assert.equal(a.href, "blob:x");
  assert.deepEqual(log, ["url:3", "append", "click", "remove", "revoke"]);
});
test("V17: services fetch insights, report json and markdown text", async () => {
  const http = createFakeHttp({ "GET /api/insights": INS, "GET /api/reports/ward?format=json": R, "GET /api/reports/ward?format=md": "# md" });
  const d = createDashboardService(http);
  await d.insights(); await d.wardReport(); await d.wardReportMd();
  assert.deepEqual(http.calls.map(c => c.path), ["/api/insights", "/api/reports/ward?format=json", "/api/reports/ward?format=md"]);
  assert.equal(http.calls[2].text, true);
});
test("V17: insights view shows text, why, evidence, banner, and the placeholder label", () => {
  const h = insightsView(INS);
  assert.match(h, /Nobody to accept/); assert.match(h, /Scenario, not a forecast\./); assert.match(h, /asset id: DR-2/i);
  assert.equal((h.match(/Placeholder data/g) || []).length, 1);
  assert.doesNotMatch(insightsView({ ...INS, insights: [] }), /undefined/); assert.match(insightsView({ ...INS, insights: [] }), /No insights/);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /verified|proof|unspoofable/i);
});
test("V17: report view has every section and the download button", () => {
  const h = reportView(R);
  assert.match(h, /MCD[\s\S]*4 open[\s\S]*1 overdue/); assert.match(h, /Held for review: <strong>2<\/strong>/);
  assert.match(h, /Pusa barrel[\s\S]*about 1 to 2\.4 h/); assert.match(h, /High[\s\S]*Minto Bridge/); assert.match(h, /Watch[\s\S]*Pusa/);
  assert.match(h, /confirmed[\s\S]*<strong>3<\/strong>/); assert.match(h, /id="dl"[^>]*>Download report \(Markdown\)/); assert.match(h, /Scenario, not a forecast\./);
  assert.doesNotMatch(h, BANNED); assert.doesNotMatch(h, /verified|proof|unspoofable/i);
});
test("V17: pane renders both and the button saves ward-report.md", async () => {
  const saved = [], els = {};
  const el = (s) => els[s] ??= { innerHTML: "", disabled: false, querySelector: el, addEventListener: (_, f) => { els[s].click = f; } };
  const pane = { innerHTML: "", querySelector: el };
  const ctx = { download: { save: (n, b) => saved.push([n, b]) }, toast: { show: () => {} },
    services: { dashboard: { insights: async () => INS, wardReport: async () => R, wardReportMd: async () => "# md" } } };
  await insightsPane(pane, ctx);
  assert.match(pane.innerHTML, /Nobody to accept/); assert.match(pane.innerHTML, /Pusa barrel/);
  await els["#dl"].click();
  assert.equal(saved[0][0], "ward-report.md"); assert.equal(await saved[0][1].text(), "# md");
  assert.match(saved[0][1].type, /markdown/);
});
test("V17: insights tab exists", () => assert.ok(TAB_TITLES.insights));
