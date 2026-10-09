// web/js/adapters/geo-browser.js — GeoPort over navigator.geolocation.
export function createBrowserGeo(geo = globalThis.navigator?.geolocation) {
  return {
    current: () => new Promise((resolve, reject) => {
      if (!geo) return reject(new Error("No GPS on this device. Tap the map instead."));
      geo.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy_m: p.coords.accuracy }),
        () => reject(new Error("Could not get GPS. Tap the map to move the pin.")),
        { enableHighAccuracy: true, timeout: 10000 });
    }),
  };
}
