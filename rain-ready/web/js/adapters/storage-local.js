// web/js/adapters/storage-local.js — StoragePort over localStorage; survives blocked storage (private mode).
export function createLocalStorage(prefix = "rr_") {
  const ls = () => { try { return globalThis.localStorage; } catch { return null; } };
  return {
    get: (k) => { try { return ls()?.getItem(prefix + k) ?? ""; } catch { return ""; } },
    set: (k, v) => { try { ls()?.setItem(prefix + k, v); } catch { /* blocked */ } },
    remove: (k) => { try { ls()?.removeItem(prefix + k); } catch { /* blocked */ } },
  };
}
