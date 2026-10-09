import { postForm, photoUrl } from "./api.js";
import { esc, $, KINDS, FIELD_RULE, toast, guard, errBox, photosHtml } from "./util.js";

const DEFAULT = [28.6433, 77.1846];

export function renderReport(view) {
  let pos = DEFAULT.slice(), marker, map;
  view.innerHTML = `<h1>Report a problem</h1>
    <p class="rule">${esc(FIELD_RULE)}</p>
    <form id="f">
      <label for="photo">Photo (from the footpath)</label>
      <input id="photo" type="file" accept="image/*" capture="environment" hidden>
      <button type="button" id="cam" class="big primary">Take or choose a photo</button>
      <div id="prev" class="photos"></div>
      <label>Where is it?</label>
      <div class="row"><button type="button" id="gps">Use my location</button></div>
      <p class="small muted" id="coords"></p>
      <div id="mini" class="map mini"></div>
      <p class="small muted">Tap the map to move the pin.</p>
      <label for="kind">What do you see?</label>
      <select id="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select>
      <label for="note">Note (optional)</label>
      <textarea id="note" maxlength="500" placeholder="For example: leaves and plastic block the grate"></textarea>
      <button class="primary big" id="send" type="submit">Send report</button>
    </form><div id="out"></div>`;
  const setPos = (lat, lon, fly) => {
    pos = [lat, lon];
    $("#coords", view).textContent = `Location: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    if (marker) marker.setLatLng(pos);
    if (fly && map) map.setView(pos, 17);
  };
  if (window.L) {
    map = L.map($("#mini", view)).setView(pos, 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    marker = L.marker(pos).addTo(map);
    map.on("click", e => setPos(e.latlng.lat, e.latlng.lng));
    setTimeout(() => map.invalidateSize(), 100);
  } else $("#mini", view).hidden = true;
  setPos(...pos);
  $("#cam", view).onclick = () => $("#photo", view).click();
  $("#photo", view).onchange = e => {
    const f = e.target.files[0];
    $("#prev", view).innerHTML = f ? `<img alt="Your photo" src="${URL.createObjectURL(f)}">` : "";
    $("#cam", view).textContent = f ? "Change photo" : "Take or choose a photo";
  };
  $("#gps", view).onclick = ev => {
    if (!navigator.geolocation) return toast("No GPS here. Tap the map instead.");
    guard(ev.target, () => new Promise(res => navigator.geolocation.getCurrentPosition(
      p => { setPos(p.coords.latitude, p.coords.longitude, true); res(); },
      () => { toast("Could not get GPS. Using Old Rajinder Nagar; tap the map to move the pin."); res(); },
      { enableHighAccuracy: true, timeout: 10000 })));
  };
  $("#f", view).onsubmit = ev => {
    ev.preventDefault();
    guard($("#send", view), async () => {
      const fd = new FormData();
      fd.append("lat", pos[0]); fd.append("lon", pos[1]);
      fd.append("kind", $("#kind", view).value); fd.append("note", $("#note", view).value);
      const f = $("#photo", view).files[0];
      if (f) fd.append("photo", f);
      try {
        const r = await postForm("/api/incidents", fd);
        const task = r.task_id == null ? "<p>No task was created.</p>" : r.task_created
          ? `<p><strong>A new task was created</strong> for this drain.</p>`
          : `<p><strong>This drain already had a task.</strong> Your report was added to it.</p>`;
        $("#out", view).innerHTML = `<div class="card"><h2>Report received</h2><p>${esc(r.message)}</p>
          ${r.linked_asset ? `<p>Linked drain: <strong>${esc(r.linked_asset)}</strong> (${esc(r.distance_m)} m away)</p>` : ""}
          ${task}${r.task_id ? `<p><a href="#/task/${esc(r.task_id)}">See the task</a></p>` : ""}
          <p class="rule">${esc(r.field_rule)}</p></div>`;
        $("#f", view).reset(); $("#prev", view).innerHTML = "";
        $("#out", view).scrollIntoView();
      } catch (e) { $("#out", view).innerHTML = errBox(e); }
    });
  };
}
