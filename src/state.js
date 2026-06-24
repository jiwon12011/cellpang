/* state.js — 진행 저장(localStorage v2) + 장면 데이터 + 시간대 추천 */
const SAVE_KEY = "yumi-cellpang-save";
const SAVE_V = 2;

let chapter = null;       // chapter1.json
let save = null;

function defaultSave() {
  return {
    v: SAVE_V,
    currentChapter: "ch1",
    scenes: {},
    todayScene: null,
    collectedCuts: [],
    oneCutOfDay: { date: null, cutId: null },
    lastVisit: null,
    settings: { reducedMotion: "auto", sound: true },
  };
}

export async function loadChapter() {
  if (chapter) return chapter;
  const res = await fetch("./data/chapter1.json");
  chapter = await res.json();
  return chapter;
}

export function loadSave() {
  if (save) return save;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.v !== SAVE_V) save = defaultSave();   // 버전 불일치 → 안전 리셋
    else save = parsed;
  } catch { save = defaultSave(); }
  // 기본 해금 반영
  ensureSceneRecords();
  return save;
}

function ensureSceneRecords() {
  if (!chapter) return;
  for (const sc of chapter.scenes) {
    if (!save.scenes[sc.id]) {
      save.scenes[sc.id] = {
        unlocked: !!sc.unlockedByDefault, visited: false, cleared: false,
      };
    }
  }
}

export function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

export function scenes() { return chapter ? chapter.scenes : []; }
export function sceneById(id) { return scenes().find((s) => s.id === id) || null; }
export function record(id) { return save.scenes[id]; }
export function isUnlocked(id) { return !!save.scenes[id]?.unlocked; }
export function isCleared(id) { return !!save.scenes[id]?.cleared; }

export function markVisited(id) {
  const r = save.scenes[id]; if (!r) return;
  r.visited = true; persist();
}

export function markCleared(id) {
  const r = save.scenes[id]; if (!r) return;
  r.cleared = true; r.visited = true;
  const cutId = id + "-clear";
  if (!save.collectedCuts.some((c) => c.id === cutId)) {
    save.collectedCuts.push({ id: cutId, sceneId: id, at: nowISO() });
  }
  save.oneCutOfDay = { date: today(), cutId };
  unlockNext(id);
  persist();
}

// soft_fail: 다음 장면 해금하되 보상 컷은 없음(흐린 한 컷 흔적만)
export function markSoftFail(id) {
  markVisited(id);
  unlockNext(id);
  persist();
}

function unlockNext(id) {
  const list = scenes();
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0 && i + 1 < list.length) {
    const next = list[i + 1].id;
    if (save.scenes[next]) save.scenes[next].unlocked = true;
  }
}

export function touchVisit() { save.lastVisit = nowISO(); persist(); }

// ---- 시간대 ----
export function timeBandNow(hour) {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "noon";
  if (h >= 15 && h < 19) return "afternoon";
  return "night";
}

// 추천 장면: 현재 시간대의 미클리어 우선, 없으면 첫 미클리어, 없으면 첫 장면
export function recommendScene(hour) {
  const band = timeBandNow(hour);
  const list = scenes();
  const byBand = list.find((s) => s.timeBand === band && isUnlocked(s.id) && !isCleared(s.id));
  if (byBand) return byBand.id;
  const firstOpen = list.find((s) => isUnlocked(s.id) && !isCleared(s.id));
  if (firstOpen) return firstOpen.id;
  return list[0]?.id || null;
}

export function settings() { return save.settings; }
export function collectedCount() { return save.collectedCuts.length; }
export function lastCut() { return save.collectedCuts[save.collectedCuts.length - 1] || null; }

function nowISO() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }
