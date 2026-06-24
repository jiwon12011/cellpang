/* S4 플레이 — 보드(5×7) + 미션 + 턴 + 감정 게이지 → 결과 분기 */
import * as state from "../state.js";
import { createEngine, CELLS } from "../engine.js";
import { createMission } from "../mission.js";
import { createInput } from "../input.js";

const MISSION_LABEL = {
  fill: (def) => `${CELLS[def.tile].glyph} ${def.target}개`,
  combo_chain: (def) => `연쇄 ${def.target}회`,
  clear_cloud: (def) => `☁ ${def.target}개`,
};

export function createPlay(el, router) {
  el.innerHTML = `
    <header class="topbar">
      <button class="topbar-back" id="playBack" aria-label="나가기">‹</button>
      <h2 class="topbar-title" id="playTitle">플레이</h2>
      <span class="topbar-action"></span>
    </header>
    <div class="stage" id="playStage">
      <div class="stage-cells" id="stageCells"></div>
      <div class="gauge"><div class="gauge-fill" id="gaugeFill"></div></div>
      <span class="gauge-label">감정이 차오른다</span>
    </div>
    <div class="play-hud">
      <div class="hud-mission"><span class="hud-cap">오늘의 마음</span>
        <strong id="hudMission">—</strong></div>
      <div class="hud-moves"><span id="hudMoves">0</span><span class="hud-cap">이동</span></div>
    </div>
    <div class="board" id="playBoard"></div>`;

  const boardEl = el.querySelector("#playBoard");
  const engine = createEngine(boardEl);

  let phase = "idle";      // idle | playing | resolved
  let mission = null, moves = 0, sceneId = null, gauge = 0;
  let input = null;

  createInput(engine, () => phase === "playing");

  // 엔진 이벤트 (한 번만 바인딩, 핸들러는 현재 미션/페이즈 참조)
  engine.on("cascade", (combo) => {
    gauge = Math.min(100, gauge + combo * 14);
    el.querySelector("#gaugeFill").style.width = gauge + "%";
  });
  engine.on("resolveEnd", (maxDepth) => {
    if (phase !== "playing") return;
    if (maxDepth >= 1) { moves--; renderHUD(); }
    setTimeout(evaluate, 60);   // 미션 리스너가 먼저 갱신되도록 한 틱 뒤
  });
  engine.on("shuffled", () => flashStage("막혔어요 — 마을을 다시 섞었어요"));

  function evaluate() {
    if (phase !== "playing") return;
    if (mission?.done) return finishPlay("clear");
    if (moves <= 0) return finishPlay("soft");
  }

  function finishPlay(result) {
    phase = "resolved";
    if (result === "clear") state.markCleared(sceneId);
    else state.markSoftFail(sceneId);
    setTimeout(() => router.replace("result", { sceneId, result }), 520);
  }

  function renderHUD() {
    el.querySelector("#hudMoves").textContent = Math.max(0, moves);
    const def = state.sceneById(sceneId).mission;
    const prog = mission ? mission.progress : 0;
    const lbl = MISSION_LABEL[def.type] ? MISSION_LABEL[def.type](def) : "";
    el.querySelector("#hudMission").innerHTML =
      `${lbl} <span class="hud-prog">(${prog}/${def.target})</span>`;
  }

  function renderStageCells(kinds) {
    el.querySelector("#stageCells").innerHTML = kinds.slice(0, 4)
      .map((k) => `<img src="${CELLS[k].img}" alt="" data-k="${k}">`).join("");
  }

  function flashStage(msg) {
    let f = el.querySelector(".stage-flash");
    if (!f) { f = document.createElement("div"); f.className = "stage-flash";
      el.querySelector("#playStage").appendChild(f); }
    f.textContent = msg; f.classList.remove("show"); void f.offsetWidth; f.classList.add("show");
    setTimeout(() => f.classList.remove("show"), 1500);
  }

  el.querySelector("#playBack").addEventListener("click", () => router.go("map"));

  return {
    onEnter(params) {
      sceneId = params?.sceneId || state.recommendScene();
      const sc = state.sceneById(sceneId);
      state.markVisited(sceneId);
      el.querySelector("#playTitle").textContent = sc.title;
      el.querySelector("#playStage").dataset.band = sc.timeBand;

      gauge = 0; el.querySelector("#gaugeFill").style.width = "0%";
      moves = sc.moves;
      const obstacles = sc.mission.type === "clear_cloud" ? sc.mission.target : 0;

      if (mission?.dispose) mission.dispose();
      mission = createMission(engine, sc.mission, () => renderHUD());
      engine.build({ rows: sc.board.rows, cols: sc.board.cols, tileKinds: sc.tileKinds, obstacles });
      renderStageCells(sc.tileKinds);
      renderHUD();
      phase = "playing";
      // 레이아웃 확정 후 재측정
      requestAnimationFrame(() => engine.measure());
    },
    onLeave() { phase = "idle"; },
  };
}
