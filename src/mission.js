/* mission.js — 미션 목표 판정 (engine 이벤트 구독). 점수 아님.
   타입: fill(특정 세포 N매치) / combo_chain(연쇄 N회) / clear_cloud(방해물 전부 제거) */
export function createMission(engine, def, onProgress) {
  const type = def.type;
  let progress = 0;
  let done = false;
  const target = def.target;
  const unsubs = [];

  function report() {
    onProgress?.({ progress: Math.min(progress, target), target, done });
  }

  function finish() {
    if (done) return;
    done = true; report();
  }

  if (type === "fill") {
    unsubs.push(engine.on("match", (cleared) => {
      if (done) return;
      progress += cleared.filter((t) => t.kind === def.tile).length;
      if (progress >= target) finish(); else report();
    }));
  } else if (type === "combo_chain") {
    unsubs.push(engine.on("resolveEnd", (maxDepth) => {
      if (done) return;
      if (maxDepth >= 2) progress += 1;          // 2단 이상 연쇄 1회
      if (progress >= target) finish(); else report();
    }));
  } else if (type === "clear_cloud") {
    progress = 0;
    unsubs.push(engine.on("obstacleCleared", () => {
      if (done) return;
      progress += 1;
      if (engine.countObstacles() === 0) finish(); else report();
    }));
  }

  return {
    get done() { return done; },
    get progress() { return Math.min(progress, target); },
    get target() { return target; },
    type,
    report,
    dispose() { unsubs.forEach((u) => u()); unsubs.length = 0; },
  };
}
