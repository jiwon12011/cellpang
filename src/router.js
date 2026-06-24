/* router.js — 해시 라우팅 + 화면 전환(깊이 페이드) + 라이프사이클 디스패치 */
const DUR = 380;
const prefersReduced = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function createRouter() {
  const screens = {};       // name → { el, ctrl }
  let current = null;       // name
  let pendingParams = null;
  let animating = false;

  function register(name, el, ctrl) { screens[name] = { el, ctrl: ctrl || {} }; }

  function hashName() { return (location.hash.replace(/^#/, "") || "home"); }

  async function show(name, params, { back = false } = {}) {
    if (animating || name === current) return;
    const next = screens[name];
    if (!next) return;
    animating = true;
    pendingParams = params || pendingParams;

    const prev = current ? screens[current] : null;
    const reduce = prefersReduced();

    // 진입 준비
    await next.ctrl.onEnter?.(pendingParams);
    pendingParams = null;
    next.el.classList.add("is-active");

    if (prev && prev !== next) {
      prev.el.classList.add(back ? "screen--out-back" : "screen--out");
      next.el.classList.add(back ? "screen--in-back" : "screen--in");
      if (!reduce) await wait(DUR);
      prev.el.classList.remove("is-active", "screen--out", "screen--out-back");
      next.el.classList.remove("screen--in", "screen--in-back");
      prev.ctrl.onLeave?.();
    } else {
      next.el.classList.add("screen--in");
      if (!reduce) await wait(DUR);
      next.el.classList.remove("screen--in");
    }

    current = name;
    animating = false;
  }

  function go(name, params) {
    if (name === current) return;
    pendingParams = params || null;
    history.pushState({ name }, "", "#" + name);
    show(name, params);
  }

  function replace(name, params) {
    pendingParams = params || null;
    history.replaceState({ name }, "", "#" + name);
    show(name, params, { back: false });
  }

  function back() { history.back(); }

  window.addEventListener("popstate", () => {
    const name = hashName();
    show(name, null, { back: true });
  });

  function start() {
    const name = hashName();
    if (!history.state) history.replaceState({ name }, "", "#" + name);
    show(name, null);
  }

  return { register, go, replace, back, start, get current() { return current; }, setParams: (p) => { pendingParams = p; } };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
