// web/js/services/city.service.js — Delhi evidence base: city-wide counts and the city insights. Public, read only.
export function createCityService(http) {
  return {
    summary: () => http.request("GET", "/api/city/summary"),
    insights: () => http.request("GET", "/api/city/insights"),
  };
}
