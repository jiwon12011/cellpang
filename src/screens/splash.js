/* 신규 화면 — 스플래시: 로딩 마을 일러 + 로고 + spinner, 핵심 에셋 preload 게이트 */
import { homeBg } from "../bg.js";

const PRELOAD = [
  homeBg(),
  "./assets/brand/logo.webp",
  "./assets/cells/pose-cells-group.webp",
  "./assets/ui/hud-board.webp",
  "./assets/tiles/face-love.webp",
  "./assets/tiles/face-food.webp",
  "./assets/tiles/face-logic.webp",
];

export function createSplash(el, router) {
  el.innerHTML = `
    <div class="splash">
      <img class="splash-art" src="./assets/bg/loading-village.webp" alt="세포팡">
      <div class="splash-fade"></div>
      <img class="splash-logo" src="./assets/brand/logo.webp" alt="세포팡">
      <img class="splash-spinner" src="./assets/generated/cellpang-ui-kit/icons/icon-04.png" alt="" aria-hidden="true">
    </div>`;

  let advanced = false;
  return {
    onEnter() {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      // 핵심 에셋 preload (게이트는 가볍게 — 최대 대기시간 안에 통과)
      PRELOAD.forEach((src) => { const i = new Image(); i.src = src; });
      const delay = reduce ? 150 : 1400;
      clearTimeout(this._t);
      this._t = setTimeout(() => {
        if (advanced) return;
        advanced = true;
        router.replace("home");
      }, delay);
    },
  };
}
