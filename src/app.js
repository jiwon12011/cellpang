/* app.js — 앱 부트: 데이터 로드 → 라우터 → 화면 등록 → 시작 */
import { createRouter } from "./router.js";
import * as state from "./state.js";
import { createSplash } from "./screens/splash.js";
import { createHome } from "./screens/home.js";
import { createMap } from "./screens/map.js";
import { createCut } from "./screens/scene.js";
import { createPlay } from "./screens/play.js";
import { createGallery } from "./screens/gallery.js";
import { createReport } from "./screens/report.js";

async function boot() {
  await state.loadChapter();
  state.loadSave();
  state.touchVisit();

  const router = createRouter();
  const el = (id) => document.getElementById(id);

  router.register("splash",  el("screen-splash"),  createSplash(el("screen-splash"), router));
  router.register("home",    el("screen-home"),    createHome(el("screen-home"), router));
  router.register("map",     el("screen-map"),     createMap(el("screen-map"), router));
  router.register("scene",   el("screen-scene"),   createCut(el("screen-scene"), router, "intro"));
  router.register("play",    el("screen-play"),    createPlay(el("screen-play"), router));
  router.register("result",  el("screen-result"),  createCut(el("screen-result"), router, "result"));
  router.register("gallery", el("screen-gallery"), createGallery(el("screen-gallery"), router));
  router.register("report",  el("screen-report"),  createReport(el("screen-report"), router));

  // 첫 진입은 스플래시(딥링크/새로고침도 스플래시로 정리 — 1차 단순성)
  const valid = ["home", "map", "scene", "play", "result", "gallery", "report"];
  const cur = location.hash.replace(/^#/, "");
  if (!cur || cur === "splash" || !valid.includes(cur)) {
    history.replaceState({ name: "splash" }, "", "#splash");
  }
  router.start();
}

boot();

// 서비스워커
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
