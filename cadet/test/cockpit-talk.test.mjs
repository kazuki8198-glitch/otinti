// CADET — the instructor in the aircraft (content/dialog/cockpit.js): the boarding talk passes the dialogue validator,
// every way through it ends with exactly one 'fly' choice told to the game, and in flight the lesson's instructions are
// said with the controls' names instead of the keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { NOT_SPOKEN } from '../src/content/dialog/instructor.js';
import { cockpitDialogs, flightLine, debriefLine, FLY_CHOICES } from '../src/content/dialog/cockpit.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { loadFL, CORE, GAME_REST } from './helpers/fl.mjs';

loadFL(CORE);
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, SC = FL.school;
const REAL = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|all\s*nippon|全日空|acron/i;

test('cockpit talk: valid data; every way through ends with one fly choice', () => {
  const data = cockpitDialogs(FL);
  const { errors, warnings } = validateDialogs(data, { lessonExists: (id) => !!SC.lesson(id) });
  assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
  const titles = ['t1', 'a2', 't3'].map(id => SC.lesson(id).title);
  // the ways through the menu (the choice made at each question) and the fly choice each tells
  const PATHS = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2], [3]];
  for (const briefed of [false, true]) {
    PATHS.forEach((path, k) => {
      const told = [], said = [];
      const state = createDialogState(briefed ? { v: 1, flags: { briefed_today: true } } : null);
      const r = createRunner({ data, state, hooks: { onHook: (n, a) => { if (n === 'fly') told.push(a); } } });
      r.start('board');
      let q = 0;
      for (let i = 0; i < 20 && r.running; i++) {
        const v = r.view(); said.push(v.text);
        if (v.choices.length) r.choose(v.choices[path[q++]].i); else r.next();
      }
      assert.equal(r.running, false, 'the talk ends');
      assert.deepEqual(told, [FLY_CHOICES[k]], `path ${path}`);
      const all = said.join('\n');
      for (const t of titles) assert.ok(all.includes(t), `names today's lesson ${t}`);
      assert.equal(/ブリーフィングはまだ/.test(all), !briefed);
      assert.ok(!REAL.test(all) && !NOT_SPOKEN.test(all), all);
    });
  }
  // the day's two questions in the air: each way tells the game one 'go'
  for (const d of ['transit', 'return']) for (const k of [0, 1]) {
    const go = []; const r = createRunner({ data, state: createDialogState(), hooks: { onHook: (n, a) => { if (n === 'go') go.push(a); } } });
    r.start(d);
    for (let i = 0; i < 10 && r.running; i++) { const v = r.view(); if (v.choices.length) r.choose(v.choices[k].i); else r.next(); }
    assert.deepEqual(go, [k ? 'fly' : 'skip'], `${d} ${k}`);
  }
  assert.throws(() => cockpitDialogs(FL, { lessonId: 'zz' }));
});

