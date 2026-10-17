// CADET — exterior tests (node --test): the aircraft seen from outside (src/aircraft/exterior.js), without a browser.
//  - the flown aircraft (liveAircraft) has every part: the surfaces, the cabin section, the propeller with its disc,
//    the lights' lenses and halos, each light where it belongs on the airframe; the Archer's fixed gear is merged into
//    the body (12 meshes in all);
//  - the propeller: no disc at rest, a disc and no blades at cruise rpm, the blades only below 900 rpm; it turns
//    clockwise seen from the cockpit (and the twin's right engine the other way), from the physics or from rpmVisual;
//    the smear joins the frames up, and the disc's pattern drifts slowly once the blades are hidden (no strobing);
//  - the cabin split keeps every triangle of the body, and the cabin holds the windows, the cowling and nothing aft of
//    its rear ring; setInside hides it and stops its shadow;
//  - the lights: off by default, the right colours, a beacon flash about every second, a double strobe every 1.2 s
//    (none missed at a low frame rate);
//  - update() works on the same objects every frame (no allocation);
//  - struts and hub caps read as metal, and the blades keep their yellow tips;
//  - the parked aircraft are exactly as before (two baked meshes, the same triangles, the same colliders).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { liveAircraft, parkedAircraft, buildAircraftModel, colliderBoxes, splitBody, cabinRear, paintClass, BLADES_OFF } from '../src/aircraft/exterior.js';
import { makeLayout } from '../src/world/layout.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'acmesh.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
const FL = globalThis.FL, P = FL.physics;
const AC = id => P.AIRCRAFT.find(a => a.id === id);
const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const state = (id, rpm = 0, ang = 0) => { const s = P.newState({ aircraft: id }); for (const e of s.eng) { e.rpm = rpm; e.ang = ang; } return s; };
const ALL = { nav: true, beacon: true, strobe: true, landing: true, taxi: true };
// a disc's uniforms (the live objects update() writes), through its material's onBeforeCompile
const discU = d => { const sh = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>' }; d.material.onBeforeCompile(sh); return sh.uniforms; };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

test('exterior: the flown aircraft has its parts, and the lights sit on the airframe', () => {
  for (const id of ['pa28', 'pa44']) {
    const A = AC(id), ac = liveAircraft(FL, A), names = new Set();
    let meshes = 0;
    ac.root.traverse(o => { if (o.isMesh) { names.add(o.name); meshes++; } });
    for (const n of ['body', 'cabin', 'ailR', 'ailL', 'flapR', 'flapL', 'stab', 'rud', 'prop', 'disc', 'lights', 'light-glow']) assert.ok(names.has(n), `${id}: ${n}`);
    // the Archer's fixed gear is in the body's mesh (it never moves); the twin's folds, so it keeps its hinges
    const gear = ['gearN', 'gearR', 'gearL'];
    if (id === 'pa28') assert.deepEqual([gear.some(n => names.has(n)), ac.parts.fixed], [false, gear], 'the fixed gear merged into the body');
    else assert.ok(gear.every(n => names.has(n) && ac.parts[n].parent.name === n + '-pivot') && ac.parts.fixed.length === 0, 'the twin\'s gear on hinges');
    assert.ok(meshes <= (id === 'pa28' ? 12 : 17), `${id}: ${meshes} meshes (draw calls)`);
    assert.equal(ac.cabin, ac.parts.cabin);
    assert.equal(ac.parts.props.length, A.engines1 || 1, `${id}: a propeller per engine`);
    for (let i = 0; i < ac.parts.props.length; i++) assert.equal(ac.parts.discs[i].parent, ac.parts.props[i].parent, 'the disc turns with its blades');
    assert.equal(ac.parts.disc.castShadow, false, 'the disc casts no shadow');
    assert.equal(tris(ac.parts.glow.geometry), 16, 'a halo (two triangles) per lamp');
    // where the lamps are: red on the left tip, green on the right, white at the tail, the beacon on top of the fin,
    // landing and taxi lights in the nose
    const at = Object.fromEntries(ac.spots.map(s => [s.id, s.pos]));
    assert.ok(at.navL[0] < -A.wing.tipX && at.navR[0] > A.wing.tipX, `${id}: the tips`);
    assert.ok(Math.abs(at.navL[2] - A.wing.tipLE) < 0.4, `${id}: the nav lights near the tips' leading edge`);
    assert.ok(at.tail[2] >= A.fuse[A.fuse.length - 1][0], `${id}: the tail light at the end of the fuselage`);
    assert.ok(at.beacon[1] > A.vstab.y1 - 0.3 && at.beacon[2] > A.vstab.rootLE, `${id}: the beacon up on the fin`);
    for (const k of ['landing', 'taxi']) assert.ok(at[k][2] < A.wing.rootLE - 1.5 && at[k][1] < A.eye[1], `${id}: ${k} in the nose`);
    assert.ok(at.landing[0] < 0 && at.taxi[0] > 0, 'landing left, taxi right');
    const col = Object.fromEntries(ac.spots.map(s => [s.id, s.col]));
    assert.ok(col.navL[0] > 10 * col.navL[1] && col.navR[1] > 10 * col.navR[0] && col.beacon[0] > 10 * col.beacon[1], 'red / green / red');
    // everything on the airframe: within the model's bounding box
    const box = new THREE.Box3().setFromObject(ac.parts.body, true).union(new THREE.Box3().setFromObject(ac.parts.cabin, true)).expandByScalar(0.08);
    for (const s of ac.spots) assert.ok(box.containsPoint(new THREE.Vector3(...s.pos)), `${id}: ${s.id} on the aircraft`);
    ac.dispose();
  }
});

test('exterior: the propeller — a disc at speed, blades below 900 rpm, clockwise from the cockpit', () => {
  const ac = liveAircraft(FL, AC('pa28')), s = state('pa28');
  const blades = ac.parts.prop, disc = ac.parts.disc;
  ac.update(s, { dt: 1 / 60 });
  assert.equal(disc.visible, false, 'no disc at 0 rpm'); assert.equal(blades.visible, true, 'blades at rest');
  for (const [rpm, b, d] of [[650, true, true], [BLADES_OFF - 0.1, true, true], [BLADES_OFF, false, true], [950, false, true], [2300, false, true], [30, true, false]]) {
    s.eng[0].rpm = rpm; ac.update(s, { dt: 1 / 60 });
    assert.equal(blades.visible, b, `blades at ${rpm} rpm`); assert.equal(disc.visible, d, `disc at ${rpm} rpm`);
  }
  // at cruise rpm the blur is a whole half-turn (an even disc), and it is fully faded in
  s.eng[0].rpm = 2300; ac.update(s, { dt: 1 / 60 });
  const U = discU(disc);
  assert.ok(U.uSweep.value >= Math.PI * 0.95, `smear ${U.uSweep.value}`);
  assert.equal(U.uAlpha.value, 1);
  assert.equal(U.uDir.value, 1);
  // the smear joins the frames up: at a long frame it reaches back to the last frame's blade, and never falls short
  for (const fps of [24, 30, 60, 144, 240]) {
    s.eng[0].rpm = 800; ac.update(s, { dt: 1 / fps });
    const arc = 800 / 60 * 2 * Math.PI / fps;
    assert.ok(U.uSweep.value >= arc - 1e-9 && (fps > 60 || Math.abs(U.uSweep.value - arc) < 1e-9), `smear at ${fps} fps: ${U.uSweep.value} for ${arc}`);
  }
  // the pattern stays on the blades while they are seen; once they are hidden it drifts slowly on its own, clockwise
  // from the cockpit, whatever the physics' angle does from frame to frame (1200 rpm at 60 fps: 120° a frame, which
  // the eye would take for a strobe, or a turn backwards); paused, it stays
  const pattern = () => -s.eng[0].ang + U.uPhase.value;          // the pattern's angle (the pivot's sense, about +z)
  s.eng[0].rpm = 800; s.eng[0].ang = 1; ac.update(s, { dt: 1 / 60 });
  assert.equal(U.uPhase.value, 0, 'on the blades');
  const steps = [];
  let was = pattern();
  for (let i = 0; i < 40; i++) {
    s.eng[0].rpm = 1200; s.eng[0].ang = (s.eng[0].ang + 1200 / 60 * 2 * Math.PI / 60) % (2 * Math.PI);
    ac.update(s, { dt: 1 / 60 });
    steps.push(wrap(pattern() - was)); was = pattern();
  }
  assert.ok(steps.every(d => d < -0.05 && d > -0.3 && Math.abs(d - steps[0]) < 1e-9), `a slow, even drift: ${steps[0]} rad a frame`);
  s.eng[0].ang = 2.5; ac.update(s, { dt: 0 });
  assert.ok(Math.abs(wrap(pattern() - was)) < 1e-9, 'paused: the pattern stays');
  s.eng[0].rpm = 700; ac.update(s, { dt: 1 / 60 });
  assert.equal(U.uPhase.value, 0, 'back on the blades below 900 rpm');
  // rpmVisual overrides the physics both ways (an engine start, a stop)
  s.eng[0].rpm = 2300; ac.update(s, { dt: 1 / 60, rpmVisual: 0 });
  assert.equal(disc.visible, false); assert.equal(blades.visible, true);
  s.eng[0].rpm = 0; ac.update(s, { dt: 1 / 60, rpmVisual: 2300 });
  assert.equal(disc.visible, true); assert.equal(blades.visible, false);
  assert.equal(ac.rpm, 2300);

  // the direction: blade 0 points up at angle 0; as the angle grows its tip goes to +x (the right, seen from the seat
  // looking along −z) — clockwise, as a Lycoming turns. acmesh alone would turn it the other way.
  const tip = () => { blades.updateWorldMatrix(true, false); return new THREE.Vector3(0, 0.02 + 0.9, -3.34).applyMatrix4(blades.matrixWorld); };
  s.eng[0].rpm = 2300; s.eng[0].ang = 0; ac.update(s, { dt: 0 });
  const t0 = tip();
  assert.ok(Math.abs(t0.x) < 1e-6 && t0.y > 0.9, 'blade 0 up at angle 0');
  s.eng[0].ang = 0.3; ac.update(s, { dt: 0 });
  const t1 = tip();
  assert.ok(Math.abs(t1.x - 0.9 * Math.sin(0.3)) < 1e-6, `tip x ${t1.x}: clockwise from the cockpit`);
  assert.ok(Math.abs(ac.parts.prop.parent.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.3))) < 1e-6, 'the pivot turns by −angle');
  // a physics step turns it the same way
  const s2 = state('pa28', 2300); P.step(s2, 1 / 120); ac.update(s2, { dt: 0 });
  assert.ok(s2.eng[0].ang > 0 && tip().x > 0, 'after a physics step');
  // and rpmVisual turns it the same way too, by rpm and dt
  s.eng[0].ang = 0; ac.update(s, { dt: 0 });
  ac.update(s, { dt: 0.01, rpmVisual: 120 });
  const want = 120 / 60 * 2 * Math.PI * 0.01;
  assert.ok(Math.abs(tip().x - 0.9 * Math.sin(want)) < 1e-6, `rpmVisual: tip x ${tip().x}`);
  ac.dispose();

  // the twin: counter-rotating, the right engine (eng 1) the other way
  const tw = liveAircraft(FL, AC('pa44')), st = state('pa44', 2400, 0.3);
  tw.update(st, { dt: 0 });
  const tipOf = (b, c) => { b.updateWorldMatrix(true, false); return new THREE.Vector3(c[0], c[1] + 0.9, c[2]).applyMatrix4(b.matrixWorld).x - c[0]; };
  const e = AC('pa44').engines[0];
  const [left, right] = tw.parts.props;
  assert.ok(tipOf(left, [-e.x, e.y, e.z]) > 0.2, 'left engine clockwise from behind');
  assert.ok(tipOf(right, [e.x, e.y, e.z]) < -0.2, 'right engine counter-clockwise from behind');
  tw.update(st, { dt: 0.01, rpmVisual: [0, 2400] });
  assert.equal(tw.parts.discs[0].visible, false); assert.equal(tw.parts.discs[1].visible, true, 'rpmVisual per engine');
  // with the blades hidden, each disc's pattern drifts its own engine's way (the physics' angles held still here)
  const UL = discU(tw.parts.discs[0]), UR = discU(tw.parts.discs[1]);
  st.eng[0].rpm = st.eng[1].rpm = 2400; tw.update(st, { dt: 1 / 60 });
  const pl = UL.uPhase.value, pq = UR.uPhase.value;
  tw.update(st, { dt: 1 / 60 });
  assert.ok(wrap(UL.uPhase.value - pl) < -0.05 && wrap(UR.uPhase.value - pq) > 0.05, 'the twin\'s patterns drift opposite ways');
  tw.dispose();
});

