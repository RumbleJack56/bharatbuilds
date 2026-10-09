// web/js/main.js — composition root: the only file that picks implementations. Swap an adapter here.
import { implement } from "./core/port.js";
import { createRouter } from "./core/router.js";
import { HttpPort, StoragePort, GeoPort, MapPort, ToastPort } from "./ports/index.js";
import { createFetchHttp } from "./adapters/http-fetch.js";
import { createLocalStorage } from "./adapters/storage-local.js";
import { createBrowserGeo } from "./adapters/geo-browser.js";
import { createLeafletMap } from "./adapters/map-leaflet.js";
import { createDomToast } from "./adapters/toast-dom.js";
import { createSessionService } from "./services/session.service.js";
import { createIncidentsService } from "./services/incidents.service.js";
import { createTasksService } from "./services/tasks.service.js";
import { createDashboardService } from "./services/dashboard.service.js";
import { CONTROLLERS, TABS, HOME } from "./controllers/index.js";
import { esc } from "./ui/format.js";
import { errBox } from "./ui/components.js";

const $ = (s) => document.querySelector(s);
const storage = implement(StoragePort, createLocalStorage());
const http = implement(HttpPort, createFetchHttp({ base: window.API_BASE || "", getUserId: () => storage.get("user") }));
const session = createSessionService(http, storage);
const nav = { go: (hash) => { location.hash = hash; }, refresh: () => router.refresh() };
const ctx = Object.freeze({
  services: { session, incidents: createIncidentsService(http), tasks: createTasksService(http), dashboard: createDashboardService(http) },
  map: implement(MapPort, createLeafletMap()),
  geo: implement(GeoPort, createBrowserGeo()),
  toast: implement(ToastPort, createDomToast($("#toast"))),
  home: HOME,
  nav,
});

function drawChrome(me, hash) {
  $("#who").textContent = me ? me.name : "";
  $("#logout").hidden = !me;
  $("#tabs").innerHTML = me ? TABS[me.role].map(([h, t]) =>
    `<a href="${h}" class="${hash.startsWith(h) ? "on" : ""}">${esc(t)}</a>`).join("") : "";
}

const router = createRouter({ controllers: CONTROLLERS, root: $("#view"), ctx, home: HOME, onChrome: drawChrome, errorHtml: errBox });
$("#logout").addEventListener("click", () => { session.logout(); nav.go("#/login"); });
router.start();
