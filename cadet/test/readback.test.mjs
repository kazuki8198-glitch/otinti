// CADET — the microphone's read-back (M8, dialog/readback.js), in Node: every exchange of the day's radio
// (content/dialog/atc.js) — the departure, the practice area, the circuit, the first solo, the solo cross-country with
// its squawk — said right is taken as the right answer, said as a recognizer writes it (digits, "niner", the call sign
// in letters) too; each wrong answer said whole is taken as that one (the controller then corrects it); the right one
// with a key word left out is not taken, and that word is named (call sign, runway, altitude, frequency, squawk,
// taxiway, the ATIS letter, the instruction's words).
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, keysOf, hearKeys, matchReadback } from '../src/dialog/readback.js';
import { dayRadio, setCall, CALL } from '../src/content/dialog/atc.js';

const WORDS = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'niner' };
// what a recognizer might write for a phrase said aloud: lower case, no commas, the radio's number words as digits,
// the call sign's letters spelled out (Archer 8SY → archer 8 sierra yankee)
const asHeard = (en) => en.replace(/Archer 8SY/g, 'archer 8 sierra yankee').replace(/Seminole 2SY/g, 'seminole 2 sierra yankee')
  .replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|niner|nine)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|niner|nine|point))*\b/gi,
    (m) => m.toLowerCase().split(/\s+/).map(w => (w === 'point' ? '.' : String(Object.entries(WORDS).find(([, x]) => x === w || (w === 'nine' && x === 'niner'))[0]))).join(''))
  .replace(/[,.](?!\d)/g, '').toLowerCase();

const RADIOS = [['area', { intent: 'area' }], ['pattern', { intent: 'pattern' }], ['solo', { intent: 'pattern', solo: true }], ['xc', { intent: 'area', xc: true }], ['ifr', { intent: 'area', ifr: true }]];
const exchangesOf = (r) => Object.entries(r.exchanges).map(([id, x]) => [id, typeof x === 'function' ? x('A2') : x]);

test('numbers, letters and the call sign as the radio says them', () => {
  assert.deepEqual(normalize('Runway three six'), ['runway', '3', '6']);
  assert.deepEqual(normalize('runway 36'), ['runway', '3', '6']);
  assert.deepEqual(normalize('one one eight point three'), ['1', '1', '8', '.', '3']);
  assert.deepEqual(normalize('118.3'), ['1', '1', '8', '.', '3']);
  assert.deepEqual(normalize('three thousand five hundred'), ['3500']);
  assert.deepEqual(keysOf('3,000 feet').map(x => `${x.kind}:${x.want}`), ['altitude:3000']);
  assert.deepEqual(normalize('Sierra Yankee niner'), ['s', 'y', '9']);
  assert.deepEqual(normalize('cleared for take-off.'), ['cleared', 'for', 'takeoff']);
  const k = keysOf('Runway three six, hold short of runway three six at Alpha One, squawk four two one five, Archer 8SY.', CALL);
  assert.deepEqual(k.map(x => `${x.kind}:${x.want}`), ['call:8sy', 'runway:36', 'squawk:4215', 'taxiway:a1', 'phrase:hold short']);
  assert.deepEqual(keysOf('LAB Tower, Archer Seven Three Eight Sierra Yankee, over the practice area, three thousand, with information Bravo, inbound for landing.', CALL).map(x => `${x.kind}:${x.want}`),
    ['call:738sy', 'altitude:3000', 'info:b', 'phrase:inbound for landing', 'phrase:over']);
  assert.deepEqual(keysOf('Right at Alpha Two, Ground point seven, Archer 8SY.', CALL).map(x => `${x.kind}:${x.want}`), ['call:8sy', 'freq:.7', 'taxiway:a2', 'phrase:right at']);
  assert.deepEqual(keysOf('LAB Ground, Archer 8SY, ready for departure.', CALL).map(x => x.ja), ['コールサイン（Archer 8SY）', '“ready for departure”']);
  // a phrase heard with the small words lost or misheard
  assert.equal(hearKeys(keysOf('line up and wait'), 'line up in wait').missing.length, 0);
  assert.equal(hearKeys(keysOf('cleared for takeoff'), 'cleared take off').missing.length, 0);
  assert.equal(hearKeys(keysOf('cleared for takeoff'), 'takeoff cleared').missing.length, 1, 'the words in their order');
});

