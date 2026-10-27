// CADET — the US–Japan boxes in the in-game textbook (node --test): FLIGHT LAB draws them from FL.jur (book-jur.js:
// bk.jur・bk.us・bk.jp・bk.same in book-core.js); content/book.js keeps the US side, headed 「米国の決まり」, and leaves out
// only the Japanese side — bk.jp, bk.same, the 日本 column and the line under bk.jur (jur-jp), the links to Part 7 and the
// summary chapters (jur-link) — textbook/rewrite/combined/DESIGN.md 3.4 and 6.3 (W06). The academy's written tests ask
// the US rules (14 CFR 91.17, 91.151): their grounds stay in the book.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { modulePath } from '../../flight-lab/src/modules.mjs';
import { loadFL, GAME } from './helpers/fl.mjs';
import { gameBook, usSideOnly, JAPAN_SIDE, US_HEAD } from '../src/content/book.js';

loadFL(GAME);
// book-jur.js reaches the game through FLIGHT LAB's one list once the integrator registers it; until then it is read here
if (!globalThis.FL.jur) vm.runInThisContext(fs.readFileSync(modulePath('book-jur.js'), 'utf8'), { filename: 'book-jur.js' });
const FL = globalThis.FL, J = FL.jur, bk = FL.book.bk;

// a chapter of boxes (and, to show that links to it go too, a Part 7 section FLIGHT LAB would have), put into FLIGHT LAB's
// book before the game's book is made from it (this file runs in a process of its own)
const IDS = ['alcohol', 'fuel.vfr', 'alt.transition', 'alt.unit', 'oxygen', 'time'];
FL.book.add({ id: 'jurp7', part: 'p6', t: '日本の空（テスト）', secs: [{ id: 'jair.rules', t: '日本の飛行の規則', h: '<p>テストの節です。</p>' }] });
FL.book.add({ id: 'jurtest', part: 'p1', t: '日米の囲み（テスト）', secs: [{ id: 'jurtest.a', t: '日米の囲み', h: () =>
  `${bk.aim('日米の囲みの見え方を確かめる節です。')}<p>本文の文です。</p>${bk.jur(...IDS)}${bk.us('alcohol')}${bk.us('<p>米国の規則の文です（14 CFR 91.103）。</p>')}`
  + `${bk.jp('alcohol')}${bk.same('fuel.ifr')}${bk.jp('<p>日本の文です（{ch:sim}）。</p>')}${bk.key('要点です')}` }] });
const BOOK = gameBook(FL);
const S = BOOK.section('jurtest.a');
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

test('the US side stays: the bk.jur rows with their US column, and bk.us, headed 「米国の決まり」', () => {
  assert.ok(S, 'the section is in the game\'s book');
  for (const id of IDS) {
    const it = J.byId(id);
    const row = S.html.match(new RegExp(`<tr class="bk-jur-row" data-jur="${id.replace(/\./g, '\\.')}">([\\s\\S]*?)</tr>`));
    assert.ok(row, `${id}: its row stays`);
    assert.ok(row[1].includes(`<td class="jur-us" data-label="米国">${esc(it.us)}<span class="jur-src">（${esc(it.usSrc)}）</span></td>`), `${id}: the US cell as FL.jur has it`);
    assert.equal((row[1].match(/<t[hd]\b/g) || []).length, 2, `${id}: the title and the US cell, no 日本 cell`);
    assert.ok(S.text.includes(it.us), `${id}: the US value in the text the instructor and the tutor read`);
  }
  assert.match(S.html, /<div class="bk-jur"><div class="jur-h"><b>米国の決まり<\/b><\/div><table class="bk-t jur-t"><tr><th>項目<\/th><th class="jur-us">米国<\/th><\/tr>/);
  assert.match(S.html, /<div class="bk-us" data-jur="alcohol"><div class="jur-h"><b>米国の決まり<\/b><\/div><div class="jur-v"><b>飲酒<\/b>：/);
  assert.match(S.html, /<div class="bk-us"><div class="jur-h"><b>米国の決まり<\/b><\/div><p>米国の規則の文です（14 CFR 91\.103）。<\/p><\/div>/);
  assert.equal((S.html.match(new RegExp(`<b>${US_HEAD}</b>`, 'g')) || []).length, 3, 'one head per US box');
  assert.match(S.text, /8 時間/); assert.match(S.text, /0\.04/); assert.match(S.text, /91\.17/);
});

