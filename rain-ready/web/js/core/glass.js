// web/js/core/glass.js — pure rules for picking the glass implementation. No window access: main.js builds env.
export const PHONE_LIQUID = true;   // Task 6 sets this to false if the measured phone median frame is > 33 ms

// env: { hasLiquid, hasGL, reducedMotion, deviceMemory (number|undefined), search, phone }
export function chooseGlass(env, phoneLiquid = PHONE_LIQUID) {
  const q = new URLSearchParams(env.search || "").get("glass");
  if (q === "css") return "css";
  if (!env.hasLiquid || !env.hasGL || env.reducedMotion) return "css";
  if (q === "liquid") return "liquid";                       // test override: skips memory and phone rules only
  if (env.deviceMemory != null && env.deviceMemory < 4) return "css";
  if (env.phone && !phoneLiquid) return "css";
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
