// Fetch wrapper. All paths are prefixed with window.API_BASE (empty = same origin).
export const BASE = () => (window.API_BASE || "").replace(/\/$/, "");

export function getUserId() { try { return localStorage.getItem("rr_user") || ""; } catch { return ""; } }
export function setUserId(id) {
  try { id ? localStorage.setItem("rr_user", id) : localStorage.removeItem("rr_user"); } catch { /* storage blocked */ }
}
export function photoUrl(u) { return !u ? "" : /^https?:/.test(u) ? u : BASE() + u; }

function detailText(d) {
  if (!d) return "Something went wrong.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(x => (x.loc ? x.loc.slice(1).join(".") + ": " : "") + (x.msg || "")).join("; ");
  return JSON.stringify(d);
}

export async function api(path, { method = "GET", json, form } = {}) {
  const headers = {};
  const uid = getUserId();
  if (uid) headers["X-User-Id"] = uid;
  let body;
  if (json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  else if (form) body = form;
  let res;
  try { res = await fetch(BASE() + path, { method, headers, body }); }
  catch { const e = new Error("Cannot reach the server. Check your connection."); e.status = 0; throw e; }
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) { const e = new Error(detailText(data && data.detail)); e.status = res.status; throw e; }
  return data;
}
export const get = p => api(p);
export const post = (p, json) => api(p, { method: "POST", json });
export const postForm = (p, form) => api(p, { method: "POST", form });
