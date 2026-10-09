// web/js/controllers/report.js — resident report: photo, GPS or tapped pin, kind (or "not sure"), note.
import { reportForm, reportResult } from "../views/report.view.js";
import { KINDS, FIELD_RULE, PIN } from "../ui/copy.js";
import { errBox, guard } from "../ui/components.js";

const DEFAULT = [28.6433, 77.1846];       // Old Rajinder Nagar, the pilot ward

export const report = {
  path: "report", roles: ["resident", "admin"],
  async mount(root, ctx) {
    root.innerHTML = reportForm({ fieldRule: FIELD_RULE, kinds: KINDS });
    const $ = (s) => root.querySelector(s);
    let pos = DEFAULT.slice(), accuracy = null;       // accuracy only while the pin is the GPS fix
    const mapView = ctx.map.available() ? ctx.map.create($("#mini"), { center: pos, zoom: 16 }) : null;
    if (!mapView) $("#mini").hidden = true;
    const setPos = (lat, lon, text, fly, acc = null) => {
      pos = [lat, lon]; accuracy = acc;
      $("#coords").textContent = text;
      mapView?.pin(pos);
      if (fly) mapView?.view(pos, 17);
    };
    mapView?.onClick((lat, lon) => setPos(lat, lon, PIN.tapped));
    setPos(pos[0], pos[1], PIN.default);

    $("#cam").onclick = () => $("#photo").click();
    $("#photo").onchange = (e) => {
      const f = e.target.files[0];
      $("#prev").innerHTML = f ? `<img alt="Your photo" src="${URL.createObjectURL(f)}">` : "";
      $("#cam").textContent = f ? "Change photo" : "Take or choose a photo";
    };
    $("#gps").onclick = (ev) => guard(ev.target, async () => {
      try { const g = await ctx.geo.current(); setPos(g.lat, g.lon, g.accuracy_m == null ? "Your GPS" : PIN.gps(g.accuracy_m), true, g.accuracy_m); }
      catch (e) { $("#coords").textContent = e.message; ctx.toast.show(e.message); }                       // pin stays where it was
    }, ctx.toast.show);
    $("#f").onsubmit = (ev) => {
      ev.preventDefault();
      const photo = $("#photo").files[0], kind = $("#kind").value;
      if (!photo && !kind) return ctx.toast.show("Add a photo, or pick what you see.");
      guard($("#send"), async () => {
        try {
          const r = await ctx.services.incidents.create({ lat: pos[0], lon: pos[1], kind, note: $("#note").value, photo, accuracy_m: accuracy });
          $("#out").innerHTML = reportResult(r);
          $("#f").reset(); $("#prev").innerHTML = "";
          $("#out").scrollIntoView();
        } catch (e) {
          $("#out").innerHTML = e.status === 422 && !kind ? errBox("We could not tell from the photo. Please pick what you see.") : errBox(e);
        }
      }, ctx.toast.show);
    };
    return () => mapView?.destroy();
  },
};
