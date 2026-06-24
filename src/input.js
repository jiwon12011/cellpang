/* input.js — 드래그 스와이프 + 탭-탭 스왑. 입력잠금 단일 게이트(isAllowed). */
export function createInput(engine, isAllowed) {
  const boardEl = engine.boardEl;
  let selected = null;
  let drag = null;

  function clearSel() {
    if (selected) selected.el.classList.remove("is-selected");
    selected = null;
  }
  const allow = () => isAllowed() && !engine.isResolving;

  function onDown(e) {
    if (!allow()) return;
    const el = e.target.closest(".tile");
    if (!el) return;
    const tile = engine.tileFromEl(el);
    if (!tile || tile.obstacle) return;
    drag = { tile, x: e.clientX, y: e.clientY };
    if (selected && selected !== tile && engine.neighbor(selected, tile)) {
      const a = selected; clearSel(); engine.trySwap(a, tile); drag = null;
    } else {
      clearSel(); selected = tile; tile.el.classList.add("is-selected");
    }
  }

  function onMove(e) {
    if (!drag || !allow()) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const cs = getComputedStyle(boardEl);
    const cell = parseFloat(cs.getPropertyValue("--cell")) || 56;
    if (Math.hypot(dx, dy) < cell * 0.4) return;
    const a = drag.tile;
    let nr = a.r, nc = a.c;
    if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1;
    else nr += dy > 0 ? 1 : -1;
    drag = null; clearSel();
    const target = engine.tileAt(nr, nc);
    if (target && !target.obstacle) engine.trySwap(a, target);
  }

  boardEl.addEventListener("pointerdown", onDown);
  boardEl.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", () => { drag = null; });

  return { clearSelection: clearSel };
}