test('exterior: the cabin split keeps every triangle; the cockpit view takes the cabin away', () => {
  for (const id of ['pa28', 'pa44']) {
    const A = AC(id), body = FL.acmesh.buildParts(A).find(p => p.name === 'body').mesh, n = body.count / 3;
    const zRear = cabinRear(A);
    assert.ok(A.fuse.some(f => f[0] === zRear) && zRear >= A.eye[2] + 2.05 - 1e-9, `${id}: the cabin ends at a ring behind the cockpit (${zRear})`);
    const { cabin, rest } = splitBody(body, A);
    assert.equal(cabin.length + rest.length, n, `${id}: every triangle once`);
    assert.equal(new Set([...cabin, ...rest]).size, n);
    const glass = t => [0, 3, 6].every(v => Math.abs(body.col[t * 9 + v] - 0.10) < 1e-4 && Math.abs(body.col[t * 9 + v + 2] - 0.19) < 1e-4);
    const cz = t => (body.pos[t * 9 + 2] + body.pos[t * 9 + 5] + body.pos[t * 9 + 8]) / 3;
    assert.equal(cabin.filter(glass).length, 14, `${id}: the six side panes and the windscreen (14 triangles)`);
    assert.equal(rest.filter(glass).length, 0);
    assert.ok(cabin.every(t => cz(t) < zRear), `${id}: nothing aft of the cabin's rear ring`);
    // the live model: the two meshes are the body exactly (plus the fixed parts merged into it, the Archer's gear)
    const ac = liveAircraft(FL, A), parts = FL.acmesh.buildParts(A);
    const fixedTris = ac.parts.fixed.reduce((k, name) => k + parts.find(p => p.name === name).mesh.count / 3, 0);
    assert.equal(fixedTris, id === 'pa28' ? 3 * 216 : 0);
    assert.equal(tris(ac.parts.body.geometry) + tris(ac.parts.cabin.geometry), n + fixedTris);
    assert.equal(tris(ac.parts.cabin.geometry), cabin.length);
    const bb = new THREE.Box3().setFromObject(ac.parts.body, true), cb = new THREE.Box3().setFromObject(ac.parts.cabin, true);
    assert.ok(bb.max.x > A.wing.tipX - 0.01 && bb.max.y > A.vstab.y1 - 0.05, `${id}: the wings and the fin stay outside`);
    assert.ok(cb.max.x < 0.7 && cb.max.z <= zRear + 1e-6, `${id}: the cabin is fuselage only`);
    if (id === 'pa28') assert.ok(cb.min.z < A.engines[0].z - 0.3, 'the nose cowling is part of it (the cockpit draws its own)');
    // outside: drawn and casting; inside: neither, and the disc fainter; back out: as before
    assert.equal(ac.inside, false);
    assert.ok(ac.cabin.visible && ac.cabin.castShadow);
    const gain = () => discU(ac.parts.disc).uGain.value;
    const gOut = gain();
    ac.setInside(true);
    assert.ok(!ac.cabin.visible && !ac.cabin.castShadow && ac.inside);
    assert.ok(gain() < gOut, 'the disc is fainter from the seat');
    assert.ok(ac.parts.body.visible && ac.parts.body.castShadow, 'the wings and the tail still cast');
    ac.update(state(id), { inside: false });
    assert.ok(ac.cabin.visible && ac.cabin.castShadow && !ac.inside && gain() === gOut);
    ac.update(state(id), { inside: true });
    assert.ok(!ac.cabin.visible);
    ac.update(state(id), {});
    assert.ok(!ac.cabin.visible, 'no `inside` given: unchanged');
    ac.dispose();
  }
});

