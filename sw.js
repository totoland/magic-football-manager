/* ============================================================
   Football Manager — service worker (offline shell, PRD §10)
   Strategy:
   - Precache the local app shell on install.
   - Navigations: network-first, fall back to cached index.html.
   - Same-origin static + CDN (React/Babel/fonts): cache-first,
     populated at runtime so a first online load makes the app
     fully offline-capable afterwards.
   ============================================================ */
const VERSION = "fm-v2";
const SHELL = "fm-shell-" + VERSION;
const RUNTIME = "fm-runtime-" + VERSION;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./js/data.js",
  "./js/drag.jsx",
  "./js/components.jsx",
  "./js/app.jsx",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // App navigations → network-first, fall back to the cached shell (offline).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Everything else (local assets + CDN scripts/fonts) → cache-first, then fill runtime cache.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
