/* S1 홈 — 시간대 인사 + 오늘의 한 컷 + "마음 지도 열기" */
import * as state from "../state.js";
import { CELLS } from "../engine.js";

const GREET = {
  morning: "좋은 아침이에요.",
  noon: "출출할 시간이네요.",
  afternoon: "오후의 햇살이에요.",
  night: "긴 하루 끝, 밤이에요.",
};

export function createHome(el, router) {
  el.innerHTML = `
    <div class="home-inner">
      <div class="home-logo">
        <div class="home-cells">
          <img src="${CELLS.love.img}" alt="">
          <img src="${CELLS.food.img}" alt="">
          <img src="${CELLS.logic.img}" alt="">
        </div>
        <h1 class="home-title">세포팡</h1>
        <p class="home-sub" id="homeGreet">오늘의 마음을 돌봐요</p>
      </div>
      <div class="home-cut" id="homeCut"></div>
      <button class="btn-primary" id="homeCta">마음 지도 열기</button>
      <div class="home-links">
        <span class="home-link" id="homeGallery">한 컷 갤러리</span>
        <span class="home-link" id="homeSettings">설정</span>
      </div>
    </div>`;

  el.querySelector("#homeCta").addEventListener("click", () => router.go("map"));
  el.querySelector("#homeGallery").addEventListener("click", () =>
    toast("갤러리는 곧 열려요 ✨"));
  el.querySelector("#homeSettings").addEventListener("click", () =>
    toast("설정은 곧 열려요 ⚙️"));

  return {
    onEnter() {
      const band = state.timeBandNow();
      el.dataset.band = band;
      el.querySelector("#homeGreet").textContent = GREET[band] || "오늘의 마음을 돌봐요";
      const cut = state.lastCut();
      const cutEl = el.querySelector("#homeCut");
      if (cut) {
        const sc = state.sceneById(cut.sceneId);
        cutEl.className = "home-cut has-cut";
        cutEl.innerHTML = `
          <div class="cut-thumb" data-band="${sc?.timeBand || "morning"}">
            <img src="${CELLS.love.img}" alt="">
          </div>
          <div class="cut-meta">
            <span class="cut-label">오늘의 한 컷</span>
            <strong>${sc?.title || "한 컷"}</strong>
          </div>`;
      } else {
        cutEl.className = "home-cut";
        cutEl.innerHTML = `<p class="cut-empty">첫 장면을 시작해 한 컷을 남겨보세요</p>`;
      }
    },
  };
}

function toast(msg) {
  let t = document.getElementById("globalToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "globalToast"; t.className = "global-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1600);
}
export { toast };
