// web/landing/site.js — shared by the public pages: the HTTP client, text helpers, the footer server status and the phone menu.
import { createFetchHttp } from "/js/adapters/http-fetch.js";
import { esc, hrs, hrRange } from "/js/ui/format.js";

const http = createFetchHttp({ base: window.API_BASE || "" });
export const get = (path) => http.request("GET", path);
export { esc, hrs };

// Fill time range from the API's low and high cases. null means no fill in that case.
export const span = (lo, hi) => lo != null && hi != null ? hrRange(lo, hi)
  : lo == null && hi == null ? "no fill in either case" : `${hrs(lo ?? hi)} to no fill`;
export const rain = (mm) => `${Number(mm)} mm/h`;
const LEVEL = { high: "high", elevated: "elevated", watch: "watch", none: "no fill" };
export const levelText = (lvl) => LEVEL[lvl] || String(lvl ?? "not available");
// Level chip: the word is always printed, the colour only repeats it.
export const levelChip = (lvl) => `<li class="lvl" data-level="${esc(lvl)}">Level: ${esc(levelText(lvl))}</li>`;
export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
// "MCD (Municipal Corporation of Delhi)" -> ["MCD", "Municipal Corporation of Delhi"]
export function agencyParts(name) {
  const [short, ...rest] = String(name ?? "").split(" (");
  return [short, rest.join(" (").replace(/\)$/, "")];
}
export const errorBox = (el, text) => { el.innerHTML = `<p class="note">${esc(text)}</p>`; };

async function serverStatus() {
  const el = document.getElementById("status");
  if (!el) return;
  try {
    const h = await get("/api/health");
    el.dataset.state = h.ok ? "ok" : "down";
    el.textContent = `Server status: ${h.ok ? "ok" : "not ok"} · version ${h.version} · storage ${h.storage} · triage ${h.triage}`;
  } catch {
    el.dataset.state = "down";
    el.textContent = "Server status: not reachable right now";
  }
}

function phoneMenu() {
  const menu = document.querySelector(".mnav");
  if (!menu) return;
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { menu.open = false; }));
  document.addEventListener("click", (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.open = false; });
}

serverStatus();
phoneMenu();
