/* S1 홈 — 시간대 인사 + 오늘의 한 컷 + "마음 지도 열기"
   리스킨: bg-home / wordmark / pose 세포 / 마스코트(정적) / oneCut-frame / 설정 팝업 */
import * as state from "../state.js";
import { homeBg } from "../bg.js";
import { cutThumb } from "./gallery.js";

const GREET = {
  morning: "좋은 아침이에요. 이불 밖으로 한 발만.",
  noon:    "출출할 시간이네요. 점심은 든든히.",
  afternoon: "오후의 햇살이에요. 잠깐 숨 고르기.",
  night:   "긴 하루 끝, 밤이에요. 오늘도 수고했어요.",
};

export function createHome(el, router) {
  el.innerHTML = `
    <div class="home-inner">
      <div class="home-hero">
        <img class="home-logo-img" src="./assets/brand/logo.webp" alt="세포팡">
        <p class="home-sub" id="homeGreet">오늘의 마음을 돌봐요</p>
      </div>

      <img class="home-group" src="./assets/cells/pose-cells-group.webp" alt="유미의 세포들">

      <div class="home-cut" id="homeCut"></div>

      <button class="btn-primary" id="homeCta"><span class="lbl">마음 지도 열기</span></button>
      <div class="home-links">
        <button class="home-link" id="homeGallery">한 컷 갤러리</button>
        <button class="home-link" id="homeReport">오늘의 마음</button>
        <button class="home-link" id="homeSettings">설정</button>
      </div>
    </div>`;

  el.querySelector("#homeCta").addEventListener("click", () => router.go("map"));
  el.querySelector("#homeGallery").addEventListener("click", () => router.go("gallery"));
  el.querySelector("#homeReport").addEventListener("click", () => router.go("report"));
  el.querySelector("#homeSettings").addEventListener("click", openSettings);

  return {
    onEnter() {
      const band = state.timeBandNow();
      el.dataset.band = band;
      el.style.setProperty("--bg", `url(${homeBg()})`);
      el.querySelector("#homeGreet").textContent = GREET[band] || "오늘의 마음을 돌봐요";

      const cut = state.lastCut();
      const cutEl = el.querySelector("#homeCut");
      if (cut) {
        const sc = state.sceneById(cut.sceneId);
        cutEl.className = "home-cut has-cut";
        cutEl.innerHTML = `
          <figure class="cut-thumb oneCut">
            <img src="${cutThumb(cut.sceneId)}" alt="${sc?.title || "오늘의 한 컷"}">
          </figure>
          <div class="cut-meta">
            <span class="cut-label">오늘의 한 컷</span>
            <strong>${sc?.title || "한 컷"}</strong>
            <em class="cut-sub">탭하면 갤러리로</em>
          </div>`;
        cutEl.onclick = () => router.go("gallery");
      } else {
        cutEl.className = "home-cut";
        cutEl.onclick = null;
        cutEl.innerHTML = `
          <img class="cut-empty-art" src="./assets/tiles/face-love.webp" alt="">
          <p class="cut-empty">첫 장면을 시작해<br>한 컷을 남겨보세요</p>`;
      }
    },
  };
}

/* ---- 설정 팝업(box-popup) : 사운드/모션 토글 → state.settings ---- */
function openSettings() {
  const s = state.settings();
  const wrap = document.createElement("div");
  wrap.className = "popup-scrim";
  wrap.innerHTML = `
    <div class="popup box-popup" role="dialog" aria-modal="true" aria-label="설정">
      <h3 class="popup-title">설정</h3>
      <div class="popup-body">
        <button class="setting-row" data-key="sound" aria-pressed="${s.sound}">
          <img src="./assets/ui/icons/icon-${s.sound ? "sound-on" : "sound-off"}.webp" alt="">
          <span>소리</span><b>${s.sound ? "켜짐" : "꺼짐"}</b>
        </button>
        <button class="setting-row" data-key="motion" aria-pressed="${s.motion}">
          <img src="./assets/ui/icons/icon-music.webp" alt="">
          <span>모션 효과</span><b>${s.motion ? "켜짐" : "꺼짐"}</b>
        </button>
      </div>
      <button class="btn-gray popup-close" id="setClose"><span class="lbl">닫기</span></button>
    </div>`;

  wrap.querySelectorAll(".setting-row").forEach((row) => {
    row.addEventListener("click", () => {
      const key = row.dataset.key;
      const next = !state.settings()[key];
      state.setSetting(key, next);
      row.setAttribute("aria-pressed", String(next));
      row.querySelector("b").textContent = next ? "켜짐" : "꺼짐";
      if (key === "sound") row.querySelector("img").src =
        `./assets/ui/icons/icon-${next ? "sound-on" : "sound-off"}.webp`;
    });
  });
  const close = () => wrap.remove();
  wrap.querySelector("#setClose").addEventListener("click", close);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  document.body.appendChild(wrap);
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