test('exterior: the lights — colours, the beacon each second, the strobes\' double flash, nothing missed at low fps', () => {
  const ac = liveAircraft(FL, AC('pa28')), s = state('pa28', 2300);
  const sh = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>' };
  ac.parts.lights.material.onBeforeCompile(sh);
  const lens = sh.uniforms.uLens.value, glow = ac.parts.glow.material.uniforms.uL.value;
  const ids = ac.spots.map(x => x.id), G = id => glow[ids.indexOf(id)];
  const sum = v => v.x + v.y + v.z;
  ac.update(s, { dt: 1 / 60 });
  assert.ok(glow.every(v => sum(v) === 0) && lens.every(v => sum(v) === 0), 'all off without `lights`');
  ac.update(s, { dt: 1 / 60, lights: { nav: true } });
  assert.ok(G('navL').x > 10 * G('navL').y && G('navR').y > 5 * G('navR').x && G('tail').x > 0.5 && G('tail').z > 0.5, 'red, green, white');
  assert.ok(sum(G('beacon')) === 0 && sum(G('landing')) === 0 && sum(G('strobeL')) === 0, 'only the nav lights');
  assert.ok(lens[0].x > 1 && lens[1].y > 1 && sum(lens[2]) > 1 && sum(lens[3]) === 0, 'their lenses glow');
  ac.update(s, { dt: 1 / 60, lights: { landing: 1, taxi: 0.5 } });
  assert.ok(sum(G('landing')) > 2 * sum(G('taxi')) && sum(G('taxi')) > 0 && sum(lens[4]) > 0 && sum(lens[5]) > 0, 'landing and taxi');
  assert.ok(G('landing').w > 0, 'a halo size');
  // flashes counted as rising edges over a long run, at several frame rates (the strobe's count starts between flashes,
  // so a run of ten periods holds exactly twenty)
  const count = (id, secs, fps, frac = 0.5) => {
    let n = 0, was = false, peak = 0;
    const vals = [];
    if (id.startsWith('strobe')) for (let i = 0; i < 1000; i++) { ac.update(s, { dt: 1 / fps, lights: ALL }); if (sum(G(id)) === 0) break; }
    for (let i = 0; i < secs * fps; i++) { ac.update(s, { dt: 1 / fps, lights: ALL }); const v = sum(G(id)); vals.push(v); peak = Math.max(peak, v); }
    for (const v of vals) { const on = v > peak * frac; if (on && !was) n++; was = on; }
    return n;
  };
  for (const fps of [144, 60, 30]) {
    const b = count('beacon', 19, fps);
    assert.ok(b >= 19 && b <= 21, `beacon at ${fps} fps: ${b} flashes in 19 s`);
    const st = count('strobeL', 12, fps);
    assert.equal(st, 20, `strobes at ${fps} fps: ${st} flashes in 12 s (ten double flashes)`);
  }
  // the strobe also lights the nav lenses white for its flash, and paused (dt 0) nothing moves
  let seen = false;
  for (let i = 0; i < 200 && !seen; i++) { ac.update(s, { dt: 1 / 60, lights: ALL }); seen = sum(G('strobeL')) > 0; }
  assert.ok(seen && lens[0].z > 10, 'the white flash in the left lens');
  const snap = glow.map(v => v.toArray().join());
  for (let i = 0; i < 10; i++) ac.update(s, { dt: 0, lights: ALL });
  assert.deepEqual(glow.map(v => v.toArray().join()), snap, 'paused: frozen');
  ac.dispose();
});

