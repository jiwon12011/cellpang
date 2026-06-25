/* sw.js — core(셸) Cache First + art(런타임 이미지) SWR+LRU 캐시. icon-512 install 제외.
   - CORE: 셸(html/css/js/json) + 타일·핵심 배경 등 즉시 필요한 소수 이미지만 (정적 목록).
   - ART : /assets/ 의 모든 webp/png 런타임 이미지(bg/fx/cells/mascot/map/ui/icons-cell …)
           → stale-while-revalidate + LRU(ART_MAX) 로 무한 증식 방지. */
const CORE = "cellpang-core-v5";
const ART = "cellpang-art-v1";
const ART_MAX = 60;   // LRU 항목 수 (≈5MB 가드)

const CORE_ASSETS = [
  "./", "./index.html", "./styles.css", "./manifest.json",
  "./src/app.js", "./src/router.js", "./src/state.js", "./src/engine.js",
  "./src/input.js", "./src/mission.js", "./src/bg.js", "./src/fx.js",
  "./src/screens/splash.js", "./src/screens/home.js", "./src/screens/map.js",
  "./src/screens/scene.js", "./src/screens/play.js",
  "./src/screens/gallery.js", "./src/screens/report.js",
  "./data/chapter1.json",
  "./assets/tiles/cell-love.webp", "./assets/tiles/cell-passion.webp",
  "./assets/tiles/cell-heart-wish.webp", "./assets/tiles/cell-food.webp",
  "./assets/tiles/cell-logic.webp", "./assets/tiles/cell-sense.webp",
  "./assets/tiles/cell-cloud.webp",
  "./assets/bg/bg-home.webp", "./assets/bg/bg-morning.webp", "./assets/bg/bg-noon.webp",
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
  // 런타임 이미지(art): 동일 출처 /assets/ 하위의 webp/png 전반.
  // bg/·fx/·cells/·mascot/·map/·ui/·icons-cell/ … 대형 이미지를 전부 ART(LRU)로 보낸다.
  // (셸 html/css/js/json·/icons 파비콘은 CORE Cache-First 유지)
  const isArt = url.origin === self.location.origin
    && url.pathname.includes("/assets/")
    && /\.(webp|png|jpe?g)$/i.test(url.pathname);

  if (isArt) {
    e.respondWith(staleWhileRevalidate(req));
  } else {
    // 셸(html/css/js/json): Network-First — 항상 최신을 받고, 오프라인일 때만 캐시 폴백.
    // (코드 수정이 즉시 반영되도록. cache-first 였을 때 옛 버전이 박제되던 문제 해결)
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CORE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
  }
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(ART);
  // 전체 캐시 탐색: ART 적중분 + CORE 에 프리캐시된 타일·핵심배경도 즉시 오프라인 제공.
  const hit = await caches.match(req);
  const fetching = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone()).then(() => trimCache(cache));
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
