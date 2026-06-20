const CACHE_NAME = 'queen-store-v1';
const FILES_TO_CACHE = [
  './',
  './QUEEN_STORE_COMODINES_APP.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// INSTALL EVENT
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll([
        './',
        './QUEEN_STORE_COMODINES_APP.html',
        './manifest.json'
      ]).catch(err => {
        console.log('Algunos archivos no pudieron cachearse:', err);
        // Continuamos aunque fallen algunos (como las fuentes externas)
      });
    })
  );
  self.skipWaiting();
});

// ACTIVATE EVENT
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH EVENT - Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Ignorar no-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Primero intentar red
    fetch(event.request)
      .then(response => {
        // No cachear respuestas que no sean 200
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clonar la respuesta
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(error => {
        // Si falla la red, usar cache
        console.log('Service Worker: Fetch failed, using cache:', event.request.url);
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Si no hay en cache, devolver una página de offline
            return new Response('Offline - localStorage still available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
      })
  );
});

// MESSAGE EVENT - para comunicación con el cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Loaded');
