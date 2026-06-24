/* app.js — 앱 부트: 데이터 로드 → 라우터 → 화면 등록 → 시작 */
import { createRouter } from "./router.js";
import * as state from "./state.js";
import { createHome } from "./screens/home.js";
import { createMap } from "./screens/map.js";
import { createCut } from "./screens/scene.js";
import { createPlay } from "./screens/play.js";

async function boot() {
  await state.loadChapter();
  state.loadSave();
  state.touchVisit();

  const router = createRouter();
  const el = (id) => document.getElementById(id);

  router.register("home",   el("screen-home"),   createHome(el("screen-home"), router));
  router.register("map",    el("screen-map"),    createMap(el("screen-map"), router));
  router.register("scene",  el("screen-scene"),  createCut(el("screen-scene"), router, "intro"));
  router.register("play",   el("screen-play"),   createPlay(el("screen-play"), router));
  router.register("result", el("screen-result"), createCut(el("screen-result"), router, "result"));

  // 시작 화면은 항상 홈 (딥링크 진입도 홈으로 정리 — 1차 단순성)
  if (location.hash && location.hash !== "#home") {
    history.replaceState({ name: "home" }, "", "#home");
  }
  router.start();
}

boot();

// 서비스워커
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
