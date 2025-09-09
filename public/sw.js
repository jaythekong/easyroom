const CACHE_NAME = 'easy-room-v2';
const STATIC_CACHE = 'easy-room-static-v2';
const DYNAMIC_CACHE = 'easy-room-dynamic-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/lovable-uploads/6721bbed-4f17-4518-8a39-2d4732849214.png'
];

// Network-first resources (API calls, dynamic content)
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /supabase/,
  /auth/
];

// Cache-first resources (static assets)
const CACHE_FIRST_PATTERNS = [
  /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/,
  /lovable-uploads/
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) return;

  // Network-first strategy for API calls
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first strategy for static assets
  if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stale-while-revalidate for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default to network with cache fallback
  event.respondWith(networkWithCacheFallback(request));
});

// Network-first strategy
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Asset not available offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const networkResponse = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // If network fails and we have cache, return it
    return cachedResponse;
  });
  
  return cachedResponse || networkResponse;
}

// Network with cache fallback
async function networkWithCacheFallback(request) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Content not available offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic for failed requests
  console.log('Background sync triggered');
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/lovable-uploads/6721bbed-4f17-4518-8a39-2d4732849214.png',
      badge: '/lovable-uploads/6721bbed-4f17-4518-8a39-2d4732849214.png',
      data: data.url
    });
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data) {
    clients.openWindow(event.notification.data);
  }
});