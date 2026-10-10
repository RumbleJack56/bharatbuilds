// web/tests/contrast.mjs — prints the contrast table for the report: node web/tests/contrast.mjs
import { readFileSync } from "node:fs";
import { parseColor, over, ratio, tokens } from "./contrast-lib.js";
const t = tokens(readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8"));
const rgb = (k) => parseColor(t[k]).slice(0, 3);
console.log("text".padEnd(10), "surface".padEnd(14), "backdrop".padEnd(10), "ratio");
for (const sk of ["glass-bg", "glass-bg-strong", "lg-tint"]) for (const bk of ["bd-darkest", "bd-brightest"])
  for (const tx of ["fg", "fg-muted", "accent", "high", "elev", "low", "info", "watch"])
    console.log(tx.padEnd(10), sk.padEnd(14), bk.slice(3).padEnd(10), ratio(rgb(tx), over(parseColor(t[sk]), rgb(bk))).toFixed(2));
