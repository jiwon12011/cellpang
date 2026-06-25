/* =========================================================
   engine.js — 매치-3 코어 (서사·화면 모름, 이벤트만 발행)
   - 보드 ROWS×COLS, 타일 종류 주입(tileKinds)
   - 방해물(cloud): 이동·매치 불가, 인접 매치로 제거
   - 데드락 감지 + 자동 셔플
   - 이벤트: match / cascade / resolveEnd / obstacleCleared / shuffled
   ========================================================= */

// 타일 = 새 세포 얼굴 아이콘(색·표정으로 구분). 매치-3 가독성↑
export const CELLS = {
  "love":       { img: "./assets/tiles/face-love.webp",       glyph: "♥" },
  "passion":    { img: "./assets/tiles/face-passion.webp",    glyph: "▲" },
  "heart-wish": { img: "./assets/tiles/face-heart-wish.webp", glyph: "✦" },
  "food":       { img: "./assets/tiles/face-food.webp",       glyph: "◗" },
  "logic":      { img: "./assets/tiles/face-logic.webp",      glyph: "▢" },
  "sense":      { img: "./assets/tiles/face-sense.webp",      glyph: "~" },
};
// 방해물: 데이터 mission.obstacle 로 종류 선택(없으면 cloud — 기존 동작 호환)
const OBSTACLES = {
  cloud: { img: "./assets/tiles/cell-cloud.webp",     glyph: "☁", alt: "먹구름" },
  ice:   { img: "./assets/tiles/obstacle-ice.webp",   glyph: "❄", alt: "얼음" },
  box:   { img: "./assets/tiles/obstacle-box.webp",   glyph: "▣", alt: "상자" },
};

