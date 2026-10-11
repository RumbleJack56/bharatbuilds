// web/js/controllers/index.js — route table. every entry is a Controller (PLAN.md 2.2).
import { login } from "./login.js";
import { welcome } from "./welcome.js";
import { report } from "./report.js";
import { mine, confirm } from "./resident.js";
import { inbox, task } from "./official.js";
import { admin } from "./admin.js";
import { dash } from "./dash.js";
import { held } from "./held.js";
import { board } from "./board.js";
import { city } from "./city.js";
import { places, road } from "./places.js";
import { projection } from "./projection.js";
import { drain } from "./drain.js";

export const CONTROLLERS = [
  login,
  welcome,
  dash,
  report,
  mine,
  confirm,
  inbox,
  task,
  admin,
  held,
  board,
  city,
  places,
  road,
  projection,
  drain,
];
export const TABS = {
  resident: [["#/report", "Report", "camera"], ["#/mine", "My reports", "list"], ["#/confirm", "Confirm", "circle-check"], ["#/dash", "Dashboard", "layout-dashboard"], ["#/board", "Board", "trophy"]],
  official: [["#/inbox", "Inbox", "inbox"], ["#/held", "Held", "shield-alert"], ["#/dash", "Dashboard", "layout-dashboard"], ["#/board", "Board", "trophy"]],
  admin: [["#/admin", "Admin", "user-cog"], ["#/held", "Held", "shield-alert"], ["#/dash", "Dashboard", "layout-dashboard"], ["#/board", "Board", "trophy"]],
};
export const HOME = { resident: "#/report", official: "#/inbox", admin: "#/admin" };
