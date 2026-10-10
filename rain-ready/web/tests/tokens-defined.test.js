// web/tests/tokens-defined.test.js — every var(--name) used in CSS or JS is defined in tokens.css.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const web = fileURLToPath(new URL("../", import.meta.url));
const LOCAL = new Set(["i", "chip"]);   // set per element in markup or CSS, not in :root
const walk = (d) => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const defined = new Set([...readFileSync(join(web, "css/tokens.css"), "utf8").matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));

test("every var(--x) in css/*.css and js/**/*.js is defined in tokens.css", () => {
  const files = [...readdirSync(join(web, "css")).filter(f => f.endsWith(".css")).map(f => join(web, "css", f)),
    ...walk(join(web, "js")).filter(f => f.endsWith(".js"))];
  const missing = [];
  for (const f of files) for (const [, n] of readFileSync(f, "utf8").matchAll(/var\((--[\w-]+)/g))
    if (!defined.has(n) && !LOCAL.has(n.slice(2))) missing.push(`${f.slice(web.length)}: ${n}`);
  assert.deepEqual([...new Set(missing)], []);
});
