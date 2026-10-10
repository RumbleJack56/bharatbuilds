// web/tests/fakes.js — test doubles that satisfy the ports.
import { ApiError } from "../js/core/errors.js";

export function createFakeHttp(routes = {}, base = "https://api.test") {
  const calls = [];
  return {
    calls,
    async request(method, path, opts = {}) {
      calls.push({ method, path, ...opts });
      const h = routes[`${method} ${path}`];
      if (h === undefined) throw new ApiError(`no fake for ${method} ${path}`, 404);
      if (h instanceof ApiError) throw h;
      return typeof h === "function" ? h(opts) : structuredClone(h);
    },
    url: (p) => !p ? "" : /^https?:/.test(p) ? p : base + p,
  };
}

export function createMemoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { get: k => m.get(k) ?? "", set: (k, v) => m.set(k, String(v)), remove: k => m.delete(k) };
}

export function createFakeGlass(initial = "css") {
  const calls = [];
  return { calls, mode: () => initial, mount: (s) => calls.push(["mount", s]), refresh: async () => { calls.push(["refresh"]); }, destroy: () => calls.push(["destroy"]) };
}
