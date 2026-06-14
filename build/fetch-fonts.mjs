/* ============================================================
   Refresh vendor/fonts/ from Google Fonts (latin subset).
   Run ONLY when the font set changes — the woff2 + fonts.css it
   writes are committed to the repo so the normal build (build-dist.mjs)
   stays 100% offline.

   Run:  node build/fetch-fonts.mjs
   ============================================================ */
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "vendor/fonts");

// Families actually used by styles.css: Archivo (display) + Hanken Grotesk (body).
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900" +
  "&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const css = await (await fetch(FONT_URL, { headers: { "User-Agent": UA } })).text();
const re = /\/\*\s*latin\s*\*\/\s*@font-face\s*\{[^}]*\}/g;
let manifest = "";
let n = 0;
for (const block of css.match(re) || []) {
  const m = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
  if (!m) continue;
  const name = basename(new URL(m[1]).pathname);
  const buf = Buffer.from(await (await fetch(m[1], { headers: { "User-Agent": UA } })).arrayBuffer());
  writeFileSync(resolve(out, name), buf);
  manifest += block.replace(m[1], `./${name}`) + "\n";
  n++;
}
if (n === 0) throw new Error("no latin @font-face blocks parsed — Google CSS format changed?");
writeFileSync(resolve(out, "fonts.css"), manifest);
console.log(`Wrote vendor/fonts/ — ${n} @font-face rule(s), latin subset. Commit them.`);
