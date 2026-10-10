// web/tests/contrast-lib.js — WCAG 2.x contrast maths over CSS colour strings. Test helper, no I/O.
export function parseColor(s) {
  s = String(s).trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map(c => c + c).join("");
    const rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return [...rgb, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error("unparseable colour: " + s);
}
export const over = ([r, g, b, a], [R, G, B]) => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function tokens(css) {
  const t = {};
  for (const [, k, v] of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) t[k] = v.trim();
  return t;
}
