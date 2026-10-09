export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const KINDS = { blocked_drain: "Blocked drain", standing_water: "Standing water", overflow: "Drain overflowing", other: "Something else" };
export const FIELD_RULE = "Do not open manholes, enter drains, or go near drains during or after rain.";
export const hrs = h => h == null ? "not available" : "about " + (h < 10 ? Math.round(h * 10) / 10 : Math.round(h)) + " h";
export function when(iso) { try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso || ""; } }
export const chip = (status) => `<span class="chip ${esc(status)}">${esc(status)}</span>`;
export const banner = t => t ? `<p class="banner">${esc(t)}</p>` : "";
export const errBox = e => `<p class="err" role="alert">${esc(e.message || e)}</p>`;
let timer;
export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(timer); timer = setTimeout(() => { t.hidden = true; }, 4000);
}
// Run an async button action: disables the button, shows errors in a toast.
export async function guard(btn, fn) {
  btn.disabled = true;
  try { return await fn(); } catch (e) { toast(e.message); } finally { btn.disabled = false; }
}
export function photosHtml(list, label) {
  const imgs = (list || []).filter(Boolean);
  return imgs.length ? `<div class="photos">${imgs.map(u => `<img loading="lazy" src="${esc(u)}" alt="${esc(label)}">`).join("")}</div>` : "";
}
