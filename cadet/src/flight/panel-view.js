// CADET — flight/panel-view.js : looking at the instruments (the panel view), as pure state and numbers.
// The 3D G1000's screens are small from the pilot's seat (PLAN 2.9: at 1080p their text cannot be read), so the
// seated pilot can, MSFS-style, (a) jump the eye to just in front of one unit — the PFD, the MFD, or the standby
// dials and the audio panel — and look a little way round it while its own knobs and keys stay under the crosshair,
// and (b) zoom the view smoothly (the wheel, or + / −) instead of only the right button's one fixed step.
// fly-mode.js owns the camera and the input; this module owns what the modes are, in which order the focus key
// visits them, how each is framed, and how a zoom step moves the field of view — so the tests can hold all of it
// without a cockpit. Nothing here touches the aircraft, the lesson or the pause rules.

// the focus views, in the order the focus key (I) visits them; null (the pilot's own view) sits at both ends
export const FOCUS_VIEWS = [
  { id: 'pfd', label: 'PFD' },
  { id: 'mfd', label: 'MFD' },
  { id: 'stby', label: '予備計器・オーディオ' },
];
export const FOCUS_IDS = FOCUS_VIEWS.map(v => v.id);
// the next focus after cur (null = the pilot's view), cycling forward; an unknown id starts again at the PFD
export function nextFocus(cur) {
  const i = FOCUS_IDS.indexOf(cur);
  return i < 0 ? FOCUS_IDS[0] : (i + 1 < FOCUS_IDS.length ? FOCUS_IDS[i + 1] : null);
}
// how each focus view is framed: the field of view (degrees) and how far in front of the unit's face the eye sits
// (metres). The bezel is 0.27 × 0.21 m: at 0.42 m and 38° it fills most of the height, its knobs still in frame;
// the standby view sits a little further back and wider, to take in the three dials and the audio panel's edge.
export const FOCUS_FRAME = {
  pfd: { fov: 38, dist: 0.42 },
  mfd: { fov: 38, dist: 0.42 },
  stby: { fov: 46, dist: 0.46 },
};
// the standby dials' centre from the MFD screen's centre, in the panel's own frame (metres): the dials stand at
// x = 0.255 (the MFD's centre is 0.051) and a touch lower; the aim is pulled a little left, towards the audio panel
export const STBY_OFF = [0.139, -0.040];
// how far the head may turn inside a focus view (radians): enough to take in the unit's own knobs, no more
export const FOCUS_LOOK = { yaw: 0.30, up: 0.24, down: 0.20 };
// the camera's move between the pilot's view and a focus view (seconds)
export const FOCUS_T = 0.35;
// the zoom: the narrowest field of view the wheel or the keys will ask for, and one step's ratio (a wheel notch,
// or one press of + / −). MSFS-like: the wheel away from you (a positive notch here) zooms in.
export const ZOOM_MIN = 16;
export const ZOOM_STEP = 0.85;
// the field of view after stepping: cur (null = base) moved by notches (positive = in), kept within [min, max]
export function zoomStep(cur, notches, base, max = base, min = ZOOM_MIN) {
  const v = (cur == null ? base : cur) * Math.pow(ZOOM_STEP, notches);
  return Math.min(max, Math.max(min, v));
}
// the smoothstep the camera blend uses (the same curve as the lesson handoff's, in fly-mode)
export const smooth01 = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
// an angle moved from a towards b by k along the short way round (radians)
export function lerpAngle(a, b, k) { return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k; }
