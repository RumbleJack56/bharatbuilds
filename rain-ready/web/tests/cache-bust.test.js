// web/tests/cache-bust.test.js — index.html carries one version on css, main.js and every module (import map).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = fileURLToPath(new URL("../", import.meta.url));
const html = readFileSync(join(WEB, "index.html"), "utf8");
const walk = (d) => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
const modules = walk(join(WEB, "js")).filter(f => f.endsWith(".js")).map(f => "./js/" + relative(join(WEB, "js"), f).split(sep).join("/"));
const map = JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(html)?.[1] || "{}").imports || {};
const V = /<link rel="stylesheet" href="css\/app\.css\?v=([\w.-]+)"/.exec(html)?.[1];

test("the stylesheet carries a version", () => assert.ok(V, "css/app.css?v=<n> missing"));
test("main.js is loaded with the same version", () => assert.match(html, new RegExp(`<script type="module" src="js/main\\.js\\?v=${V}"`)));
test("the import map comes before the module script", () => assert.ok(html.indexOf('type="importmap"') > 0 && html.indexOf('type="importmap"') < html.indexOf('type="module"')));
test("config.js is still loaded unversioned", () => assert.match(html, /<script src="config\.js"><\/script>/));
test("every module under web/js is mapped to the same version", () => {
  for (const m of modules.filter(m => m !== "./js/main.js")) assert.equal(map[m], `${m}?v=${V}`, m);
});
test("the import map holds no entry for a missing module", () => {
  for (const k of Object.keys(map)) assert.ok(modules.includes(k), `stale entry ${k}`);
});
test("every stylesheet link carries the same version", () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="(css\/[\w-]+\.css)\?v=([\w.-]+)"/g)];
  assert.deepEqual(links.map(l => l[1]), ["css/tokens.css", "css/app.css", "css/ui.css", "css/motion.css", "css/phone.css", "css/dash.css", "css/inbox.css"]);
  for (const [, href, v] of links) assert.equal(v, V, href);
});
test("every icons.svg reference carries the same version", () => {
  const files = [join(WEB, "index.html"), ...walk(join(WEB, "js")).filter(f => f.endsWith(".js"))];
  const refs = files.flatMap(f => [...readFileSync(f, "utf8").matchAll(/img\/icons\.svg\?v=([\w.-]+)/g)].map(m => [relative(WEB, f), m[1]]));
  assert.ok(refs.length >= 3, "sprite refs not found");
  for (const [f, v] of refs) assert.equal(v, V, f);
});
