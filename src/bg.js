/* bg.js — 시간대·장소·이벤트 → 배경 webp 경로 헬퍼 (작은 매핑 모음)
   화면은 이 경로를 --bg 커스텀 프로퍼티나 background-image 로 꽂아 쓴다.
   배경은 화면당 1장만 로드(성능): 호출부에서 현재 화면 것만 적용. */
const BASE = "./assets/bg/";
const url = (name) => `${BASE}${name}.webp`;
const bandOf = (sc) => sc?.timeBand || "morning";

export function homeBg() { return url("bg-home"); }

// 씬/컷 배경 우선순위: event > place > timeBand.
const SCENE_BAND = { morning: "bg-morning", noon: "bg-noon", afternoon: "bg-afternoon", night: "bg-night" };
const EVENT_BG = { heart: "bg-event-heart", "night-festival": "bg-event-night-festival" };
// 장소 태그 → 배경(실내/야외). data 의 place 로 잠자던 장소 에셋 흡수.
const PLACE_BG = { bedroom: "bg-bedroom", cafe: "bg-cafe", office: "bg-office", park: "bg-park", street: "bg-street" };

export function sceneBg(sc) {
  if (sc?.event && EVENT_BG[sc.event]) return url(EVENT_BG[sc.event]);   // 1) 이벤트 최우선
  if (sc?.place && PLACE_BG[sc.place]) return url(PLACE_BG[sc.place]);    // 2) 장소
  return url(SCENE_BAND[bandOf(sc)] || "bg-morning");                    // 3) 시간대 폴백
}

// 보드 배경 우선순위도 place 우선. 야외 → 잔디, 실내 근무(사무실) → 책상 위, 없으면 시간대.
const OUTDOOR = new Set(["outdoor", "park", "street", "garden"]);
const PLACE_BOARD = { office: "bg-office" }; // 사무실에서 두는 보드(책상 위 느낌)
export function boardBg(sc) {
  const p = sc?.place;
  if (p && OUTDOOR.has(p)) return url("bg-board-grass");
  if (p && PLACE_BOARD[p]) return url(PLACE_BOARD[p]);
  const b = bandOf(sc);
  if (b === "afternoon") return url("bg-board-wood");
  return url("bg-board-candy"); // morning·noon·night(어둡게는 CSS filter)
}

// 갤러리 계절 띠(월 기준) — 잠자던 계절 에셋 소진용.
const SEASON = ["bg-winter", "bg-winter", "bg-spring", "bg-spring", "bg-spring",
  "bg-summer", "bg-summer", "bg-summer", "bg-autumn", "bg-autumn", "bg-autumn", "bg-winter"];
export function seasonBg(month) {
  const m = (month ?? new Date().getMonth());
  return url(SEASON[m] || "bg-spring");
}

// 리포트 뒷배경 — 시간/계절 분위기 1장. starry/sunset/snow/rain/summer 소진.
export function ambientBg(hour, month) {
  const h = hour ?? new Date().getHours();
  const m = month ?? new Date().getMonth();
  if (h >= 19 || h < 5) return url("bg-starry");   // 밤 = 별빛
  if (h >= 17) return url("bg-sunset");             // 해질녘
  if (m === 11 || m <= 1) return url("bg-snow");    // 한겨울 = 눈
  if (m >= 5 && m <= 7) return url("bg-summer");     // 한여름
  return url("bg-rain");                            // 환절기 = 빗소리
}

/* 남은 미사용(차후 흡수 후보, perf-engineer 가 prefetch 전략 다듬음):
   bg-board-frame, bg-*-2 변주(morning/noon/afternoon/night-2) — place/event 늘면 흡수. */
