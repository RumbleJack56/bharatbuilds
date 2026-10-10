// web/js/main.js — composition root: the only file that picks implementations. Swap an adapter here.
import { implement } from "./core/port.js";
import { createRouter } from "./core/router.js";
import { HttpPort, StoragePort, GeoPort, MapPort, ToastPort, CameraPort, ImagePort, DownloadPort, GlassPort, TransitionPort } from "./ports/index.js";
import { createFetchHttp } from "./adapters/http-fetch.js";
import { createLocalStorage } from "./adapters/storage-local.js";
import { createBrowserGeo } from "./adapters/geo-browser.js";
import { createLeafletMap } from "./adapters/map-leaflet.js";
import { createMediaCamera } from "./adapters/camera-media.js";
import { createCanvasImage } from "./adapters/image-canvas.js";
import { createDomDownload } from "./adapters/download-dom.js";
import { createDomToast } from "./adapters/toast-dom.js";
import { createLiquidGlass, hasLiquidGL } from "./adapters/glass-liquidgl.js";
import { createCssGlass } from "./adapters/glass-css.js";
import { chooseGlass, waitFor } from "./core/glass.js";
import { createViewTransition } from "./adapters/transition-vt.js";
import { createSessionService } from "./services/session.service.js";
import { createIncidentsService } from "./services/incidents.service.js";
import { createTasksService } from "./services/tasks.service.js";
import { createCaptureService } from "./services/capture.service.js";
import { createDashboardService } from "./services/dashboard.service.js";
import { CONTROLLERS, TABS, HOME } from "./controllers/index.js";
import { stampLines, drawStamp } from "./ui/stamp.js";
import { initials } from "./ui/format.js";
import { errBox, tabsHtml } from "./ui/components.js";

const $ = (s) => document.querySelector(s);
// Glass: wait briefly for the async CDN script, then pick lens or css (core/glass.js holds the rules).
const media = (q) => !!window.matchMedia?.(q).matches;
function hasGL() {
  if (navigator.gpu) return true;
  try { const gl = document.createElement("canvas").getContext("webgl2"); gl?.getExtension("WEBGL_lose_context")?.loseContext(); return !!gl; }
  catch { return false; }
}
await waitFor(() => hasLiquidGL(window), 1200);
const glass = implement(GlassPort, chooseGlass({ hasLiquid: hasLiquidGL(window), hasGL: hasGL(), reducedMotion: media("(prefers-reduced-motion: reduce)"),
  search: location.search }) === "liquid" ? createLiquidGlass(window) : createCssGlass(document));
const storage = implement(StoragePort, createLocalStorage());
const http = implement(HttpPort, createFetchHttp({ base: window.API_BASE || "", getUserId: () => storage.get("user") }));
const session = createSessionService(http, storage);
const geo = implement(GeoPort, createBrowserGeo());
const camera = implement(CameraPort, createMediaCamera(document));
const image = implement(ImagePort, createCanvasImage(document));
const nav = { go: (hash) => { location.hash = hash; }, refresh: () => router.refresh() };
const ctx = Object.freeze({
  services: { session, incidents: createIncidentsService(http), tasks: createTasksService(http), dashboard: createDashboardService(http),
    capture: createCaptureService({ http, camera, geo, image, stamp: { lines: stampLines, draw: drawStamp } }) },
  map: implement(MapPort, createLeafletMap()),
  geo,
  camera,
  download: implement(DownloadPort, createDomDownload(document)),
  toast: implement(ToastPort, createDomToast($("#toast"))),
  glass,
  home: HOME,
  nav,
});

function drawChrome(me, hash) {
  $("#acct-wrap").hidden = !me;
  $("#acct").textContent = me ? initials(me.name) : "";
  $("#acct").setAttribute("aria-label", me ? `Account: ${me.name}` : "Account");
  $("#acct-name").textContent = me ? me.name : "";
  $("#acct-role").textContent = me ? me.role.charAt(0).toUpperCase() + me.role.slice(1) : "";
  $("#tabs").innerHTML = me ? tabsHtml(TABS[me.role], hash) : "";
  try { if ($("#acct-menu").matches(":popover-open")) $("#acct-menu").hidePopover(); } catch {}   // navigating closes the menu
}
// No Popover API: show the name and Log out inline in the header instead.
if (!("popover" in HTMLElement.prototype)) {
  $("#acct-menu").removeAttribute("popover"); $("#acct").removeAttribute("popovertarget"); $("#acct-wrap").classList.add("menu-inline");
}

const transition = implement(TransitionPort, createViewTransition(document, window));
const router = createRouter({ controllers: CONTROLLERS, root: $("#view"), ctx, home: HOME, onChrome: drawChrome, errorHtml: errBox, transition });
$("#logout").addEventListener("click", () => { session.logout(); nav.go("#/login"); });
glass.mount(".lg:not([data-lg-css])");
router.start();
