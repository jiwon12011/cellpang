/* =========================================================
   fx.js — FX/모션 레이어 (바닐라 JS, GSAP 없음)
   - 합성 전용: transform / opacity 만 애니메이션 (레이아웃 유발 속성 회피)
   - 짧은 FX 노드는 끝나면 반드시 DOM 제거 (메모리 누수 방지)
   - prefers-reduced-motion + 설정(motion) 둘 다 존중 → 정적/축소 폴백
   - 좌표 계산은 engine.measure() 와 동일한 공식을 미러링(보드 CSS 공유)
   ========================================================= */
import * as state from "./state.js";

const mqReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");

/** 모션을 줄여야 하나? (OS 설정 또는 인앱 모션 토글 OFF) */
export function motionOff() {
  if (mqReduce?.matches) return true;
  try { return state.settings()?.motion === false; } catch { return false; }
}

const BURST_KINDS = new Set(["love", "passion", "heart-wish", "food", "logic", "sense"]);

/* ---------------------------------------------------------
   보드 좌표 → 픽셀 중심 (engine.measure 공식과 동일)
   fx-layer 는 보드 padding-box 기준(inset:0)이라 타일 transform 과 원점이 일치한다.
   --------------------------------------------------------- */
export function tileCenter(boardEl, r, c, cols, rows) {
  const cs = getComputedStyle(boardEl);
  const pad = parseFloat(cs.paddingLeft) || 0;
  const gap = parseFloat(cs.getPropertyValue("--gap")) || 0;
  const cell = parseFloat(cs.getPropertyValue("--cell")) || 56;
  const W = boardEl.clientWidth - pad * 2;
  const H = boardEl.clientHeight - pad * 2;
  const gridW = cols * cell + gap * (cols - 1);
  const gridH = rows * cell + gap * (rows - 1);
  const offX = pad + Math.max(0, (W - gridW) / 2);
  const offY = pad + Math.max(0, (H - gridH) / 2);
  return {
    x: offX + c * (cell + gap) + cell / 2,
    y: offY + r * (cell + gap) + cell / 2,
    cell,
  };
}

/** 짧은 FX 노드 정리 헬퍼: animationend + setTimeout 안전망(둘 중 먼저) */
function autoRemove(node, fallbackMs) {
  let done = false;
  const kill = () => { if (done) return; done = true; node.remove(); };
  node.addEventListener("animationend", kill, { once: true });
  setTimeout(kill, fallbackMs);
}

/* ---------------------------------------------------------
   1) 매치 burst — 사라지는 세포 위치에 세포별 burst 팝
   동시 다발 성능 위해 매치당 대표 1~2개(세포 종류별 중심)로 제한.
   reduced-motion 이면 burst 한 점만 단순 페이드.
   --------------------------------------------------------- */
export function burstMatch(layer, boardEl, cleared, cols, rows) {
  if (!layer || !cleared || !cleared.length) return;
  const off = motionOff();

  // 세포 종류별 그룹 → 각 그룹 중심에 burst (최대 2종류)
  const groups = {};
  cleared.forEach((t) => { (groups[t.kind] ||= []).push(t); });
  const kinds = Object.keys(groups).slice(0, off ? 1 : 2);

  let sumR = 0, sumC = 0;
  kinds.forEach((k) => {
    const g = groups[k];
    const ar = g.reduce((s, t) => s + t.r, 0) / g.length;
    const ac = g.reduce((s, t) => s + t.c, 0) / g.length;
    const { x, y, cell } = tileCenter(boardEl, ar, ac, cols, rows);
    spawnBurst(layer, k, x, y, cell, off);
  });

  // reduced-motion 이 아니면 전체 중심에 match-burst 플래시 1회(추가 주스)
  if (!off) {
    cleared.forEach((t) => { sumR += t.r; sumC += t.c; });
    const { x, y, cell } = tileCenter(boardEl, sumR / cleared.length, sumC / cleared.length, cols, rows);
    const img = document.createElement("img");
    img.className = "fx fx-matchburst";
    img.src = "./assets/fx/match-burst.webp";
    img.alt = "";
    const size = cell * 1.9;
    img.style.width = img.style.height = size + "px";
    img.style.left = (x - size / 2) + "px";
    img.style.top = (y - size / 2) + "px";
    layer.appendChild(img);
    autoRemove(img, 600);
  }
}

function spawnBurst(layer, kind, x, y, cell, off) {
  const img = document.createElement("img");
  img.className = "fx fx-burst" + (off ? " is-static" : "");
  img.src = `./assets/fx/burst-${BURST_KINDS.has(kind) ? kind : "love"}.webp`;
  img.alt = "";
  const size = cell * 1.5;
  img.style.width = img.style.height = size + "px";
  img.style.left = (x - size / 2) + "px";   // 위치는 1회 설정(애니 대상 아님) → 레이아웃 스래시 없음
  img.style.top = (y - size / 2) + "px";
  layer.appendChild(img);
  autoRemove(img, off ? 400 : 600);
}

