// web/js/core/glass.js — pure rules for picking the glass implementation. No window access: main.js builds env.
// liquid-gl 2.2.4 doubles unblurred text under the bar and washes the tab bar on every width, so css is the default; ?glass=liquid opts in.
// env: { hasLiquid, hasGL, reducedMotion, search }
export function chooseGlass(env) {
  const q = new URLSearchParams(env.search || "").get("glass");
  if (q !== "liquid") return "css";
  if (!env.hasLiquid || !env.hasGL || env.reducedMotion) return "css";   // liquid still needs WebGL, the CDN script and motion allowed
  return "liquid";
}

const REAL = { now: () => Date.now(), sleep: (n) => new Promise(r => setTimeout(r, n)) };
// Polls pred until true or `ms` elapse (a hung CDN script must not hold the app back).
export async function waitFor(pred, ms, step = 50, timers = REAL) {
  const t0 = timers.now();
  for (;;) {
    if (pred()) return true;
    if (timers.now() - t0 >= ms) return false;
    await timers.sleep(step);
  }
}
