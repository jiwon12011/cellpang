/* 신규 화면 — 한 컷 갤러리 + 세포 도감(탭 통합)
   - 한 컷: 수집한 컷(state.collectedCuts)을 cuts/{band}-clear 썸네일로 필름스트립에
   - 도감: 6세포 표정 수집(한 번이라도 만난 세포는 happy 표정, 아니면 slot-empty) */
import * as state from "../state.js";

// 시간대 → 컷 파일 밴드(noon은 lunch 파일명)
const CUT_BAND = { morning: "morning", noon: "lunch", afternoon: "afternoon", night: "night" };

// sceneId → 보상 컷 썸네일 경로 (home/map 에서도 재사용)
export function cutThumb(sceneId) {
  const sc = state.sceneById(sceneId);
  const band = CUT_BAND[sc?.timeBand] || "morning";
  return `./assets/cuts/${band}-clear.webp`;
}

const CELLS_ORDER = ["love", "passion", "heart-wish", "food", "logic", "sense"];
const CELL_KO = {
  love: "사랑세포", passion: "감성세포", "heart-wish": "응큼세포",
  food: "출출세포", logic: "이성세포", sense: "감각세포",
};
// 표정 4종 — face-{kind}-{mood}.webp 24장 전부 참조
const MOODS = ["happy", "sad", "sleepy", "wow"];
const MOOD_KO = { happy: "활짝", sad: "시무룩", sleepy: "노곤", wow: "반짝" };

export function createGallery(el, router) {
  el.innerHTML = `
    <header class="topbar">
      <button class="btn-round topbar-back" id="galBack" aria-label="뒤로">
        <img src="./assets/ui/icons/icon-back.webp" alt=""></button>
      <h2 class="topbar-title">한 컷 보관함</h2>
      <span class="topbar-action" aria-hidden="true"></span>
    </header>

    <div class="gal-tabs" role="tablist">
      <button class="gal-tab is-on" id="tabCuts" role="tab" aria-selected="true">한 컷</button>
      <button class="gal-tab" id="tabDex" role="tab" aria-selected="false">세포 도감</button>
    </div>

    <div class="gal-body" id="galBody"></div>`;

  el.querySelector("#galBack").addEventListener("click", () => router.back());
  const body = el.querySelector("#galBody");
  const tabCuts = el.querySelector("#tabCuts");
  const tabDex = el.querySelector("#tabDex");

  function setTab(which) {
    const cuts = which === "cuts";
    tabCuts.classList.toggle("is-on", cuts);
    tabDex.classList.toggle("is-on", !cuts);
    tabCuts.setAttribute("aria-selected", String(cuts));
    tabDex.setAttribute("aria-selected", String(!cuts));
    body.innerHTML = cuts ? renderCuts() : renderDex();
  }
  tabCuts.addEventListener("click", () => setTab("cuts"));
  tabDex.addEventListener("click", () => setTab("dex"));

  return { onEnter() { el.dataset.band = state.timeBandNow(); setTab("cuts"); } };
}

function renderCuts() {
  const got = state.collectedCuts();
  const list = state.scenes();
  const newest = got[got.length - 1]?.sceneId;
  // 장면 순서대로 슬롯: 수집했으면 컷 썸네일, 아니면 빈 슬롯
  const slots = list.map((sc) => {
    const owned = got.some((c) => c.sceneId === sc.id);
    if (!owned) {
      return `<figure class="film-slot empty">
        <span class="slot-ph"></span>
        <figcaption>아직 못 남긴 한 컷</figcaption></figure>`;
    }
    const isNew = sc.id === newest;
    return `<figure class="film-slot oneCut">
      ${isNew ? `<span class="badge-new">NEW</span>` : ""}
      <img class="film-cut" src="${cutThumb(sc.id)}" alt="${sc.title} 한 컷">
      <figcaption>${sc.title}</figcaption></figure>`;
  }).join("");
  const n = got.length;
  return `<p class="gal-count">${n} / ${list.length} 한 컷을 모았어요</p>
    <div class="film-strip">${slots}</div>`;
}

function renderDex() {
  // 세포별로 4표정(happy/sad/sleepy/wow) 한 줄. 만난 세포는 4표정 모두 공개, 아니면 빈 슬롯.
  const sections = CELLS_ORDER.map((kind) => {
    const met = state.isCellMet(kind);
    const faces = MOODS.map((mood) => {
      if (!met) {
        return `<figure class="dex-card locked">
          <span class="dex-face ph"></span>
          <figcaption>아직</figcaption></figure>`;
      }
      return `<figure class="dex-card">
        <img class="dex-face" src="./assets/icons-cell/face-${kind}-${mood}.webp"
             alt="${CELL_KO[kind]} ${MOOD_KO[mood]} 표정">
        <figcaption>${MOOD_KO[mood]}</figcaption></figure>`;
    }).join("");
    return `<section class="dex-cell">
      <header class="dex-cell-head">
        <img src="./assets/icons-cell/badge-${kind}.webp" alt="">
        <strong>${CELL_KO[kind]}</strong>
        ${met ? "" : `<span class="dex-cell-hint">아직 못 만난 표정 — 언젠가 보게 될 거예요</span>`}
      </header>
      <div class="dex-faces">${faces}</div>
    </section>`;
  }).join("");
  return `<div class="dex-hero"><img src="./assets/cells/pose-cells-group.webp" alt="유미의 세포들"></div>
    ${sections}`;
}
