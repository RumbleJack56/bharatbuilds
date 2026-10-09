// web/js/adapters/map-leaflet.js — MapPort over Leaflet. The ONLY file in web/ that touches L.
import { definePort, implement } from "../core/port.js";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MapView = definePort("MapViewPort", ["circle", "badge", "pin", "onClick", "view", "fit", "destroy"]);

export function createLeafletMap(L = globalThis.L) {
  return {
    available: () => !!L,
    create(el, { center, zoom = 16 } = {}) {
      const map = L.map(el);
      L.tileLayer(TILES, { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      if (center) map.setView(center, zoom);
      setTimeout(() => map.invalidateSize(), 100);
      let pin = null;
      return implement(MapView, {
        // radius in screen pixels so a pocket stays visible at any zoom (fixes B-1)
        circle([lat, lon], { color, radiusPx = 12, label, popup }) {
          const m = L.circleMarker([lat, lon], { radius: radiusPx, color, fillColor: color, fillOpacity: 0.45, weight: 3 }).addTo(map);
          if (label) m.bindTooltip(label, { permanent: true, direction: "right", className: "map-label" });
          if (popup) m.bindPopup(popup);
        },
        badge([lat, lon], { html, size = 28, popup }) {
          const m = L.marker([lat, lon], { icon: L.divIcon({ className: "", html, iconSize: [size, size] }) }).addTo(map);
          if (popup) m.bindPopup(popup);
        },
        pin([lat, lon]) { pin ? pin.setLatLng([lat, lon]) : (pin = L.marker([lat, lon]).addTo(map)); },
        onClick(fn) { map.on("click", e => fn(e.latlng.lat, e.latlng.lng)); },
        view([lat, lon], z = 17) { map.setView([lat, lon], z); },
        fit(points, maxZoom = 17) { if (points.length) map.fitBounds(points, { padding: [30, 30], maxZoom }); },
        destroy() { map.remove(); },
      });
    },
  };
}
