/* sw.js — core(셸) Cache First + art(일러) 런타임 캐시. icon-512 install 제외. */
const CORE = "cellpang-core-v2";
const ART = "cellpang-art-v1";
const ART_MAX = 60;   // LRU 항목 수 (≈5MB 가드)

const CORE_ASSETS = [
  "./", "./index.html", "./styles.css", "./manifest.json",
  "./src/app.js", "./src/router.js", "./src/state.js", "./src/engine.js",
  "./src/input.js", "./src/mission.js",
  "./src/screens/home.js", "./src/screens/map.js", "./src/screens/scene.js", "./src/screens/play.js",
  "./data/chapter1.json",
  "./assets/tiles/cell-love.webp", "./assets/tiles/cell-passion.webp",
  "./assets/tiles/cell-heart-wish.webp", "./assets/tiles/cell-food.webp",
  "./assets/tiles/cell-logic.webp", "./assets/tiles/cell-sense.webp",
  "./assets/tiles/cell-cloud.webp",
  "./assets/bg/bg-morning.webp", "./assets/bg/bg-noon.webp",
  "./assets/bg/bg-afternoon.webp", "./assets/bg/bg-night.webp",
  "./icons/icon-192.png", "./icons/icon-180.png", "./icons/favicon-32.png",
  "./favicon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CORE && k !== ART).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isArt = /\/(cuts|illust|maps)\//.test(url.pathname);   // 향후 일러 폴더

  if (isArt) {
    e.respondWith(staleWhileRevalidate(req));
  } else {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CORE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
  }
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(ART);
  const hit = await cache.match(req);
  const fetching = fetch(req).then((res) => {
    cache.put(req, res.clone()).then(() => trimCache(cache));
    return res;
  }).catch(() => hit);
  return hit || fetching;
}

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > ART_MAX) {
    for (let i = 0; i < keys.length - ART_MAX; i++) await cache.delete(keys[i]);
  }
}
