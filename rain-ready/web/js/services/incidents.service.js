// web/js/services/incidents.service.js — resident reports.
export function createIncidentsService(http) {
  const fix = (i) => ({ ...i, photo_url: http.url(i.photo_url) });
  return {
    async create({ lat, lon, kind = "", note = "", photo, accuracy_m, capture_token = "" }) {
      const fd = new FormData();
      fd.append("lat", lat); fd.append("lon", lon); fd.append("kind", kind); fd.append("note", note);
      if (typeof accuracy_m === "number") fd.append("accuracy_m", accuracy_m);
      if (capture_token) fd.append("capture_token", capture_token);
      if (photo) fd.append("photo", photo, "photo.jpg");
      const r = await http.request("POST", "/api/incidents", { form: fd });
      return { ...r, incident: fix(r.incident) };
    },
    async mine() {
      const d = await http.request("GET", "/api/incidents?mine=true");
      return d.incidents.map(fix);
    },
  };
}
