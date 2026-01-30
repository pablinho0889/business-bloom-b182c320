const CACHE_NAME = 'mi-puntico-v1';

// Instalación - no pre-cacheamos nada para evitar conflictos
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker instalado - Mi Puntico');
  self.skipWaiting();
});

// Activación - limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado - Mi Puntico');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - Network First con Cache Fallback (ideal para apps con datos dinámicos)
self.addEventListener('fetch', (event) => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') return;
  
  // No cachear llamadas a APIs externas
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('firestore') ||
      event.request.url.includes('firebase')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, guardar en cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 Sirviendo desde cache:', event.request.url);
            return cachedResponse;
          }
          // Si no hay cache, retornar error
          return new Response('Sin conexión y sin cache disponible', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
