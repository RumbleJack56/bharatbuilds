// web/js/adapters/http-fetch.js — HttpPort over fetch. The ONLY file in web/ that calls fetch.
import { ApiError } from "../core/errors.js";

function detailText(d) {
  if (!d) return "Something went wrong.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(x => (x.loc ? x.loc.slice(1).join(".") + ": " : "") + (x.msg || "")).join("; ");
  return JSON.stringify(d);
}

export function createFetchHttp({ base = "", getUserId = () => "", fetchImpl = (...a) => globalThis.fetch(...a) } = {}) {
  const root = base.replace(/\/$/, "");
  return {
    async request(method, path, { json, form, text } = {}) {
      const headers = {};
      const uid = getUserId();
      if (uid) headers["X-User-Id"] = uid;
      let body;
      if (json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
      else if (form) body = form;
      let res;
      try { res = await fetchImpl(root + path, { method, headers, body }); }
      catch { throw new ApiError("Cannot reach the server. Check your connection.", 0); }
      if (text && res.ok) return res.text();
      let data = null;
      try { data = await res.json(); } catch { /* empty body */ }
      if (!res.ok) throw new ApiError(detailText(data && data.detail), res.status);
      return data;
    },
    url: (p) => !p ? "" : /^https?:/.test(p) ? p : root + p,
  };
}
