// FLIGHT LAB — next-wave item 2: the practical emergency lessons (e4 forced landing off-field, i8 partial
// panel with compass / timed turns, e6 the rejected-takeoff decision drill). The scripted pilot flies each
// at the basic level and must pass — the same bar every scored lesson is held to.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';
import { runLesson } from './bot.mjs';
const FL = load(...CORE);
const SC = FL.school, SY = FL.syllabus;

test('emergency lessons exist in the syllabus, in their stages, with fixed lesson wind (no wind in setup)', () => {
  const s1 = SY.STAGES.find(s => s.id === 's1'), s3 = SY.STAGES.find(s => s.id === 's3'), s4 = SY.STAGES.find(s => s.id === 's4');
  assert.ok(s1.lessons.some(l => l.id === 'e4'), 'e4 in stage 1 (with e1–e3)');
  assert.ok(s3.lessons.some(l => l.id === 'i8'), 'i8 in stage 3 (instruments)');
  assert.ok(s4.lessons.some(l => l.id === 'e6'), 'e6 in stage 4 (Seminole)');
  for (const id of ['e4', 'i8', 'e6']) {
    const l = SC.lesson(id);
    assert.ok(l && l.steps && l.why && l.brief && l.std, `${id}: a full lesson`);
    assert.ok(!('wind' in (l.setup || {})), `${id}: the scored lesson's wind stays the fixed lesson wind`);
  }
});

test('e4: the bot selects the field, holds best glide and puts it down in the field zone', () => {
  const L = runLesson(FL, 'e4', 'basic', 1200);
  assert.ok(L.done && L.passed, `e4 passed: ${L.grade} ${L.reason} ${JSON.stringify(L.results.flatMap(r => r.rows).filter(r => !r.pass))}`);
  const rows = L.results.flatMap(r => r.rows);
  assert.ok(rows.some(r => /応答/.test(r.name)), 'the selection was answered (the atc step ran)');
  const zone = rows.find(r => /接地点/.test(r.name));
  assert.ok(zone && zone.pass, `touchdown in the zone: ${zone && zone.val}`);
  const m = /(\d+) m/.exec(zone.val); assert.ok(m && +m[1] <= 700, `touchdown ${m && m[1]} m from the field centre`);
  assert.ok(rows.find(r => /接地の降下率/.test(r.name)).pass, 'the touchdown sink');
  assert.ok(rows.find(r => /接地の方向/.test(r.name)).pass, 'into wind');
  assert.equal(L.fail.engine !== undefined, true, 'the engine really failed (failNow)');
});

test('i8: AHRS and GPS both fail, and the bot flies compass and timed turns on the standby instruments', () => {
  const L = runLesson(FL, 'i8', 'basic', 1200);
  assert.ok(L.done && L.passed, `i8 passed: ${L.grade} ${L.reason} ${JSON.stringify(L.results.flatMap(r => r.rows).filter(r => !r.pass))}`);
  assert.equal(L.av.fail.ahrs, true, 'AHRS failed');
  assert.equal(L.av.fail.gps, true, 'GPS failed');
  const rows = L.results.flatMap(r => r.rows);
  const timed = rows.find(r => /旋回時間（計時）/.test(r.name));
  assert.ok(timed && timed.pass, `timed turn: ${timed && timed.val} (${timed && timed.std})`);
  assert.equal(rows.filter(r => /ロールアウト（航跡）/.test(r.name) && r.pass).length, 3, 'three graded roll-outs (timed + two compass turns)');
});

test('e6: the bot rejects before Vr, estimates the runway remaining, then continues on one engine', () => {
  const L = runLesson(FL, 'e6', 'basic', 1200);
  assert.ok(L.done && L.passed, `e6 passed: ${L.grade} ${L.reason} ${JSON.stringify(L.results.flatMap(r => r.rows).filter(r => !r.pass))}`);
  const rows = L.results.flatMap(r => r.rows);
  assert.ok(rows.find(r => /アイドルまで/.test(r.name)).pass, 'idle within 2 s on the reject');
  const rem = rows.find(r => /滑走路の残量/.test(r.name));
  assert.ok(rem && /約 \d+ m/.test(rem.val), `the remaining is reported from the stop position: ${rem && rem.val}`);
  assert.ok(L.results.some(r => /無線（復唱）/.test(r.step) && r.rows.every(x => x.pass)), 'the runway-remaining estimate answered right');
  assert.ok(rows.find(r => /継続の判断/.test(r.name)).pass, 'after liftoff it kept flying');
  const dead = L.s.eng.find(e => e.failed);
  assert.ok(dead && dead.feather, 'the dead engine is feathered');
  assert.ok(L.s.eng.every(e => !e.feather || e.failed), 'the live engine is not feathered');
});
