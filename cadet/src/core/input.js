// CADET — core/input.js : keyboard and mouse for walking, the visit camera and the cockpit.
// Click to capture the mouse (pointer lock); Esc releases it (the browser does that), and the game opens the pause menu.
// When the pointer cannot be locked, dragging with the right button (or Alt + drag) looks around instead. With the
// mouse captured, the buttons held (Mouse0 / Mouse2) and the wheel's notches are kept for the cockpit.
export function createInput(canvas) {
  const keys = new Set(), edges = new Set();
  let lookX = 0, lookY = 0, locked = false, drag = null, enabled = true, wheel = 0, wheelAcc = 0;
  const lockFns = [];
  // typing into a field: the game's keys are left alone (a slider or a switch is not a field)
  const typing = () => { const a = document.activeElement; return !!a && ((a.tagName === 'INPUT' && !/^(range|checkbox|radio|button)$/.test(a.type)) || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA' || a.isContentEditable); };
  function requestLock() {
    if (locked || !canvas.requestPointerLock) return;
    // raw mouse movement where the browser offers it; a plain lock otherwise. A refusal (no click to allow it, or just
    // after Esc) leaves the hint on screen: the next click on the game locks the mouse.
    const plain = () => { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed here */ } };
    try { const r = canvas.requestPointerLock({ unadjustedMovement: true }); if (r && r.catch) r.catch(plain); } catch (e) { plain(); }
  }
  document.addEventListener('pointerlockchange', () => {
    const was = locked; locked = document.pointerLockElement === canvas;
    if (!locked) keys.clear();
    if (was !== locked) for (const f of lockFns) f(locked);
  });
  document.addEventListener('mousemove', (e) => {
    if (!enabled) return;
    if (locked) { lookX += e.movementX; lookY += e.movementY; }
    else if (drag) { lookX += (e.clientX - drag.x) * 1.6; lookY += (e.clientY - drag.y) * 1.6; drag = { x: e.clientX, y: e.clientY }; }
  });
  canvas.addEventListener('mousedown', (e) => {
    if (locked && enabled && (e.button === 0 || e.button === 2)) { const c = 'Mouse' + e.button; if (!keys.has(c)) edges.add(c); keys.add(c); return; }
    if (e.button === 2 || e.altKey) drag = { x: e.clientX, y: e.clientY };
  });
  document.addEventListener('mouseup', (e) => { drag = null; keys.delete('Mouse' + e.button); });
  // the wheel in notches (+1 = away from you); a trackpad's small deltas add up to whole notches
  canvas.addEventListener('wheel', (e) => {
    if (!enabled || !locked) return;
    e.preventDefault();
    wheelAcc += -e.deltaY / (e.deltaMode === 1 ? 3 : e.deltaMode === 2 ? 0.1 : 100);
    const n = Math.trunc(wheelAcc); wheel += n; wheelAcc -= n;
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    if (!enabled || typing()) return;
    // a focused slider keeps its own keys (the arrows step it); the other keys still reach the game
    const a = document.activeElement;
    if (a && a.tagName === 'INPUT' && a.type === 'range' && /^(Arrow|Page|Home|End)/.test(e.code)) return;
    if (!keys.has(e.code)) edges.add(e.code);
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Tab'].includes(e.code) && locked) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); edges.clear(); });

  return {
    keys, requestLock,
    exitLock() { if (locked && document.exitPointerLock) document.exitPointerLock(); },
    get locked() { return locked; },
    set enabled(v) { enabled = v; if (!v) { keys.clear(); edges.clear(); lookX = lookY = 0; wheel = wheelAcc = 0; } },
    get enabled() { return enabled; },
    down: (code) => keys.has(code),
    // true once per press (cleared by endFrame)
    pressed: (code) => edges.has(code),
    shift: () => keys.has('ShiftLeft') || keys.has('ShiftRight'),
    // mouse movement since the last call, in pixels
    takeLook() { const r = { x: lookX, y: lookY }; lookX = lookY = 0; return r; },
    // wheel notches since the last call (+ = away from you)
    takeWheel() { const n = wheel; wheel = 0; return n; },
    endFrame() { edges.clear(); },
    onLock(fn) { lockFns.push(fn); },
    typing,
  };
}
