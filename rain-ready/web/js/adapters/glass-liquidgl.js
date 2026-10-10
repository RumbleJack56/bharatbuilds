// web/js/adapters/glass-liquidgl.js — GlassPort over liquidGL 2.2.4 (MIT, github.com/naughtyduk/liquidGL). The ONLY file that touches window.liquidGL.
const OPTS = { snapshot: "body", resolution: 1.5, refraction: 0.01, bevelDepth: 0.06, bevelWidth: 0.15, frost: 1,
  shadow: true, specular: false, tilt: false, reveal: "none" };
const MAX_LENSES = 12;

export function createLiquidGlass(win = globalThis.window, { settleMs = 150, imgTimeoutMs = 1500, setTimeoutFn = setTimeout } = {}) {
  const doc = win.document, root = doc.documentElement;
  const lenses = new Map();                       // element -> lens. liquid-gl 2.2.4 has no lens destroy(), so lenses are mounted once, on persistent chrome only
  let state = "liquid", selector = "", serial = 0, gen = 0;

  // The library appends its shared renderer canvas (and mirror canvases) straight to <body> with no teardown API: hide them.
  const hideCanvases = () => { for (const c of doc.querySelectorAll("body > canvas")) if (c.style) c.style.display = "none"; };
  const fallback = () => { state = "css"; gen++; root.classList.add("glass-css"); hideCanvases(); lenses.clear(); };   // context lost or library threw
  win.addEventListener("webglcontextlost", fallback, true);

  function add() {
    if (state !== "liquid" || !selector) return;
    for (const el of doc.querySelectorAll(selector)) {
      if (lenses.has(el) || lenses.size >= MAX_LENSES) continue;
      const cls = `lgl-${++serial}`;
      el.classList.add(cls);
      try { lenses.set(el, [].concat(win.liquidGL({ ...OPTS, target: "." + cls }))[0] || {}); }
      catch { fallback(); return; }
    }
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
      const my = ++gen;
      try {
        await imagesSettled();
        await new Promise(r => setTimeoutFn(r, settleMs));
        if (my !== gen || state !== "liquid") return;
        if (state === "liquid") win.dispatchEvent(new win.Event("resize"));
      } catch { fallback(); }
    },
    destroy() { gen++; hideCanvases(); lenses.clear(); win.removeEventListener("webglcontextlost", fallback, true); },
  };
}

// True once the async CDN script has defined the library (main.js asks here so the global's name stays in this file).
export const hasLiquidGL = (win = globalThis.window) => typeof win?.liquidGL === "function";
