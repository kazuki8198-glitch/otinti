// CADET — TEM (M6): today's threat from the day (career/tem.js), the instructor's question before the flight (the
// 'day' and 'xc' talks of content/dialog/instructor-career.js) and the debrief's line (content/dialog/debrief.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { temFor, errorsOf, THREATS } from '../src/career/tem.js';
import { careerInstructorDialogs, CAREER_SAMPLE } from '../src/content/dialog/instructor-career.js';
import { debriefDialogs } from '../src/content/dialog/debrief.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';

const base = { weather: 'good', fatigue: 20, chapter: 'ch3', aircraft: 'pa28', check: false, xc: false, day: 50 };

test('tem: today\'s threat — the day\'s most pressing, three options with today\'s among them, the others not today\'s', () => {
  const cases = [
    [{}, 'traffic'], [{ weather: 'pmStorm' }, 'storm'], [{ weather: 'lowCloud', chapter: 'ch4' }, 'cloud'], [{ weather: 'crosswind' }, 'wind'],
    [{ weather: 'amFog' }, 'fog'], [{ fatigue: 60 }, 'tired'], [{ xc: true }, 'nav'], [{ aircraft: 'pa44', chapter: 'ch5' }, 'twin'],
    [{ chapter: 'ch4' }, 'sd'], [{ weather: 'pmWind' }, 'pmwind'], [{ weather: 'amLowCloud' }, 'ceiling'], [{ check: true }, 'check'], [{ weather: 'pmStorm', fatigue: 70, aircraft: 'pa44' }, 'storm'],
  ];
  for (const [o, id] of cases) {
    for (let day = 40; day < 60; day++) {
      const t = temFor({ ...base, ...o, day });
      assert.equal(t.threat.id, id, JSON.stringify(o));
      assert.equal(t.options.length, 3); assert.equal(new Set(t.options).size, 3, 'three different options');
      assert.equal(t.options[t.right], t.threat.ja);
      t.others.forEach((why, i) => { if (i === t.right) assert.equal(why, ''); else assert.ok(why.length > 4, `why not: ${t.options[i]}`); });
      // the others are no threat today
      for (let i = 0; i < 3; i++) if (i !== t.right) assert.ok(!THREATS.find(x => x.ja === t.options[i]).when({ ...base, ...o, day }), `${t.options[i]} is not today's`);
    }
  }
  // the right answer moves about from day to day
  assert.ok(new Set([40, 41, 42, 43, 44, 45].map(day => temFor({ ...base, day }).right)).size > 1);
});

test('tem: errors of a day from its summary', () => {
  assert.deepEqual(errorsOf({ radio: { wrong: 0 }, lessons: [], walk: { missed: [] } }), []);
  const e = errorsOf({ incursion: true, radio: { wrong: 2 }, autoItems: 9, walk: { missed: [{ name: 'x' }] }, lessons: [{ done: true, title: '「急旋回」', rows: [{ pass: true, name: '速度' }, { pass: false, name: '高度' }] }] });
  assert.equal(e.length, 5);
  assert.match(e.join('／'), /停止線[\s\S]*言い直し（2 回）[\s\S]*教官に任せた[\s\S]*見落とし[\s\S]*「急旋回」の高度/);
});

// the instructor's 'day' talk: IMSAFE, then TEM (on from chapter 3), then the briefing's menu
function runDay(dialog, ctx, pick) {
  const data = careerInstructorDialogs(), state = createDialogState(), hooked = [];
  data.dialogs.day.nodes['brief:menu'] = { speaker: 'instructor', text: '（今日の課目のブリーフィング）', end: true };      // (instructorDialogs' in the game)
  const r = createRunner({ data, state, ctx, hooks: { onHook: (n, a) => { hooked.push([n, a]); if (n === 'tem') { ctx.tem.right = +a === ctx._right; ctx.tem.not = ctx._others[+a]; } } } });
  r.start(dialog);
  const lines = [];
  for (let k = 0; k < 40 && r.running; k++) {
    const v = r.view(); lines.push(v.text);
    if (v.node === 'brief:menu' || v.node === 'x4b') break;
    if (v.choices.length) r.choose(v.node.endsWith('tem') ? pick : 0); else r.next();
  }
  return { lines, hooked, node: r.view() && r.view().node, state };
}
test('tem: the instructor asks for today\'s threat (chapter 3 on), says so when it is named, says which it was when not', () => {
  const t = temFor({ ...base, weather: 'pmStorm' });
  const mk = (on) => ({ ...CAREER_SAMPLE, career: { ...CAREER_SAMPLE.career, chapter: 'ch3' }, today: { ...CAREER_SAMPLE.today, intro: '' },
    tem: { on, o0: t.options[0], o1: t.options[1], o2: t.options[2], threat: t.threat.ja, why: t.threat.why, plan: t.threat.plan, right: false, not: '' }, _right: t.right, _others: t.others });
  let r = runDay('day', mk(true), t.right);
  assert.deepEqual(r.hooked.filter(h => h[0] === 'tem'), [['tem', String(t.right)]]);
  assert.match(r.lines.join('\n'), /今日の「脅威」[\s\S]*そのとおり。TAF に午後の雷雨[\s\S]*13 時までに戻る/);
  assert.equal(r.node, 'brief:menu');
  const wrong = (t.right + 1) % 3;
  r = runDay('day', mk(true), wrong);
  assert.match(r.lines.join('\n'), new RegExp(`${t.others[wrong].slice(0, 6)}[\\s\\S]*今日いちばんの脅威は「午後の雷雨」`));
  assert.equal(r.node, 'brief:menu');
  // chapter 2: no TEM question
  r = runDay('day', mk(false), 0);
  assert.ok(!/脅威/.test(r.lines.join('\n')));
  assert.equal(r.node, 'brief:menu');
  // the cross-country's talk asks it too
  r = runDay('xc', mk(true), t.right);
  assert.match(r.lines.join('\n'), /今日の「脅威」/); assert.equal(r.node, 'x4b');
});

test('tem: the debrief names the threat and the day\'s errors', () => {
  const sum = { walk: { found: 0, anomalies: 0, missed: [], tasksLeft: [] }, radio: { n: 4, first: 3, wrong: 1, late: 0 }, lessons: [{ id: 'n1', title: '「推測航法」', done: true, passed: true, grade: 'A', rows: [{ pass: true, name: '高度', val: '', std: '' }] }], trust: 3, incursion: false, autoItems: 2 };
  const text = (s) => { const d = debriefDialogs(s), n = d.dialogs.debrief.nodes; return Object.values(n).map(x => x.text).join('\n'); };
  assert.ok(!/TEM/.test(text(sum)), 'no TEM line without a threat named this morning');
  const th = temFor({ ...base, weather: 'pmStorm' }).threat;
  assert.match(text({ ...sum, tem: { threat: th, named: true } }), /TEM の振り返りです。今日の脅威は「午後の雷雨」でした。朝、自分で挙げられました[\s\S]*エラーは、無線の復唱の言い直し（1 回）/);
  assert.match(text({ ...sum, tem: { threat: th, named: false } }), /朝は別のものを挙げました/);
});
