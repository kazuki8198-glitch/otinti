// CADET — the instructor in the aircraft (content/dialog/cockpit.js): the boarding talk passes the dialogue validator,
// every way through it ends with exactly one 'fly' choice told to the game, and in flight the lesson's instructions are
// said with the controls' names instead of the keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { NOT_SPOKEN } from '../src/content/dialog/instructor.js';
import { cockpitDialogs, flightLine, debriefLine, FLY_CHOICES } from '../src/content/dialog/cockpit.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
const FL = globalThis.FL, SC = FL.school;
const REAL = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|all\s*nippon|全日空|acron/i;

test('cockpit talk: valid data; every way through ends with one fly choice', () => {
  const data = cockpitDialogs(FL, { lessonId: 'a1' });
  const { errors, warnings } = validateDialogs(data, { lessonExists: (id) => !!SC.lesson(id) });
  assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
  const lesson = FL.syllabus.STAGES.flatMap(s => s.lessons).find(l => l.id === 'a1');
  for (const briefed of [false, true]) {
    for (let k = 0; k < FLY_CHOICES.length; k++) {
      const told = [], said = [];
      const state = createDialogState(briefed ? { v: 1, flags: { briefed_today: true } } : null);
      const r = createRunner({ data, state, hooks: { onHook: (n, a) => { if (n === 'fly') told.push(a); } } });
      r.start('board');
      for (let i = 0; i < 20 && r.running; i++) {
        const v = r.view(); said.push(v.text);
        if (v.choices.length) r.choose(v.choices[k].i); else r.next();
      }
      assert.equal(r.running, false, 'the talk ends');
      assert.deepEqual(told, [FLY_CHOICES[k]], `choice ${k}`);
      const all = said.join('\n');
      assert.ok(all.includes(lesson.title), 'names today\'s lesson');
      assert.equal(/ブリーフィングはまだ/.test(all), !briefed);
      assert.ok(!REAL.test(all) && !NOT_SPOKEN.test(all), all);
    }
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
  assert.equal(flightLine('W / S で高度 3,000 ft を保ち、昇降率が 0 付近になったら T。手を離して保つ'), '機首の上げ下げで高度 3,000 ft を保ち、昇降率が 0 付近になったらトリム。手を離して保つ');
  assert.equal(flightLine('高度が 60 ft 高い：機首を 1〜2° 下げる（W を軽く）'), '高度が 60 ft 高い：機首を 1〜2° 下げる');
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
