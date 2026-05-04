/* 키보드히메 PWA 서비스 워커 — Network First 전략
 * 매번 최신 HTML/JS를 가져오고, 오프라인일 때만 캐시 사용. */
const CACHE_NAME = 'keyboard-hime-v1';
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS);
      const fresh = await fetch(req, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(()=>{});
        return fresh;
      }
      throw new Error('bad-response');
    } catch(err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
