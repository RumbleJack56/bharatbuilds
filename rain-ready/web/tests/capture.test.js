// web/tests/capture.test.js — stamp text and drawing, capture service, camera adapter, report pin lock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { stampLines, drawStamp } from "../js/ui/stamp.js";
import { createCaptureService } from "../js/services/capture.service.js";
import { createIncidentsService } from "../js/services/incidents.service.js";
import { createMediaCamera } from "../js/adapters/camera-media.js";
import { report } from "../js/controllers/report.js";
import { PIN, BANNED } from "../js/ui/copy.js";

// A Date-like with fixed local fields; offset is getTimezoneOffset() (minutes WEST of UTC, so IST is -330).
const at = (offset, h = 13, m = 5) => ({ getDate: () => 18, getMonth: () => 9, getFullYear: () => 2026, getHours: () => h, getMinutes: () => m,
  getTimezoneOffset: () => offset });

test("stampLines: the five lines, 6 decimals, 12h clock, GMT offset", () => {
  assert.deepEqual(stampLines({ lat: 28.54321, lon: 77.182223, when: at(-330), ref: "7QK2" }),
    ["Lat 28.543210°", "Long 77.182223°", "18/10/26 01:05 PM GMT +05:30", "Ref 7QK2"]);
  assert.equal(stampLines({ lat: 1, lon: 2, when: at(-330), ref: "R", address: "Ward 7" })[0], "Ward 7");
});
test("stampLines: negative, zero and midnight/noon", () => {
  const t = (o, h, m) => stampLines({ lat: 0, lon: 0, when: at(o, h, m), ref: "R" })[2];
  assert.equal(t(300, 0, 7), "18/10/26 12:07 AM GMT -05:00");
  assert.equal(t(0, 12, 0), "18/10/26 12:00 PM GMT +00:00");
  assert.equal(t(-345, 23, 59), "18/10/26 11:59 PM GMT +05:45");
});
test("drawStamp: dark box bottom-left, white text, font at least 3% of height", () => {
  const calls = [];
  const ctx = new Proxy({ measureText: (s) => ({ width: s.length * 10 }) }, {
    get: (o, k) => k in o ? o[k] : (...a) => calls.push([k, ...a]),
    set: (o, k, v) => { calls.push(["set " + k, v]); return true; } });
  drawStamp({ width: 1000, height: 2000, getContext: () => ctx }, ["Lat 1", "Long 2"]);
  const font = calls.find(c => c[0] === "set font")[1];
  assert.ok(parseInt(font) >= 60, font);
  const box = calls.find(c => c[0] === "fillRect");
  assert.equal(box[1] >= 0 && box[1] < 100, true);
  assert.ok(box[2] + box[4] <= 2000 && box[2] + box[4] > 1800, "box sits at the bottom");
  assert.equal(calls.filter(c => c[0] === "fillText").length, 2);
  const tiny = []; 
  const c2 = new Proxy({ measureText: () => ({ width: 5 }) }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { tiny.push(v); return true; } });
  drawStamp({ width: 100, height: 100, getContext: () => c2 }, ["x"]);
  assert.ok(tiny.some(v => /^16px/.test(v)), "minimum 16px");
});

const canvas = () => ({ width: 640, height: 480, getContext: () => ({ measureText: () => ({ width: 50 }), fillRect() {}, fillText() {} }),
  toBlob(cb, type, q) { this.args = [type, q]; cb(new Blob(["jpeg"], { type })); } });
const svc = ({ geo, cv = canvas(), http = createFakeHttp({ "GET /api/capture-token": { token: "tok1", ref: "7QK2" } }) } = {}) =>
  ({ http, cv, s: createCaptureService({ http, camera: { capture: async () => cv }, stamp: { lines: stampLines, draw: drawStamp }, clock: () => at(-330),
    geo: { current: geo || (async () => ({ lat: 28.6, lon: 77.1, accuracy_m: 12 })) } }) });

