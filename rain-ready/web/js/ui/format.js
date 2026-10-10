// web/js/ui/format.js — pure text helpers.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const hrs = (h) => h == null ? "not available" : "about " + (h < 10 ? Math.round(h * 10) / 10 : Math.round(h)) + " h";
export function when(iso) {
  try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso || ""; }
}
const h1 = (h) => h < 10 ? Math.round(h * 10) / 10 : Math.round(h);
export const hrRange = (lo, hi) => lo == null || hi == null ? "not available" : `about ${h1(lo)} to ${h1(hi)} h`;
// Zero reads as a phrase, not a figure. Other values keep the plain format.
export const gainPhrase = (h) => h === 0 ? "gains no fill time at this rain" : "gains " + hrs(h) + " of fill time";
export const rankPhrase = (r) => r === 0 ? "no rank score" : "rank " + Math.round(r * 10) / 10;
