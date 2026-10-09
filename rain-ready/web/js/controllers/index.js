// web/js/controllers/index.js — route table. Each entry is a Controller (PLAN.md 2.2); legacy() until migrated.
import { legacy } from "../core/router.js";
import { renderLogin } from "../login.js";
import { renderReport } from "../report.js";
import { renderMine, renderConfirm } from "../resident.js";
import { renderInbox, renderTask } from "../official.js";
import { renderAdmin } from "../admin.js";
import { renderDash } from "../dash.js";

export const CONTROLLERS = [
  legacy("login", null, (root) => renderLogin(root, () => location.reload())),   // reload: legacy login writes storage behind the session cache
  legacy("dash", null, (root, _me, tab) => renderDash(root, tab)),
  legacy("report", ["resident", "admin"], renderReport),
  legacy("mine", ["resident"], renderMine),
  legacy("confirm", ["resident"], renderConfirm),
  legacy("inbox", ["official"], renderInbox),
  legacy("task", ["official", "admin", "resident"], renderTask),
  legacy("admin", ["admin"], renderAdmin),
];
export const TABS = {
  resident: [["#/report", "Report"], ["#/mine", "My reports"], ["#/confirm", "Confirm"], ["#/dash", "Dashboard"]],
  official: [["#/inbox", "Inbox"], ["#/dash", "Dashboard"]],
  admin: [["#/admin", "Admin"], ["#/dash", "Dashboard"]],
};
export const HOME = { resident: "#/report", official: "#/inbox", admin: "#/admin" };
