/* eslint-disable no-restricted-globals, no-undef */
/**
 * SERVICE WORKER — SpediamoFacile PWA (F09)
 *
 * Strategie di caching:
 *   - Documenti HTML (navigation): NetworkFirst con fallback offline ('/').
 *   - Asset _nuxt/* (JS/CSS hashati): CacheFirst, immutable per 1 anno.
 *   - Immagini /img/* /images/*: StaleWhileRevalidate con max 50 entry.
 *   - API /api/*: NetworkFirst — non cache PII per default; salva solo
 *     /api/locations/* (catalogo) per offline-friendly.
 *
 * Push:
 *   - 'push' event: parse JSON payload { title, body, url, tag } e mostra notification.
 *   - 'notificationclick' event: focus tab esistente o apre URL.
 *
 * Aggiornamenti:
 *   - skipWaiting + clients.claim per attivare il SW nuovo immediatamente
 *     (in coordinamento col plugin che intercetta updatefound).
 */

const SW_VERSION = 'sf-sw-v1';
const PRECACHE = `sf-precache-${SW_VERSION}`;
const RUNTIME_HTML = `sf-html-${SW_VERSION}`;
const RUNTIME_STATIC = `sf-static-${SW_VERSION}`;
const RUNTIME_IMG = `sf-img-${SW_VERSION}`;
const RUNTIME_API = `sf-api-${SW_VERSION}`;

const OFFLINE_FALLBACK = '/';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (![PRECACHE, RUNTIME_HTML, RUNTIME_STATIC, RUNTIME_IMG, RUNTIME_API].includes(key)) {
          return caches.delete(key);
        }
        return null;
      })),
    ).then(() => self.clients.claim()),
  );
});

function isHashedAsset(url) {
  return url.pathname.startsWith('/_nuxt/');
}
function isImage(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname)
    || url.pathname.startsWith('/images/')
    || url.pathname.startsWith('/img/');
}
function isCacheableApi(url) {
  // Whitelist: solo cataloghi pubblici (no PII).
  return url.pathname.startsWith('/api/locations')
    || url.pathname.startsWith('/api/articles')
    || url.pathname.startsWith('/api/services');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Solo same-origin + API stessa origine: lascia passare il resto al network.
  if (url.origin !== self.location.origin) return;

  // 1) Navigazioni (HTML): NetworkFirst con fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_HTML).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE_FALLBACK))),
    );
    return;
  }

  // 2) Asset hashati Nuxt: CacheFirst.
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_STATIC).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            cache.put(request, res.clone());
            return res;
          });
        }),
      ),
    );
    return;
  }

  // 3) Immagini: StaleWhileRevalidate.
  if (isImage(url)) {
    event.respondWith(
      caches.open(RUNTIME_IMG).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((res) => {
              cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        }),
      ),
    );
    return;
  }

  // 4) API whitelistate (cataloghi pubblici): NetworkFirst, fallback cache.
  if (isCacheableApi(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_API).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)),
    );
  }
});

/* ===== PUSH NOTIFICATIONS ===== */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'SpediamoFacile', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'SpediamoFacile';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'sf-notification',
    data: { url: data.url || '/' },
    requireInteraction: Boolean(data.requireInteraction),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
            return;
          }
        } catch (_) { /* noop */ }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    }),
  );
});

/* Permette al client di forzare il SW nuovo senza reload manuale. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