/* ---------------------------------------------------------
   2) 콤보 배너 + 숫자 — cascade combo>=2
   combo>=3 이면 shockwave 링 1회.
   숫자: combo-num-sheet(스프라이트) 프레임 메타 미확정 → 텍스트 숫자로 안전 폴백.
   (시트 그리드 확정 시 .fx-combo-num 을 steps() 시트로 교체 예정)
   --------------------------------------------------------- */
export function comboBanner(layer, combo, boardEl, cols, rows) {
  if (!layer || combo < 2) return;
  const off = motionOff();

  const wrap = document.createElement("div");
  wrap.className = "fx fx-combo" + (off ? " is-static" : "");
  wrap.innerHTML =
    `<img class="fx-combo-banner" src="./assets/fx/combo-banner.webp" alt="">` +
    `<span class="fx-combo-num">${combo}</span>`;
  layer.appendChild(wrap);
  autoRemove(wrap, off ? 700 : 1100);

  // 큰 콤보 → shockwave 1회(보드 중앙). reduced-motion 이면 생략.
  if (combo >= 3 && !off) {
    const { x, y, cell } = tileCenter(boardEl, (rows - 1) / 2, (cols - 1) / 2, cols, rows);
    const ring = document.createElement("img");
    ring.className = "fx fx-shock";
    ring.src = "./assets/fx/shockwave.webp";
    ring.alt = "";
    const size = cell * 6;
    ring.style.width = ring.style.height = size + "px";
    ring.style.left = (x - size / 2) + "px";
    ring.style.top = (y - size / 2) + "px";
    layer.appendChild(ring);
    autoRemove(ring, 700);
  }
}

/* ---------------------------------------------------------
   3) ⭐시그니처: 잠수(dive-village) 클리어 전환
   "수면 아래 마을로 가라앉는" 차분한(ease-in, 느린) 연출.
   cover → onCovered(밑에서 화면 교체) → reveal 패턴으로 깜빡임 방지.
   reduced-motion 이면 짧은 크로스페이드.
   tone: 씬 톤 — 기본 calm / heart 이벤트·heart-wish → love / night → night
   --------------------------------------------------------- */
export function diveTransition(tone, onCovered) {
  const t = (tone === "love" || tone === "night") ? tone : "calm";
  const off = motionOff();
  return new Promise((resolve) => {
    const ov = document.createElement("div");
    ov.className = "fx-dive" + (off ? " is-static" : "");
    ov.innerHTML =
      `<img class="fx-dive-village" src="./assets/fx/dive-village-${t}.webp" alt="">` +
      `<img class="fx-dive-rays" src="./assets/fx/dive-rays.webp" alt="">`;
    // 폰 프레임(.app) 안쪽에 클리핑(데스크톱 라운드 프레임 존중). 폴백 body.
    (document.querySelector(".app") || document.body).appendChild(ov);

    const coverAt = off ? 120 : 230;   // 오버레이 완전 불투명 시점 → 이 때 화면 교체
    const endAt = off ? 260 : 850;     // 페이드아웃 끝 → 결과 화면 드러남
    setTimeout(() => onCovered?.(), coverAt);
    setTimeout(() => { ov.remove(); resolve(); }, endAt);
  });
}

/** 씬 데이터 → dive 톤 */
export function diveTone(sc) {
  if (!sc) return "calm";
  if (sc.timeBand === "night") return "night";
  if (sc.event === "heart" || (sc.tileKinds || []).includes("heart-wish")) return "love";
  return "calm";
}

/* ---------------------------------------------------------
   4) 결과 컨페티 — scene result(clear) 의 .result-fx
   confetti 낙하 + level-clear 중앙 팝 + sparkle 미세 반짝임.
   soft_fail 은 호출하지 않음(잔잔하게). reduced-motion 이면 정적.
   confetti-sheet / sparkle-sheet 시트 메타 미확정 → 단일 이미지로 안전 폴백.
   --------------------------------------------------------- */
export function resultConfetti(host) {
  if (!host) return;
  host.innerHTML = "";
  const off = motionOff();
  host.classList.toggle("is-static", off);

  const conf = document.createElement("img");
  conf.className = "fx-confetti";
  conf.src = "./assets/fx/confetti.webp"; // confetti-sheet 대신 단일 이미지 폴백
  conf.alt = "";
  host.appendChild(conf);

  const spark = document.createElement("img");
  spark.className = "fx-sparkle";
  spark.src = "./assets/fx/sparkle-sheet.webp"; // 시트 메타 미확정 → 단일 이미지 페이드 폴백
  spark.alt = "";
  host.appendChild(spark);

  const lvl = document.createElement("img");
  lvl.className = "fx-levelclear";
  lvl.src = "./assets/fx/level-clear.webp";
  lvl.alt = "";
  host.appendChild(lvl);
}
