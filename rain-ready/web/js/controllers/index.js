// web/js/controllers/index.js — route table. Each entry is a Controller (PLAN.md 2.2); legacy() until migrated.
import { legacy } from "../core/router.js";
import { login } from "./login.js";
import { report } from "./report.js";
import { mine, confirm } from "./resident.js";
import { inbox, task } from "./official.js";
import { renderAdmin } from "../admin.js";
import { renderDash } from "../dash.js";

export const CONTROLLERS = [
  login,
  legacy("dash", null, (root, _me, tab) => renderDash(root, tab)),
  report,
  mine,
  confirm,
  inbox,
  task,
  legacy("admin", ["admin"], renderAdmin),
];
export const TABS = {
  resident: [["#/report", "Report"], ["#/mine", "My reports"], ["#/confirm", "Confirm"], ["#/dash", "Dashboard"]],
  official: [["#/inbox", "Inbox"], ["#/dash", "Dashboard"]],
  admin: [["#/admin", "Admin"], ["#/dash", "Dashboard"]],
};
export const HOME = { resident: "#/report", official: "#/inbox", admin: "#/admin" };