test('cockpit talk: the lesson\'s instructions without keyboard keys, for every flight lesson', () => {
  const keyLeft = /(?<![A-Za-z0-9-])[WASDQERFTVBGLUZX](?![A-Za-z0-9-])\s*(?:[/／]|で|を|キー|（|\(|。|、|$)/;
  let n = 0;
  for (const id of SC.lessonOrder()) {
    const def = SC.lesson(id); if (!def || !def.steps) continue;
    const L = SC.startLesson(id, 'basic');
    for (const S of def.steps) {
      if (!S.say) continue;
      const line = flightLine(SC.fillText(S.say, L));
      n++;
      assert.ok(line.length > 3, `${id} ${S.name}: empty`);
      assert.ok(!keyLeft.test(line), `${id} ${S.name}: a key is left in "${line}"`);
      assert.ok(!/undefined|NaN|\{/.test(line), `${id} ${S.name}: "${line}"`);
    }
  }
  assert.ok(n > 60, `${n} instructions`);
  assert.equal(flightLine('W / S で高度 3,000 ft を保ち、昇降率が 0 付近になったら T。手を離して保つ'), '機首の上げ下げで高度 3,000 ft を保ち、昇降率が 0 付近になったらトリム。手を離して保ちます。');
  assert.equal(flightLine('高度が 60 ft 高い：機首を 1〜2° 下げる（W を軽く）'), '高度が 60 ft 高い：機首を 1〜2° 下げます。');
  assert.equal(flightLine('何も操作せず、PFD の姿勢表示・速度・高度・昇降率がどう動くか 10 秒観察'), '何も操作せず、PFD の姿勢表示・速度・高度・昇降率がどう動くか 10 秒観察します。');
});

test('cockpit talk: the first words after a lesson', () => {
  assert.equal(debriefLine(null), '');
  assert.equal(debriefLine({ done: false }), '');
  assert.match(debriefLine({ done: true, passed: true, grade: 'S' }), /お見事/);
  assert.match(debriefLine({ done: true, passed: true, grade: 'A' }), /合格/);
  assert.match(debriefLine({ done: true, passed: false, grade: 'C' }), /惜しかった/);
  assert.match(debriefLine({ done: true, passed: false, grade: '―' }), /ここまで/);
  assert.match(debriefLine({ done: true, crashed: true }), /大丈夫/);
});

test('day talk (M4–M5): the briefing within the day, the apron, the questions in the air, the day\'s lines — valid, polite, no keys or real names', async () => {
  loadFL(GAME_REST);                 // the rest of what the game reads
  const { instructorDialogs } = await import('../src/content/dialog/instructor.js');
  const { apronDialogs, dayDialogs, PHASE_LINES, ASSIST_LINES, EVENT_LINES, RECOVER_LINE, SOLO_LINES } = await import('../src/content/dialog/day1.js');
  const { STEPS } = await import('../src/career/day.js');
  for (const data of [instructorDialogs(FL, { lessonId: 'a2', day: ['t1', 'a2', 't3'] }), apronDialogs(), dayDialogs()]) {
    const { errors, warnings } = validateDialogs(data, { lessonExists: (id) => !!SC.lesson(id), sectionExists: () => true });
    assert.deepEqual(errors, []);
    assert.ok(warnings.every(w => !/never|unreach/.test(w)), warnings.join('\n'));
  }
  const brief = JSON.stringify(instructorDialogs(FL, { lessonId: 'a2', day: ['t1', 'a2', 't3'] }));
  assert.ok(brief.includes(SC.lesson('t1').title) && brief.includes(SC.lesson('t3').title) && /外部点検/.test(brief));
  const lines = [...Object.values(PHASE_LINES), ...Object.values(ASSIST_LINES), RECOVER_LINE, ...Object.values(EVENT_LINES).map(v => (typeof v === 'function' ? v('タイヤの空気が足りません。') : v))];
  for (const k of [...Object.keys(PHASE_LINES), ...Object.keys(SOLO_LINES)]) assert.ok(STEPS[k], `a line for an unknown step ${k}`);
  // the first solo's reminders: the cadet's own short notes (no one to say them to)
  for (const l of Object.values(SOLO_LINES)) { assert.ok(!REAL.test(l) && !/FLIGHT LAB|ゲーム|ソフト/.test(l), l); assert.match(l, /。$/, l); }
  for (const l of lines) {
    assert.ok(!REAL.test(l), l);
    assert.ok(!/FLIGHT LAB|ゲーム|ソフト|シミュレータ/.test(l), `talks about the game: ${l}`);
    assert.match(l, /(です|ます|ください|ましょう|ね|。|！|control。?)$/, l);
  }
});

test('cockpit talk in the career (M5): ready, not ready, the check ride — valid, and the day\'s questions in the air are there', async () => {
  const { careerBoardDialogs } = await import('../src/content/dialog/cockpit.js');
  for (const o of [{ lessons: ['t1', 'a2', 't3'], ready: true }, { reason: 'weather' }, { lessons: ['c1', 't3'], checkride: true, who: '真壁 主任教官' }]) {
    const data = careerBoardDialogs(FL, o);
    const { errors } = validateDialogs(data, { lessonExists: (id) => !!SC.lesson(id), sectionExists: () => true });
    assert.deepEqual(errors, [], JSON.stringify(o));
    for (const id of ['board', 'transit', 'return', 'pattern']) assert.ok(data.dialogs[id], `${id}: ${JSON.stringify(o)}`);
  }
});
