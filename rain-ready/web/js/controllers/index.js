// web/js/controllers/index.js — route table. every entry is a Controller (PLAN.md 2.2).
import { login } from "./login.js";
import { report } from "./report.js";
import { mine, confirm } from "./resident.js";
import { inbox, task } from "./official.js";
import { admin } from "./admin.js";
import { dash } from "./dash.js";

export const CONTROLLERS = [
  login,
  dash,
  report,
  mine,
  confirm,
  inbox,
  task,
  admin,
];
export const TABS = {
  resident: [["#/report", "Report"], ["#/mine", "My reports"], ["#/confirm", "Confirm"], ["#/dash", "Dashboard"]],
  official: [["#/inbox", "Inbox"], ["#/dash", "Dashboard"]],
  admin: [["#/admin", "Admin"], ["#/dash", "Dashboard"]],
};
export const HOME = { resident: "#/report", official: "#/inbox", admin: "#/admin" };
