/* 鼠哥学院 PWA Service Worker v2：网络优先（有网拿最新，离线回退缓存） */
var C = 'academy-v2';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== C; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = req.url;
  if (u.indexOf(self.location.origin) !== 0) return;
  e.respondWith(
    fetch(req).then(function(resp) {
      if (resp && resp.ok && resp.type === 'basic') {
        try { caches.open(C).then(function(c) { c.put(req, resp.clone()); }); } catch (err) {}
      }
      return resp;
    }).catch(function() {
      return caches.match(req);
    })
  );
});
