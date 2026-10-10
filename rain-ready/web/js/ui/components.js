// web/js/ui/components.js — pure HTML snippets plus guard() for buttons.
import { esc } from "./format.js";

export const chip = (status) => `<span class="chip ${esc(status)}">${esc(status)}</span>`;
export const empty = (text) => `<div class="empty"><svg class="ic" aria-hidden="true"><use href="img/icons.svg?v=2#i-inbox"/></svg><p>${esc(text)}</p></div>`;
// Nav innerHTML: [hash, label, icon] tabs, the one whose hash prefixes the current hash is marked.
export const tabsHtml = (tabs, hash) => tabs.map(([h, t, i]) => {
  const on = hash.startsWith(h);
  return `<a href="${esc(h)}"${on ? ' class="on" aria-current="page"' : ""}><svg class="ic" aria-hidden="true"><use href="img/icons.svg?v=2#i-${esc(i)}"/></svg><span>${esc(t)}</span></a>`;
}).join("");
export const banner = (t) => t ? `<p class="banner">${esc(t)}</p>` : "";
export const errBox = (e) => `<p class="err" role="alert">${esc(e && e.message || e)}</p>`;
export function photos(urls, alt) {
  const list = (urls || []).filter(Boolean);
  return list.length ? `<div class="photos">${list.map(u => `<img loading="lazy" src="${esc(u)}" alt="${esc(alt)}">`).join("")}</div>` : "";
}
export const flagList = (flags) => flags && flags.length
  ? `<ul class="flags">${flags.map(f => `<li class="${f.level === "warn" ? "warn" : "info"}"><strong>${f.level === "warn" ? "Check needed" : "Note"}:</strong> ${esc(f.detail)}</li>`).join("")}</ul>` : "";
// Message for a refused report or after-photo: the server's own text, except the "kind is required" 422 which gets a hint.
export const photoError = (e, kind) => e.status === 422 && !kind && /^kind is required/.test(e.message)
  ? "We could not tell from the photo. Please pick what you see." : e.message || String(e);
// Runs fn once per tap: ignores taps while busy, re-enables after, reports errors to onError (usually ctx.toast.show).
export async function guard(btn, fn, onError) {
  if (btn.disabled) return;
  btn.disabled = true;
  try { return await fn(); } catch (e) { onError(e.message || String(e)); } finally { btn.disabled = false; }
}
// Style attribute for the n-th list item: --i drives the fade-up delay (30 ms steps, capped at 8 items).
export const stagger = (i) => `style="--i:${Math.min(7, Math.max(0, Number(i) | 0))}"`;
