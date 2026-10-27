// selftest.mjs — checks the checks: the parsers against DESIGN's own numbers, the small helpers, and that every
// problem planted in test/broken-draft.js is found by check-chapter's checks. Exit 1 on a failure.
//   node textbook/rewrite/combined/tools/selftest.mjs [--no-browser]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toc, jurItems, photoPlan, knownConcepts, kRefs } from './lib/design.mjs';
import { evaluate } from './lib/expr.mjs';
import { sentences, stripB64 } from './lib/html.mjs';
import { ending } from './check-style.mjs';
import { findRules } from './check-jurisdiction.mjs';
import { findHardRefs } from './check-chapter-refs.mjs';
import { loadBook } from './lib/load.mjs';
import { runChecks } from './lib/checks.mjs';
import { kiso } from './lib/kiso.mjs';
import { rowsOf } from './lib/ledgers.mjs';
import { extract } from './check-claims.mjs';
import { citationProblems, bookNumbers } from './check-egov.mjs';
import { defTerm } from './check-concepts.mjs';
import * as EGOV_TOOL from '../../sources/egov/check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const noBrowser = process.argv.includes('--no-browser');
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error(`FAIL ${name}\n${e.message}`); process.exitCode = 1; } };

t('DESIGN 3.3: 289 sections, 48 chapters, the parts as planned', () => {
  const { secs, chapters } = toc(); assert.equal(secs.size, 289); assert.equal(chapters.size, 48);
  const by = {}; for (const v of secs.values()) by[v.part] = (by[v.part] || 0) + 1;
  assert.deepEqual(by, { p0: 22, p1: 118, p2: 40, p3: 19, p4: 19, p5: 14, p6: 17, p7: 40 });
  assert.equal([...secs.values()].filter(v => v.isNew).length, 135);
});
t('DESIGN 3.4: 47 items; DESIGN 4.2: photos 52 / 4 / 29; DESIGN 3.2: 13 known pairs', () => {
  assert.equal(jurItems().length, 47); const p = photoPlan(); assert.deepEqual([p.use.size, p.conditional.size, p.notUse.size], [52, 4, 29]); assert.equal(knownConcepts().length, 13);
});
t('the basic course: 393 sections, 376 questions, 161 figures, 85 photos', () => { const K = kiso(); assert.deepEqual([K.sections.length, K.qa.length, K.figures.length, K.photos.length], [393, 376, 161, 85]); });
t('kRefs', () => { assert.deepEqual(kRefs('K05.14〜05.16・05.21（図）＋T'), [{ ch: '05', n: 14 }, { ch: '05', n: 15 }, { ch: '05', n: 16 }, { ch: '05', n: 21 }]); });
t('expr', () => { assert.ok(Math.abs(evaluate('1/cosd(60)') - 2) < 1e-12); assert.equal(evaluate('2^3 + -1'), 7); assert.throws(() => evaluate('process.exit()')); });
t('sentences and endings', () => {
  assert.deepEqual(sentences('A です。「B。」と書きます。C').map(x => x.t), ['A です。', '「B。」と書きます。', 'C']);
  assert.equal(ending('高度を保ちます（14 CFR 23.2005(d)）。'), 'polite'); assert.equal(ending('高度を保つ。'), 'plain'); assert.equal(ending('差は 4℃。'), 'noun');
});
t('rule words', () => { const x = findRules('14 CFR 91.155 と AIM 4-3-3、121.5 MHz、航空法第 2 条'); assert.deepEqual(x.us.map(m => m.s), ['14 CFR 91.155', 'AIM 4-3-3']); assert.deepEqual(x.jp.map(m => m.s), ['航空法', '第 2 条']); });
t('第 N 章', () => { assert.equal(findHardRefs('PHAK 第 11 章と AWH 第 3 章・第 24〜27 章').length, 0); assert.equal(findHardRefs('詳しくは第 5 章。').length, 1); });
t('e-Gov citations and numbers (基準 4)', () => {
  assert.deepEqual(bookNumbers('14,000 ft 未満、1013.2 hPa、180 日に 6 時間、第 178 条、日本').map(x => [x.value, x.unit]), [[14000, 'ft'], [1013.2, 'hPa'], [180, 'd'], [6, 'h']]);
  const codes = s => citationProblems(EGOV_TOOL, s).map(p => p.code);
  assert.deepEqual(codes('平均海面から 14,000 ft 未満は QNH、以上は 1013.2 hPa（航空法施行規則第 178 条）。'), []);
  assert.deepEqual(codes('施行規則第 180〜186 条（第 186 条：進路と速度の維持）。'), []);
  assert.deepEqual(codes('航空法施行規則第 178 条により 15,000 ft 未満は QNH。'), ['number-not-in-article']);
  assert.deepEqual(codes('航空法施行規則第 999 条。'), ['article-not-copied']);
  assert.deepEqual(codes('電波法第 40 条の資格。'), ['other-law']);
  assert.deepEqual(codes('（法第 82 条）'), ['bare-law-name']);
  assert.deepEqual(codes('第 5 条。'), ['citation-without-law']);
});
t('bold definitions (基準 15): 語（English） and 正式名（通称、English）', () => {
  for (const [t, want] of [['迎え角（Angle of Attack, AOA）', '迎え角'], ['地面効果（ground effect）', '地面効果'], ['重心（CG）', '重心'],
    ['補助翼（エルロン、aileron）', '補助翼'], ['迎え角（迎角、angle of attack）', '迎え角'], ['着陸復行（ゴーアラウンド、go-around）', '着陸復行'],
    ['50 ft の障害物を越える距離（total distance）', '50 ft の障害物を越える距離'], ['風（ふう）', null], ['Vyse（88 kt）', null], ['ELT（航空機用救命無線機、Emergency Locator Transmitter）', null], ['15℃・29.92 inHg（1013.25 hPa）', null]]) assert.equal(defTerm(t), want, t);
});
t('base64 cut first', () => { assert.equal(stripB64('x data:image/webp;base64,AAAXXXTBD= y'), 'x data:image/webp;base64, y'); });

