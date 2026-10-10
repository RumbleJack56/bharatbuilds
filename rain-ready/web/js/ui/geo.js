// web/js/ui/geo.js — pure distance helpers.
const R = 6371000, rad = (d) => d * Math.PI / 180;
export function distanceM([lat1, lon1], [lat2, lon2]) {                  // haversine, metres
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// Nearest of {lat, lon, ...} drains to a point; m is rounded to 10 m. null when there are none.
export function nearestDrain(pos, drains) {
  let best = null;
  for (const d of drains || []) { const m = distanceM(pos, [d.lat, d.lon]); if (!best || m < best.m) best = { drain: d, m }; }
  return best && { drain: best.drain, m: Math.round(best.m / 10) * 10 };
}
