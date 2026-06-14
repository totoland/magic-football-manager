/* ============================================================
   Build a fully self-contained, CDN-free dist/ for nginx.
   - JSX pre-compiled with esbuild (no in-browser Babel)
   - React/ReactDOM served from vendor/ (local)
   - Google Fonts (Archivo + Hanken Grotesk, latin) vendored locally
   - index.html + sw.js rewritten to reference only same-origin assets
   Output: dist/  (COPY'd into the nginx image by the Dockerfile)

   Run:  node build/build-dist.mjs
   Needs internet at BUILD time (fonts). Runtime is 100% offline.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => resolve(root, p);
const read = (p) => readFileSync(r(p), "utf8");

// ---- 1. clean dist tree -------------------------------------------------
rmSync(r("dist"), { recursive: true, force: true });
for (const d of ["dist", "dist/js", "dist/vendor", "dist/fonts"]) mkdirSync(r(d), { recursive: true });

// ---- 2. compile JSX -> classic JS (NO iife: top-level scope stays shared) ----
const compile = (f) =>
  execSync(`npx --yes esbuild@0.21.5 ${r(f)} --loader:.jsx=jsx --target=es2018`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
for (const f of ["drag", "components", "app"]) writeFileSync(r(`dist/js/${f}.js`), compile(`js/${f}.jsx`));
cpSync(r("js/data.js"), r("dist/js/data.js")); // plain JS, copy verbatim

// ---- 3. vendor React + static assets ------------------------------------
cpSync(r("vendor/react.production.min.js"), r("dist/vendor/react.production.min.js"));
cpSync(r("vendor/react-dom.production.min.js"), r("dist/vendor/react-dom.production.min.js"));
for (const f of ["styles.css", "manifest.webmanifest", "icon.svg"]) cpSync(r(f), r(`dist/${f}`));
cpSync(r("icons"), r("dist/icons"), { recursive: true });

// ---- 4. fonts: copy committed vendor/fonts/ (100% offline build) --------
// Refresh the vendored woff2 with `node build/fetch-fonts.mjs` if the design
// ever changes the font set; the normal build never touches the network.
let haveFonts = false;
if (existsSync(r("vendor/fonts/fonts.css"))) {
  cpSync(r("vendor/fonts"), r("dist/fonts"), { recursive: true });
  haveFonts = true;
  console.log("  fonts: copied from vendor/fonts/ (offline)");
} else {
  console.warn("  fonts: vendor/fonts/ missing — using system-ui fallback " +
               "(run: node build/fetch-fonts.mjs)");
}

// ---- 5. index.html — strip every CDN reference --------------------------
let html = read("index.html");
// React/ReactDOM/Babel CDN -> local vendor (no Babel at all)
html = html.replace(
  /<script src="https:\/\/unpkg\.com\/react@[^"]*"[^>]*><\/script>\s*/,
  '<script src="vendor/react.production.min.js"></script>\n');
html = html.replace(
  /<script src="https:\/\/unpkg\.com\/react-dom@[^"]*"[^>]*><\/script>\s*/,
  '<script src="vendor/react-dom.production.min.js"></script>\n');
html = html.replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]*"[^>]*><\/script>\s*/, "");
// text/babel .jsx -> plain compiled .js
html = html.replace(/<script type="text\/babel" data-presets="react" src="js\/([\w-]+)\.jsx"><\/script>/g,
  '<script src="js/$1.js"></script>');
// Google Fonts -> local fonts.css (or drop entirely if vendoring failed)
const fontBlock =
  /\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[^>]*\/>\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*\/>\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*\/>/;
html = html.replace(fontBlock, haveFonts ? '\n<link rel="stylesheet" href="fonts/fonts.css" />' : "");
writeFileSync(r("dist/index.html"), html);

// ---- 6. sw.js — point the precache at the compiled, local shell ---------
let sw = read("sw.js");
sw = sw.replace(/const VERSION = "[^"]*";/, 'const VERSION = "fm-v3";');
const shell = [
  "./", "./index.html", "./styles.css", "./manifest.webmanifest", "./icon.svg",
  ...(haveFonts ? ["./fonts/fonts.css"] : []),
  "./vendor/react.production.min.js", "./vendor/react-dom.production.min.js",
  "./js/data.js", "./js/drag.js", "./js/components.js", "./js/app.js",
];
sw = sw.replace(/const SHELL_ASSETS = \[[^\]]*\];/,
  "const SHELL_ASSETS = [\n  " + shell.map((s) => `"${s}"`).join(",\n  ") + ",\n];");
writeFileSync(r("dist/sw.js"), sw);

console.log("Built dist/ — fully self-contained (no CDN at runtime).");
