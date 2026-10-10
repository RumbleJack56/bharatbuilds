// web/tests/e2e/walk.mjs — end-to-end walk on a FRESH database (never the dev DB).
// Usage: NODE_PATH=<dir with node_modules/playwright> PW_CHROME=<chromium binary> \
//        node web/tests/e2e/walk.mjs http://localhost:8010 [screenshotDir]
// Flow: resident reports (live camera) at the real-seed drain DR-DN-PUSA (MCD) -> official accepts -> completes with a camera photo ->
// a different resident confirms -> dashboard. Runs on the real seed (data/seed.json, no SEED_PATH). DR-DN-PUSA is in no pocket, so the
// observable change after confirmation is the task chip reading confirmed and Impact counting 1 confirmed task (fill time gained stays 0 h). Exit code 1 on any failure
// or any unexpected console error / 4xx / 5xx. No package.json or npm dependency lives in web/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = (process.argv[2] || "http://localhost:8010").replace(/\/$/, "");
const SHOTS = process.argv[3] || process.env.WALK_SHOTS || join(tmpdir(), "rr-walk-shots");
mkdirSync(SHOTS, { recursive: true });

const DRAIN = [28.643592, 77.186944];       // DR-DN-PUSA in data/seed.json: Daryai Nallah barrel, Pusa Road crossing, MCD
const results = [], problems = [], expected = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
// The fake camera feeds a test pattern, so the live-camera flow runs without a device.
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
// Opens the camera from `openSel`, takes the shot, waits for the stamped preview.
async function takePhoto(page, openSel) {
  await page.click(openSel); await page.waitForSelector(".cam-overlay video");
  await page.waitForFunction(() => !document.querySelector(".cam-overlay button.primary")?.disabled);
  await page.click(".cam-overlay button.primary"); await page.waitForSelector("#prev img");
}

async function persona(user, expect4xx = []) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["geolocation", "camera"],
    geolocation: { latitude: DRAIN[0], longitude: DRAIN[1], accuracy: 10 } });
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
// Impact tile "fill time gained by confirmed work" as the text before its label.
const gained = async (page) => (await page.innerText("#pane")).replace(/\s+/g, " ").match(/(\S+ ?\S*) fill time gained by confirmed work/)?.[1] ?? "(not found)";

