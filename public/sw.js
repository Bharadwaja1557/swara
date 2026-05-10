/**
 * Swara Service Worker
 * Version: CACHE_VERSION is bumped on every production deploy
 *
 * Caching strategy:
 *  Shell (HTML/JS/CSS/fonts) → Cache-first, background update
 *  Album JSON (jsDelivr)     → Network-first, 5-min cache fallback
 *  Cover images              → Cache-first, 7-day TTL
 *  Audio (.m4a)              → NEVER cached (stream directly, could be 50 MB+)
 */

/* global self, caches, fetch, Request, Response, URL */
'use strict';

const CACHE_VERSION = 'v1.0';
const SHELL_CACHE   = `swara-shell-${CACHE_VERSION}`;
const META_CACHE    = `swara-meta-${CACHE_VERSION}`;
const IMAGE_CACHE   = `swara-images-${CACHE_VERSION}`;

const ALL_CACHES = [SHELL_CACHE, META_CACHE, IMAGE_CACHE];

const META_TTL_MS  = 5  * 60 * 1000;        // 5 minutes
const IMAGE_TTL_MS = 7  * 24 * 60 * 60 * 1000; // 7 days

/** App shell URLs to precache on install */
const PRECACHE_URLS = [
  '/',
  '/search/',
  '/liked/',
  '/offline.html',
  '/manifest.json',
];

// ─── Lifecycle ─────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting(); // activate immediately
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll fails atomically — non-fatal: might fail if pages not yet built
      cache.addAll(PRECACHE_URLS).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch routing ─────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const path = url.pathname.toLowerCase();

  // ── Never intercept audio streams ─────────────────────────────────────
  if (path.endsWith('.m4a') || path.endsWith('.mp3') ||
      path.endsWith('.aac') || path.endsWith('.ogg') ||
      path.endsWith('.flac')) {
    return; // let browser handle range requests natively
  }

  // ── GitHub Releases (audio, not matched above): pass through ──────────
  if (url.hostname === 'objects.githubusercontent.com' ||
      (url.hostname === 'github.com' && url.pathname.includes('/releases/download/'))) {
    return;
  }

  // ── JSON metadata (jsDelivr / raw github): Network-first ──────────────
  if (
    (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'raw.githubusercontent.com') &&
    path.endsWith('.json')
  ) {
    event.respondWith(networkFirstWithCache(req, META_CACHE, META_TTL_MS));
    return;
  }

  // ── Cover images: Cache-first ──────────────────────────────────────────
  if (/\.(webp|jpg|jpeg|png|avif|gif|svg)$/i.test(path)) {
    event.respondWith(cacheFirstWithNetwork(req, IMAGE_CACHE, IMAGE_TTL_MS));
    return;
  }

  // ── Google Fonts ──────────────────────────────────────────────────────
  if (url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirstWithNetwork(req, SHELL_CACHE, IMAGE_TTL_MS));
    return;
  }

  // ── App shell (same-origin HTML / JS / CSS / fonts) ────────────────────
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithNetworkFallback(req, SHELL_CACHE));
    return;
  }
});

// ─── Strategies ────────────────────────────────────────────────────────────

/**
 * Network-first: try network, fall back to cache within TTL.
 * Used for metadata JSON that should always be fresh if possible.
 */
async function networkFirstWithCache(req, cacheName, ttlMs) {
  const cache = await caches.open(cacheName);

  try {
    const res = await fetch(req.clone());
    if (res.ok) {
      // Wrap with our cached-at timestamp
      const stamped = await stampResponse(res);
      cache.put(req, stamped.clone());
      return stamped;
    }
    return await fromCacheOrFail(cache, req, ttlMs, res);
  } catch {
    return await fromCacheOrFail(cache, req, ttlMs, null);
  }
}

/**
 * Cache-first: serve from cache, refresh in background, respect TTL.
 * Used for cover images and fonts — stable content.
 */
async function cacheFirstWithNetwork(req, cacheName, ttlMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  if (cached && !isStale(cached, ttlMs)) {
    // Stale-while-revalidate: serve cached, update in background
    refreshCache(cache, req).catch(() => {});
    return cached;
  }

  try {
    const res = await fetch(req.clone());
    if (res.ok) {
      const stamped = await stampResponse(res);
      cache.put(req, stamped.clone());
      return stamped;
    }
    return cached ?? res;
  } catch {
    return cached ?? new Response('', { status: 408, statusText: 'Offline' });
  }
}

/**
 * Cache-first for app shell: serve cached, update in background.
 * Falls back to /offline.html for navigation requests.
 */
async function cacheFirstWithNetworkFallback(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  if (cached) {
    // Update in background
    refreshCache(cache, req).catch(() => {});
    return cached;
  }

  try {
    const res = await fetch(req.clone());
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    if (req.mode === 'navigate') {
      const offline = await cache.match('/offline.html');
      return offline ?? new Response('<h1>Offline</h1>', {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return new Response('', { status: 408 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function stampResponse(res) {
  const body = await res.arrayBuffer();
  const headers = new Headers(res.headers);
  headers.set('sw-cached-at', Date.now().toString());
  return new Response(body, {
    status:  res.status,
    headers,
  });
}

function isStale(res, ttlMs) {
  const t = parseInt(res.headers.get('sw-cached-at') || '0', 10);
  return !t || (Date.now() - t > ttlMs);
}

async function fromCacheOrFail(cache, req, ttlMs, networkRes) {
  const cached = await cache.match(req);
  if (cached && !isStale(cached, ttlMs)) return cached;
  // Stale cache is better than nothing
  if (cached) return cached;
  return networkRes ?? new Response(
    JSON.stringify({ error: 'offline', url: req.url }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

async function refreshCache(cache, req) {
  const res = await fetch(req.clone());
  if (res.ok) {
    const stamped = await stampResponse(res);
    cache.put(req, stamped);
  }
}
