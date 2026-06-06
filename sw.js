const CACHE_NAME = 'dpdc-static-v1';
const API_CACHE = 'dpdc-api-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

async function handleApiRequest(request, url) {
    const cache = await caches.open(API_CACHE);
    const cacheKey = url.pathname;

    const cached = await cache.match(cacheKey);
    if (cached) {
        fetch(request).then(response => {
            if (response.ok) cache.put(cacheKey, response);
        }).catch(() => {});
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) cache.put(cacheKey, response.clone());
        return response;
    } catch {
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname.includes('balance.json') || url.pathname.includes('history.json')) {
        event.respondWith(handleApiRequest(event.request, url));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(networkResponse => {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                    return networkResponse;
                });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
    const cacheWhitelist = [CACHE_NAME, API_CACHE];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
