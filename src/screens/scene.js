/* S3 진입 컷 / S5 결과·엔딩 컷 — 공용 컷 시퀀서 (kind: 'intro' | 'result')
   리스킨: cuts/{band}-{intro|clear} 일러 / bubble-frame / portrait / scroll-parchment
   결과: box-result + ribbon-clear|fail + star-on/off (오버레이) */
import * as state from "../state.js";
import { sceneBg } from "../bg.js";
import * as fx from "../fx.js";

const CUT_BAND = { morning: "morning", noon: "lunch", afternoon: "afternoon", night: "night" };
const cutArt = (band, phase) => `./assets/cuts/${CUT_BAND[band] || "morning"}-${phase}.webp`;
// 화자 → 초상(없으면 yumi). 응큼세포는 babi.
const PORTRAIT = { "응큼세포": "babi", "사랑세포": "yumi", "감각세포": "gu-woong" };
const portraitFor = (sp) => `./assets/icons-cell/portrait-${PORTRAIT[sp] || "yumi"}.webp`;

export function createCut(el, router, kind) {
  el.innerHTML = `
    <div class="cut" id="cutRoot">
      <button class="cut-skip" id="cutSkip">건너뛰기 ›</button>
      <div class="cut-illust" id="cutIllust"></div>
      <!-- 게스트 마스코트(정적 배치, 등장 모션은 motion-engineer) -->
      <img class="cut-guest" id="cutGuest" alt="" aria-hidden="true" hidden>
      <div class="cut-bubble bubble-img" id="cutBubble"></div>
      <div class="cut-band scroll-parchment">
        <p class="cut-narration" id="cutNarr"></p>
        <div class="cut-dots" id="cutDots"></div>
        <div class="cut-actions" id="cutActions"></div>
      </div>
      <!-- 결과 오버레이(box-result) -->
      <div class="result-overlay" id="resultOverlay" hidden></div>
    </div>`;

  let frames = [], idx = 0, sceneId = null, band = "morning", result = null, sc = null;
  const root = el.querySelector("#cutRoot");
  const illust = el.querySelector("#cutIllust");
  const guest = el.querySelector("#cutGuest");
  const bubble = el.querySelector("#cutBubble");
  const narr = el.querySelector("#cutNarr");
  const dots = el.querySelector("#cutDots");
  const actions = el.querySelector("#cutActions");
  const overlay = el.querySelector("#resultOverlay");
  const skip = el.querySelector("#cutSkip");

  function phaseArt() {
    if (kind === "intro") return "intro";
    return result === "clear" ? "clear" : "intro"; // soft = intro 아트 + dim
  }

  function render() {
    const f = frames[idx];
    const last = idx === frames.length - 1;
    illust.dataset.band = band;
    actions.innerHTML = "";
    overlay.hidden = true; overlay.innerHTML = "";

    // 컷 일러스트
    illust.innerHTML = `<img class="cut-cell" src="${cutArt(band, phaseArt())}" alt="">`;
    illust.classList.toggle("dim", result === "soft");

    // 게스트 마스코트: heart 이벤트 인트로=gu-woong, 밤 위로(soft)=babi
    let g = null;
    if (kind === "intro" && sc?.event === "heart") g = "gu-woong";
    else if (kind === "result" && result === "soft" && band === "night") g = "babi";
    if (g) { guest.src = `./assets/mascot/${g}.webp`; guest.hidden = false; }
    else { guest.hidden = true; }

    // 말풍선 / 내레이션
    if (f.text) {
      bubble.style.display = "";
      bubble.innerHTML = `
        <img class="bubble-portrait" src="${portraitFor(f.speaker)}" alt="">
        <div class="bubble-text"><span class="bubble-speaker">${f.speaker || ""}</span>${f.text}</div>`;
    } else { bubble.style.display = "none"; }
    narr.textContent = f.narration || "";

    dots.innerHTML = frames.map((_, i) => `<span class="dot${i === idx ? " on" : ""}"></span>`).join("");

    if (last) {
      skip.style.display = "none";
      if (kind === "result") renderResultOverlay();
      else { actions.innerHTML = buttonsFor(); wireButtons(actions); }
    } else {
      skip.style.display = "";
    }
    root.classList.remove("cut-anim"); void root.offsetWidth; root.classList.add("cut-anim");
  }

  function renderResultOverlay() {
    const win = result === "clear";
    const stars = win ? 3 : 1;
    overlay.innerHTML = `
      <div class="result-fx" aria-hidden="true"></div>
      <div class="box-result result-card">
        <img class="result-ribbon" src="./assets/ui/ribbon-${win ? "clear" : "fail"}.webp"
             alt="${win ? "클리어" : "아쉽지만 괜찮아요"}">
        <div class="result-stars" aria-label="별 ${stars}개">
          ${[0, 1, 2].map((i) =>
            `<img src="./assets/ui/star-${i < stars ? "on" : "off"}.webp" alt="">`).join("")}
        </div>
        <p class="result-line">${narr.textContent}</p>
        <div class="result-actions">${buttonsFor()}</div>
      </div>`;
    overlay.hidden = false;
    wireButtons(overlay);
    // 컨페티 + level-clear (clear 만). soft_fail 은 잔잔하게 — FX 없음.
    if (win) fx.resultConfetti(overlay.querySelector(".result-fx"));
  }

  function buttonsFor() {
    if (kind === "intro")
      return `<button class="btn-primary" data-act="start"><span class="lbl">시작</span></button>`;
    if (result === "clear")
      return `<button class="btn-yellow" data-act="mood"><span class="lbl">오늘의 마음</span></button>
              <button class="btn-blue" data-act="map"><span class="lbl">지도로</span></button>
              <button class="btn-gray" data-act="retry"><span class="lbl">한 번 더</span></button>`;
    return `<button class="btn-primary" data-act="retry"><span class="lbl">한 번 더</span></button>
            <button class="btn-gray" data-act="map"><span class="lbl">지도로</span></button>`;
  }

  function wireButtons(scope) {
    scope.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === "start") router.go("play", { sceneId });
        else if (act === "map") router.go("map");
        else if (act === "mood") router.go("report");
        else if (act === "retry") router.go("scene", { sceneId, mode: "intro" });
      }));
  }

  function advance() { if (idx < frames.length - 1) { idx++; render(); } }
  function finish() { idx = frames.length - 1; render(); }

  root.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (!overlay.hidden) return; // 결과 오버레이 떠 있으면 진행 잠금
    advance();
  });
  skip.addEventListener("click", (e) => { e.stopPropagation(); finish(); });

  return {
    onEnter(params) {
      sceneId = params?.sceneId || state.recommendScene();
      sc = state.sceneById(sceneId);
      band = sc?.timeBand || "morning";
      el.style.setProperty("--bg", `url(${sceneBg(sc)})`);
      if (kind === "intro") {
        frames = sc?.intro || [{ narration: "..." }];
        result = null;
      } else {
        result = params?.result || "clear";
        frames = (result === "clear" ? sc?.endingClear : sc?.endingSoft) || [{ narration: "..." }];
      }
      el.dataset.band = band;
      idx = 0;
      render();
    },
  };
}
