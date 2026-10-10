// web/js/services/dashboard.service.js — public dashboard data and the coordinator's plan.
export function createDashboardService(http) {
  return {
    map: () => http.request("GET", "/api/map"),
    simulate: ({ rain, state = "current", atH }) =>
      http.request("POST", "/api/simulate", { json: { rain_mm_h: rain, drain_state: state, ...(atH == null ? {} : { at_h: atH }) } }),
    accountability: () => http.request("GET", "/api/accountability"),
    impact: () => http.request("GET", "/api/impact"),
    opportunities: () => http.request("GET", "/api/opportunities"),
    leaderboard: () => http.request("GET", "/api/leaderboard"),
    transparency({ agencyId, status, limit } = {}) {
      const q = new URLSearchParams();
      if (agencyId) q.set("agency_id", agencyId);
      if (status) q.set("status", status);
      q.set("limit", limit || 50);
      return http.request("GET", "/api/transparency?" + q);
    },
    agencies: async () => (await http.request("GET", "/api/agencies")).agencies,
    generatePlan: (top = 5) => http.request("POST", `/api/plan/generate?top=${encodeURIComponent(top)}`),
  };
}
