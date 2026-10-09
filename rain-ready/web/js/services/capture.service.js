// web/js/services/capture.service.js — live photo: capture token, camera frame, location at that moment, stamp, JPEG.
// stamp = { lines, draw } from ui/stamp.js, injected by main.js (services may not import ui/).
export function createCaptureService({ http, camera, geo, stamp, clock = () => new Date() }) {
  const token = () => http.request("GET", "/api/capture-token");
  const toBlob = (canvas) => new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not save the photo. Try again.")), "image/jpeg", 0.85));
  return {
    token,
    async takePhoto({ withToken = false } = {}) {
      const tok = withToken ? await token() : null;        // first, so the Ref is known
      const canvas = await camera.capture();               // a cancel rejects here with cancelled: true
      const g = await geo.current();                       // read at the moment of capture
      if (g.accuracy_m == null) throw new Error("We could not get your location for the photo stamp. Allow location and retake.");
      if (g.accuracy_m > 100) throw new Error(`Location is not precise enough (± ${Math.round(g.accuracy_m)} m). Move to open sky and retake.`);
      stamp.draw(canvas, stamp.lines({ lat: g.lat, lon: g.lon, when: clock(), ref: tok?.ref ?? "" }));
      return { blob: await toBlob(canvas), lat: g.lat, lon: g.lon, accuracy_m: g.accuracy_m, capture_token: tok?.token ?? "" };
    },
  };
}
