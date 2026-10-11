// web/js/services/places.service.js — Delhi waterlogging places from the city records, and one PWD road. Public, read only.
export function createPlacesService(http) {
  return {
    // Only the filters that are given go into the query; the API applies its own defaults.
    places({ chronic, minDates, owner, road, limit } = {}) {
      const q = new URLSearchParams();
      if (chronic != null) q.set("chronic", chronic ? "true" : "false");
      if (minDates != null && minDates !== "") q.set("min_dates", minDates);
      if (owner) q.set("owner", owner);
      if (road && String(road).trim()) q.set("road", String(road).trim());
      if (limit != null && limit !== "") q.set("limit", limit);
      const s = String(q);
      return http.request("GET", "/api/city/places" + (s ? "?" + s : ""));
    },
    road: (code) => http.request("GET", "/api/city/roads/" + encodeURIComponent(code)),
  };
}
