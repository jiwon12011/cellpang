/* S4 플레이 — 보드(5×7) + 미션 + 턴 + 감정 게이지 → 결과 분기 (이미지 리스킨) */
import * as state from "../state.js";
import { createEngine } from "../engine.js";
import { createMission } from "../mission.js";
import { createInput } from "../input.js";
import { boardBg } from "../bg.js";
import * as fx from "../fx.js";

const MISSION_LABEL = {
  fill: (def) => `${def.target}개 모으기`,
  combo_chain: (def) => `연쇄 ${def.target}회`,
  clear_cloud: (def) => `먹구름 ${def.target}개`,
};
function missionIcon(def) {
  if (def.type === "fill") return `./assets/tiles/face-${def.tile}.webp`;
  if (def.type === "combo_chain") return `./assets/tiles/face-heart-wish.webp`;
  return `./assets/tiles/cell-cloud.webp`; // clear_cloud
}
// 장면 대표 세포(HUD 보드 중앙 소켓에 들어갈 얼굴)
const PRIMARY = { morning: "love", noon: "food", afternoon: "heart-wish", night: "sense" };

export function createPlay(el, router) {
  el.innerHTML = `
    <header class="topbar play-topbar">
      <button class="icon-btn" id="playBack" aria-label="나가기">
        <img src="./assets/ui/icons/icon-back.webp" alt=""></button>
      <h2 class="topbar-title" id="playTitle">플레이</h2>
      <button class="icon-btn" id="playPause" aria-label="일시정지">
        <img src="./assets/ui/kit/pause.webp" alt=""></button>
    </header>

    <!-- 리치 HUD 보드: 중앙 소켓=대표 세포 / 좌=미션 / 우=이동 / 하단 별바=게이지 -->
    <div class="hud-board" id="hudBoard">
      <div class="hud-slot hud-mission">
        <img class="hud-mission-ic" id="hudMissionIc" src="" alt="">
        <strong id="hudMission">—</strong>
      </div>
      <div class="hud-cell">
        <img id="hudCell" src="" alt="" aria-hidden="true">
        <img class="stage-cheer" src="./assets/mascot/mascot-cheer.webp" alt="" aria-hidden="true" hidden>
      </div>
      <div class="hud-slot hud-moves">
        <span id="hudMoves">0</span><em>이동</em>
      </div>
      <div class="hud-bar" aria-hidden="true"><div class="hud-bar-fill" id="gaugeFill"></div></div>
    </div>

    <div class="board" id="playBoard"></div>`;

  const boardEl = el.querySelector("#playBoard");
  const engine = createEngine(boardEl);

  // 보드 위 FX 레이어(절대배치, --z-fx) — burst/콤보 배너가 여기에 뜬다.
  // engine.build 는 .tile 만 제거하므로 이 레이어는 유지된다(1회 생성).
  const fxLayer = document.createElement("div");
  fxLayer.className = "fx-layer";
  boardEl.appendChild(fxLayer);

  let phase = "idle";
  let mission = null, moves = 0, sceneId = null, gauge = 0;

  createInput(engine, () => phase === "playing");

  engine.on("cascade", (combo) => {
    gauge = Math.min(100, gauge + combo * 14);
    el.querySelector("#gaugeFill").style.width = gauge + "%";
    // 콤보 배너(+큰 콤보 shockwave) — combo>=2
    fx.comboBanner(fxLayer, combo, boardEl, engine.cols, engine.rows);
  });
  // 오늘의 마음 집계 + 세포별 burst FX
  engine.on("match", (cleared) => {
    cleared.forEach((t) => state.addCellMatch(t.kind));
    fx.burstMatch(fxLayer, boardEl, cleared, engine.cols, engine.rows);
  });
  engine.on("resolveEnd", (maxDepth) => {
    if (phase !== "playing") return;
    if (maxDepth >= 1) { moves--; renderHUD(); }
    setTimeout(evaluate, 60);
  });
  engine.on("shuffled", () => flashStage("막혔어요 — 마을을 다시 섞었어요"));

  function evaluate() {
    if (phase !== "playing") return;
    if (mission?.done) return finishPlay("clear");
    if (moves <= 0) return finishPlay("soft");
  }

  function finishPlay(result) {
    phase = "resolved";
    if (result === "clear") {
      state.markCleared(sceneId);
      el.querySelector(".stage-cheer").hidden = false; // 마스코트 등장(CSS: cheerIn)
    } else state.markSoftFail(sceneId);
    state.commitTodayMood();

    if (result === "clear") {
      // ⭐시그니처: 수면 아래 마을로 가라앉는 전환.
      // 오버레이가 화면을 덮은 순간(onCovered) play→result 를 교체해 깜빡임 없이 reveal.
      const tone = fx.diveTone(state.sceneById(sceneId));
      fx.diveTransition(tone, () => router.replace("result", { sceneId, result }));
    } else {
      // soft_fail: 기존 차분한 타이밍 유지(시그니처 전환 없음)
      setTimeout(() => router.replace("result", { sceneId, result }), 520);
    }
  }

  function renderHUD() {
    el.querySelector("#hudMoves").textContent = Math.max(0, moves);
    const def = state.sceneById(sceneId).mission;
    const prog = mission ? mission.progress : 0;
    const lbl = MISSION_LABEL[def.type] ? MISSION_LABEL[def.type](def) : "";
    el.querySelector("#hudMissionIc").src = missionIcon(def);
    el.querySelector("#hudMission").innerHTML =
      `${lbl} <span class="hud-prog">(${prog}/${def.target})</span>`;
  }

  function flashStage(msg) {
    let f = el.querySelector(".stage-flash");
    if (!f) { f = document.createElement("div"); f.className = "stage-flash";
      el.querySelector(".board").appendChild(f); }
    f.textContent = msg; f.classList.remove("show"); void f.offsetWidth; f.classList.add("show");
    setTimeout(() => f.classList.remove("show"), 1500);
  }

  el.querySelector("#playBack").addEventListener("click", () => router.go("map"));
  el.querySelector("#playPause").addEventListener("click", () =>
    openPause(router, sceneId, () => { phase = "playing"; }));

  return {
    onEnter(params) {
      sceneId = params?.sceneId || state.recommendScene();
      const sc = state.sceneById(sceneId);
      state.markVisited(sceneId);
      el.querySelector("#playTitle").textContent = sc.title;
      el.dataset.band = sc.timeBand;
      el.querySelector(".stage-cheer").hidden = true;
      // HUD 보드 중앙 소켓 = 장면 대표 세포 얼굴
      el.querySelector("#hudCell").src = `./assets/tiles/face-${PRIMARY[sc.timeBand] || "love"}.webp`;

      // 보드 배경(시간대/장소) — 화면당 1장만 로드
      boardEl.style.backgroundImage = `url(${boardBg(sc)})`;

      gauge = 0; el.querySelector("#gaugeFill").style.width = "0%";
      moves = sc.moves;
      const obstacles = sc.mission.type === "clear_cloud" ? sc.mission.target : 0;
      const obstacleType = sc.mission.obstacle || "cloud";

      if (mission?.dispose) mission.dispose();
      mission = createMission(engine, sc.mission, () => renderHUD());
      engine.build({ rows: sc.board.rows, cols: sc.board.cols, tileKinds: sc.tileKinds, obstacles, obstacleType });
      renderHUD();
      phase = "playing";
      requestAnimationFrame(() => engine.measure());
    },
    onLeave() { phase = "idle"; },
  };
}