const book = await loadBook({ drafts: [path.join(here, 'test', 'broken-draft.js')] });
assert.equal(book.drafts[0].error, null, book.drafts[0].error);
const env = { o: { browser: !noBrowser, limit: 0 }, book, FL: book.FL, only: new Set(book.drafts[0].added) };
const ids = ['chapters', 'form', 'data', 'style', 'jurisdiction', 'chapter-refs', 'figures', 'questions', 'jur', 'path', 'provenance'];
const res = Object.fromEntries((await runChecks(ids, env)).map(r => [r.id, r]));
const want = {
  chapters: ['section-short', 'terms', 'examples', 'questions', 'question-4-choices', 'question-answer', 'refs', 'placeholder'],
  form: ['aim-not-first', 'photo-before-figure', 'key-items', 'no-key'],
  data: ['from-unknown', 'deep-shape', 'from-missing'],
  style: ['not-polite', 'taigen-dome'],
  jurisdiction: ['us-rule-outside-us', 'jp-rule-outside-jp'],
  'chapter-refs': ['hard-chapter-number'],
  figures: ['viewbox-width', 'white-board', ...(noBrowser ? [] : ['text-outside', 'text-overlap'])],
  questions: ['answer-index', 'duplicate-choice', 'reason-no-basis'],
  jur: ['box-missing'],
  path: ['forward-see-unlabelled'],
  provenance: ['from-unknown'],
};
for (const [id, codes] of Object.entries(want)) t(`planted problems found by ${id}`, () => { const got = new Set(res[id].items.map(x => x.code)); for (const c of codes) assert.ok(got.has(c), `${id}: ${c} not found (got ${[...got].join(', ')})`); });
t('a box that is there is found', () => { assert.ok(!res.jur.items.some(x => x.where === 'alt.unit → basics.units'), 'alt.unit box in basics.units'); });
// the ledgers, read loosely: three shapes, and the checks that read them, on a temporary folder of ledgers
t('rowsOf', () => {
  assert.equal(rowsOf([{ id: 'a' }]).length, 1); assert.equal(rowsOf({ about: 'x', rows: [{ id: 'a' }, { id: 'b' }] }).length, 2);
  assert.deepEqual(rowsOf({ 'kiso00.01': { to: ['basics.flight'] } }), [{ id: 'kiso00.01', to: ['basics.flight'] }]);
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w01-ledgers-'));
try {
  const plain = await loadBook();
  const claim = extract({ FL: plain.FL })[0];
  const put = (f, v) => fs.writeFileSync(path.join(tmp, f), JSON.stringify(v));
  put('PROVENANCE.json', { rows: [{ id: 'kiso00.01', to: ['basics.flight'] }, { id: 'kiso00.02' }, { id: 'kiso99.01', reason: 'x' }, { id: 'kiso00.01', to: ['nowhere.x'] }] });
  put('JCAB-MAP.json', [{ id: 'law.1', subject: '航空法規', sections: ['law.rules'] }, { id: 'law.2', subject: '航空法規' }, { id: 'law.3', sections: ['no.such'] }, { id: 'law.4', excluded: '範囲外' }]);
  put('CONCEPTS.json', [{ name: 'ピトー静圧', address: 'sys.g1000', recalls: ['ifr.instr'] }, { name: 'x', address: 'no.where', recalls: [] }]);
  put('CLAIMS.json', [{ id: claim.id, tag: '参考値' }]);
  put('ERRATA.json', [{ id: 'T-1', status: 'open' }, { id: 'T-2', status: 'fixed', where: 'aero.turn', fixedBy: 'W07a', checkedBy: 'W07a' }, { id: 'T-3', status: 'not-error', fixedBy: 'a', checkedBy: 'b' }]);
  put('RULINGS.json', [{ id: 'R-1', class: 'A', status: 'fixed', where: 'x', fixedBy: 'a', checkedBy: 'b' }, { id: 'R-2', status: 'open' }]);
  put('CALC.json', [{ id: 'bad', sec: 'aero.turn', expr: '1/cosd(60)', expect: 3, show: '2.00 G' }]);
  process.env.COMBINED_LEDGERS = tmp;
  const env2 = { o: { browser: false, limit: 0 }, book: plain, FL: plain.FL };
  const got = Object.fromEntries((await runChecks(['provenance', 'maps', 'concepts', 'claims', 'calc', 'ledgers'], env2)).map(r => [r.id, new Set(r.items.map(x => x.code))]));
  const want2 = { provenance: ['no-destination', 'unknown-id', 'duplicate-row', 'missing-row', 'unknown-destination'], maps: ['unmapped', 'unknown-section'], concepts: ['address-unknown', 'recall-not-boxed'], calc: ['wrong-result'], ledgers: ['open', 'same-signer', 'no-reason', 'a-without-item', 'no-class'] };
  for (const [id, codes] of Object.entries(want2)) t(`ledger read by ${id}`, () => { for (const c of codes) assert.ok(got[id].has(c), `${id}: ${c} not found (got ${[...got[id]].join(', ')})`); });
  t('the claims ledger is read', () => { assert.ok(!got.claims.has('ledger')); });
} finally { delete process.env.COMBINED_LEDGERS; fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`selftest: ${n} passed${process.exitCode ? ', some FAILED' : ''}`);
