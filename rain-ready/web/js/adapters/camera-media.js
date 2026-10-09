// web/js/adapters/camera-media.js — CameraPort over getUserMedia. The ONLY file that touches navigator.mediaDevices.
const DENIED = "Camera not available. Allow camera access, or send the report without a photo.";

export function createMediaCamera(doc, nav = globalThis.navigator) {
  const md = nav?.mediaDevices;
  const el = (tag, props = {}) => Object.assign(doc.createElement(tag), props);
  return {
    available: () => !!md?.getUserMedia,
    // Opens a full-screen live view; resolves with a canvas of the frame, rejects (cancelled: true) on Cancel.
    async capture() {
      if (!md?.getUserMedia) throw new Error(DENIED);
      let stream;
      try { stream = await md.getUserMedia({ video: { facingMode: "environment" }, audio: false }); }
      catch { throw new Error(DENIED); }
      const ov = el("div", { className: "cam-overlay" });
      ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Camera");
      const video = el("video", { className: "cam-video", srcObject: stream, muted: true, autoplay: true });
      video.setAttribute("playsinline", ""); video.setAttribute("aria-label", "Live camera view");
      const shoot = el("button", { type: "button", className: "primary big", textContent: "Capture", disabled: true });
      shoot.setAttribute("aria-label", "Capture photo");
      const cancel = el("button", { type: "button", className: "big", textContent: "Cancel" });
      cancel.setAttribute("aria-label", "Cancel and close camera");
      const bar = el("div", { className: "cam-bar" });
      bar.append(cancel, shoot); ov.append(video, bar); doc.body.append(ov);
      return new Promise((resolve, reject) => {
        const close = () => { stream.getTracks().forEach(t => t.stop()); ov.remove(); };
        video.onloadedmetadata = () => { shoot.disabled = false; video.play?.(); };
        cancel.onclick = () => { close(); reject(Object.assign(new Error("Cancelled"), { cancelled: true })); };
        shoot.onclick = () => {
          const c = el("canvas", { width: video.videoWidth, height: video.videoHeight });
          c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
          close(); resolve(c);
        };
      });
    },
  };
}
