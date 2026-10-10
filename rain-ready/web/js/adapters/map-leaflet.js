// web/js/adapters/map-leaflet.js — MapPort over Leaflet. The ONLY file in web/ that touches L.
import { definePort, implement } from "../core/port.js";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MapView = definePort("MapViewPort", ["circle", "badge", "pin", "clear", "onClick", "view", "fit", "destroy"]);

export function createLeafletMap(L = globalThis.L) {
  return {
    available: () => !!L,
    create(el, { center, zoom = 16 } = {}) {
      const map = L.map(el);
      L.tileLayer(TILES, { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      if (center) map.setView(center, zoom);
      const layer = L.layerGroup().addTo(map);          // circles and badges live here so clear() leaves the pin and tiles alone
      let pin = null, dead = false;
      // After destroy every call is a no-op (Leaflet throws _leaflet_pos on a removed map) and the deferred resize is cancelled.
      const timer = setTimeout(() => { if (!dead) map.invalidateSize(); }, 100);
      const live = (fn) => (...a) => { if (!dead) return fn(...a); };
      const v = {
        // radius in screen pixels so a pocket stays visible at any zoom (fixes B-1)
        circle: ([lat, lon], { color, radiusPx = 12, label, popup }) => {
          const m = L.circleMarker([lat, lon], { radius: radiusPx, color, fillColor: color, fillOpacity: 0.45, weight: 3 }).addTo(layer);
          if (label) m.bindTooltip(label, { permanent: true, direction: "right", className: "map-label" });
          if (popup) m.bindPopup(popup);
        },
        badge: ([lat, lon], { html, size = 28, popup }) => {
          const m = L.marker([lat, lon], { icon: L.divIcon({ className: "", html, iconSize: [size, size] }), interactive: !!popup, keyboard: !!popup })   // no popup: taps reach the map, no tab stop
            .addTo(layer);
          if (popup) m.bindPopup(popup);
        },
        pin: ([lat, lon]) => { pin ? pin.setLatLng([lat, lon]) : (pin = L.marker([lat, lon]).addTo(map)); },
        clear: () => { layer.clearLayers(); },
        onClick: (fn) => { map.on("click", e => fn(e.latlng.lat, e.latlng.lng)); },
        view: ([lat, lon], z = 17) => { map.setView([lat, lon], z, { animate: false }); },
        fit: (points, maxZoom = 17) => { if (points.length) map.fitBounds(points, { padding: [30, 30], maxZoom, animate: false }); },
      };
      for (const k of Object.keys(v)) v[k] = live(v[k]);
      v.destroy = () => { if (dead) return; dead = true; clearTimeout(timer); map.remove(); };
      return implement(MapView, v);
    },
  };
}
