// web/js/ui/copy.js — fixed UI strings. Safety text mirrors core/copy.py; never generated.
export const BANNED = /\bsafe\b|guarantee|desilted|removed|cm deep/i;
export const FIELD_RULE = "Do not open manholes, enter drains, or go near drains during or after rain. Photograph from the footpath.";
export const KINDS = { blocked_drain: "Blocked drain", standing_water: "Standing water", overflow: "Drain overflowing", other: "Something else" };
export const ROLE = { resident: "Resident", official: "Official", admin: "Coordinator" };
export const EVENT = { created: "Task created", report_added: "Another report added", accepted: "Accepted", bounced: "Sent back: wrong owner",
  reassigned: "Reassigned", assigned: "Assigned", rejected: "Rejected", completed: "Marked done", confirmed: "Confirmed by a resident",
  disputed: "Disputed by a resident" };
export const LEVEL = { high: ["#b3261e", "High"], elevated: ["#d9822b", "Elevated"], watch: ["#c9b100", "Watch"], none: ["#6b7b88", "None"] };
export const USE = { store_reuse: "Store and reuse", detain: "Detain only", recharge: "Recharge", needs_data_or_tank: "Needs data" };
export const PIN = {
  default: "Default pin (Daryai Nallah barrel, Pusa Road crossing) - tap the map or use my location",
  tapped: "Pin you tapped",
  photo: (m) => `Pin from your photo (\u00b1 ${Math.round(m)} m)`,
  gps: (m) => `Your GPS (\u00b1 ${Math.round(m)} m)`,
};
export const NO_OWNER = "No agency owns this drain yet. A coordinator will assign it.";
export const NEAREST = (name, m) => `Nearest drain: ${name}, about ${m} m away. A report links to a drain within 150 m - tap the map closer to a drain.`;
export const APPROX = (m) => `Your location is approximate (\u00b1 ${Math.round(m)} m). Tap the map to set the exact spot.`;
export const ANDROID_PRECISE = "On Android, turn on Precise location for your browser.";
export const CAMERA = { none: "Camera not available on this device. You can still send a report without a photo: pick what you see." };
export const ACTION = { clean: "Clean", inspect: "Inspect", clarify_owner: "Clarify owner", monitor: "Monitor" };
// One plain line per empty list screen (V8).
export const EMPTY = { mine: "You have not sent any reports yet.", confirm: "Nothing to check right now.", inbox: "No tasks for your agency right now.",
  history: "No history yet.", reports: "No reports linked yet.", admin: "Every task has an owner.", held: "No reports are waiting for a check.",
  actions: "No actions to show.", insights: "No insights from the current rules.", log: "No tasks match.", accountability: "No agencies to show yet.",
  capture: "No rain-capture sites to show." };
