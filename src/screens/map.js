/* S2 마음 지도 — 하루 능선(지그재그) + 4상태 노드 */
import * as state from "../state.js";
import { CELLS } from "../engine.js";

const BAND_ICON = { morning: "🌅", noon: "☀️", afternoon: "🌇", night: "🌙" };
const BAND_KO = { morning: "아침", noon: "점심", afternoon: "오후", night: "밤" };
const MISSION_KO = { fill: "마음 채우기", combo_chain: "두근두근 연쇄", clear_cloud: "먹구름 걷어내기" };

export function createMap(el, router) {
  el.innerHTML = `
    <header class="topbar">
      <button class="topbar-back" id="mapBack" aria-label="뒤로">‹</button>
      <h2 class="topbar-title">보통의 하루</h2>
      <button class="topbar-action" id="mapSettings" aria-label="설정">⚙</button>
    </header>
    <div class="map-head">
      <span class="map-date" id="mapDate"></span>
      <span class="map-chip" id="mapProgress"></span>
    </div>
    <div class="ridge" id="ridge"></div>`;

  el.querySelector("#mapBack").addEventListener("click", () => router.back());
  el.querySelector("#mapSettings").addEventListener("click", () => {});

  return {
    onEnter() {
      el.dataset.band = state.timeBandNow();
      const list = state.scenes();
      const today = state.recommendScene();
      el.querySelector("#mapDate").textContent = formatDate();
      const clearedN = list.filter((s) => state.isCleared(s.id)).length;
      el.querySelector("#mapProgress").textContent = `${clearedN} / ${list.length} 한 컷`;

      const ridge = el.querySelector("#ridge");
      ridge.innerHTML = "";
      list.forEach((sc, i) => {
        const node = buildNode(sc, i, today, router);
        ridge.appendChild(node);
      });
    },
  };
}

function buildNode(sc, i, todayId, router) {
  const cleared = state.isCleared(sc.id);
  const unlocked = state.isUnlocked(sc.id);
  const visited = state.record(sc.id)?.visited;
  const isToday = sc.id === todayId;

  const wrap = document.createElement("div");
  wrap.className = "node-wrap " + (i % 2 ? "node-right" : "node-left");
  wrap.style.setProperty("--i", i);

  let stateClass = "node--locked";
  if (cleared) stateClass = "node--cleared";
  else if (isToday && unlocked) stateClass = "node--current";
  else if (unlocked && visited) stateClass = "node--revisit";
  else if (unlocked) stateClass = "node--open";

  const inner = cleared
    ? `<div class="polaroid" data-band="${sc.timeBand}">
         <img src="${CELLS.love.img}" alt="">
         <span class="polaroid-cap">${sc.title}</span>
         <span class="node-badge">✓</span>
       </div>`
    : `<div class="node-circle" data-band="${sc.timeBand}">
         <span class="node-icon">${BAND_ICON[sc.timeBand] || "•"}</span>
         ${isToday && unlocked ? `<span class="node-now">지금</span>` : ""}
         ${stateClass === "node--locked" ? `<span class="node-lock">🔒</span>` : ""}
       </div>`;

  wrap.innerHTML = `
    ${inner}
    <div class="node-label">
      <strong>${BAND_KO[sc.timeBand]} · ${sc.title}</strong>
      <span>${MISSION_KO[sc.mission.type] || ""}</span>
      ${stateClass === "node--locked" ? `<em>아직 잠겨 있어요</em>` : ""}
    </div>`;
  wrap.classList.add(stateClass);

  if (unlocked) {
    wrap.addEventListener("click", () => router.go("scene", { sceneId: sc.id, mode: "intro" }));
  }
  return wrap;
}

function formatDate() {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
}
