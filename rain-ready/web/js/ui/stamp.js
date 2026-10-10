// web/js/ui/stamp.js — the location and time stamp: text lines and drawing on a canvas. Pure apart from the canvas passed in.
const p2 = (n) => String(n).padStart(2, "0");

// "18/10/26 01:05 PM GMT +05:30" from the phone clock; getTimezoneOffset is minutes WEST of UTC.
function stampTime(d) {
  const off = d.getTimezoneOffset(), a = Math.abs(off), h = d.getHours();
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${p2(d.getFullYear() % 100)} ${p2(h % 12 || 12)}:${p2(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`
    + ` GMT ${off > 0 ? "-" : "+"}${p2(Math.floor(a / 60))}:${p2(a % 60)}`;
}

export function stampLines({ lat, lon, when, ref, address }) {
  return [...(address ? [address] : []), `Lat ${lat.toFixed(6)}°`, `Long ${lon.toFixed(6)}°`, stampTime(when), ...(ref ? [`Ref ${ref}`] : [])];
}

// Bottom-left dark box with white text; font is at least 3% of the image height so OCR can read it.
export function drawStamp(canvas, lines) {
  const ctx = canvas.getContext("2d"), fs = Math.max(16, Math.ceil(0.03 * canvas.height));
  const pad = Math.round(fs * 0.5), lh = Math.ceil(fs * 1.25);
  ctx.font = `${fs}px sans-serif`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 2 * pad, h = lines.length * lh + 2 * pad;
  const x = pad, y = canvas.height - h - pad;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + i * lh));
}
