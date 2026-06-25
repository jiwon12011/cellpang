/* S2 마음 지도 — 하루의 장면 카드 리스트 (깔끔·귀엽게, 실제 캐릭터 아트 사용) */
import * as state from "../state.js";
import { cutThumb } from "./gallery.js";

const BAND_KO = { morning: "아침", noon: "점심", afternoon: "오후", night: "밤" };
const MISSION_KO = { fill: "마음 채우기", combo_chain: "두근두근 연쇄", clear_cloud: "먹구름 걷어내기" };
// 장면 대표 세포(아바타) — 실제 3D 캐릭터 아트
const PRIMARY = { morning: "love", noon: "food", afternoon: "heart-wish", night: "sense" };
const pose = (kind, mood) => `./assets/cells/pose-${kind}-${mood}.webp`;

export function createMap(el, router) {
  el.innerHTML = `
    <header class="topbar">
      <button class="btn-round topbar-back" id="mapBack" aria-label="뒤로">
        <img src="./assets/ui/icons/icon-back.webp" alt=""></button>
      <h2 class="topbar-title">보통의 하루</h2>
      <button class="btn-round topbar-action" id="mapSettings" aria-label="홈">
        <img src="./assets/ui/icons/icon-home.webp" alt=""></button>
    </header>
    <div class="map-head">
      <span class="map-date" id="mapDate"></span>
      <span class="map-chip" id="mapProgress"></span>
    </div>
    <div class="ridge" id="ridge"></div>`;

  el.querySelector("#mapBack").addEventListener("click", () => router.go("home"));
  el.querySelector("#mapSettings").addEventListener("click", () => router.go("home"));

  return {
    onEnter() {
      el.dataset.band = state.timeBandNow();
      el.style.setProperty("--bg", `url(./assets/map/map-chapter1.webp)`);
      const list = state.scenes();
      const today = state.recommendScene();
      el.querySelector("#mapDate").textContent = formatDate();

      const clearedN = list.filter((s) => state.isCleared(s.id)).length;
      el.querySelector("#mapProgress").innerHTML = renderChip(clearedN, list.length);

      const ridge = el.querySelector("#ridge");
      ridge.innerHTML = "";
      list.forEach((sc, i) => ridge.appendChild(buildNode(sc, i, today, router)));
    },
  };
}

function renderChip(n, total) {
  const dots = Array.from({ length: total }, (_, i) =>
    `<i class="cdot${i < n ? " on" : ""}"></i>`).join("");
  return `<span class="chip-dots">${dots}</span><b>${n}/${total} 한 컷</b>`;
}

function buildNode(sc, i, todayId, router) {
  const cleared = state.isCleared(sc.id);
  const unlocked = state.isUnlocked(sc.id);
  const visited = state.record(sc.id)?.visited;
  const isToday = sc.id === todayId;

  let stateClass = "node--locked", tag = `<em class="node-tag locked">잠김</em>`;
  if (cleared) { stateClass = "node--cleared"; tag = `<em class="node-tag done">완료 ✓</em>`; }
  else if (isToday && unlocked) { stateClass = "node--current"; tag = `<em class="node-tag now">지금 하기</em>`; }
  else if (unlocked && visited) { stateClass = "node--revisit"; tag = `<em class="node-tag">다시 하기</em>`; }
  else if (unlocked) { stateClass = "node--open"; tag = `<em class="node-tag">열림</em>`; }

  const kind = PRIMARY[sc.timeBand] || "love";
  const avatar = cleared
    ? `<figure class="node-pola"><img src="${cutThumb(sc.id)}" alt="${sc.title} 한 컷"></figure>`
    : `<div class="node-ava">
         <img src="${pose(kind, unlocked ? "idle" : "sad")}" alt="">
         ${stateClass === "node--current" ? `<span class="node-now-pin">지금</span>` : ""}
       </div>`;

  const wrap = document.createElement("div");
  wrap.className = "node-card " + stateClass;
  wrap.style.setProperty("--i", i);
  wrap.innerHTML = `
    ${avatar}
    <div class="node-label">
      <strong>${BAND_KO[sc.timeBand]} · ${sc.title}</strong>
      <span>${MISSION_KO[sc.mission.type] || ""}</span>
      ${tag}
    </div>`;

  if (unlocked) wrap.addEventListener("click", () => router.go("scene", { sceneId: sc.id, mode: "intro" }));
  return wrap;
}

function formatDate() {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
}
