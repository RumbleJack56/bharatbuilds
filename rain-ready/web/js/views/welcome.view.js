// web/js/views/welcome.view.js — the website's landing page as an app screen, so the APK carries it too. Pure.
// Image paths are relative, so they resolve under /app on the web and from the bundled files in the APK.
import { esc } from "../ui/format.js";
import { icon } from "../ui/components.js";

const IMG = "landing/img/";
export const LOGOS = { mcd: IMG + "logos/mcd.png", djb: IMG + "logos/djb.png" };   // PWD and I&FC only use the State Emblem: initials badge
const STATS = [["pockets", "Low-point pockets mapped", "stat-pockets", "People cycling through a flooded street"],
  ["drains", "Drains in the pilot ward", "stat-drains", "Rainwater running into a storm drain grate"],
  ["unowned", "Drains with no owner found", "stat-unowned", "A street with uncollected waste beside the kerb"]];
const STEPS = [["camera", "Report", "A resident sends a photo and a location from the in-app camera, in under a minute."],
  ["inbox", "Find the owner", "The report is linked to the nearest drain within 150 m. The owner agency is named, or the result says “No owner found”."],
  ["list", "Rank", "Tasks are ordered by the hours of fill time that cleaning would buy at the reference rain."],
  ["circle-check", "Confirm", "A different resident confirms or disputes the work. Whoever did the job cannot confirm it."]];
const WHO = [["resident", "Resident", "Reports in under a minute, sees what happened to the report, and confirms finished work.", "A woman with an umbrella walking along a rainy path"],
  ["official", "Official", "Sees only their agency’s tasks, ranked, with an overdue badge. Accepts, sends back as “Not ours”, or completes with an after-photo.", "A municipal crew in high-visibility vests cleaning a street with a water tanker"],
  ["coordinator", "Ward coordinator", "Assigns tasks that have no owner and generates the ranked plan.", "Hands planning over a printed city map"],
  ["anyone", "Anyone", "The public board shows agency scores and the action log without a login.", "A person with a red umbrella crossing a wet city street"],
  ["simulator", "Rain simulator", "Compares pocket fill times now and after cleaning. Illustrative parameters. A scenario, not a forecast.", "A rain-soaked street with people and an auto-rickshaw"],
  ["capture", "Rain capture", "Store, detain or recharge, decided by rule for each roof. Experimental. Not reviewed by a hydrogeologist. Not for construction.", "Rooftops with water tanks and laundry"]];
const go = (href, text) => `<a class="btn go" href="${href}"><span>${esc(text)}</span><i aria-hidden="true"></i></a>`;

// Counts from the same endpoints the website uses. null while loading or when the server is not reachable.
export function countsFrom(map, acc) {
  if (!map || !acc) return null;
  const none = (acc.agencies || []).find(a => a.agency_id == null);
  return { pockets: (map.pockets || []).length, drains: (map.assets || []).length, unowned: none ? none.assets_owned : 0 };
}

export function agencyStrip(list = []) {
  return list.map(a => {
    const [short, ...rest] = String(a.name ?? "").split(" ("), full = rest.join(" (").replace(/\)$/, "");
    const mark = LOGOS[a.id] ? `<img src="${LOGOS[a.id]}" width="120" height="120" alt="${esc(full || short)} logo">`
      : `<b class="w-mono" aria-hidden="true">${esc(short)}</b>`;
    return `<li>${mark}<span><strong>${esc(short)}</strong>${esc(full)}</span></li>`;
  }).join("");
}

export const welcomeView = ({ counts = null, agencies = [], offline = false } = {}) => `<div class="welcome">
  <section class="w-hero" aria-labelledby="w-h"><p class="w-word" aria-hidden="true">Rain-Ready</p>
    <h1 id="w-h">Clean the right drain first</h1>
    <p>A shared action list for monsoon waterlogging: what to clean, who owns it, who did it, who checked, and did it help.</p>
    <div class="w-acts">${go("#/login", "Get started")}<a class="btn" href="#/dash">Public dashboard</a></div></section>

  ${agencies.length ? `<section class="w-sec" aria-labelledby="w-ag"><p class="eyebrow" id="w-ag">Agencies in the pilot ward</p>
    <ul class="w-logos">${agencyStrip(agencies)}</ul>
    <p class="small muted">Logos belong to their agencies and only identify them. Rain-Ready is an independent project, not affiliated with any agency.</p></section>` : ""}

  <section class="w-sec w-about" aria-labelledby="w-ab"><img src="${IMG}about-delhi.jpg" width="840" height="1050" loading="lazy" alt="Rooftops of an old Delhi neighbourhood under a pale sky">
    <div><p class="eyebrow" id="w-ab">About</p><h2>Software cannot fix a drain. It can make ownership visible, make action easy to prove, and point crews to the drain where one hour of work buys the most.</h2>
      <a class="btn" href="#/board">See the public board</a></div></section>

  <section class="w-sec" aria-label="Live counts"><div class="w-stats">${STATS.map(([k, label, img, alt]) => `<figure class="w-stat">
    <img src="${IMG}${img}.jpg" width="960" height="640" loading="lazy" alt="${esc(alt)}"><figcaption><strong>${counts ? esc(counts[k]) : "–"}</strong><span>${esc(label)}</span></figcaption></figure>`).join("")}</div>
    <p class="small muted">${offline ? "Live counts are not available right now." : "Live counts from the server. Pilot ward: Old Rajinder Nagar and Karol Bagh, Delhi. Photos are illustrative, not of the pilot ward."}</p></section>

  <section class="w-sec" aria-labelledby="w-st"><p class="eyebrow" id="w-st">What it does</p><h2>From a photo to a checked fix</h2>
    <p class="muted">Every step writes a row in the task history with who, when and the photo. A job counts as confirmed only after a different resident has looked.</p>
    <div class="w-steps">${STEPS.map(([ic, t, d]) => `<article class="card glass"><span class="w-ic">${icon(ic)}</span><h3>${esc(t)}</h3><p class="small">${esc(d)}</p></article>`).join("")}</div></section>

  <section class="w-sec" aria-labelledby="w-who"><p class="eyebrow" id="w-who">Who uses it</p><h2>Who it is for, and what they see</h2>
    <div class="w-who">${WHO.map(([img, t, d, alt]) => `<article class="card glass"><img src="${IMG}who-${img}.jpg?v=2" width="1040" height="800" loading="lazy" alt="${esc(alt)}">
      <h3>${esc(t)}</h3><p class="small">${esc(d)}</p></article>`).join("")}</div></section>

  <section class="w-cta" aria-labelledby="w-c"><h2 id="w-c">See who acts, how fast, and did it hold</h2>${go("#/board", "Open the public board")}</section>

  <p class="small muted w-credits">Layout after the EcoPower template for Framer. Photos from Unsplash, illustrative. Logos: Municipal Corporation of Delhi seal (Wikimedia Commons, public domain) and Delhi Jal Board logo (Wikimedia Commons, GODL-India); they belong to their agencies.</p>
</div>`;
