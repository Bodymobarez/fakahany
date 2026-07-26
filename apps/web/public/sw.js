/* Fresh Harvest service worker — same-origin shell only; never break API calls */
const CACHE = 'fh-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/manifest.json']).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Cross-origin (API tunnel, Unsplash, etc.) — do not intercept.
  if (url.origin !== self.location.origin) return;

  // Only soft-cache same-origin GETs; always return a real Response.
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      }),
  );
});