try {
  // 0. Before: Impact as anonymous; no work confirmed yet.
  let u = await persona("");
  await u.go("#/dash/impact"); await u.page.waitForSelector("#pane .grid"); const before = await gained(u.page); await u.shot("00-impact-before");
  ok("fill time gained starts at 0", /^0\b/.test(before), before); await u.ctx.close();

  // 1. Resident A reports at the default pin (drain DR-DN-PUSA, MCD).
  u = await persona("res-1");
  await u.go("#/report"); await u.shot("01-report-form");
  ok("default pin is labelled DR-DN-PUSA's place", /Daryai Nallah barrel, Pusa Road/.test(await u.page.innerText("#coords")));
  await takePhoto(u.page, "#cam");
  ok("report photo locks the pin", /Pin from your photo/.test(await u.page.innerText("#coords")));
  await u.page.selectOption("#kind", "blocked_drain");
  await u.page.fill("#note", "Leaves and plastic block the grate (walk)");
  await u.page.click("#send");
  await u.page.waitForSelector("#out .card, #out .err");
  await u.shot("02-report-result");
  const link = await u.page.$("#out a[href^='#/task/']");
  const taskHash = link ? await link.getAttribute("href") : null;
  ok("report created a task", !!taskHash, taskHash || await u.page.innerText("#out"));
  ok("report links to DR-DN-PUSA", /DR-DN-PUSA/.test(await u.page.innerText("#out")), (await u.page.innerText("#out")).slice(0, 120));
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
  await takePhoto(u.page, "#ph");
  await u.page.fill("#nt", "Cleared by hand (walk)");
  await u.page.click("#done button[type=submit]");
  await u.page.waitForSelector("text=waiting", { timeout: 8000 }).catch(() => {});
  await u.page.waitForTimeout(800); await u.shot("08-task-done");
  const page4 = await u.page.innerText("#view");
  ok("task shows done state", /done/i.test(page4)); ok("task is owned by MCD", /MCD/.test(page4)); await u.ctx.close();

  // 4. A different resident confirms. The reporter (res-1) confirming would be a rule break (backend item 3), not tested here.
  u = await persona("res-2");
  await u.go("#/confirm"); await u.shot("09-confirm-list");
  const card = await u.page.$(`[data-task="${taskHash.split("/").pop()}"]`);
  ok("confirm card visible to other resident", !!card);
  if (card) { await u.page.click(`[data-task="${taskHash.split("/").pop()}"] [data-ok="1"]`); await u.page.waitForTimeout(1000); await u.shot("10-confirmed"); }
  await u.ctx.close();

  // 5. After: the task reads confirmed, Impact fill time gained went up, then the other tabs.
  u = await persona("res-2");
  await u.go(taskHash); ok("task chip reads confirmed", /confirmed/i.test(await u.page.innerText(".chip")), await u.page.innerText(".chip"));
  await u.go("#/dash/impact"); await u.page.waitForSelector("#pane .grid"); const after = await gained(u.page); await u.shot("11-impact-after");
  const tiles = (await u.page.innerText("#pane")).replace(/\s+/g, " ");
  ok("Impact counts the confirmed task", /1 confirmed/.test(tiles), `gained before=${before} after=${after} (DR-DN-PUSA sits in no pocket, so 0 h is correct)`);
  await u.go("#/dash/simulator"); await u.page.waitForSelector("#rain");
  ok("simulator starts at the map's reference rain (25)", (await u.page.inputValue("#rain")) === "25", await u.page.inputValue("#rain"));
  await u.go("#/dash/map"); await u.page.waitForSelector(".map-label"); await u.page.waitForTimeout(500); await u.shot("12-dash-map");
  // Leaving the map tab right after it loads must not throw (Leaflet _leaflet_pos race).
  const errs0 = problems.length;
  await u.page.goto(`${BASE}/#/dash/map`); await u.page.evaluate(() => { location.hash = "#/dash/impact"; });
  await u.page.waitForTimeout(700);
  ok("leaving the map tab at once raises no page error", problems.length === errs0, problems.slice(errs0).join(" | "));
  for (const t of ["accountability", "capture"]) { await u.go(`#/dash/${t}`); await u.shot(`12-dash-${t}`); }
  await u.ctx.close();

  // 6. Deliberate 403: a resident calls an admin-only endpoint; the router redirects #/admin, the API refuses.
  u = await persona("res-1", [{ status: 403, path: "/api/plan/generate" }]);
  await u.go("#/admin"); await u.shot("13-resident-admin-redirect");
  const r = await u.page.evaluate(async () => (await fetch("/api/plan/generate", { method: "POST", headers: { "X-User-Id": localStorage.getItem("rr_user") } })).status);
  ok("resident is forbidden from an admin API call (expected 403)", r === 403, `status ${r}`);
  await u.ctx.close();
  // 7. Held queue: the same picture from two people holds the second report; the coordinator releases it. Then the public board.
  const post = (page) => page.evaluate(async ([lat, lon]) => {
    const c = document.createElement("canvas"); c.width = 240; c.height = 180; const g = c.getContext("2d");
    for (let i = 0; i < 12; i++) for (let j = 0; j < 9; j++) { const v = (i * 97 + j * 53 + i * j * 31) % 256; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * 20, j * 20, 20, 20); }
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9)), fd = new FormData();
    fd.append("lat", lat); fd.append("lon", lon); fd.append("kind", "blocked_drain"); fd.append("note", "held walk"); fd.append("photo", blob, "p.jpg");
    return (await (await fetch("/api/incidents", { method: "POST", body: fd, headers: { "X-User-Id": localStorage.getItem("rr_user") } })).json()).held_for_review;
  }, DRAIN);
  u = await persona("admin-1"); await u.go("#/admin"); const first = await post(u.page); await u.ctx.close();
  u = await persona("res-2"); await u.go("#/mine"); const second = await post(u.page); await u.ctx.close();
  ok("a picture sent twice by different people is held", first === false && second === true, `first=${first} second=${second}`);
  u = await persona("admin-1"); await u.go("#/held"); await u.page.waitForSelector("[data-act=release]"); await u.shot("14-held");
  await u.page.fill("textarea", "checked (walk)"); await u.page.click("[data-act=release]");
  await u.page.waitForSelector("#view .banner a[href^='#/task/']"); await u.shot("15-held-released");
  ok("release empties the queue and links the task", /No reports are waiting/.test(await u.page.innerText("#view")));
  await u.go("#/board"); await u.page.waitForSelector("#log details"); await u.shot("16-board");
  ok("public board shows the method and the action log", /How the score works/.test(await u.page.innerText("#view")) && (await u.page.locator("#log details").count()) > 0);
  await u.ctx.close();
} catch (e) { ok("walk ran to the end", false, e.message); }
await browser.close();

console.log("\nscreenshots:", SHOTS);
console.log("expected 4xx:", expected.length ? "\n  " + expected.join("\n  ") : "none");
console.log("unexpected console errors / 4xx / 5xx:", problems.length ? "\n  " + problems.join("\n  ") : "none");
process.exit(results.every(r => r.pass) && !problems.length ? 0 : 1);
