// web/tests/e2e/perf.mjs — rAF frame-time sample (3 s, CPU 4x throttle) on dashboard map and report, css vs liquid, at 390x844.
// Usage: NODE_PATH=... PW_CHROME=... node perf.mjs http://localhost:8113
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = (process.argv[2] || "http://localhost:8113").replace(/\/$/, "");
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME,
  args: ["--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
let cssMedianFail = false;
const XQ = process.env.GLASS_EXTRA ? "&" + process.env.GLASS_EXTRA : "";
for (const hash of ["#/dash/map", "#/report"]) for (const qs of ["?glass=css", "?glass=liquid" + XQ]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { if (!sessionStorage.__s) { localStorage.setItem("rr_user", "res-1"); sessionStorage.__s = 1; } } catch {} });
  await page.goto(`${BASE}/${qs}${hash}`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const frames = await page.evaluate(() => new Promise(res => { const d = []; let last = performance.now(), t0 = last;
    const tick = (n) => { d.push(n - last); last = n; n - t0 < 3000 ? requestAnimationFrame(tick) : res(d); }; requestAnimationFrame(tick); }));
  const m = median(frames), p95 = [...frames].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)];
  const mode = await page.evaluate(() => document.documentElement.classList.contains("glass-css") ? "css" : "liquid");
  console.log(`${hash.padEnd(11)} asked=${qs.slice(7, 13).padEnd(6)} got=${mode.padEnd(6)} frames=${frames.length} median=${m.toFixed(1)} ms p95=${p95.toFixed(1)} ms`);
  if (qs === "?glass=css" && m > 20) cssMedianFail = true;
  await ctx.close();
}
await browser.close();
console.log(cssMedianFail ? "FAIL: css-mode median > 20 ms" : "css-mode medians <= 20 ms");
process.exit(cssMedianFail ? 1 : 0);
