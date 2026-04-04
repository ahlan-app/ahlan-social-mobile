// A robust service worker with caching strategies for offline functionality.

const CACHE_NAME = 'ahlan-shell-cache-v2';
const DATA_CACHE_NAME = 'ahlan-data-cache-v2';
const SUPABASE_HOSTNAME = 'zwtfvauwfegnlligyuji.supabase.co';

// App Shell files - these are critical for the app to load.
const urlsToCache = [
  '/',
  '/index.html',
  '/index.js',
  '/manifest.json',
  '/icon.svg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Anton&family=Dancing+Script:wght@700&family=Fredoka:wght@500&display=swap',
];

// Install service worker and cache all app shell files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(urlsToCache);
    }).then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
    }).catch(error => {
      console.error('Failed to cache app shell:', error);
    })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME, 'shared-files-cache-v1'];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: handle requests with different caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Share target handler
  if (request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const formData = await request.formData();
        const mediaFile = formData.get('media');

        if (!mediaFile) {
          return Response.redirect('/', 303);
        }
        
        // We can only store Responses in cache.
        const fileResponse = new Response(mediaFile);
        const cache = await caches.open('shared-files-cache-v1');
        await cache.put('shared-file', fileResponse);
        
        // Redirect to the app with a query param to indicate a share.
        return Response.redirect('/?shared=true', 303);
      } catch (error) {
        console.error('Share target failed:', error);
        return Response.redirect('/', 303);
      }
    })());
    return;
  }

  // Strategy 1: Stale-while-revalidate for API calls (Supabase) and images
  if (url.hostname === SUPABASE_HOSTNAME || url.hostname === 'picsum.photos') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            // Do not cache failed requests
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            console.error('Fetch failed for data/image:', request.url, err);
            // On network failure, we MUST return the cached response if it exists.
            if (cachedResponse) {
                return cachedResponse;
            }
          });

          // Return cached response immediately if available, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy 2: Cache-first for app shell and fonts
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If not in cache, fetch from network, and cache it for next time
      return fetch(request).then((networkResponse) => {
        // Check if we received a valid response. Don't cache opaque responses from cross-origin requests unless we know they are safe (like fonts).
        if(!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const isFont = url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com');
        const isSafeToCache = request.destination === 'script' || request.destination === 'style' || isFont;

        if (isSafeToCache) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
            });
        }
        
        return networkResponse;
      });
    }).catch(error => {
      // If fetch fails and nothing is in cache, return a fallback (e.g., the main page)
      console.log('Fetch failed; returning offline fallback.', error);
      return caches.match('/');
    })
  );
});