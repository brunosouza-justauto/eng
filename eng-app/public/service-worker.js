// Service Worker for ENG App PWA
const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `eng-app-v${CACHE_VERSION}`;

// List of static assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.svg',
  '/pwa-512x512.svg'
];

// Log current version on load
console.log(`[Service Worker] Started version ${CACHE_VERSION}`);

// Installation - cache core assets
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing version ${CACHE_VERSION}`);
  
  // Skip waiting immediately to ensure the new service worker activates right away
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and content');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activation - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activating version ${CACHE_VERSION}`);
  
  // Clear all caches except current version
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Function to determine if a request should be cached
function shouldCache(url) {
  const urlObj = new URL(url);
  
  // Don't cache API requests or external resources
  if (
    urlObj.pathname.startsWith('/api/') ||
    urlObj.hostname.includes('supabase.co') ||
    urlObj.pathname.includes('auth') ||
    urlObj.pathname.includes('analytics') ||
    urlObj.hostname.includes('google') ||
    urlObj.pathname.includes('gtag') ||
    urlObj.hostname !== self.location.hostname
  ) {
    return false;
  }
  
  // Cache static assets, HTML, CSS, JS, etc.
  return true;
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Only handle same-origin requests
  if (new URL(event.request.url).origin !== self.location.origin) return;
  
  // Skip URLs that shouldn't be cached
  if (!shouldCache(event.request.url)) return;
  
  // For HTML pages - use network first strategy
  if (event.request.mode === 'navigate' || 
      (event.request.headers.get('accept') && 
       event.request.headers.get('accept').includes('text/html'))) {
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest version
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for offline support
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return the cached homepage as a fallback
              return caches.match('/index.html');
            });
        })
    );
    return;
  }
  
  // For other assets - stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Create a response promise
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Update the cache
            if (networkResponse.ok) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, copy);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            // Return the error if no cached response is available
            if (!cachedResponse) {
              throw error;
            }
          });
        
        // Return the cached response immediately if available, 
        // otherwise wait for the network response
        return cachedResponse || fetchPromise;
      })
  );
}); 