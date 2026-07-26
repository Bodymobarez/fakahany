/* Fresh Harvest service worker stub — cache shell only */
const CACHE = 'fh-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/manifest.json'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first stub; expand caching strategy in a later phase
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