test("takePhoto: token first, JPEG blob 0.85, result carries lat/lon/accuracy/token", async () => {
  const { s, cv, http } = svc();
  const r = await s.takePhoto({ withToken: true });
  assert.equal(http.calls[0].path, "/api/capture-token");
  assert.equal(r.blob.type, "image/jpeg");
  assert.deepEqual(cv.args, ["image/jpeg", 0.85]);
  assert.deepEqual([r.lat, r.lon, r.accuracy_m, r.capture_token], [28.6, 77.1, 12, "tok1"]);
});
test("takePhoto: withToken false makes no token request", async () => {
  const { s, http } = svc();
  const r = await s.takePhoto({ withToken: false });
  assert.equal(http.calls.length, 0);
  assert.equal(r.capture_token, "");
});
test("takePhoto: denied location and poor accuracy reject, nothing stamped", async () => {
  await assert.rejects(svc({ geo: async () => { throw new Error("Could not get GPS. Tap the map to move the pin."); } }).s.takePhoto({}), /Could not get GPS/);
  await assert.rejects(svc({ geo: async () => ({ lat: 1, lon: 2, accuracy_m: 150 }) }).s.takePhoto({}), /not precise enough \(± 150 m\).*retake/);
  await assert.rejects(svc({ geo: async () => ({ lat: 1, lon: 2, accuracy_m: null }) }).s.takePhoto({}), /could not get your location/i);
});
test("takePhoto: a cancelled camera passes the cancel through and skips location", async () => {
  let asked = false;
  const s = createCaptureService({ http: createFakeHttp(), stamp: {}, geo: { current: async () => { asked = true; } },
    camera: { capture: async () => { throw Object.assign(new Error("Cancelled"), { cancelled: true }); } } });
  await assert.rejects(s.takePhoto({}), e => e.cancelled === true);
  assert.equal(asked, false);
});
test("incidents.create sends capture_token only when non-empty, photo named photo.jpg", async () => {
  const http = createFakeHttp({ "POST /api/incidents": { incident: {} } });
  const i = createIncidentsService(http);
  await i.create({ lat: 1, lon: 2, kind: "x", capture_token: "tok1", photo: new Blob(["j"], { type: "image/jpeg" }) });
  await i.create({ lat: 1, lon: 2, kind: "x", capture_token: "" });
  assert.equal(http.calls[0].form.get("capture_token"), "tok1");
  assert.equal(http.calls[0].form.get("photo").name, "photo.jpg");
  assert.equal(http.calls[1].form.has("capture_token"), false);
});

test("camera adapter: available() follows getUserMedia; denied maps to a readable message", async () => {
  assert.equal(createMediaCamera({}, {}).available(), false);
  const nav = { mediaDevices: { getUserMedia: async () => { throw new DOMException("no", "NotAllowedError"); } } };
  const cam = createMediaCamera({}, nav);
  assert.equal(cam.available(), true);
  await assert.rejects(cam.capture(), /Camera not available\. Allow camera access, or send the report without a photo\./);
});

