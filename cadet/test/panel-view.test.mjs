// CADET — panel view tests (node --test): looking at the instruments up close (flight/panel-view.js).
//  - the focus key's order: the pilot's view → PFD → MFD → the standby dials and the audio panel → the pilot's view;
//  - each focus view is framed tighter than the pilot's own view (the setting's 60–100°), near enough that the
//    unit's bezel (0.27 × 0.21 m) fills most of the height, and its look-around stays within the unit's own reach;
//  - the zoom: a notch in is one fixed ratio, out reverses it, and the ends are clamped (never wider than asked,
//    never narrower than ZOOM_MIN); from no zoom, one notch in lands on base × step whatever the base is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FOCUS_VIEWS, FOCUS_IDS, FOCUS_FRAME, FOCUS_LOOK, FOCUS_T, STBY_OFF, ZOOM_MIN, ZOOM_STEP, nextFocus, zoomStep, smooth01, lerpAngle } from '../src/flight/panel-view.js';

test('panel view: the focus key visits the units in order and comes back to the pilot', () => {
  assert.deepEqual(FOCUS_IDS, ['pfd', 'mfd', 'stby']);
  assert.equal(nextFocus(null), 'pfd');
  assert.equal(nextFocus('pfd'), 'mfd');
  assert.equal(nextFocus('mfd'), 'stby');
  assert.equal(nextFocus('stby'), null);
  assert.equal(nextFocus('nonsense'), 'pfd', 'an unknown focus starts again at the PFD');
  for (const v of FOCUS_VIEWS) assert.ok(/[぀-ヿ一-鿿]|PFD|MFD/.test(v.label), `${v.id}: a label the player can read`);
});

test('panel view: each focus view is framed to be read, and the head stays with its unit', () => {
  for (const id of FOCUS_IDS) {
    const f = FOCUS_FRAME[id];
    assert.ok(f.fov >= 30 && f.fov < 60, `${id}: tighter than the pilot's view (${f.fov}°)`);
    // the bezel's height (0.21 m) against what the frame shows at its distance: between half and the whole height
    const shown = 2 * f.dist * Math.tan((f.fov * Math.PI / 180) / 2);
    assert.ok(0.21 / shown > 0.5 && 0.21 / shown < 1, `${id}: the bezel fills ${(0.21 / shown).toFixed(2)} of the height`);
    assert.ok(f.dist > 0.25 && f.dist < 0.6, `${id}: the eye sits ${f.dist} m in front of the unit`);
  }
  // the standby aim: right of the MFD's centre (the dials), a little lower, still on the panel
  assert.ok(STBY_OFF[0] > 0.1 && STBY_OFF[0] < 0.2 && STBY_OFF[1] < 0 && STBY_OFF[1] > -0.08, `standby offset ${STBY_OFF}`);
  // the look-around inside a focus view: a small turn, never the pilot view's wide sweep
  assert.ok(FOCUS_LOOK.yaw > 0.15 && FOCUS_LOOK.yaw < 0.6 && FOCUS_LOOK.up < 0.45 && FOCUS_LOOK.down < 0.45, 'a small turn only');
  assert.ok(FOCUS_T > 0.1 && FOCUS_T < 0.8, 'the move is a short one');
});

test('panel view: the zoom steps by one ratio, reverses, and clamps at both ends', () => {
  assert.equal(zoomStep(null, 1, 75), 75 * ZOOM_STEP, 'from the framing, one notch in');
  assert.equal(zoomStep(null, -1, 75), 75, 'one notch out from the framing is the framing (clamped at the base)');
  assert.equal(zoomStep(40, -1, 75), 40 / ZOOM_STEP, 'a notch out widens by the same ratio');
  let v = null;
  for (let i = 0; i < 40; i++) v = zoomStep(v, 1, 75);
  assert.equal(v, ZOOM_MIN, 'zooming in stops at the narrowest');
  assert.ok(ZOOM_MIN >= 10 && ZOOM_MIN < 30, 'the narrowest is a close look, not a telescope');
  // in a focus view the wheel may also go wider than the framing (up to the caller's max), never past it
  assert.ok(Math.abs(zoomStep(null, -3, 38, 70) - 38 * Math.pow(ZOOM_STEP, -3)) < 1e-9, 'three notches out from the framing');
  assert.equal(zoomStep(69, -1, 38, 70), 70);
  // the blend's curve and the short way round for angles
  assert.deepEqual([smooth01(0), smooth01(0.5), smooth01(1), smooth01(-1), smooth01(2)], [0, 0.5, 1, 0, 1]);
  assert.ok(Math.abs(lerpAngle(3.0, -3.0, 0.5) - Math.PI) < 1e-9, 'across the wrap, the short way');
  assert.equal(lerpAngle(0.2, 0.4, 0), 0.2); assert.equal(lerpAngle(0.2, 0.4, 1), 0.4);
});
