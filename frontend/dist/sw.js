/**
 * Service Worker для кэширования и оптимизации
 */

const CACHE_VERSION = 'science-map-v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Ресурсы для кэширования при установке
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css'
];

// API endpoints для кэширования
const CACHEABLE_API_PATTERNS = [
  /^\/api\/health/,
  /^\/api\/search/,
  /^\/api\/graph/
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        // Пропускаем ожидание и активируем сразу
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');
  
  event.waitUntil(
    // Очистка старых кэшей
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        // Немедленно берем контроль над всеми клиентами
        return self.clients.claim();
      })
  );
});

// Обработка fetch запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Обрабатываем только GET запросы
  if (method !== 'GET') {
    return;
  }

  // API запросы
  if (url.includes('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Изображения
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Статические ресурсы
  event.respondWith(handleStaticRequest(request));
});

// Обработка API запросов
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Проверяем, можно ли кэшировать этот API endpoint
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );

  if (!isCacheable) {
    // Не кэшируемые запросы идут напрямую в сеть
    return fetch(request);
  }

  try {
    // Пытаемся получить свежие данные
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Кэшируем успешный ответ
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error);
    
    // Если сеть недоступна, пытаемся вернуть из кэша
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Добавляем заголовок, указывающий что данные из кэша
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-By', 'service-worker-cache');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }
    
    // Если и в кэше нет, возвращаем ошибку
    throw error;
  }
}

// Обработка изображений
async function handleImageRequest(request) {
  // Сначала проверяем кэш
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Загружаем из сети
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Кэшируем изображение
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to load image', error);
    
    // Возвращаем placeholder изображение
    return new Response(
      '<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Image unavailable</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'X-Served-By': 'service-worker-placeholder'
        }
      }
    );
  }
}

// Обработка статических ресурсов
async function handleStaticRequest(request) {
  // Cache First стратегия для статических ресурсов
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
    console.log('Service Worker: Failed to load static resource', error);
    
    // Для HTML файлов возвращаем главную страницу (SPA fallback)
    if (request.destination === 'document') {
      const fallbackResponse = await caches.match('/index.html');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

// Обработка сообщений от клиентов
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
      console.log('Service Worker: Unknown message type', type);
  }
});

// Очистка всех кэшей
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('Service Worker: All caches cleared');
}

// Получение информации о кэшах
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

// Фоновая синхронизация (если поддерживается)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      event.waitUntil(doBackgroundSync());
    }
  });
}

async function doBackgroundSync() {
  console.log('Service Worker: Performing background sync');
  
  // Здесь можно добавить логику для синхронизации данных
  // например, отправка отложенных запросов когда появилась связь
}

// Push уведомления (если нужны)
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

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
