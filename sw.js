/* 세포팡 서비스워커 — 오프라인 캐시 (앱처럼 동작) */
const CACHE = "cellpang-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./game.css",
  "./game.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./assets/cells/love-cell.webp",
  "./assets/cells/logic-cell.webp",
  "./assets/cells/sense-cell.webp",
  "./assets/cells/food-cell.webp",
  "./assets/cells/passion-cell.webp",
  "./assets/cells/heart-wish-cell.webp",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 캐시 우선, 없으면 네트워크 후 캐시에 저장
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => hit);
    })
  );
});
