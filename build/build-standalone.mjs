/* ============================================================
   Build a single self-contained HTML that runs from file://
   - JSX is pre-compiled with esbuild (no in-browser Babel, no fetches)
   - React/ReactDOM are inlined from vendor/ (works fully offline)
   - styles.css + data.js + compiled UI are all inlined
   Output: football-manager-standalone.html  (just double-click it)

   Run:  node build/build-standalone.mjs
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => resolve(root, p);
const read = (p) => readFileSync(r(p), "utf8");
// Neutralize any literal </script> so inlined code can't close the tag early.
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");

// 1) Pre-compile the JSX (classic scripts share one scope when concatenated).
const compile = (f) =>
  execSync(`npx --yes esbuild@0.21.5 ${r(f)} --loader:.jsx=jsx`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const ui = ["js/drag.jsx", "js/components.jsx", "js/app.jsx"].map(compile).join("\n;\n");

// 2) Gather inlined parts.
const css = read("styles.css");
const dataJs = read("js/data.js");
const react = read("vendor/react.production.min.js");
const reactDom = read("vendor/react-dom.production.min.js");

// 3) Assemble.
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#0A0D0C" />
<title>Football Manager</title>
<style>
html, body { height: 100%; background: #060807; }
#root { min-height: 100%; }
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>${safe(react)}</script>
<script>${safe(reactDom)}</script>
<script>${safe(dataJs)}</script>
<script>${safe(ui)}</script>
</body>
</html>
`;

const outPath = r("football-manager-standalone.html");
writeFileSync(outPath, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`Built ${outPath} (${kb} KB) — open it directly via file://`);
