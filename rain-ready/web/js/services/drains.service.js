// web/js/services/drains.service.js — one drain's public record: owner, silt estimate, pockets, cleaning history.
export function createDrainsService(http) {
  return {
    asset: (id) => http.request("GET", `/api/assets/${encodeURIComponent(id)}`),
  };
}
