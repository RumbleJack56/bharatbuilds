// web/tests/e2e/glass-check.mjs — every screen x {390x844, 1280x800} x {css, liquid}: no console errors, no horizontal scroll, glass mode as asked,
// contrast of body/muted/chip text over the brightest backdrop. Usage: NODE_PATH=... PW_CHROME=... node glass-check.mjs http://localhost:8111 [outDir]
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseColor, over, ratio, tokens } from "../contrast-lib.js";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = (process.argv[2] || "http://localhost:8111").replace(/\/$/, "");
const OUT = process.argv[3] || join(tmpdir(), "rr-glass-shots");
mkdirSync(OUT, { recursive: true });
const t = tokens(readFileSync(new URL("../../css/tokens.css", import.meta.url), "utf8"));
const BRIGHT = parseColor(t["bd-brightest"]).slice(0, 3);
const SCREENS = [["", ["#/login", "#/dash/map", "#/dash/impact", "#/dash/simulator", "#/dash/accountability", "#/dash/capture", "#/dash/actions", "#/dash/insights", "#/board"]],
  ["res-1", ["#/report", "#/mine", "#/confirm"]], ["off-mcd", ["#/inbox", "#/held"]], ["admin-1", ["#/admin"]]];
const XQ = process.env.GLASS_EXTRA ? "&" + process.env.GLASS_EXTRA : "";   // e.g. liquidGL-engine=webgl
const MODES = [["css", "?glass=css"], ["liquid", "?glass=liquid" + XQ]];
const SIZES = [[390, 844], [1280, 800]];
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
let bad = 0;
const fail = (m) => { bad++; console.log("FAIL " + m); };
for (const [mode, qs] of MODES) for (const [w, h] of SIZES) for (const [user, hashes] of SCREENS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(u => { try { if (!sessionStorage.__s) { localStorage.setItem("rr_user", u); sessionStorage.__s = 1; } } catch {} }, user);
  for (const hash of hashes) {
    const tag = `${mode} ${w}x${h} ${user || "anon"} ${hash}`;
    await page.goto(`${BASE}/${qs}${hash}`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const first = (s) => document.querySelector(s);
      const sample = (s) => { const e = first(s); if (!e) return null; let p = e, bg = null;
        while (p && !(p.classList.contains("glass") || p.classList.contains("card") || p.classList.contains("lg"))) p = p.parentElement;
        return { color: getComputedStyle(e).color, bg: p ? getComputedStyle(p).backgroundColor : null }; };
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, css: document.documentElement.classList.contains("glass-css"),
        samples: { body: sample("main p"), muted: sample("main .muted"), chip: sample("main .chip") } };
    });
    if (info.overflow) fail(`${tag}: horizontal scroll`);
    if (mode === "liquid" && info.css) fail(`${tag}: asked for liquid but fell back to css (WebGL missing? try ?liquidGL-engine=webgl)`);
    if (mode === "css" && !info.css) fail(`${tag}: css mode but glass-css class is missing`);
    for (const [name, s] of Object.entries(info.samples)) {
      if (!s || !s.bg) continue;
      const r = ratio(parseColor(s.color).slice(0, 3), over(parseColor(s.bg), BRIGHT));
      if (r < 4.5) fail(`${tag}: ${name} text ${r.toFixed(2)}:1 over the brightest backdrop`);
    }
    if (hash === "#/report" || hash === "#/dash/map" || hash === "#/board") await page.screenshot({ path: join(OUT, `${mode}-${w}-${hash.replace(/\W+/g, "_")}.png`) });
  }
  if (errs.length) fail(`${mode} ${w}x${h} ${user || "anon"}: console errors: ${errs.slice(0, 3).join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} problem(s)` : "\nall screens ok in css and liquid, both sizes");
process.exit(bad ? 1 : 0);