test('the Japanese side goes: bk.jp, bk.same, the 日本 column, the e-Gov line, the link to Part 7 — and with them any （別の章）', () => {
  for (const cls of JAPAN_SIDE) assert.doesNotMatch(S.html, new RegExp(`class="(?:[^"]*\\s)?${cls}(?:\\s|")`), `no ${cls}`);
  assert.doesNotMatch(S.html, /日本では|日本も同じ|日米の対照|e-Gov|〔要確認〕|data-sec=|第 7 部|（別の章）/);
  for (const id of [...IDS, 'fuel.ifr']) {
    const it = J.byId(id);
    assert.ok(!S.text.includes(it.jp), `${id}: no Japanese value`);
    if (it.jpArt) assert.ok(!S.text.includes(it.jpArt), `${id}: no Japanese article`);
  }
  assert.doesNotMatch(S.text, /航空法|施行規則|勅令|通達|日本の文/);
  // FLIGHT LAB drew all of it (so the filter had something to do)
  const raw = FL.book.html(FL.book.findSection('jurtest.a').sec);
  for (const s of ['class="jur-jp"', 'class="bk-jp"', 'class="bk-same"', 'class="jur-link" data-sec="jair.rules"', 'e-Gov']) assert.ok(raw.includes(s), `FLIGHT LAB draws ${s}`);
  assert.ok(FL.book.findSection('jurtest.a').sec.h().includes('（{ch:sim}）'), 'a reference to a chapter the game leaves out, inside bk.jp');
  // the rest of the section as before: the aim, the prose, the key points
  assert.ok(S.summary.startsWith('日米の囲みの見え方を確かめる節です。'));
  assert.deepEqual(S.keyPoints, ['要点です']);
  assert.deepEqual(BOOK.issues, []);
});

test('usSideOnly: nested elements go whole, and nothing else is touched', () => {
  const h = '<div class="bk-jp" data-jur="x"><div class="jur-h"><b>日本では</b></div><div class="jur-v"><div>入れ子</div></div></div><p>残る</p>'
    + '<table><tr><th>項目</th><th class="jur-us">米国</th><th class="jur-jp">日本</th></tr><tr><th>a</th><td class="jur-us">us</td><td class="jur-jp">jp <span>x</span></td></tr></table>'
    + '<div class="jur-jp jur-foot">e-Gov <button type="button" class="jur-link" data-sec="jair.rules">→</button></div><div class="bk-us"><div class="jur-h"><b>米国では</b></div>u</div>';
  assert.equal(usSideOnly(h), '<p>残る</p><table><tr><th>項目</th><th class="jur-us">米国</th></tr><tr><th>a</th><td class="jur-us">us</td></tr></table>'
    + `<div class="bk-us"><div class="jur-h"><b>${US_HEAD}</b></div>u</div>`);
  assert.equal(usSideOnly('<p class="bk-jpx">似た名前は残る</p>'), '<p class="bk-jpx">似た名前は残る</p>');
});

test('the academy\'s written tests ask the US rules: their grounds stay in the book (91.17 in hf.self, 91.151 in perf.fuel)', () => {
  assert.match(BOOK.section('hf.self').text, /91\.17/);
  assert.match(BOOK.section('hf.self').text, /8 時間/);
  assert.match(BOOK.section('perf.fuel').text, /91\.151/);
});

test('every section of the game\'s book: no Japanese side, no link to Part 7 or a summary chapter', () => {
  for (const c of BOOK.chapters) for (const s of c.sections) {
    const x = BOOK.section(s.id);
    for (const cls of JAPAN_SIDE) assert.doesNotMatch(x.html, new RegExp(`class="(?:[^"]*\\s)?${cls}(?:\\s|")`), `${s.id}: ${cls}`);
    assert.doesNotMatch(x.html, /data-sec="(?:j[a-z]+\.|g\d\.)/, `${s.id}: a link to Part 7 or a summary chapter`);
  }
});

test('book-jur.js: the game reads it once the integrator registers it in FLIGHT LAB\'s one list', { skip: !GAME.includes('book-jur.js') && 'not in flight-lab/src/modules.mjs yet (W06 report, needs from others)' }, () => {
  assert.ok(GAME.includes('book-jur.js'));
});
