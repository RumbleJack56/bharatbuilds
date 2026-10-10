// web/tests/v10-shrink.test.js — V10 shrink after the stamp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeHttp } from "./fakes.js";
import { createCaptureService } from "../js/services/capture.service.js";
import { stampLines, drawStamp } from "../js/ui/stamp.js";
import { createCanvasImage, fitSize } from "../js/adapters/image-canvas.js";
import { ImagePort } from "../js/ports/index.js";
import { implement } from "../js/core/port.js";

// ---- V10
test("V10: fitSize caps the longest side at 1600 and keeps the ratio, never enlarges", () => {
  assert.deepEqual(fitSize(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(fitSize(3000, 4000), { width: 1200, height: 1600 });
  assert.deepEqual(fitSize(1280, 720), { width: 1280, height: 720 });
  assert.deepEqual(fitSize(4000, 3000, 800), { width: 800, height: 600 });
});
const fakeDoc = (sizeFor) => { const made = [];
  return { made, createElement: () => { const c = { width: 0, height: 0, drew: null,
    getContext: () => ({ drawImage: (...a) => { c.drew = a; } }),
    toBlob(cb, type, q) { c.tries = [...(c.tries || []), q]; cb(new Blob([new Uint8Array(sizeFor(q, c))], { type })); } };
    made.push(c); return c; } }; };
test("V10: the image adapter scales to 1600, JPEG, and lowers quality until under 2 MB", async () => {
  const doc = fakeDoc((q) => q > 0.7 ? 3_000_000 : 1_500_000);
  const img = implement(ImagePort, createCanvasImage(doc));
  const b = await img.shrink({ width: 4000, height: 3000 });
  const c = doc.made[0];
  assert.deepEqual([c.width, c.height], [1600, 1200]);
  assert.equal(b.type, "image/jpeg"); assert.ok(b.size < 2_000_000);
  assert.deepEqual(c.tries.slice(0, 2), [0.85, 0.7]);
});
test("V10: the image adapter fails with a plain message when no JPEG can be made", async () => {
  const doc = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: cb => cb(null) }) };
  await assert.rejects(createCanvasImage(doc).shrink({ width: 10, height: 10 }), /Could not save the photo/);
});
test("V10: the capture service stamps first, then shrinks through the image port", async () => {
  const order = [];
  const cv = { width: 4000, height: 3000, getContext: () => ({ measureText: () => ({ width: 5 }), fillRect: () => order.push("stamp"), fillText() {} }) };
  const out = new Blob(["small"], { type: "image/jpeg" });
  const s = createCaptureService({ http: createFakeHttp(), camera: { capture: async () => cv }, stamp: { lines: stampLines, draw: drawStamp },
    image: { shrink: async (c) => { order.push("shrink"); assert.equal(c, cv); return out; } },
    geo: { current: async () => ({ lat: 28.6, lon: 77.1, accuracy_m: 9 }) } });
  const r = await s.takePhoto({});
  assert.equal(r.blob, out); assert.deepEqual(order, ["stamp", "shrink"]);
});

