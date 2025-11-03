/// <reference lib="webworker" />

const swSelf = self as unknown as ServiceWorkerGlobalScope;

const STATIC_CACHE = 'dripfy-static-v1';
const API_CACHE = 'dripfy-api-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS: string[] = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.png',
  '/assets/logo-icon.png',
  '/assets/logo-wordmark.png',
  '/icons/pwa-icon.svg',
  '/icons/pwa-icon-maskable.svg',
];

function shouldHandleAsNavigation(request: Request): boolean {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html') === true);
}

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.ok) {
    cache.put(request, networkResponse.clone()).catch(() => undefined);
  }
  return networkResponse;
}

async function networkFirst(request: Request, cacheName: string, fallback?: () => Promise<Response>): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => undefined);
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    if (fallback) {
      return fallback();
    }
    throw error;
  }
}

function matchRuntimeResource(request: Request): boolean {
  return ['style', 'script', 'font'].includes(request.destination) || request.destination === 'image';
}

swSelf.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch((error) => {
      console.error('[sw] Precaching failed', error);
    }),
  );
  swSelf.skipWaiting();
});

swSelf.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  swSelf.clients.claim().catch(() => undefined);
});

swSelf.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (shouldHandleAsNavigation(request)) {
    event.respondWith(
      networkFirst(request, STATIC_CACHE, async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(OFFLINE_URL);
        if (cached) {
          return cached;
        }
        return new Response('Çevrimdışı sayfası bulunamadı.', { status: 503, statusText: 'Offline' });
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (matchRuntimeResource(request)) {
    event.respondWith(cacheFirst(request));
  }
});

swSelf.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    swSelf.skipWaiting();
  }
  if (event.data === 'OFFLINE_QUEUE_SYNC') {
    swSelf.registration.sync
      ?.register('offline-queue-sync')
      .catch((error) => console.error('[sw] Failed to register sync', error));
  }
});

swSelf.addEventListener('sync', (event) => {
  if (event.tag === 'offline-queue-sync') {
    event.waitUntil(
      swSelf.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'OFFLINE_QUEUE_FLUSH_REQUEST' }));
      }),
    );
  }
});

swSelf.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? { title: 'Dripfy', body: 'Yeni bildirim' };
  const title = data.title ?? 'Dripfy';
  const body = data.body ?? 'Yeni bildirim';
  event.waitUntil(
    swSelf.registration.showNotification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data,
    }),
  );
});

swSelf.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    swSelf.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => 'focus' in c && (c as WindowClient).url.startsWith(swSelf.location.origin));
      if (client) {
        return (client as WindowClient).focus();
      }
      return swSelf.clients.openWindow(targetUrl);
    }),
  );
});
