/* eslint-disable no-restricted-globals */
/*
 * MEDviz hand-written service worker.
 * Served from the web root so its scope is "/".
 *
 * Strategy:
 *   - Navigation requests: network-first, fall back to cached "/index.html"
 *     (so the SPA still boots while offline).
 *   - Static same-origin assets (script/style/image): cache-first, then
 *     network (and cache the result).
 *   - API calls ("/api...") and any non-GET request: ALWAYS bypass the cache
 *     and hit the network so auth / data responses are never stale.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `medviz-cache-${CACHE_VERSION}`;

// App shell precached on install.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // addAll fails atomically; use individual puts so one missing
        // asset can't abort the whole install.
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => {
              /* ignore individual precache failures */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  // Same-origin /api path, or anything that looks like an API endpoint.
  return url.pathname.startsWith('/api');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever deal with GET. Let POST/PUT/DELETE etc. go straight to network.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Never touch API traffic or anything cross-origin to our backend.
  // Cross-origin requests are left entirely to the browser's default handling.
  if (url.origin !== self.location.origin) {
    return;
  }
  if (isApiRequest(url)) {
    return; // network-only, no cache read or write
  }

  // Navigation requests: network-first with offline fallback to the SPA shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep the latest shell warm for offline use.
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((cached) => cached || caches.match('/'))
            .then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  const dest = request.destination;
  if (dest === 'script' || dest === 'style' || dest === 'image' || dest === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
  // Everything else falls through to the network by default.
});
