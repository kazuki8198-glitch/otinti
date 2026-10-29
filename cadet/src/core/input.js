// CADET — core/input.js : keyboard and mouse for walking, the visit camera and the cockpit.
// Click to capture the mouse (pointer lock); Esc releases it (the browser does that), and the game opens the pause menu.
// When the pointer is not locked, dragging on the view looks around instead: with the right button, with Alt, or with
// the left button once it has moved more than DRAG_PX (so a plain click stays a click; `dragged` tells the click that
// ends a drag apart, and the game does not take it as one). With the mouse captured, the buttons held (Mouse0 / Mouse2)
// and the wheel's notches are kept for the cockpit. A release the game makes itself (exitLock: a talk's choices, the
// tablet) keeps the keys held, so a walk goes on across it; any other release lets them all go (their key-up may not
// come back to the page).
const DRAG_PX = 6;                                 // a left press that moves further than this (CSS px) is a drag, not a click

export function createInput(canvas) {
  const keys = new Set(), edges = new Set();
  let lookX = 0, lookY = 0, locked = false, drag = null, dragged = false, enabled = true, wheel = 0, wheelAcc = 0;
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
  // (the second argument: the game let the mouse go itself — a talk's choices, the tablet — rather than the player
  // pressing Esc; the event comes later, so it is remembered when exitLock is called)
  let selfExit = false;
  document.addEventListener('pointerlockchange', () => {
    const was = locked; locked = document.pointerLockElement === canvas;
    const bySelf = !locked && selfExit; if (!locked) selfExit = false;
    if (!locked && !bySelf) keys.clear();
    if (was !== locked) for (const f of lockFns) f(locked, bySelf);
  });
  document.addEventListener('mousemove', (e) => {
    if (!enabled) return;
    if (locked) { lookX += e.movementX; lookY += e.movementY; }
    else if (drag) {
      if (!dragged && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > DRAG_PX) {
        dragged = true;
        if (drag.wait) { drag.wait = false; drag.x = e.clientX; drag.y = e.clientY; }   // (the left button looks from here, without a jump)
      }
      if (drag.wait) return;
      lookX += (e.clientX - drag.x) * 1.6; lookY += (e.clientY - drag.y) * 1.6; drag.x = e.clientX; drag.y = e.clientY;
    }
  });
  canvas.addEventListener('mousedown', (e) => {
    dragged = false;
    if (locked && enabled && (e.button === 0 || e.button === 2)) { const c = 'Mouse' + e.button; if (!keys.has(c)) edges.add(c); keys.add(c); return; }
    // the right button and Alt look at once; the left one waits until it has moved past DRAG_PX (a click stays a click)
    if (e.button === 2 || e.altKey || e.button === 0) drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, wait: e.button === 0 && !e.altKey };
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
    exitLock() { if (locked && document.exitPointerLock) { selfExit = true; document.exitPointerLock(); } },
    get locked() { return locked; },
    // the last press on the view (unlocked) moved further than DRAG_PX: it looked round, so its click is not a click
    get dragged() { return dragged; },
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