for (const type of ['pa28', 'pa44']) {
  test(`every exchange of the day's radio (${type}): the right answer said is taken; a wrong one said is that one; a key word left out is named`, () => {
    setCall(type);
    try {
      let n = 0;
      for (const [name, w] of RADIOS) {
        const r = dayRadio({ info: 'Bravo', ...w });
        for (const [id, x] of exchangesOf(r)) {
          const number = x.kind === 'listen', right = x.choices.findIndex(c => c.ok);
          const call = r.call;
          for (const said of [x.choices[right].en, asHeard(x.choices[right].en)]) {
            const m = matchReadback(x.choices, said, { call, number });
            assert.equal(m.pick, right, `${name} ${id}: "${said}" → ${m.pick} (missing ${m.missing.map(k => k.ja)})`);
          }
          x.choices.forEach((c, i) => {
            if (i === right) return;
            const m = matchReadback(x.choices, asHeard(c.en), { call, number });
            const keys = keysOf(c.en, call, { number });
            if (number || keys.length >= 2) assert.ok(m.pick === i || m.pick === -1, `${name} ${id}: wrong "${c.en}" → ${m.pick}`);
            else assert.equal(m.pick, -1, `${name} ${id}: "${c.en}" has too few key words to be taken`);
            assert.notEqual(m.pick, right, `${name} ${id}: "${c.en}" is not the right one`);
          });
          // each key word of the right answer, left out: not taken, and named
          const keys = keysOf(x.choices[right].en, call, { number });
          assert.ok(keys.length >= 1, `${name} ${id}: key words`);
          if (!number) for (const k of keys) {
            const short = matchReadback(x.choices, keys.filter(o => o !== k).map(o => (o.kind === 'call' ? (o.want.length > 3 ? call.full : call.short) : o.kind === 'runway' ? `runway ${o.want}` : o.kind === 'info' ? `information ${o.want}` : o.kind === 'taxiway' ? `at ${o.want}` : o.kind === 'squawk' ? `squawk ${o.want}` : o.want)).join(', '), { call });
            assert.notEqual(short.pick, right, `${name} ${id}: without ${k.ja}`);
            assert.ok(short.missing.some(o => o.kind === k.kind && o.want === k.want) || short.pick >= 0, `${name} ${id}: ${k.ja} named as missing`);
          }
          n++;
        }
      }
      assert.ok(n >= 60, `${n} exchanges`);
    } finally { setCall('pa28'); }
  });
}

test('the ATIS question: the altimeter said in words; a number close to it is not it', () => {
  const r = dayRadio({ qnh: 29.92 }), x = r.exchanges.atis, right = x.choices.findIndex(c => c.ok);
  assert.equal(matchReadback(x.choices, 'two niner niner two', { number: true }).pick, right);
  assert.equal(matchReadback(x.choices, 'altimeter 2992', { number: true }).pick, right);
  const wrong = x.choices.findIndex(c => c.en === '29.29');
  assert.equal(matchReadback(x.choices, 'two niner two niner', { number: true }).pick, wrong);
  assert.equal(matchReadback(x.choices, 'two niner', { number: true }).pick, -1);
});

test('what is missing from a read-back, in words the panel can show; the best of the recognizer\'s guesses', () => {
  const r = dayRadio({ intent: 'area', xc: true }), x = r.exchanges.gnd_rb;
  const m = matchReadback(x.choices, 'runway 36 taxi via alpha hold short at alpha one archer 8 sierra yankee', { call: r.call });
  assert.equal(m.pick, -1);
  assert.deepEqual(m.missing.map(k => k.ja), ['スコーク 4215']);
  const m2 = matchReadback(x.choices, ['taxi via alpha archer 8 sierra yankee', 'runway 36 taxi via alpha hold short at alpha one squawk 4215 archer 8 sierra yankee'], { call: r.call });
  assert.equal(m2.pick, x.choices.findIndex(c => c.ok), 'the second guess says it all');
  // the call sign alone never picks "Roger"
  const t = r.exchanges.twr_luaw, a = matchReadback(t.choices, 'archer 8 sierra yankee', { call: r.call });
  assert.equal(a.pick, -1); assert.deepEqual(a.missing.map(k => k.kind), ['runway', 'phrase']);
  // the first call with the call sign cut short: that is the wrong answer (the controller asks for the full one)
  const g = r.exchanges.gnd_call, s = matchReadback(g.choices, 'lab ground archer 8 sierra yankee request taxi', { call: r.call });
  assert.equal(g.choices[s.pick].en, `LAB Ground, ${r.call.short}, request taxi.`);
  assert.deepEqual(matchReadback(g.choices, '', { call: r.call }).pick, -1);
});
