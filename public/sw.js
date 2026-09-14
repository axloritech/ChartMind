/* ChartMind service worker — app shell caching + offline fallback.
 * Strategy:
 *  - Precache the shell (pages, manifest, icons) on install.
 *  - Navigations: network-first, fall back to cache (offline shell).
 *  - /api/knowledge GETs: stale-while-revalidate (knowledge base works offline).
 *  - Other same-origin GETs (static assets): cache-first with network fill.
 *  - /api/analyze is NEVER cached (it hits the AI).
 */

const CACHE = "chartmind-v1";
const SHELL = [
  "/",
  "/analyze",
  "/knowledge",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {
        /* individual failures shouldn't block install */
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache AI analysis calls.
  if (url.pathname.startsWith("/api/analyze")) return;

  // Knowledge API: stale-while-revalidate so it works offline.
  if (url.pathname.startsWith("/api/knowledge")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Navigations: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || (await caches.match("/")) || Response.error();
        })
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons"))) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
