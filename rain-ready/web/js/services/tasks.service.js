// web/js/services/tasks.service.js — task lifecycle. Returns tasks with absolute photo URLs.
export function createTasksService(http) {
  const fixPhotos = (t) => ({ ...t,
    events: (t.events || []).map(e => ({ ...e, photo_url: http.url(e.photo_url) })),
    incidents: (t.incidents || []).map(i => ({ ...i, photo_url: http.url(i.photo_url) })) });
  const id = (x) => encodeURIComponent(x);
  return {
    list({ agencyId, status } = {}) {
      const q = new URLSearchParams();
      if (agencyId) q.set("agency_id", agencyId);
      if (status) q.set("status", status);
      return http.request("GET", "/api/tasks" + (q.size ? "?" + q : ""));
    },
    async get(tid) { return fixPhotos(await http.request("GET", `/api/tasks/${id(tid)}`)); },
    async accept(tid) { return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/accept`)); },
    async reject(tid, { reason, reassignTo }) {
      return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/reject`, { json: { reason, reassign_to: reassignTo || null } }));
    },
    async assign(tid, agencyId) { return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/assign`, { json: { agency_id: agencyId } })); },
    async complete(tid, { photo, note = "" }) {
      const fd = new FormData(); fd.append("photo", photo); fd.append("note", note);
      return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/complete`, { form: fd }));
    },
    async confirm(tid, { ok, note = "" }) { return fixPhotos(await http.request("POST", `/api/tasks/${id(tid)}/confirm`, { json: { ok, note } })); },
  };
}
