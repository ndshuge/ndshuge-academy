/* 鼠哥学院 PWA Service Worker：缓存优先 + 网络更新（同源页面离线可开） */
var C = 'academy-v1';

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
  if (u.indexOf(self.location.origin) !== 0) return;          // 跨域（CDN 等）不拦截
  e.respondWith(
    caches.open(C).then(function(cache) {
      return cache.match(req).then(function(hit) {
        var network = fetch(req).then(function(resp) {
          if (resp && resp.ok && resp.type === 'basic') {
            try { cache.put(req, resp.clone()); } catch (err) {}
          }
          return resp;
        }).catch(function() { return hit; });
        return hit || network;
      });
    })
  );
});