// Report page with a fake root: elements keyed by selector.
function reportRoot() {
  const els = {};
  const el = (s) => els[s] ??= { textContent: "", innerHTML: "", hidden: false, style: {}, files: [], value: "", disabled: false };
  return { els, innerHTML: "", querySelector: el };
}
test("report: a photo moves and locks the pin; remove unlocks and restores", async () => {
  const root = reportRoot();
  let click, pins = [];
  const photo = { blob: new Blob(["j"], { type: "image/jpeg" }), lat: 28.5, lon: 77.2, accuracy_m: 9.4, capture_token: "tok1" };
  let sent;
  const ctx = { map: { available: () => true, create: () => ({ pin: p => pins.push(p), view() {}, destroy() {}, onClick: f => { click = f; } }) },
    camera: { available: () => true }, geo: { current: async () => ({ lat: 1, lon: 1, accuracy_m: 5 }) }, toast: { show() {} },
    services: { capture: { takePhoto: async () => photo }, incidents: { create: async (a) => { sent = a; return { incident: {}, message: "m" }; } } } };
  await report.mount(root, ctx);
  click(28.7, 77.3);
  assert.match(root.els["#coords"].textContent, /Pin you tapped/);
  await root.els["#cam"].onclick({ target: { disabled: false } });
  assert.equal(root.els["#coords"].textContent, PIN.photo(9.4));
  assert.match(root.els["#coords"].textContent, /Pin from your photo \(± 9 m\)/);
  assert.match(root.els["#prev"].innerHTML, /<img/);
  assert.equal(root.els["#gps"].disabled, true);
  assert.equal(root.els["#rm"].hidden, false);
  click(1, 2);                                              // locked: ignored
  assert.equal(root.els["#coords"].textContent, PIN.photo(9.4));
  assert.deepEqual(pins.at(-1), [28.5, 77.2]);
  root.els["#rm"].onclick();                                // remove: unlocks and restores the tapped pin
  assert.equal(root.els["#prev"].innerHTML, "");
  assert.equal(root.els["#gps"].disabled, false);
  assert.equal(root.els["#rm"].hidden, true);
  assert.match(root.els["#coords"].textContent, /Pin you tapped/);
  click(1, 2);
  assert.deepEqual(pins.at(-1), [1, 2]);
  await root.els["#cam"].onclick({ target: { disabled: false } });
  root.els["#f"].reset = () => {}; root.querySelector("#out").scrollIntoView = () => {};
  await root.els["#f"].onsubmit({ preventDefault() {} });
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual([sent.lat, sent.lon, sent.accuracy_m, sent.capture_token], [28.5, 77.2, 9.4, "tok1"]);
  assert.equal(sent.photo, photo.blob);
  assert.equal(root.els["#rm"].hidden, true);               // sent: photo cleared
});
test("report: cancel changes nothing and shows no toast; an error keeps state and shows the message", async () => {
  const root = reportRoot(); const shown = [];
  let err = Object.assign(new Error("Cancelled"), { cancelled: true });
  const ctx = { map: { available: () => false }, camera: { available: () => true }, geo: {}, toast: { show: m => shown.push(m) },
    services: { capture: { takePhoto: async () => { throw err; } } } };
  await report.mount(root, ctx);
  await root.querySelector("#cam").onclick({ target: { disabled: false } });
  assert.deepEqual(shown, []);
  assert.equal(root.querySelector("#prev").innerHTML, "");
  err = new Error("Location is not precise enough (± 150 m). Move to open sky and retake.");
  await root.querySelector("#cam").onclick({ target: { disabled: false } });
  assert.deepEqual(shown, [err.message]);
  assert.equal(root.querySelector("#camnote").textContent, err.message);
  assert.equal(root.querySelector("#prev").innerHTML, "");
});
test("report: no camera says so, the button is off, and copy has no banned words", async () => {
  const root = reportRoot();
  await report.mount(root, { map: { available: () => false }, camera: { available: () => false }, geo: {}, toast: { show() {} }, services: {} });
  assert.match(root.querySelector("#camnote").textContent, /Camera not available/);
  assert.equal(root.els["#cam"].disabled, true);
  assert.doesNotMatch(PIN.photo(3), BANNED);
});

import { task } from "../js/controllers/official.js";
test("official: Mark done needs a camera photo; completes with the stamped blob and asks for no token", async () => {
  const els = {};
  const el = (s) => els[s] ??= { textContent: "", innerHTML: "", disabled: false, value: "n", addEventListener() {} };
  const box = { querySelector: el };
  const root = { innerHTML: "", querySelector: (s) => s === "#actions" ? box : el(s) };
  const shown = [], done = [], taken = [];
  const blob = new Blob(["j"], { type: "image/jpeg" });
  const t = { id: 5, status: "accepted", agency_id: "mcd", incidents: [], events: [], asset_name: "D" };
  const ctx = { camera: { available: () => true }, toast: { show: m => shown.push(m) }, nav: { refresh() {} },
    services: { session: { me: async () => ({ role: "official", agency_id: "mcd" }) },
      tasks: { get: async () => t, list: async () => ({ banner: "" }), complete: async (id, a) => { done.push([id, a]); } },
      dashboard: { agencies: async () => [] }, capture: { takePhoto: async (o) => { taken.push(o); return { blob }; } } } };
  let submit;
  box.addEventListener = () => {};
  els["#done"] = { addEventListener: (_, f) => { submit = f; } };
  await task.mount(root, ctx, [5]);
  await submit({ preventDefault() {}, submitter: { disabled: false } });
  assert.deepEqual(shown, ["An after-photo is required."]);
  await els["#ph"].onclick({ target: { disabled: false } });
  assert.deepEqual(taken, [{ withToken: false }]);
  assert.match(els["#prev"].innerHTML, /<img/);
  await submit({ preventDefault() {}, submitter: { disabled: false } });
  assert.equal(done[0][1].photo, blob);
});
