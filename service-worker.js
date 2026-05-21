/* CarRadio Service Worker */
var CACHE = 'carradio-v3';
var SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(SHELL); }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(k) {
      return Promise.all(k.filter(function(x) { return x !== CACHE; }).map(function(x) { return caches.delete(x); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  /* Для MP3: cache-first */
  if (url.pathname.endsWith('.mp3')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
          }
          return res;
        }).catch(function() {
          /* Если нет сети и нет в кеше — тишина */
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  /* Для shell-файлов: cache-first */
  if (SHELL.includes(url.pathname) || url.pathname.startsWith('/icon-') || url.pathname === '/manifest.json') {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request);
      })
    );
    return;
  }

  /* Для всего остального: network-first с fallback в кеш */
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
