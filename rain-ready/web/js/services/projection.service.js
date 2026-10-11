// web/js/services/projection.service.js — rain and silt projection per pocket (a scenario, not a forecast).
const list = (xs) => xs.map(x => encodeURIComponent(x)).join(",");

export function createProjectionService(http) {
  return {
    // rains in mm/h, horizons in days from today; both optional (the server has defaults).
    projection({ rains, horizons } = {}) {
      const q = [];
      if (rains?.length) q.push("rain=" + list(rains));
      if (horizons?.length) q.push("horizon=" + list(horizons));
      return http.request("GET", "/api/projection" + (q.length ? "?" + q.join("&") : ""));
    },
  };
}
