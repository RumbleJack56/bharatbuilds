// web/js/services/session.service.js — who is logged in. Persona id lives in StoragePort under "user".
export function createSessionService(http, storage) {
  let cached = null;
  const userId = () => storage.get("user");
  const logout = () => { storage.remove("user"); cached = null; };
  async function me() {
    if (!userId()) return null;
    if (cached) return cached;
    try { cached = await http.request("GET", "/api/me"); }
    catch (e) { if (e.status === 401) { logout(); return null; } throw e; }
    return cached;
  }
  return {
    userId, me, logout,
    async login(id) { storage.set("user", id); cached = null; return me(); },
    users: () => http.request("GET", "/api/users"),
  };
}
