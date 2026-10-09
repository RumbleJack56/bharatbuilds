// web/js/ui/format.js — pure text helpers.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const hrs = (h) => h == null ? "not available" : "about " + (h < 10 ? Math.round(h * 10) / 10 : Math.round(h)) + " h";
export function when(iso) {
  try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso || ""; }
}
