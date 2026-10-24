// CADET — the guide (career/guide.js, node --test): what to do next for each kind of day and moment (the first day, a
// class, a flying day from the dispatch's go / no-go to boarding, the check ride, a day off, the day done), and the way
// there through the academy's doors (from briefing room 1 to the dispatch, to the apron, nothing inside one room).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { academySpec } from '../src/content/academy-spec.js';
import { nextStep, makeRouter } from '../src/career/guide.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const S = academySpec(globalThis.FL);
const item = (kind, slot, state = 'now', o = {}) => ({ kind, slot, state, id: 'x', title: o.title || kind, where: o.where || null, who: o.who || null });

test('guide: the next thing to do, for each moment of a day', () => {
  // the first morning: the welcome in the lobby
  let g = nextStep({ chapter: 'prologue', slot: 'morning', plan: [item('ceremony', 'morning'), item('tour', 'am', 'later'), item('brief', 'pm', 'later')] });
  assert.deepEqual([g.who, g.room, g.at], ['chief', 'lobby', 'person']); assert.match(g.text, /主任教官/);
  // later in the day: the plan's next (the afternoon's, said as the afternoon's)
  g = nextStep({ chapter: 'prologue', slot: 'am', plan: [item('ceremony', 'morning', 'done'), item('tour', 'am', 'done'), item('brief', 'pm', 'later')] });
  assert.equal(g.who, 'instructor'); assert.match(g.text, /^午後：/);
  // a class
  g = nextStep({ chapter: 'ch1', slot: 'am', plan: [item('class', 'am', 'now', { title: '座学（2 / 6）' }), item('ftd', 'pm', 'later')] });
  assert.deepEqual([g.who, g.room], ['lecturer', 'brief-2']);
  // a flying day: the go / no-go first, then the briefing, the walk-around, boarding
  const fly = { chapter: 'ch2', slot: 'am', plan: [item('flight', 'am')] };
  assert.equal(nextStep({ ...fly, decided: false }).who, 'dispatcher');
  assert.deepEqual([nextStep({ ...fly, decided: true, briefed: false }).who, nextStep({ ...fly, decided: true, briefed: false }).room], ['instructor', 'brief-1']);
  g = nextStep({ ...fly, decided: true, briefed: true, walk: { done: 4, total: 15 } });
  assert.equal(g.at, 'walk'); assert.match(g.text, /4 \/ 15/);
  assert.equal(nextStep({ ...fly, decided: true, briefed: true, walk: { done: 15, total: 15 } }).at, 'board');
  // the check ride's briefing is the chief instructor's
  assert.equal(nextStep({ chapter: 'ch2', slot: 'am', plan: [item('checkride', 'am')], decided: true, briefed: false }).who, 'chief');
  // a day off; the day's work done (home through the front doors)
  assert.equal(nextStep({ chapter: 'ch2', slot: 'am', plan: [item('off', 'am')] }).at, 'entrance');
  g = nextStep({ chapter: 'ch2', slot: 'pm', plan: [item('flight', 'am', 'done')] });
  assert.equal(g.at, 'entrance'); assert.match(g.text, /寮/);
  // every step says something
  for (const k of ['ceremony', 'tour', 'brief', 'class', 'ftd', 'exam', 'study']) assert.ok(nextStep({ chapter: 'ch1', slot: 'am', plan: [item(k, 'am', 'now', { where: 'planning' })] }).text.length > 4, k);
});

test('guide: the way through the academy\'s doors', () => {
  const R = makeRouter(S);
  // from briefing room 1 to the dispatch: out through briefing room 1's own door first
  assert.equal(R.next('brief-1', 'dispatch').door, 'd-brief-1');
  // then from the corridor to the lobby, and from the lobby through the dispatch's door
  assert.equal(R.next('corridor-s', 'dispatch').door, 'o-south');
  assert.match(R.next('lobby', 'dispatch').door, /^d-dispatch/);
  // out to the apron from the lobby: the airside doors; from outside into briefing room 1: in through the lobby
  assert.equal(R.next('lobby', 'outside').door, 'x-airside');
  assert.ok(['x-airside', 'x-main'].includes(R.next('outside', 'brief-1').door));
  // in the room already: nothing; a locked or closed room: no way
  assert.equal(R.next('lobby', 'lobby'), null);
  assert.equal(R.next('lobby', 'stairs'), null);
  // every door's middle is on the door's line
  const d = R.next('brief-1', 'lobby'); assert.ok(Math.abs(d.c - 261.0) < 1e-9 && d.a > 642.6 && d.a < 643.6);
  // rooms have centres
  assert.ok(R.centre('dispatch').a > 664 && R.centre('dispatch').a < 676);
});
