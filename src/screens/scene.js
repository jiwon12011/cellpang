/* S3 진입 컷 / S5 결과·엔딩 컷 — 공용 컷 시퀀서 (kind: 'intro' | 'result') */
import * as state from "../state.js";
import { CELLS } from "../engine.js";

export function createCut(el, router, kind) {
  el.innerHTML = `
    <div class="cut" id="cutRoot">
      <button class="cut-skip" id="cutSkip">건너뛰기 ›</button>
      <div class="cut-illust" id="cutIllust"></div>
      <div class="cut-bubble" id="cutBubble"></div>
      <div class="cut-band">
        <p class="cut-narration" id="cutNarr"></p>
        <div class="cut-dots" id="cutDots"></div>
        <div class="cut-actions" id="cutActions"></div>
      </div>
    </div>`;

  let frames = [], idx = 0, sceneId = null, band = "morning", result = null;
  const root = el.querySelector("#cutRoot");
  const illust = el.querySelector("#cutIllust");
  const bubble = el.querySelector("#cutBubble");
  const narr = el.querySelector("#cutNarr");
  const dots = el.querySelector("#cutDots");
  const actions = el.querySelector("#cutActions");
  const skip = el.querySelector("#cutSkip");

  function render() {
    const f = frames[idx];
    illust.dataset.band = band;
    actions.innerHTML = "";
    const last = idx === frames.length - 1;

    // 일러스트(대표 세포 한 컷)
    const cellKind = f.cell || "love";
    illust.innerHTML = `<img class="cut-cell" src="${CELLS[cellKind]?.img || CELLS.love.img}" alt="">`;
    illust.classList.toggle("dim", result === "soft");   // soft_fail = 흐린 한 컷

    // 말풍선 / 내레이션
    if (f.text) {
      bubble.style.display = "";
      bubble.innerHTML = `<span class="bubble-speaker">${f.speaker || ""}</span>${f.text}`;
    } else { bubble.style.display = "none"; }
    narr.textContent = f.narration || "";

    // 인디케이터
    dots.innerHTML = frames.map((_, i) =>
      `<span class="dot${i === idx ? " on" : ""}"></span>`).join("");

    // 마지막 프레임 → 액션 버튼
    if (last) {
      skip.style.display = "none";
      actions.innerHTML = buttonsFor();
      wireButtons();
    } else {
      skip.style.display = "";
    }
    // 애니메이션 재시작
    root.classList.remove("cut-anim"); void root.offsetWidth; root.classList.add("cut-anim");
  }

  function buttonsFor() {
    if (kind === "intro") return `<button class="btn-primary" data-act="start">시작</button>`;
    if (result === "clear")
      return `<button class="btn-primary" data-act="map">다음 장면</button>
              <button class="btn-text" data-act="retry">한 번 더</button>`;
    return `<button class="btn-primary" data-act="retry">한 번 더</button>
            <button class="btn-text" data-act="map">지도로</button>`;
  }

  function wireButtons() {
    actions.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === "start") router.go("play", { sceneId });
        else if (act === "map") router.go("map");
        else if (act === "retry") router.go("scene", { sceneId, mode: "intro" });
      }));
  }

  function advance() {
    if (idx < frames.length - 1) { idx++; render(); }
  }
  function finish() { idx = frames.length - 1; render(); }

  root.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    advance();
  });
  skip.addEventListener("click", (e) => { e.stopPropagation(); finish(); });

  return {
    onEnter(params) {
      sceneId = params?.sceneId || state.recommendScene();
      const sc = state.sceneById(sceneId);
      band = sc?.timeBand || "morning";
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
