// web/tests/e2e/walk.mjs — end-to-end walk on a FRESH database (never the dev DB).
// Usage: NODE_PATH=<dir with node_modules/playwright> PW_CHROME=<chromium binary> \
//        node web/tests/e2e/walk.mjs http://localhost:8010 [screenshotDir]
// Flow: resident reports -> official accepts -> completes with photo -> a different resident confirms -> dashboard.
// Checks the Rajinder Nagar pocket level on the map goes High -> Elevated. Exit code 1 on any failure
// or any unexpected console error / 4xx / 5xx. No package.json or npm dependency lives in web/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = (process.argv[2] || "http://localhost:8010").replace(/\/$/, "");
const SHOTS = process.argv[3] || process.env.WALK_SHOTS || join(tmpdir(), "rr-walk-shots");
mkdirSync(SHOTS, { recursive: true });

// 64x64 gradient PNG with noise so the photo checks do not call it blank.
async function png() {
  const { deflateSync } = await import("node:zlib");
  const w = 64, h = 64, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (x * 4 + y * 3 + ((x * y) % 17)) & 255;
    raw[o + 1] = (y * 4) & 255; raw[o + 2] = (x * 2 + y * 2 + ((x ^ y) % 29)) & 255;
  }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const results = [], problems = [], expected = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME });
const photo = { name: "drain.png", mimeType: "image/png", buffer: await png() };

async function persona(user, expect4xx = []) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("console", m => {
    if (m.type() !== "error") return;
    // Chromium logs every failed request as a console error; the deliberate ones are expected too.
    const echo = expect4xx.some(e => m.text().includes(`status of ${e.status}`));
    (echo ? expected : problems).push(`${user} console: ${m.text()}`);
  });
  page.on("pageerror", e => problems.push(`${user} pageerror: ${e.message}`));
  page.on("response", r => {
    if (r.status() < 400) return;
    const line = `${user} ${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`;
    (expect4xx.some(e => e.status === r.status() && r.url().includes(e.path)) ? expected : problems).push(line);
  });
  await page.addInitScript(u => { try { if (!sessionStorage.__s) { localStorage.setItem("rr_user", u); sessionStorage.__s = 1; } } catch {} }, user);
  const shot = (n) => page.screenshot({ path: join(SHOTS, `${n}.png`), fullPage: true });
  const go = async (hash) => { await page.goto(`${BASE}/${hash}`); await page.waitForLoadState("networkidle"); };
  return { ctx, page, shot, go };
}
// Permanent pocket labels on the map read "<name>: <Level>".
const pocketLevel = async (page, name) => {
  await page.waitForSelector(".map-label");
  const labels = await page.$$eval(".map-label", els => els.map(e => e.textContent.trim()));
  const hit = labels.find(l => l.startsWith(name + ":"));
  return hit ? hit.slice(name.length + 1).trim() : `(no label; saw ${JSON.stringify(labels)})`;
};
const POCKET = "Rajinder Nagar saucer";

try {
  // 0. Before: dashboard as anonymous.
  let u = await persona("");
  await u.go("#/dash"); const before = await pocketLevel(u.page, POCKET); await u.shot("00-dash-before");
  ok("pocket level before", before === "High", before); await u.ctx.close();

  // 1. Resident A reports at the default pin (drain DR-RN-001, MCD).
  u = await persona("res-1");
  await u.go("#/report"); await u.shot("01-report-form");
  await u.page.setInputFiles("#photo", photo);
  await u.page.selectOption("#kind", "blocked_drain");
  await u.page.fill("#note", "Leaves and plastic block the grate (walk)");
  await u.page.click("#send");
  await u.page.waitForSelector("#out .card, #out .err");
  await u.shot("02-report-result");
  const link = await u.page.$("#out a[href^='#/task/']");
  const taskHash = link ? await link.getAttribute("href") : null;
  ok("report created a task", !!taskHash, taskHash || await u.page.innerText("#out"));
  await u.go("#/mine"); await u.shot("03-mine"); await u.ctx.close();
  if (!taskHash) throw new Error("no task, cannot continue");

  // 2. Wrong agency official sees the task without actions (view only).
  u = await persona("off-pwd");
  await u.go(taskHash); await u.shot("04-task-other-agency");
  ok("other agency has no accept button", !(await u.page.$("#acc"))); await u.ctx.close();

  // 3. Owning official accepts, then completes with an after-photo.
  u = await persona("off-mcd");
  await u.go("#/inbox"); await u.shot("05-inbox");
  await u.go(taskHash); await u.shot("06-task-open");
  await u.page.click("#acc"); await u.page.waitForSelector("#done");
  await u.shot("07-task-accepted");
  await u.page.setInputFiles("#ph", photo);
  await u.page.fill("#nt", "Cleared by hand (walk)");
  await u.page.click("#done button[type=submit]");
  await u.page.waitForSelector("text=waiting", { timeout: 8000 }).catch(() => {});
  await u.page.waitForTimeout(800); await u.shot("08-task-done");
  ok("task shows done state", /done/i.test(await u.page.innerText("#view"))); await u.ctx.close();

  // 4. A different resident confirms. The reporter (res-1) confirming would be a rule break (backend item 3), not tested here.
  u = await persona("res-2");
  await u.go("#/confirm"); await u.shot("09-confirm-list");
  const card = await u.page.$(`[data-task="${taskHash.split("/").pop()}"]`);
  ok("confirm card visible to other resident", !!card);
  if (card) { await u.page.click(`[data-task="${taskHash.split("/").pop()}"] [data-ok="1"]`); await u.page.waitForTimeout(1000); await u.shot("10-confirmed"); }
  await u.ctx.close();

  // 5. Dashboard after: pocket level, impact, accountability, simulator.
  u = await persona("res-2");
  await u.go("#/dash"); const after = await pocketLevel(u.page, POCKET); await u.shot("11-dash-after");
  ok("pocket level High -> Elevated after confirmation", before === "High" && after === "Elevated", `before=${before} after=${after}`);
  for (const t of ["impact", "accountability", "simulator", "capture"]) { await u.go(`#/dash/${t}`); await u.shot(`12-dash-${t}`); }
  await u.ctx.close();

  // 6. Deliberate 403: a resident calls an admin-only endpoint; the router redirects #/admin, the API refuses.
  u = await persona("res-1", [{ status: 403, path: "/api/plan/generate" }]);
  await u.go("#/admin"); await u.shot("13-resident-admin-redirect");
  const r = await u.page.evaluate(async () => (await fetch("/api/plan/generate", { method: "POST", headers: { "X-User-Id": localStorage.getItem("rr_user") } })).status);
  ok("resident is forbidden from an admin API call (expected 403)", r === 403, `status ${r}`);
  await u.ctx.close();
} catch (e) { ok("walk ran to the end", false, e.message); }
await browser.close();

console.log("\nscreenshots:", SHOTS);
console.log("expected 4xx:", expected.length ? "\n  " + expected.join("\n  ") : "none");
console.log("unexpected console errors / 4xx / 5xx:", problems.length ? "\n  " + problems.join("\n  ") : "none");
process.exit(results.every(r => r.pass) && !problems.length ? 0 : 1);
