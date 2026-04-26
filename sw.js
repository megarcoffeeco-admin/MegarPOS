// ============================================
// MEGAR POS — SERVICE WORKER
// ============================================

const CACHE_NAME = 'megar-pos-v4';
const ASSETS = [
  '/MegarPOS/',
  '/MegarPOS/index.html',
  '/MegarPOS/pos-megar-transaksi.html',
  '/MegarPOS/pos-megar-admin.html',
  '/MegarPOS/pos-megar-nota.html',
  '/MegarPOS/manifest.json',
  '/MegarPOS/icon-192.png',
  '/MegarPOS/icon-512.png'
];

// Install — cache semua aset
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache first untuk aset, network first untuk API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls — selalu network, jangan cache
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(fetch(event.request).catch(() => {
      return new Response('Offline', { status: 503 });
    }));
    return;
  }

  // Jangan cache halaman protected
  const protectedPages = ['pos-megar-transaksi.html', 'pos-megar-admin.html', 'pos-megar-nota.html'];
  if (protectedPages.some(p => url.pathname.includes(p))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Aset lokal — cache first, fallback network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache aset baru yang ditemukan
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback ke index jika halaman tidak ditemukan
        if (event.request.destination === 'document') {
          return caches.match('/MegarPOS/index.html');
        }
      });
    })
  );
});
