// web/js/controllers/report.js — resident report: live camera photo, GPS or tapped pin, kind (or "not sure"), note.
import { reportForm, reportResult } from "../views/report.view.js";
import { KINDS, FIELD_RULE, PIN, CAMERA } from "../ui/copy.js";
import { esc } from "../ui/format.js";
import { errBox, guard, photoError } from "../ui/components.js";

export const DEFAULT = [28.643592, 77.186944];   // drain DR-DN-PUSA: Daryai Nallah barrel, Pusa Road crossing (MCD)

export const report = {
  path: "report", roles: ["resident", "admin"],
  async mount(root, ctx) {
    root.innerHTML = reportForm({ fieldRule: FIELD_RULE, kinds: KINDS });
    const $ = (s) => root.querySelector(s);
    let pos = DEFAULT.slice(), accuracy = null;       // accuracy only while the pin is the GPS fix
    const mapView = ctx.map.available() ? ctx.map.create($("#mini"), { center: pos, zoom: 16 }) : null;
    if (!mapView) $("#mini").hidden = true;
    let photo = null;                                 // the stamped photo, if any; it locks the pin
    const locked = () => !!photo;
    const setPos = (lat, lon, text, fly, acc = null) => {
      pos = [lat, lon]; accuracy = acc;
      $("#coords").textContent = text;
      mapView?.pin(pos);
      if (fly) mapView?.view(pos, 17);
    };
    mapView?.onClick((lat, lon) => { if (!locked()) setPos(lat, lon, PIN.tapped); });
    setPos(pos[0], pos[1], PIN.default);

    // Camera photo: stamped in capture.service. A photo locks the pin to where it was taken.
    let url = "", before = null;
    const showPhoto = (p) => {
      if (url) URL.revokeObjectURL(url);
      if (!photo) before = { pos, accuracy, text: $("#coords").textContent };
      photo = p; url = URL.createObjectURL(p.blob);
      $("#prev").innerHTML = `<img alt="Your photo, location and time stamped" src="${esc(url)}">`;
      setPos(p.lat, p.lon, PIN.photo(p.accuracy_m), true, p.accuracy_m);
      $("#cam").textContent = "Retake photo"; $("#rm").hidden = false; $("#gps").disabled = true; $("#camnote").textContent = "";
    };
    const clearPhoto = () => {
      if (url) URL.revokeObjectURL(url);
      photo = null; url = "";
      $("#prev").innerHTML = ""; $("#cam").textContent = "Take photo"; $("#rm").hidden = true; $("#gps").disabled = false;
      if (before) setPos(before.pos[0], before.pos[1], before.text, false, before.accuracy);
    };
    if (!ctx.camera.available()) { $("#cam").disabled = true; $("#camnote").textContent = CAMERA.none; }
    $("#cam").onclick = (ev) => guard(ev.target, async () => {
      try { showPhoto(await ctx.services.capture.takePhoto({ withToken: true })); }
      catch (e) { if (e.cancelled) return; $("#camnote").textContent = e.message; ctx.toast.show(e.message); }   // photo state unchanged
    }, ctx.toast.show);
    $("#rm").onclick = clearPhoto;
    $("#gps").onclick = (ev) => locked() ? null : guard(ev.target, async () => {
      try { const g = await ctx.geo.current(); setPos(g.lat, g.lon, g.accuracy_m == null ? "Your GPS" : PIN.gps(g.accuracy_m), true, g.accuracy_m); }
      catch (e) { $("#coords").textContent = e.message; ctx.toast.show(e.message); }                       // pin stays where it was
    }, ctx.toast.show);
    $("#f").onsubmit = (ev) => {
      ev.preventDefault();
      const kind = $("#kind").value;
      if (!photo && !kind) return ctx.toast.show("Add a photo, or pick what you see.");
      guard($("#send"), async () => {
        try {
          const r = await ctx.services.incidents.create({ lat: pos[0], lon: pos[1], kind, note: $("#note").value, photo: photo?.blob, accuracy_m: accuracy, capture_token: photo?.capture_token });
          $("#out").innerHTML = reportResult(r);
          $("#f").reset(); clearPhoto();
          $("#out").scrollIntoView();
        } catch (e) {
          $("#out").innerHTML = errBox(photoError(e, kind));
        }
      }, ctx.toast.show);
    };
    return () => mapView?.destroy();
  },
};