test('exterior: update() works on the same objects every frame (no allocation)', () => {
  const ac = liveAircraft(FL, AC('pa44')), s = state('pa44', 2400);
  const objs = [];
  ac.root.traverse(o => objs.push(o.position, o.quaternion, o.scale, o.matrix, o.geometry || null, o.material || null));
  const lensU = (() => { const sh = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>' }; ac.parts.lights.material.onBeforeCompile(sh); return sh.uniforms.uLens.value; })();
  const glowU = ac.parts.glow.material.uniforms.uL.value;
  objs.push(...lensU, ...glowU);
  const P3 = [THREE.Vector3, THREE.Vector4, THREE.Quaternion, THREE.Matrix4, THREE.Euler, THREE.Color].map(C => C.prototype), orig = P3.map(p => p.clone);
  let clones = 0;
  P3.forEach((p, i) => { p.clone = function () { clones++; return orig[i].call(this); }; });
  try {
    for (let i = 0; i < 600; i++) {
      s.ail = Math.sin(i * 0.05); s.elev = Math.cos(i * 0.03) * 0.5; s.rud = Math.sin(i * 0.02); s.flapDeg = (i % 300) / 10; s.gearPos = (i % 200) / 200;
      for (const e of s.eng) { e.rpm = 600 + 3 * i; e.ang = i * 0.7; }
      ac.update(s, { dt: 1 / 60, lights: i % 100 < 50 ? ALL : null, inside: i % 240 < 120, rpmVisual: i % 90 < 30 ? [1000, 300 + i] : null });
    }
  } finally { P3.forEach((p, i) => { p.clone = orig[i]; }); }
  assert.equal(clones, 0, 'clone() during update()');
  const after = [];
  ac.root.traverse(o => after.push(o.position, o.quaternion, o.scale, o.matrix, o.geometry || null, o.material || null));
  after.push(...lensU, ...glowU);
  assert.equal(after.length, objs.length);
  after.forEach((o, i) => assert.ok(o === objs[i], `object ${i} was replaced`));
  for (const o of glowU) assert.ok(o.toArray().every(Number.isFinite));
  // and the per-frame code has no constructors, clones, spreads, closures, literals or iterators in it
  const src = liveAircraft.toString(), body = src.slice(src.indexOf('// ---- per frame'), src.indexOf('// ---- end of the per-frame code')).replace(/\/\/.*$/gm, '');
  assert.ok(body.length > 1500, 'found the per-frame code');
  for (const [re, what] of [[/\bnew\s/, 'new'], [/\.clone\(/, 'clone()'], [/\.\.\./, 'spread'], [/=>/, 'closure'], [/\[\s*\]|\{\s*\}/, 'literal'], [/\bof\b/, 'for…of']]) {
    assert.ok(!re.test(body), `${what} in the per-frame code`);
  }
  // bad input does no harm
  const bad = state('pa44'); bad.eng = [];
  for (const o of [undefined, null, { dt: NaN }, { dt: -1, rpmVisual: NaN }, { dt: 99, rpmVisual: [NaN] }, { lights: { nav: 'x', beacon: NaN } }]) ac.update(bad, o);
  ac.root.traverse(o => assert.ok(o.quaternion.toArray().every(Number.isFinite), `${o.name}: finite`));
  for (const o of glowU) assert.ok(o.toArray().every(Number.isFinite));
  ac.dispose();
});

test('exterior: struts and hub caps read as metal; the blades keep their yellow tips', () => {
  const lin = c => c.map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  assert.equal(paintClass(lin([0.72, 0.73, 0.75])), 'metal', 'acmesh struts');
  assert.equal(paintClass(lin([0.75, 0.75, 0.78])), 'metal', 'acmesh hub caps');
  for (const [c, k] of [[[0.94, 0.94, 0.92], 'paint'], [[0.95, 0.95, 0.94], 'paint'], [[0.13, 0.32, 0.62], 'paint'], [[0.85, 0.62, 0.18], 'paint'], [[0.62, 0.12, 0.16], 'paint'],
    [[0.20, 0.22, 0.28], 'paint'], [[0.10, 0.14, 0.19], 'glass'], [[0.09, 0.09, 0.1], 'rubber']]) assert.equal(paintClass(lin(c)), k, `${c} is ${k}`);
  // the paint shader uses the same tolerance (both for roughness and metalness)
  const ac = liveAircraft(FL, AC('pa28'));
  const sh = { fragmentShader: '#include <roughnessmap_fragment>\n#include <lights_physical_fragment>\n#include <metalnessmap_fragment>' };
  ac.parts.body.material.onBeforeCompile(sh);
  assert.equal(sh.fragmentShader.split('step(abs(vColor.r - vColor.b), 0.060)').length - 1, 2, 'metal tolerance in the shader');
  // every gear leg has metal-coloured triangles (the Archer's are in its body mesh, the twin's on their hinges); the
  // propeller's material keeps the vertex colours (yellow tips)
  const metalIn = g => { const c = g.attributes.color; let k = 0; for (let i = 0; i < c.count; i++) if (paintClass([c.getX(i), c.getY(i), c.getZ(i)]) === 'metal') k++; return k; };
  assert.equal(metalIn(ac.parts.body.geometry), 216 + 360, 'the Archer\'s three legs: struts and hub caps (vertices)');
  assert.equal(metalIn(ac.parts.cabin.geometry), 0);
  const tw = liveAircraft(FL, AC('pa44'));
  for (const g of ['gearN', 'gearR', 'gearL']) { const k = metalIn(tw.parts[g].geometry); assert.ok(k > 30, `pa44 ${g}: ${k} metal vertices`); }
  tw.dispose();
  assert.equal(ac.parts.prop.material.vertexColors, true);
  const pc = ac.parts.prop.geometry.attributes.color;
  let yellow = 0; for (let i = 0; i < pc.count; i++) if (pc.getX(i) > 0.5 && pc.getZ(i) < 0.1) yellow++;
  assert.ok(yellow >= 24, `${yellow} yellow tip vertices`);
  ac.dispose();
});

test('exterior: the parked aircraft are unchanged (two baked meshes, the same triangles and colliders)', () => {
  const L = makeLayout(P), G = P.GROUND_M, cy = Math.cos(L.frameYaw), sy = Math.sin(L.frameYaw), toFrame = (x, z) => [x * cy - z * sy, x * sy + z * cy];
  const hdg = (L.R.trueHdg + 270) % 360;
  // measured from the code before the flown aircraft was added
  const REF = { pa28: { tris: 2018, boxes: 59, hash: -150336.043077, at: [636.5, 207.6], parts: 11 }, pa44: { tris: 2066, boxes: 69, hash: -190275.448182, at: [655, 167.6], parts: 12 } };
  for (const id of ['pa28', 'pa44']) {
    const R = REF[id], ac = parkedAircraft(FL, L, id, R.at[0], R.at[1], hdg, { prop: 1.3 });
    const meshes = [];
    ac.root.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 2, `${id}: baked into two meshes`);
    assert.ok(meshes.every(m => m.name === 'aircraft-baked' && m.castShadow && m.receiveShadow));
    assert.equal(meshes.reduce((n, m) => n + tris(m.geometry), 0), R.tris, `${id}: triangles`);
    const boxes = colliderBoxes(ac.root, toFrame, G);
    let h = 0; for (const b of boxes) h += b.x0 * 1.3 + b.x1 * 1.7 + b.z0 * 2.1 + b.z1 * 2.9 + b.y0 * 3.3 + b.y1 * 3.7;
    assert.equal(boxes.length, R.boxes, `${id}: collider boxes`);
    assert.ok(Math.abs(h - R.hash) < 1e-3, `${id}: the same boxes (${h})`);
    const m = buildAircraftModel(FL, AC(id)), names = [];
    m.root.traverse(o => { if (o.isMesh) names.push(o.name); });
    assert.equal(names.length, R.parts, `${id}: a mesh per part`);
    assert.ok(!names.includes('disc'), 'no disc on a parked aircraft');
  }
});
