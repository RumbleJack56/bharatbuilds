import { get, getUserId, setUserId } from "./api.js";
import { $, esc, errBox } from "./util.js";
import { renderLogin } from "./login.js";
import { renderReport } from "./report.js";
import { renderMine, renderConfirm } from "./resident.js";
import { renderInbox, renderTask } from "./official.js";
import { renderAdmin } from "./admin.js";
import { renderDash } from "./dash.js";

let me = null;
const TABS = {
  resident: [["#/report", "Report"], ["#/mine", "My reports"], ["#/confirm", "Confirm"], ["#/dash", "Dashboard"]],
  official: [["#/inbox", "Inbox"], ["#/dash", "Dashboard"]],
  admin: [["#/admin", "Admin"], ["#/dash", "Dashboard"]],
};
const HOME = { resident: "#/report", official: "#/inbox", admin: "#/admin" };

function drawChrome(hash) {
  $("#who").textContent = me ? me.name : "";
  $("#logout").hidden = !me;
  $("#tabs").innerHTML = me ? TABS[me.role].map(([h, t]) =>
    `<a href="${h}" class="${hash.startsWith(h) ? "on" : ""}">${esc(t)}</a>`).join("") : "";
}

async function loadMe() {
  me = null;
  if (!getUserId()) return;
  try { me = await get("/api/me"); } catch { setUserId(""); }
}

async function route() {
  const hash = location.hash || "#/";
  const [, name, arg] = hash.split("/");
  const view = $("#view");
  if (!me && getUserId()) await loadMe();
  drawChrome(hash);
  const needRole = (...roles) => me && roles.includes(me.role);
  try {
    if (name === "dash") return await renderDash(view, arg);
    if (name === "login" || !me) return await renderLogin(view, async () => { await loadMe(); location.hash = HOME[me.role]; });
    if (name === "report" && needRole("resident", "admin")) return renderReport(view);
    if (name === "mine" && needRole("resident")) return await renderMine(view);
    if (name === "confirm" && needRole("resident")) return await renderConfirm(view);
    if (name === "inbox" && needRole("official")) return await renderInbox(view, me);
    if (name === "task" && needRole("official", "admin", "resident")) return await renderTask(view, me, arg);
    if (name === "admin" && needRole("admin")) return await renderAdmin(view);
    location.hash = HOME[me.role];
  } catch (e) { view.innerHTML = errBox(e); }
  view.focus();
}

$("#logout").addEventListener("click", () => { setUserId(""); me = null; location.hash = "#/login"; route(); });
window.addEventListener("hashchange", route);
await loadMe();
route();
