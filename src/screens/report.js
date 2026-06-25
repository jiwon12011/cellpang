/* 신규 화면 — 오늘의 마음 리포트
   play 에서 집계한 세포별 매치(state.cellStats/todayMood)로
   "가장 많이 터뜨린 세포 = 오늘의 마음" 카드. (ideator 톤 카피) */
import * as state from "../state.js";

const CELL_KO = {
  love: "사랑세포", passion: "감성세포", "heart-wish": "응큼세포",
  food: "출출세포", logic: "이성세포", sense: "감각세포",
};
const MOOD_COPY = {
  love: "누군가를 많이 떠올린 하루.",
  passion: "감정이 일렁이고 흔들린 하루.",
  "heart-wish": "설렘이 자주 노크한 하루.",
  food: "작은 행복을 부지런히 챙긴 하루.",
  logic: "차분히 중심을 잡아준 하루.",
  sense: "작은 감각 하나를 오래 곱씹은 하루.",
};

export function createReport(el, router) {
  el.innerHTML = `
    <header class="topbar">
      <button class="btn-round topbar-back" id="repBack" aria-label="뒤로">
        <img src="./assets/ui/icons/icon-back.webp" alt=""></button>
      <h2 class="topbar-title">오늘의 마음</h2>
      <button class="btn-round topbar-action" id="repHome" aria-label="홈">
        <img src="./assets/ui/icons/icon-home.webp" alt=""></button>
    </header>
    <div class="report-body" id="reportBody"></div>`;

  el.querySelector("#repBack").addEventListener("click", () => router.back());
  el.querySelector("#repHome").addEventListener("click", () => router.go("home"));

  return {
    onEnter() {
      el.dataset.band = state.timeBandNow();
      el.querySelector("#reportBody").innerHTML = render();
    },
  };
}

function render() {
  const mood = state.todayMood();
  const kind = mood?.kind;
  const stats = state.cellStats();

  if (!kind) {
    return `<div class="report-empty card-soft">
      <img class="report-mascot" src="./assets/mascot/mascot.webp" alt="">
      <p>아직 오늘의 마음이 비어 있어요.<br>한 판 비우고 마음을 들여다봐요.</p>
    </div>`;
  }

  // 오늘 매치 순위(상위 3)
  const ranked = Object.entries(stats)
    .map(([k, v]) => ({ k, n: v.today || 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);
  const rows = ranked.map((x) => `
    <li class="rank-row">
      <img src="./assets/icons-cell/ic-${x.k}.webp" alt="">
      <span>${CELL_KO[x.k]}</span>
      <b>${x.n}</b>
    </li>`).join("");

  return `
    <div class="report-card card-soft">
      <img class="report-mascot" src="./assets/mascot/mascot-cheer.webp" alt="" aria-hidden="true">
      <span class="report-eyebrow">오늘의 마음</span>
      <img class="report-hero" src="./assets/cells/pose-${kind}-happy.webp" alt="${CELL_KO[kind]}">
      <h3 class="report-name">
        <img class="report-badge" src="./assets/icons-cell/badge-${kind}.webp" alt="">
        ${CELL_KO[kind]}
      </h3>
      <p class="report-copy">${MOOD_COPY[kind] || "오늘도 마음을 돌봤어요."}</p>
      <ul class="report-rank">${rows}</ul>
      <!-- 오늘의 선물: 순수 장식(기능 없음). chest/gift/gem/key 정적 소진 -->
      <div class="report-gifts" aria-hidden="true">
        <span class="report-gifts-cap">오늘의 작은 선물</span>
        <div class="report-gifts-row">
          <img src="./assets/ui/chest-closed.webp" alt="">
          <img src="./assets/ui/gift-box.webp" alt="">
          <img src="./assets/ui/gem.webp" alt="">
          <img src="./assets/ui/key.webp" alt="">
        </div>
      </div>
    </div>`;
}
