// web/js/core/router.js — hash router. parseHash/resolve are pure; createRouter touches window and the DOM.
export function parseHash(hash) {
  const [, name = "", ...params] = (hash || "#/").split("/");
  return { name, params };
}

export function resolve(controllers, name, role) {
  const c = controllers.find(x => x.path === name);
  if (name === "login" && role) return { redirect: true };   // already signed in: go home
  if (!c || (c.roles && !c.roles.includes(role))) return { redirect: true };
  return { controller: c };
}

export function createRouter({ controllers, root, ctx, home, onChrome, errorHtml }) {
  let cleanup = null, seq = 0;
  async function render() {
    const my = ++seq, stale = () => my !== seq;
    const { name, params } = parseHash(location.hash);
    const me = await ctx.services.session.me().catch(() => null);
    if (stale()) return;
    const hit = resolve(controllers, name, me ? me.role : null);
    const target = me ? home[me.role] : "#/login";
    if (hit.redirect && location.hash !== target) { location.hash = target; return; }
    const controller = hit.controller || controllers.find(c => c.path === "login");
    onChrome(me, location.hash);
    if (cleanup) { cleanup(); cleanup = null; }
    const host = document.createElement("div");      // a stale render writes into a host nobody sees
    root.replaceChildren(host);
    let done = null;
    try { done = (await controller.mount(host, ctx, params)) || null; }
    catch (e) {
      if (stale()) return;
      if (e && e.status === 401) { ctx.services.session.logout(); location.hash = "#/login"; return; }
      host.innerHTML = errorHtml(e);
    }
    if (stale()) { if (done) done(); return; }
    cleanup = done;
    root.focus();
  }
  return {
    start() { addEventListener("hashchange", render); return render(); },
    refresh: render,
  };
}

// Adapter for screens not yet migrated: wraps an old render(view, me, arg) function as a controller.
export function legacy(path, roles, fn) {
  return { path, roles, mount: async (root, ctx, params) => fn(root, await ctx.services.session.me(), params[0]) };
}
