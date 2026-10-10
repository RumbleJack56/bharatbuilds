// web/js/adapters/transition-vt.js — TransitionPort over document.startViewTransition. The ONLY file that calls it.
// run(fn) always runs fn exactly once and resolves with its value; animation is a bonus, never a requirement.
export function createViewTransition(doc = globalThis.document, win = globalThis.window) {
  return {
    run(fn) {
      const reduced = !!win?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduced || typeof doc.startViewTransition !== "function") return Promise.resolve().then(fn);
      let out, called = false;
      let vt;
      try { vt = doc.startViewTransition(async () => { called = true; out = await fn(); }); }
      catch { return called ? Promise.resolve(out) : Promise.resolve().then(fn); }
      return vt.updateCallbackDone.then(() => out);
    },
  };
}
export const createInstantTransition = () => ({ run: (fn) => Promise.resolve().then(fn) });
