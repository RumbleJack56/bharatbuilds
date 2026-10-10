// web/js/adapters/glass-css.js — GlassPort without a lens: the CSS frost from glass.css is the whole effect.
export function createCssGlass(doc = globalThis.document) {
  doc?.documentElement?.classList.add("glass-css");
  return { mount() {}, refresh: async () => {}, destroy() {}, mode: () => "css" };
}
