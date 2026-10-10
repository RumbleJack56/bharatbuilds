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
export const CAMERA = { none: "Camera not available on this device. You can still send a report without a photo: pick what you see." };
export const ACTION = { clean: "Clean", inspect: "Inspect", clarify_owner: "Clarify owner", monitor: "Monitor" };
