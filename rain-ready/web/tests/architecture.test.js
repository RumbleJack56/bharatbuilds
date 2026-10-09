// web/tests/architecture.test.js — enforces PLAN.md section 2.1. LEGACY files are exempt until Task 12 deletes them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const JS = fileURLToPath(new URL("../js/", import.meta.url));
const LEGACY = new Set(["api.js", "util.js", "app.js", "dashmap.js", "dashmore.js", "login.js", "report.js",
  "resident.js", "official.js", "admin.js", "dash.js"]);
const ALLOWED = { core: ["core"], ports: ["core"], adapters: ["core"], services: ["core"], ui: ["ui"],
  views: ["ui", "views"], controllers: ["controllers", "views", "ui", "core"] };

const files = (dir) => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".js") ? [p] : [];
});
const layer = (p) => relative(JS, p).split(sep).length > 1 ? relative(JS, p).split(sep)[0] : "";

for (const file of files(JS)) {
  const rel = relative(JS, file);
  if (LEGACY.has(rel)) continue;
  const src = readFileSync(file, "utf8");
  test(`imports follow the layer rule: ${rel}`, () => {
    const from = layer(file);
    if (from === "") return;                        // main.js is the composition root
    for (const [, spec] of src.matchAll(/from\s+"(\.[^"]+)"/g)) {
      const to = layer(resolve(dirname(file), spec));
      assert.ok(ALLOWED[from].includes(to), `${rel} (${from}) must not import ${spec} (${to || "root"})`);
    }
  });
  test(`platform APIs stay in their adapter: ${rel}`, () => {
    if (rel !== join("adapters", "http-fetch.js")) assert.doesNotMatch(src, /\bfetch\(/, "fetch only in adapters/http-fetch.js");
    if (rel !== join("adapters", "map-leaflet.js")) assert.doesNotMatch(src, /\bL\.\w+\(/, "Leaflet only in adapters/map-leaflet.js");
  });
}
