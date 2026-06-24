/* =========================================================
   세포팡 — 매치-3 엔진
   ========================================================= */
(() => {
  "use strict";

  // ---- 설정 ----
  const SIZE = 8;                 // 8x8 보드
  const ROUND_TIME = 60;          // 라운드 시간(초)
  const BASE_SCORE = 10;          // 타일 1개 기본 점수
  const BEST_KEY = "yumi-cellpang-best";

  // 타일 6종 (관계도 세포 이미지 재사용)
  const TILES = [
    { name: "사랑세포", img: "./assets/cells/love-cell.webp" },
    { name: "이성세포", img: "./assets/cells/logic-cell.webp" },
    { name: "감각세포", img: "./assets/cells/sense-cell.webp" },
    { name: "식욕세포", img: "./assets/cells/food-cell.webp" },
    { name: "열정세포", img: "./assets/cells/passion-cell.webp" },
    { name: "응큼세포", img: "./assets/cells/heart-wish-cell.webp" },
  ];
  const TYPES = TILES.length;

  // ---- DOM ----
  const boardEl   = document.getElementById("board");
  const scoreEl   = document.getElementById("score");
  const timeEl    = document.getElementById("time");
  const timeFill  = document.getElementById("timeFill");
  const hudTime   = document.querySelector(".hud-time");
  const startScr  = document.getElementById("startScreen");
  const overScr   = document.getElementById("overScreen");
  const startBtn  = document.getElementById("startBtn");
  const retryBtn  = document.getElementById("retryBtn");
  const finalScore= document.getElementById("finalScore");
  const bestStart = document.getElementById("bestStart");
  const bestOver  = document.getElementById("bestOver");
  const bestLine  = document.getElementById("bestLine");
  const resultCell= document.getElementById("resultCell");
  const comboToast= document.getElementById("comboToast");

  // ---- 상태 ----
  let grid = [];            // grid[r][c] = tile object | null
  let cellSize = 58;
  let score = 0;
  let timeLeft = ROUND_TIME;
  let timerId = null;
  let busy = false;         // 애니메이션 중 입력 잠금
  let playing = false;
  let best = +(localStorage.getItem(BEST_KEY) || 0);
  let uid = 0;

  bestStart.textContent = best;

  // ---- 유틸 ----
  const rnd = (n) => Math.floor(Math.random() * n);
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

  function measure() {
    const style = getComputedStyle(boardEl);
    const pad = parseFloat(style.paddingLeft);
    const gap = 0; // 타일은 절대배치, 셀 크기에 간격 포함
    const inner = boardEl.clientWidth - pad * 2;
    cellSize = inner / SIZE;
    boardEl.style.setProperty("--cell", cellSize + "px");
    // 배치된 타일 위치 갱신
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r] && grid[r][c]) place(grid[r][c]);
  }

  function pos(r, c) {
    const style = getComputedStyle(boardEl);
    const pad = parseFloat(style.paddingLeft);
    return { x: pad + c * cellSize, y: pad + r * cellSize };
  }

  function place(tile) {
    const { x, y } = pos(tile.r, tile.c);
    tile.el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function makeTile(type, r, c) {
    const el = document.createElement("div");
    el.className = "tile is-spawn";
    el.dataset.type = type;
    const inner = document.createElement("div");
    inner.className = "tile-inner";
    const img = document.createElement("img");
    img.src = TILES[type].img;
    img.alt = TILES[type].name;
    img.draggable = false;
    inner.appendChild(img);
    el.appendChild(inner);
    boardEl.appendChild(el);
    const tile = { id: ++uid, type, r, c, el };
    place(tile);
    return tile;
  }

  // 초기 보드 — 시작부터 매치가 없도록 생성
  function buildGrid() {
    boardEl.querySelectorAll(".tile").forEach((t) => t.remove());
    grid = [];
    for (let r = 0; r < SIZE; r++) {
      grid[r] = [];
      for (let c = 0; c < SIZE; c++) {
        let type;
        do {
          type = rnd(TYPES);
        } while (
          (c >= 2 && grid[r][c-1].type === type && grid[r][c-2].type === type) ||
          (r >= 2 && grid[r-1][c].type === type && grid[r-2][c].type === type)
        );
        grid[r][c] = makeTile(type, r, c);
      }
    }
  }

  // ---- 매치 감지 ----
  function findMatches() {
    const matched = new Set();
    // 가로
    for (let r = 0; r < SIZE; r++) {
      let run = 1;
      for (let c = 1; c <= SIZE; c++) {
        const same = c < SIZE && grid[r][c] && grid[r][c-1] && grid[r][c].type === grid[r][c-1].type;
        if (same) { run++; }
        else {
          if (run >= 3) for (let k = c - run; k < c; k++) matched.add(r + "," + k);
          run = 1;
        }
      }
    }
    // 세로
    for (let c = 0; c < SIZE; c++) {
      let run = 1;
      for (let r = 1; r <= SIZE; r++) {
        const same = r < SIZE && grid[r][c] && grid[r-1][c] && grid[r][c].type === grid[r-1][c].type;
        if (same) { run++; }
        else {
          if (run >= 3) for (let k = r - run; k < r; k++) matched.add(k + "," + c);
          run = 1;
        }
      }
    }
    return matched;
  }

  // ---- 스왑 ----
  function swapData(a, b) {
    grid[a.r][a.c] = b;
    grid[b.r][b.c] = a;
    const tr = a.r, tc = a.c;
    a.r = b.r; a.c = b.c;
    b.r = tr;  b.c = tc;
  }

  async function trySwap(a, b) {
    if (busy || !playing) return;
    busy = true;
    clearSelection();

    swapData(a, b);
    place(a); place(b);
    await sleep(260);

    const matches = findMatches();
    if (matches.size === 0) {
      // 매치 없음 → 되돌리기
      swapData(a, b);
      place(a); place(b);
      await sleep(260);
      busy = false;
      return;
    }
    await resolveBoard();
    busy = false;
  }

  // ---- 매치 해소 (캐스케이드 루프) ----
  async function resolveBoard() {
    let combo = 0;
    while (true) {
      const matches = findMatches();
      if (matches.size === 0) break;
      combo++;

      // 점수: 콤보가 깊을수록 배수 ↑
      const gained = matches.size * BASE_SCORE * combo;
      addScore(gained);
      if (combo >= 2) showCombo(combo);

      // 클리어 애니메이션
      let cx = 0, cy = 0, n = 0;
      matches.forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        const tile = grid[r][c];
        if (!tile) return;
        tile.el.classList.add("is-clearing");
        const p = pos(r, c);
        cx += p.x; cy += p.y; n++;
        grid[r][c] = null;
      });
      // 점수 플로터
      if (n) floatScore(cx / n + cellSize / 2, cy / n, "+" + gained);

      await sleep(260);
      matches.forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        // grid 이미 null, el 제거
      });
      boardEl.querySelectorAll(".tile.is-clearing").forEach((el) => el.remove());

      // 중력 + 리필
      collapseAndRefill();
      await sleep(300);
    }
  }

  function collapseAndRefill() {
    for (let c = 0; c < SIZE; c++) {
      // 아래에서 위로 — 빈칸 메우기
      let write = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        if (grid[r][c]) {
          if (write !== r) {
            const tile = grid[r][c];
            grid[write][c] = tile;
            grid[r][c] = null;
            tile.r = write; tile.c = c;
            place(tile);
          }
          write--;
        }
      }
      // 위쪽 빈칸 새 타일로 채움 (화면 위에서 떨어지듯)
      for (let r = write; r >= 0; r--) {
        const type = rnd(TYPES);
        const tile = makeTile(type, r, c);
        // 시작 위치를 보드 위로 올려 낙하 연출
        const startY = pos(-(write - r + 1), c).y;
        const { x } = pos(r, c);
        tile.el.style.transition = "none";
        tile.el.style.transform = `translate(${x}px, ${startY}px)`;
        // 강제 리플로우 후 제자리로
        void tile.el.offsetWidth;
        tile.el.style.transition = "";
        grid[r][c] = tile;
        place(tile);
      }
    }
  }

  // ---- 점수/타이머 ----
  function addScore(n) {
    score += n;
    scoreEl.textContent = score;
    scoreEl.animate(
      [{ transform: "scale(1.25)" }, { transform: "scale(1)" }],
      { duration: 200, easing: "ease-out" }
    );
  }

  function floatScore(x, y, text) {
    const f = document.createElement("div");
    f.className = "score-float";
    f.textContent = text;
    f.style.left = x + "px";
    f.style.top = y + "px";
    boardEl.appendChild(f);
    setTimeout(() => f.remove(), 700);
  }

  function showCombo(n) {
    comboToast.textContent = n + " COMBO!";
    comboToast.classList.remove("show");
    void comboToast.offsetWidth;
    comboToast.classList.add("show");
  }

  function tick() {
    timeLeft--;
    timeEl.textContent = timeLeft;
    timeFill.style.width = (timeLeft / ROUND_TIME) * 100 + "%";
    if (timeLeft <= 10) hudTime.classList.add("is-low");
    if (timeLeft <= 0) endGame();
  }

  // ---- 게임 흐름 ----
  function startGame() {
    score = 0; timeLeft = ROUND_TIME;
    scoreEl.textContent = "0";
    timeEl.textContent = ROUND_TIME;
    timeFill.style.width = "100%";
    hudTime.classList.remove("is-low");
    startScr.classList.remove("is-active");
    overScr.classList.remove("is-active");

    buildGrid();
    measure();
    // 혹시 모를 초기 매치 정리
    requestAnimationFrame(async () => {
      busy = true; await resolveBoard(); busy = false;
    });

    playing = true;
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    playing = false;
    timeEl.textContent = "0";
    timeFill.style.width = "0%";

    const isNew = score > best;
    if (isNew) { best = score; localStorage.setItem(BEST_KEY, best); }

    finalScore.textContent = score;
    bestOver.textContent = best;
    bestStart.textContent = best;
    bestLine.classList.toggle("is-newbest", isNew);

    // 점수 등급에 맞는 세포 한 컷
    const tier = score >= 3000 ? 0 : score >= 1500 ? 4 : score >= 600 ? 2 : 1;
    resultCell.innerHTML = `<img src="${TILES[tier].img}" alt="${TILES[tier].name}">`;
    document.getElementById("overTitle").textContent = isNew ? "신기록 달성! 🎉" : "시간 종료!";

    setTimeout(() => overScr.classList.add("is-active"), 400);
  }

  // ---- 입력 (드래그 스와이프 + 탭-탭) ----
  let selected = null;
  let dragStart = null;

  function clearSelection() {
    if (selected) selected.el.classList.remove("is-selected");
    selected = null;
  }

  function tileFromEvent(e) {
    const el = e.target.closest(".tile");
    if (!el) return null;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] && grid[r][c].el === el) return grid[r][c];
    return null;
  }

  function neighbor(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  boardEl.addEventListener("pointerdown", (e) => {
    if (busy || !playing) return;
    const tile = tileFromEvent(e);
    if (!tile) return;
    dragStart = { tile, x: e.clientX, y: e.clientY, moved: false };

    if (selected && selected !== tile && neighbor(selected, tile)) {
      const a = selected;
      clearSelection();
      trySwap(a, tile);
      dragStart = null;
    } else {
      clearSelection();
      selected = tile;
      tile.el.classList.add("is-selected");
    }
  });

  boardEl.addEventListener("pointermove", (e) => {
    if (!dragStart || busy || !playing) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.hypot(dx, dy) < cellSize * 0.45) return;

    dragStart.moved = true;
    const a = dragStart.tile;
    let nr = a.r, nc = a.c;
    if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1;
    else nr += dy > 0 ? 1 : -1;

    dragStart = null;
    if (inBounds(nr, nc) && grid[nr][nc]) {
      clearSelection();
      trySwap(a, grid[nr][nc]);
    }
  });

  window.addEventListener("pointerup", () => { dragStart = null; });

  // ---- 이벤트 바인딩 ----
  startBtn.addEventListener("click", startGame);
  retryBtn.addEventListener("click", startGame);
  window.addEventListener("resize", () => { if (grid.length) measure(); });
})();
