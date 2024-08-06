const CACHE_NAME = 'ebook-library-v2'; // 버전 번호 증가
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  '/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('All resources have been cached');
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  console.log('Fetch event for ', event.request.url);
  if (event.request.url.startsWith('chrome-extension://')) {
    console.log('Ignoring chrome-extension request: ', event.request.url);
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Found ', event.request.url, ' in cache');
          return response;
        }
        console.log('Network request for ', event.request.url);
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              console.log('Response not valid: ', response);
              return response;
            }

            // Only cache 'basic' responses, 'cors' responses are ignored.
            if (response.type === 'basic') {
              const responseToCache = response.clone();

              return caches.open(CACHE_NAME)
                .then((cache) => {
                  console.log('Caching new resource: ', event.request.url);
                  cache.put(event.request, responseToCache);
                  return response;
                });
            } else {
              console.log('Not caching CORS response: ', response);
              return response;
            }
          })
          .catch((error) => {
            console.error('Fetching failed for ', event.request.url, ': ', error);
            return caches.match(event.request)
              .then((response) => {
                if (response) {
                  console.log('Serving cached fallback for ', event.request.url);
                  return response;
                }
                return new Response('Network request failed and no cache available.', {
                  status: 404,
                  statusText: 'Network request failed and no cache available.'
                });
              });
          });
      })
      .catch((error) => {
        console.error('Error in fetch handler: ', error);
        throw error;
      })
  );
});
