// CADET — flight/traffic-view.js : the pattern traffic drawn (flight/traffic.js does the flying).
// The far detail of the Archer (the parked aeroplanes' model: 2,468 triangles) in the academy's other
// registrations, one three.js group per trainer, moved each frame to the traffic system's pose. They cast
// no shadow (the shadow box never reaches the pattern, and the passes stay cheap). Built only while the day
// has traffic and only shown while flying: the apron and the lobby — the scenes the perf tests measure —
// never carry them, and the measured cockpit day (the Seminole's, chapter 5) has no traffic at all.
import * as THREE from 'three';
import { buildAircraftModel } from '../aircraft/exterior.js';
import { TRAFFIC_CALLS } from './traffic.js';

export function createTrafficView({ FL, L, scene }) {
  const root = new THREE.Group(); root.name = 'pattern-traffic'; root.visible = false; scene.add(root);
  const A = FL.physics.AIRCRAFT.find(a => a.id === 'pa28');
  let built = -1;
  const models = [];
  function set(count) {
    if (count === built) return;
    built = count;
    for (const m of models) root.remove(m.root);
    models.length = 0;
    for (let i = 0; i < count; i++) {
      const m = buildAircraftModel(FL, A, { lod: 'far', reg: TRAFFIC_CALLS[i % TRAFFIC_CALLS.length].reg });
      m.root.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
      root.add(m.root); models.push(m);
    }
    if (!count) root.visible = false;
  }
  // place the models on the system's poses (on = the player is in the aircraft: the only place they are seen)
  function show(sys, on) {
    root.visible = !!on && built > 0;
    if (!root.visible) return;
    for (let i = 0; i < models.length && i < sys.poses.length; i++) {
      const p = sys.poses[i], m = models[i].root, lp = L.toLocal(p.n, p.e, p.y);
      m.position.set(lp[0], lp[1], lp[2]);
      m.quaternion.set(p.q[0], p.q[1], p.q[2], p.q[3]);
    }
  }
  return { set, show, get count() { return built; } };
}