/* 일시정지 팝업(box-popup) : 계속/재시작/홈/소리 */
function openPause(router, sceneId, onResume) {
  const s = state.settings();
  const wrap = document.createElement("div");
  wrap.className = "popup-scrim";
  wrap.innerHTML = `
    <div class="popup box-popup" role="dialog" aria-modal="true" aria-label="일시정지">
      <h3 class="popup-title">잠깐 쉬어가요</h3>
      <div class="pause-grid">
        <button class="btn-round pause-btn" data-act="resume" aria-label="계속">
          <img src="./assets/ui/icons/icon-play.webp" alt=""></button>
        <button class="btn-round pause-btn" data-act="restart" aria-label="다시 시작">
          <img src="./assets/ui/icons/icon-restart.webp" alt=""></button>
        <button class="btn-round pause-btn" data-act="home" aria-label="홈">
          <img src="./assets/ui/icons/icon-home.webp" alt=""></button>
        <button class="btn-round pause-btn" data-act="sound" aria-label="소리">
          <img id="pauseSound" src="./assets/ui/icons/icon-sound-${s.sound ? "on" : "off"}.webp" alt=""></button>
      </div>
      <button class="btn-green popup-close" data-act="resume"><span class="lbl">계속하기</span></button>
    </div>`;

  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn && e.target === wrap) { close(); onResume?.(); return; }
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "resume") { close(); onResume?.(); }
    else if (act === "restart") { close(); router.replace("scene", { sceneId, mode: "intro" }); }
    else if (act === "home") { close(); router.go("home"); }
    else if (act === "sound") {
      const next = !state.settings().sound;
      state.setSetting("sound", next);
      wrap.querySelector("#pauseSound").src = `./assets/ui/icons/icon-sound-${next ? "on" : "off"}.webp`;
    }
  });
  document.body.appendChild(wrap);
}
