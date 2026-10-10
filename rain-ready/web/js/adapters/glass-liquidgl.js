// web/js/adapters/glass-liquidgl.js — GlassPort over liquidGL 2.2.4 (MIT, github.com/naughtyduk/liquidGL). The ONLY file that touches window.liquidGL.
const OPTS = { snapshot: "body", resolution: 1.5, refraction: 0.01, bevelDepth: 0.06, bevelWidth: 0.15, frost: 1,
  shadow: true, specular: false, tilt: false, reveal: "none" };
const MAX_LENSES = 12, RESNAP_MS = 300;   // liquidGL re-captures on a 250 ms debounced resize

export function createLiquidGlass(win = globalThis.window, { settleMs = 150, imgTimeoutMs = 1500, setTimeoutFn = setTimeout } = {}) {
  const doc = win.document, root = doc.documentElement;
  const lenses = new Map();                       // element -> lens. liquid-gl 2.2.4 has no lens destroy(), so lenses are mounted once, on persistent chrome only
  let state = "liquid", selector = "", serial = 0, gen = 0;

  // The library appends its shared renderer canvas (and mirror canvases) straight to <body> with no teardown API.
  // Hide only those: adopt the body canvases that appear while liquidGL mounts (diff before/after), never a blanket "body > canvas".
  const owned = new Set(), canvases = () => [...doc.querySelectorAll("body > canvas")];
  const hideCanvases = () => { for (const c of owned) if (c.style) c.style.display = "none"; };
  const fallback = () => { state = "css"; gen++; root.classList.add("glass-css"); hideCanvases(); lenses.clear(); };   // context lost or library threw
  // liquidGL sets pointer-events:none inline on each target (clicks would fall through to <body>): hand them back.
  const unblock = () => { for (const el of lenses.keys()) { if (el.style) el.style.pointerEvents = "auto"; for (const k of el.querySelectorAll?.("a, button, input, select, textarea") || []) if (k.style) k.style.pointerEvents = "auto"; } };
  win.addEventListener("webglcontextlost", fallback, true);

  function add() {
    if (state !== "liquid" || !selector) return;
    for (const el of doc.querySelectorAll(selector)) {
      if (lenses.has(el) || lenses.size >= MAX_LENSES) continue;
      const before = new Set(canvases()), cls = `lgl-${++serial}`;
      el.classList.add(cls);
      try { lenses.set(el, [].concat(win.liquidGL({ ...OPTS, target: "." + cls }))[0] || {}); }
      catch { for (const c of canvases()) if (!before.has(c)) owned.add(c); fallback(); return; }
      for (const c of canvases()) if (!before.has(c)) owned.add(c);
    }
    unblock();
    if (state === "liquid") root.classList.remove("glass-css");
  }
  const imagesSettled = () => {
    const pending = [...(doc.images || [])].filter(i => !i.complete);
    if (!pending.length) return Promise.resolve();
    const loaded = Promise.all(pending.map(i => new Promise(r => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); })));
    return Promise.race([loaded, new Promise(r => setTimeoutFn(r, imgTimeoutMs))]);
  };

  return {
    mode: () => state,
    mount(sel) { selector = sel; add(); },        // call once at boot; per-route elements use CSS glass (data-lg-css), never a lens
    // Called after each route render. Only the newest call re-snapshots; liquidGL re-captures on a debounced window "resize".
    async refresh() {
      if (state !== "liquid") return;
      const my = ++gen, seen = new Set(canvases());
      try {
        await imagesSettled();
        await new Promise(r => setTimeoutFn(r, settleMs));
        if (my !== gen || state !== "liquid") return;
        win.dispatchEvent(new win.Event("resize"));
        await new Promise(r => setTimeoutFn(r, RESNAP_MS));       // the re-snapshot may create canvases late: adopt those (and only those) so context loss can hide them
        for (const c of canvases()) if (!seen.has(c)) owned.add(c);
        if (state !== "liquid") hideCanvases(); else unblock();
      } catch { fallback(); }
    },
    destroy() { gen++; hideCanvases(); lenses.clear(); win.removeEventListener("webglcontextlost", fallback, true); },
  };
}

// True once the async CDN script has defined the library (main.js asks here so the global's name stays in this file).
export const hasLiquidGL = (win = globalThis.window) => typeof win?.liquidGL === "function";
