// web/landing/agencies.js — the template's "Services" grid: one card per agency from GET /api/accountability, scored from GET /api/leaderboard.
import { get, esc, hrs, agencyParts, plural } from "/landing/site.js?v=3";

const STATES = ["open", "accepted", "done", "confirmed", "disputed", "rejected"];
const pct = (v) => v == null ? "no data yet" : `${Math.round(v * 100)}%`;

function card(a, lb) {
  const [short, full] = a.agency_id ? agencyParts(a.agency_name) : ["No owner found", "Drains that no agency record covers. A finding, not an error."];
  const t = a.tasks || {};
  const score = !a.agency_id ? "Not scored: the ward coordinator assigns these."
    : lb && lb.ranked ? `Score ${Math.round(lb.score)} of 100, rank ${lb.rank}` : "Not ranked yet";
  const parts = lb && lb.components ? `Accepted in 48 h: ${pct(lb.components.response)} · done on time: ${pct(lb.components.delivery)} · `
    + `confirmed by residents: ${pct(lb.components.verified)} · not overdue: ${pct(lb.components.timeliness)}` : "";
  return `<article class="agency${a.agency_id ? "" : " none"}">
    <p class="tag">${esc(full)}</p><h3>${esc(short)}</h3>
    <p class="big-n">${esc(plural(a.assets_owned, "drain"))}</p>
    <p>${STATES.map(s => `${s}: ${t[s] ?? 0}`).join(" · ")}</p>
    <p>Overdue: ${a.overdue ?? 0} · sent back as not theirs: ${a.bounced_away ?? 0}</p>
    <p>Median time to accept: ${esc(hrs(a.median_hours_to_accept))} · to complete: ${esc(hrs(a.median_hours_to_complete))}</p>
    <p class="score">${esc(score)}</p>${parts ? `<p class="small">${esc(parts)}</p>` : ""}
  </article>`;
}

async function load() {
  const [acc, lb] = await Promise.all([get("/api/accountability"), get("/api/leaderboard")]);
  const byId = Object.fromEntries(lb.agencies.map(x => [x.agency_id, x]));
  document.getElementById("grid").innerHTML = acc.agencies.map(a => card(a, byId[a.agency_id])).join("");
  document.getElementById("note").textContent = [acc.note, lb.method && lb.method.score, lb.banner].filter(Boolean).join(" ");
}

load().catch(() => { document.getElementById("grid").innerHTML = `<p class="note">The agency figures are not available right now.</p>`; });
