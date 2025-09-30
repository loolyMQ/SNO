
const CACHE_VERSION = 'science-map-v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css'
];

const CACHEABLE_API_PATTERNS = [
  /^\/api\/health/,
  /^\/api\/search/,
  /^\/api\/graph/
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  
  if (method !== 'GET') {
    return;
  }

  
  if (url.includes('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  
  event.respondWith(handleStaticRequest(request));
});

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );

  if (!isCacheable) {
    
    return fetch(request);
  }

  try {
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-By', 'service-worker-cache');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }
    
    
    throw error;
  }
}

async function handleImageRequest(request) {
  
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    
    
    return new Response(
      '<svg width="200" height="150" xmlns="http:
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'X-Served-By': 'service-worker-placeholder'
        }
      }
    );
  }
}

async function handleStaticRequest(request) {
  
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    
    
    if (request.destination === 'document') {
      const fallbackResponse = await caches.match('/index.html');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then((info) => {
        event.ports[0].postMessage(info);
      });
      break;
      
    default:
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    info[cacheName] = {
      count: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return info;
}

if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      event.waitUntil(doBackgroundSync());
    }
  });
}

async function doBackgroundSync() {
  
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
