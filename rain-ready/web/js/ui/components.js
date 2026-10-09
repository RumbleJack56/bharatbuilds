// web/js/ui/components.js — pure HTML snippets plus guard() for buttons.
import { esc } from "./format.js";

export const chip = (status) => `<span class="chip ${esc(status)}">${esc(status)}</span>`;
export const banner = (t) => t ? `<p class="banner">${esc(t)}</p>` : "";
export const errBox = (e) => `<p class="err" role="alert">${esc(e && e.message || e)}</p>`;
export function photos(urls, alt) {
  const list = (urls || []).filter(Boolean);
  return list.length ? `<div class="photos">${list.map(u => `<img loading="lazy" src="${esc(u)}" alt="${esc(alt)}">`).join("")}</div>` : "";
}
// Runs fn once per tap: ignores taps while busy, re-enables after, reports errors to onError (usually ctx.toast.show).
export async function guard(btn, fn, onError) {
  if (btn.disabled) return;
  btn.disabled = true;
  try { return await fn(); } catch (e) { onError(e.message || String(e)); } finally { btn.disabled = false; }
}
