// web/js/adapters/image-canvas.js — ImagePort over canvas. Scales to a long side of about 1600 px and encodes JPEG under 2 MB.
const MAX_SIDE = 1600, MAX_BYTES = 2_000_000, QUALITIES = [0.85, 0.7, 0.55, 0.4];
const FAIL = "Could not save the photo. Try again.";

// Pure: size with the longest side capped at `max`, ratio kept, never enlarged.
export function fitSize(w, h, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

export function createCanvasImage(doc) {
  const toBlob = (c, q) => new Promise(res => c.toBlob(res, "image/jpeg", q));
  return {
    // `canvas` is the stamped frame; the stamp scales with it. Returns a JPEG Blob.
    async shrink(canvas) {
      let side = MAX_SIDE, blob = null;
      for (let round = 0; round < 3; round++, side = Math.round(side * 0.75)) {
        const { width, height } = fitSize(canvas.width, canvas.height, side);
        const c = doc.createElement("canvas");
        c.width = width; c.height = height;
        c.getContext("2d").drawImage(canvas, 0, 0, width, height);
        for (const q of QUALITIES) {
          blob = await toBlob(c, q);
          if (!blob) throw new Error(FAIL);
          if (blob.size < MAX_BYTES) return blob;
        }
      }
      throw new Error("The photo is too large to send. Try again.");
    },
  };
}
