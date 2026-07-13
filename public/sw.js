// CashFlow Service Worker — offline-first shell + runtime cache.
// Hand-written and served from /public so Vercel guarantees it exists at /sw.js.

const VERSION = "v3";
const STATIC_CACHE = `cashflow-static-${VERSION}`;
const RUNTIME_CACHE = `cashflow-runtime-${VERSION}`;
const HTML_CACHE = `cashflow-html-${VERSION}`;

// Minimum shell that must be available offline.
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("cashflow-") && ![STATIC_CACHE, RUNTIME_CACHE, HTML_CACHE].includes(n))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// NetworkFirst for HTML navigations — always try fresh, fall back to cache when offline.
async function handleNavigation(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = (await cache.match(request)) || (await cache.match("/")) || (await caches.match("/"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title><body style='font-family:system-ui;padding:2rem;text-align:center'><h1>Offline</h1><p>Buka aplikasi sekali saat online agar bisa dipakai offline.</p></body>",
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}

// CacheFirst for hashed static assets — immutable once built.
async function handleAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (/\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico|gif)$/i.test(url.pathname)) {
    event.respondWith(handleAsset(request));
  }
});
