// web/js/ports/index.js — the interfaces adapters implement. See PLAN.md section 2.2.
import { definePort } from "../core/port.js";

export const HttpPort = definePort("HttpPort", ["request", "url"]);
export const StoragePort = definePort("StoragePort", ["get", "set", "remove"]);
export const GeoPort = definePort("GeoPort", ["current"]);
export const MapPort = definePort("MapPort", ["available", "create"]);
export const MapViewPort = definePort("MapViewPort", ["circle", "badge", "pin", "onClick", "view", "fit", "destroy"]);
export const ToastPort = definePort("ToastPort", ["show"]);