// 특수 타일 경로 상수 — 엔진 룰은 이번 범위 밖(미사용 OK). 차후 룰/모션 확장용 훅.
export const SPECIALS = {
  bomb:       "./assets/tiles/special-bomb.webp",
  lineH:      "./assets/tiles/special-line-h.webp",
  lineV:      "./assets/tiles/special-line-v.webp",
  rainbow:    "./assets/tiles/special-rainbow.webp",
  primeCrown: "./assets/tiles/tile-prime-crown.webp",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createEngine(boardEl) {
  let ROWS = 7, COLS = 5;
  let kinds = [];           // 이 보드에서 쓰는 세포 종류(부분집합)
  let obstacleKind = "cloud"; // 이 보드의 방해물 종류
  let grid = [];            // grid[r][c] = tile | null
  let cellSize = 56;
  let offX = 0, offY = 0, boardGap = 12;
  let uid = 0;
  let resolving = false;
  const listeners = {};

  const rnd = (n) => Math.floor(Math.random() * n);
  const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

  function on(evt, fn) {
    (listeners[evt] ||= []).push(fn);
    return () => { const a = listeners[evt]; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); };
  }
  function emit(evt, payload) { (listeners[evt] || []).slice().forEach((fn) => fn(payload)); }

  // ---- 좌표 ----
  function measure() {
    const cs = getComputedStyle(boardEl);
    const pad = parseFloat(cs.paddingLeft) || 0;
    boardGap = parseFloat(cs.getPropertyValue("--gap")) || 0;
    const W = boardEl.clientWidth - pad * 2;
    const H = boardEl.clientHeight - pad * 2;
    const cw = (W - boardGap * (COLS - 1)) / COLS;
    const ch = (H - boardGap * (ROWS - 1)) / ROWS;
    cellSize = Math.max(8, Math.floor(Math.min(cw, ch)));   // 너비·높이 중 작은 쪽
    boardEl.style.setProperty("--cell", cellSize + "px");
    const gridW = COLS * cellSize + boardGap * (COLS - 1);
    const gridH = ROWS * cellSize + boardGap * (ROWS - 1);
    offX = pad + Math.max(0, (W - gridW) / 2);
    offY = pad + Math.max(0, (H - gridH) / 2);
    forEachTile((t) => place(t));
  }
  function pos(r, c) {
    return { x: offX + c * (cellSize + boardGap), y: offY + r * (cellSize + boardGap) };
  }
  function place(t) {
    const { x, y } = pos(t.r, t.c);
    t.el.style.transform = `translate(${x}px, ${y}px)`;
  }
  function forEachTile(fn) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r] && grid[r][c]) fn(grid[r][c]);
  }

  // ---- 타일 생성 ----
  function makeTile(kind, r, c, obstacle = false) {
    const el = document.createElement("div");
    el.className = "tile is-spawn" + (obstacle ? " tile--cloud" : "");
    el.dataset.kind = obstacle ? "cloud" : kind;
    const inner = document.createElement("div");
    inner.className = "tile-inner";
    const img = document.createElement("img");
    const ob = OBSTACLES[obstacleKind] || OBSTACLES.cloud;
    img.src = obstacle ? ob.img : CELLS[kind].img;
    img.alt = obstacle ? ob.alt : kind;
    img.draggable = false;
    inner.appendChild(img);
    el.appendChild(inner);
    boardEl.appendChild(el);
    const t = { id: ++uid, kind, r, c, el, obstacle };
    place(t);
    return t;
  }

  function randKind() { return kinds[rnd(kinds.length)]; }

  // 초기 보드: 매치 없이 생성 + 방해물 배치
  function build({ rows, cols, tileKinds, obstacles = 0, obstacleType = "cloud" }) {
    ROWS = rows; COLS = cols; kinds = tileKinds.slice();
    obstacleKind = OBSTACLES[obstacleType] ? obstacleType : "cloud";
    boardEl.querySelectorAll(".tile").forEach((t) => t.remove());
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let k;
        do { k = randKind(); }
        while (
          (c >= 2 && grid[r][c-1]?.kind === k && grid[r][c-2]?.kind === k) ||
          (r >= 2 && grid[r-1][c]?.kind === k && grid[r-2][c]?.kind === k)
        );
        grid[r][c] = makeTile(k, r, c);
      }
    }
    // 방해물(cloud) 무작위 배치 (중앙~상단 영역)
    let placed = 0, guard = 0;
    while (placed < obstacles && guard++ < 500) {
      const r = rnd(ROWS), c = rnd(COLS);
      if (grid[r][c] && !grid[r][c].obstacle) {
        grid[r][c].el.remove();
        grid[r][c] = makeTile(null, r, c, true);
        placed++;
      }
    }
    measure();
  }

  // ---- 매치 감지 (방해물은 run을 끊음) ----
  function findMatches() {
    const m = new Set();
    const same = (a, b) => a && b && !a.obstacle && !b.obstacle && a.kind === b.kind;
    for (let r = 0; r < ROWS; r++) {
      let run = 1;
      for (let c = 1; c <= COLS; c++) {
        if (c < COLS && same(grid[r][c], grid[r][c-1])) run++;
        else { if (run >= 3) for (let k = c-run; k < c; k++) m.add(r+","+k); run = 1; }
      }
    }
    for (let c = 0; c < COLS; c++) {
      let run = 1;
      for (let r = 1; r <= ROWS; r++) {
        if (r < ROWS && same(grid[r][c], grid[r-1][c])) run++;
        else { if (run >= 3) for (let k = r-run; k < r; k++) m.add(k+","+c); run = 1; }
      }
    }
    return m;
  }

  // ---- 스왑 ----
  function swapData(a, b) {
    grid[a.r][a.c] = b; grid[b.r][b.c] = a;
    [a.r, b.r] = [b.r, a.r]; [a.c, b.c] = [b.c, a.c];
  }

  async function trySwap(a, b) {
    if (resolving) return;
    if (a.obstacle || b.obstacle) return;      // 방해물은 이동 불가
    resolving = true;
    swapData(a, b); place(a); place(b);
    await sleep(220);
    if (findMatches().size === 0) {            // 매치 없음 → 되돌림
      swapData(a, b); place(a); place(b);
      await sleep(220);
      resolving = false;
      emit("resolveEnd", 0);
      ensurePlayable();
      return;
    }
    const maxDepth = await resolveBoard();
    resolving = false;
    emit("resolveEnd", maxDepth);
    ensurePlayable();
  }

  // ---- 캐스케이드 해소 ----
  async function resolveBoard() {
    let combo = 0;
    while (true) {
      const matches = findMatches();
      if (matches.size === 0) break;
      combo++;
      emit("cascade", combo);

      const cleared = [];
      matches.forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        const t = grid[r][c];
        if (!t) return;
        cleared.push({ kind: t.kind, r, c });
        t.el.classList.add("is-clearing");
        grid[r][c] = null;
      });
      emit("match", cleared);

      // 인접 방해물 제거
      clearAdjacentObstacles(matches);

      await sleep(240);
      boardEl.querySelectorAll(".tile.is-clearing").forEach((el) => el.remove());
      collapseAndRefill();
      await sleep(280);
    }
    return combo;
  }

  function clearAdjacentObstacles(matched) {
    const toClear = new Set();
    matched.forEach((key) => {
      const [r, c] = key.split(",").map(Number);
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
        if (inBounds(nr, nc) && grid[nr][nc]?.obstacle) toClear.add(nr+","+nc);
      });
    });
    toClear.forEach((key) => {
      const [r, c] = key.split(",").map(Number);
      const t = grid[r][c];
      if (!t) return;
      t.el.classList.add("is-clearing");
      grid[r][c] = null;
      emit("obstacleCleared", { r, c });
    });
  }

  function collapseAndRefill() {
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r][c]) {
          if (write !== r) {
            const t = grid[r][c];
            grid[write][c] = t; grid[r][c] = null;
            t.r = write; t.c = c; place(t);
          }
          write--;
        }
      }
      for (let r = write; r >= 0; r--) {
        const t = makeTile(randKind(), r, c);          // 리필은 일반 타일만
        const startY = pos(-(write - r + 1), c).y;
        const { x } = pos(r, c);
        t.el.style.transition = "none";
        t.el.style.transform = `translate(${x}px, ${startY}px)`;
        void t.el.offsetWidth;
        t.el.style.transition = "";
        grid[r][c] = t; place(t);
      }
    }
  }

  // ---- 데드락 감지 + 셔플 ----
  function hasPossibleMove() {
    const tryAt = (r, c, nr, nc) => {
      if (!inBounds(nr, nc)) return false;
      const a = grid[r][c], b = grid[nr][nc];
      if (!a || !b || a.obstacle || b.obstacle) return false;
      // 가상 스왑 후 매치 여부
      grid[r][c] = b; grid[nr][nc] = a;
      const ok = findMatches().size > 0;
      grid[r][c] = a; grid[nr][nc] = b;
      return ok;
    };
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (tryAt(r, c, r, c+1) || tryAt(r, c, r+1, c)) return true;
    return false;
  }

  function shuffle() {
    // 일반 타일들의 kind만 섞어 재배치 (방해물 위치 유지)
    const movable = [];
    forEachTile((t) => { if (!t.obstacle) movable.push(t); });
    let guard = 0;
    do {
      const ks = movable.map((t) => t.kind);
      for (let i = ks.length - 1; i > 0; i--) {
        const j = rnd(i + 1); [ks[i], ks[j]] = [ks[j], ks[i]];
      }
      movable.forEach((t, i) => { t.kind = ks[i]; updateTileVisual(t); });
    } while ((findMatches().size > 0 || !hasPossibleMove()) && guard++ < 30);
    emit("shuffled");
  }

  function updateTileVisual(t) {
    t.el.dataset.kind = t.kind;
    const img = t.el.querySelector("img");
    if (img) { img.src = CELLS[t.kind].img; img.alt = t.kind; }
  }

  async function ensurePlayable() {
    if (resolving) return;
    if (!hasPossibleMove()) {
      await sleep(150);
      shuffle();
    }
  }

  function countObstacles() {
    let n = 0; forEachTile((t) => { if (t.obstacle) n++; }); return n;
  }
  function tileFromEl(el) {
    let found = null;
    forEachTile((t) => { if (t.el === el) found = t; });
    return found;
  }

  return {
    on, build, measure, trySwap, tileFromEl, countObstacles,
    tileAt: (r, c) => (inBounds(r, c) && grid[r] ? grid[r][c] : null),
    get isResolving() { return resolving; },
    get cols() { return COLS; },
    get rows() { return ROWS; },
    neighbor: (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1,
    boardEl,
  };
}
