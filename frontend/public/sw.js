// Service worker mínimo para PWA installability.
// Não faz caching agressivo: a app usa APIs dinâmicas (câmara, Spotify).
const CACHE = 'scanmysound-v1'
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/logo-mark.svg', '/logo-mark-dark.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => null)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (req.url.includes('/api/')) return
  if (req.url.includes('spotify.com')) return
  if (req.url.includes('accounts.spotify.com')) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        if (res.status === 200) {
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => null)
        }
        return res
      })
      .catch(() => caches.match(req)),
  )
})
