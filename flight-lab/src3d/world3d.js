// FLIGHT LAB — src3d/world3d.js : the scenery of the three.js view, built from FLIGHT LAB's own data by CADET's
// world modules (cadet/src/world, aircraft; read-only): the training landmarks and the trees at once (they need no
// pictures), then — once the textures are decoded — the ground with its fields and lakes, the airfield (pavement,
// markings, lights, signs, PAPI, windsock), the hangars and the tower, the academy building, and the school's
// aircraft parked on the apron. Built in a few steps with a pause between them, so that the page stays responsive
// while the menu is up.
// The academy is CADET's building as seen from outside: FLIGHT LAB never goes in, so its rooms are built without their
// furniture and ceiling lights (in CADET those are half of the building's draw calls and nearly all of its triangles,
// and they cast sun shadows round the room the player is in) and the inner doors are not drawn; the shell, the glass,
// the outer doors and the name boards are. Its doors need a collision world: one of its own, that nothing else uses.
import { loadTextures, setAnisotropy } from '../../cadet/src/render/textures.js';
import { buildGround } from '../../cadet/src/world/ground.js';
import { buildAirfield, STANDS } from '../../cadet/src/world/airfield.js';
import { buildBuildings } from '../../cadet/src/world/buildings.js';
import { buildVegetation } from '../../cadet/src/world/vegetation.js';
import { buildLandmarks } from '../../cadet/src/world/landmarks.js';
import { buildAcademy } from '../../cadet/src/world/academy.js';
import { createPropKit } from '../../cadet/src/world/props.js';
import { createCollisionWorld } from '../../cadet/src/player/collide.js';
import { academySpec } from '../../cadet/src/content/academy-spec.js';
import { parkedAircraft } from '../../cadet/src/aircraft/exterior.js';
import { PARKED_ARCHERS, PARKED_SEMINOLES } from '../../cadet/src/aircraft/registrations.js';

// the tie-down spots in use, as CADET's apron has them; stand 19 (CADET's cadet's own Archer) stays empty: that is
// the aircraft being flown
const SPOTS = [[0, 'pa28'], [2, 'pa28'], [3, 'pa28'], [5, 'pa28'], [8, 'pa28'], [10, 'pa44'], [13, 'pa28'], [16, 'pa44'], [22, 'pa28']];
const pause = () => new Promise(r => setTimeout(r, 0));

export function createWorld(FL, L, scene, preset) {
  const w = { landmarks: null, veg: null, ground: null, airfield: null, buildings: null, academy: null, parked: [], ms: {} };
  const timed = (k, fn) => { const t0 = performance.now(), v = fn(); w.ms[k] = Math.round(performance.now() - t0); return v; };
  w.landmarks = timed('landmarks', () => buildLandmarks(L, FL).group); scene.add(w.landmarks);
  w.veg = timed('vegetation', () => buildVegetation(L, FL, { quality: preset })); scene.add(w.veg.group);

  // the rest, after the textures; onGround(ground) as soon as the ground exists (the Google tiles' hole);
  // gone() → true when the scene was thrown away meanwhile
  w.load = async ({ anisotropy, lightsOn, onGround, gone }) => {
    const t0 = performance.now();
    await loadTextures();
    w.ms.textures = Math.round(performance.now() - t0);
    if (gone()) return false;
    setAnisotropy(anisotropy);
    await pause(); if (gone()) return false;
    w.ground = timed('ground', () => buildGround(L, FL, { quality: preset }));
    onGround(w.ground); scene.add(w.ground.group);
    w.airfield = timed('airfield', () => buildAirfield(L, FL, { quality: preset })); scene.add(w.airfield.group);
    await pause(); if (gone()) return false;
    w.buildings = timed('buildings', () => buildBuildings(L, {})); w.buildings.setNight(lightsOn); scene.add(w.buildings.group);
    await pause(); if (gone()) return false;
    w.academy = timed('academy', () => {
      const spec = academySpec(FL);
      spec.rooms = (spec.rooms || []).map(r => ({ ...r, furniture: [], lights: [] }));
      const a = buildAcademy({ L, FL, spec, kit: createPropKit(), world: createCollisionWorld() });
      a.setNight(lightsOn);
      a.update(0, { x: 1e6, y: 0, z: 1e6 });                   // (no one inside: the doors stay shut)
      const props = a.group.getObjectByName('props'); if (props) props.visible = false;      // (the exit signs: inside)
      for (const d of (a.doors && a.doors.doors) || []) if (d.group && d.kind !== 'sliding_auto' && !(d.rooms || []).includes('outside')) d.group.visible = false;
      return a;
    });
    scene.add(w.academy.group);
    await pause(); if (gone()) return false;
    timed('parked', () => {
      const hdgOut = (L.R.trueHdg + 270) % 360;             // noses towards the taxilane
      let archers = 0, twins = 0;
      const nextReg = id => (id === 'pa28' ? PARKED_ARCHERS[archers++ % PARKED_ARCHERS.length] : PARKED_SEMINOLES[twins++ % PARKED_SEMINOLES.length]);
      for (const [i, id] of SPOTS) {
        const s = STANDS[i]; if (!s) continue;
        w.parked.push(parkedAircraft(FL, L, id, s.a, s.c - 0.4, hdgOut, { prop: 0.3 + i * 0.7, reg: nextReg(id), lod: 'auto' }));
      }
      // one in the open hangar (maintenance)
      w.parked.push(parkedAircraft(FL, L, 'pa28', 563, 258, hdgOut, { prop: 1.1, reg: nextReg('pa28'), lod: 'auto' }));
      for (const ac of w.parked) scene.add(ac.root);
    });
    return true;
  };
  // everything outside the aircraft (hidden under the hood)
  w.outside = () => [w.landmarks, w.veg.group, w.ground && w.ground.group, w.airfield && w.airfield.group, w.buildings && w.buildings.group,
    w.academy && w.academy.group, ...w.parked.map(a => a.root)].filter(Boolean);
  // per frame: the water, the windsock, the PAPI, the runway lights, the trees round the camera
  w.update = (t, camWorld, wind, lightsOn) => {
    if (w.ground) w.ground.update(t);
    if (w.airfield) w.airfield.update(t, { cameraWorld: camWorld, windFromDeg: wind.fromDeg, windKt: wind.kt, lightsOn });
    w.veg.update(t, camWorld);
  };
  return w;
}
