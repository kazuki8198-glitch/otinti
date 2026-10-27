// FLIGHT LAB — the US–Japan table and its boxes (node --test): FL.jur (src/book-jur.js, the 47 items of
// textbook/rewrite/combined/DESIGN.md 3.4) and the parts that draw it in src/book-core.js — bk.jur・bk.us・bk.jp・bk.same,
// the chapter-end table FL.book.jurTable and the appendix table FL.book.jurAppendix (W06).
//  - the data: the 47 items of DESIGN 3.4 in its order, with its boxes, summary chapters, Part 7 sections and 〔安全〕
//    marks; 確度 as W05 found the Japanese column (textbook/rewrite/sources/egov/jur-japan.json); 〔要確認〕 wherever the
//    item is not confirmed; plain text with each country's rule words on its own side;
//  - the Japanese column against W05's e-Gov copies: the versions, every cited article copied, every number of a
//    confirmed item in the article it cites;
//  - drawing equals the data: every box, the chapter-end table and the appendix show the item's strings and nothing
//    else, the Japanese side only in class jur-jp / bk-jp / bk-same (what CADET leaves out: cadet/test/jur.test.mjs);
//  - a link to Part 7 or a summary chapter only when that section is in the book (DESIGN 6.2 rules 6 and 13): none in R1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { load, NODE_MODULES, SRC } from './load.mjs';
import { MODULES } from '../src/modules.mjs';
import { jurItems } from '../../textbook/rewrite/combined/tools/lib/design.mjs';
import { loadIndex, loadArticle, parseCitations, articleHasNumber } from '../../textbook/rewrite/sources/egov/check.mjs';

load(...NODE_MODULES);
// book-jur.js reaches these tests through the one list (src/modules.mjs) once the integrator registers it; until then it
// is read here the way the page reads it
if (!globalThis.FL.jur) vm.runInThisContext(fs.readFileSync(path.join(SRC, 'book-jur.js'), 'utf8'), { filename: 'book-jur.js' });
const FL = globalThis.FL, J = FL.jur, B = FL.book, bk = B.bk;
const W05 = new Map(JSON.parse(fs.readFileSync(new URL('../../textbook/rewrite/sources/egov/jur-japan.json', import.meta.url), 'utf8')).items.map(x => [x.id, x]));

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const plain = h => String(h).replace(/<[^>]+>/g, '').replace(/&(?:amp|lt|gt|quot|#39);/g, m => ENT[m]);
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = s => (s ? `（${s}）` : '');
const usText = it => it.us + src(it.usSrc);
const jpText = it => it.jp + src([it.jpArt, it.jpSrc].filter(Boolean).join('・'));
// the rows of a drawn table: { id, title, us, jp, cells: [plain text of each cell] }
function rows(html) {
  return [...String(html).matchAll(/<tr class="bk-jur-row" data-jur="([^"]+)">([\s\S]*?)<\/tr>/g)].map(([, id, tr]) => {
    const cell = cls => { const m = tr.match(new RegExp(`<td class="${cls}"[^>]*>([\\s\\S]*?)<\\/td>`)); return m ? plain(m[1]) : null; };
    return { id, title: plain((tr.match(/<th scope="row">([\s\S]*?)<\/th>/) || [])[1] || ''), us: cell('jur-us'), jp: cell('jur-jp'),
      cells: [...tr.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map(m => plain(m[1])) };
  });
}
const NUM = /\d[\d,]*(?:\.\d+)?/g;
const nums = s => [...String(s).matchAll(NUM)].map(m => m[0].replace(/,/g, ''));
const US_RULE = /14 CFR|47 CFR|49 CFR|U\.S\.C\.|AIM|FAA-S-ACS|FMH-1|Pilot\/Controller Glossary|NOAA/;
const JP_RULE = /航空法|施行規則|勅令|通達|告示/;

// a chapter put in for one test and taken out after (at the end: the numbers of the others do not move)
function withChapter(ch, fn) {
  B.add(ch);
  try { return fn(); } finally { B.CHAPTERS.splice(B.CHAPTERS.indexOf(ch), 1); B.CHAPTERS.forEach((c, k) => { c.n = k + 1; }); }
}

// ------------------------------------------------------------------ the data
test('FL.jur: the 47 items of DESIGN 3.4, in its order, with its boxes, summary chapters, Part 7 sections and 〔安全〕', () => {
  const design = jurItems();
  assert.equal(design.length, 47, 'DESIGN 3.4 has 47 items');
  assert.equal(J.items.length, 47);
  assert.deepEqual(J.items.map(x => x.id), design.map(x => x.id));
  for (const d of design) {
    const it = J.byId(d.id);
    assert.deepEqual([...it.boxes], d.boxes, `${d.id}: boxes`);
    assert.deepEqual([...it.gates], d.gates, `${d.id}: summary chapters`);
    assert.deepEqual([...it.part7], d.part7, `${d.id}: Part 7`);
    assert.equal(it.safety, d.safety, `${d.id}: 〔安全〕`);
  }
  assert.deepEqual(J.items.filter(x => x.safety).map(x => x.id), ['fuel.vfr', 'alcohol']);
  assert.equal(J.byId('nope'), null);
  assert.ok(Object.isFrozen(J) && Object.isFrozen(J.items) && J.items.every(Object.isFrozen), 'the table is read-only');
  // the lookups
  assert.deepEqual(J.ofSection('law.rules').map(x => x.id), ['msa', 'speed', 'fuel.vfr', 'row']);
  assert.deepEqual(J.ofGate('g5').map(x => x.id), ['multi.rating']);
  assert.deepEqual(J.ofPart7('jexam.check').map(x => x.id), ['check.slow', 'check.stall', 'check.short', 'check.basic']);
});

test('FL.jur: every item has both sides and its sources; 確度 is W05\'s finding; 〔要確認〕 wherever it is not confirmed', () => {
  for (const it of J.items) {
    const w = W05.get(it.id);
    assert.ok(w, `${it.id}: in W05's jur-japan.json`);
    assert.match(it.id, /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)*$/);
    for (const k of ['title', 'us', 'usSrc', 'jp']) assert.ok(typeof it[k] === 'string' && it[k].trim(), `${it.id}: ${k}`);
    assert.match(it.usUrl, /^https:\/\//, `${it.id}: the US source's URL`);
    assert.match(it.usSrc, US_RULE, `${it.id}: the US source names its rule`);
    // plain text: the drawing escapes it; no HTML, no chapter references, no placeholders
    for (const k of ['title', 'us', 'usSrc', 'jp', 'jpArt', 'jpSrc']) {
      assert.doesNotMatch(it[k], /[<>]|\{ch:|TODO|TBD|XXX|PLACEHOLDER/, `${it.id}: ${k} is plain text`);
    }
    // 確度: confirmed only when W05 confirmed (or corrected) the Japanese column in the e-Gov copies
    assert.equal(it.w05, w.status, `${it.id}: W05's finding`);
    assert.equal(it.conf, ['confirmed', 'corrected'].includes(w.status) ? 'confirmed' : 'unverified', `${it.id}: 確度`);
    assert.ok(J.CONF[it.conf], `${it.id}: 確度 has a label`);
    if (it.conf === 'unverified') assert.match(it.jp, /〔要確認〕/, `${it.id}: the box says 要確認`);
    assert.doesNotMatch(it.us + it.usSrc, /要確認/, `${it.id}: the US side was checked`);
    // each country's rule words on its own side (DESIGN 3.4「決まり」)
    assert.doesNotMatch(it.us + it.usSrc, JP_RULE, `${it.id}: no Japanese rule on the US side`);
    assert.doesNotMatch(it.jp + it.jpArt + it.jpSrc, /CFR|AIM|ACS|U\.S\.C\./, `${it.id}: no US rule on the Japanese side`);
    if (it.jpArt) assert.match(it.jpArt, JP_RULE, `${it.id}: the article names its law`);
  }
  // W05's corrections to DESIGN 3.4 are in (DESIGN 付記 2)
  assert.match(J.byId('lights.ac').jp, /衝突防止灯・右舷灯・左舷灯・尾灯/);
  assert.match(J.byId('medical').jpArt, /航空法施行規則第 61 条の 2/);
  assert.match(J.byId('docs').jpArt, /第 144 条・航空法施行規則第 144 条の 2/);
  assert.doesNotMatch(J.byId('docs').jp, /要確認/);
});

test('FL.jur: the Japanese column against W05\'s e-Gov copies — the versions, every article cited, every number of a confirmed item', () => {
  const idx = loadIndex();
  for (const law of idx.laws) {
    const L = J.LAWS[law.key];
    assert.ok(L, `${law.key}: in FL.jur.LAWS`);
    assert.equal(L.version, law.version, `${law.key}: version`);
    assert.equal(L.revision, law.revisionId, `${law.key}: revision`);
    assert.equal(L.checked, law.checked, `${law.key}: checked on`);
    assert.equal(L.url, law.url, `${law.key}: URL`);
  }
  for (const L of Object.values(J.LAWS)) {
    assert.match(L.url, /^https:\/\/laws\.e-gov\.go\.jp\/law\//);
    assert.match(L.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(L.name && L.label);
  }
  const UNIT = { hPa: 'hPa', ft: 'ft', kt: 'kt', km: 'km', m: 'm', 分: 'min', 時間: 'h', 日: 'd', 年: 'yr', '°': '°' };
  for (const it of J.items) {
    const cited = parseCitations(it.jpArt).flatMap(c => c.refs);
    for (const ref of cited) assert.ok(loadArticle(ref), `${it.id}: ${ref} (cited in 「${it.jpArt}」) is copied in textbook/rewrite/sources/egov/`);
    const w05refs = new Set(W05.get(it.id).refs);
    for (const ref of it.jpRefs) {
      const a = loadArticle(ref);
      assert.ok(a, `${it.id}: ${ref} is copied`);
      assert.equal(a.version, J.LAWS[ref.split(':')[0]].version, `${it.id}: ${ref} is of the pinned version`);
      assert.ok(cited.includes(ref) || w05refs.has(ref), `${it.id}: ${ref} is cited or W05 cites it`);
      assert.ok(it.egov.includes(ref.split(':')[0]), `${it.id}: the version line names ${ref}'s law`);
    }
    for (const ref of cited) assert.ok(it.jpRefs.includes(ref), `${it.id}: ${ref} is cited, so it is in jpRefs`);
    for (const k of it.egov) assert.ok(J.LAWS[k], `${it.id}: ${k}`);
    if (it.conf !== 'confirmed') continue;
    // every number with a unit in a confirmed item's Japanese text is in one of the articles it cites
    for (const m of it.jp.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(hPa|ft|kt|km|m|分|時間|日|年|°)/g)) {
      const value = Number(m[1].replace(/,/g, '')), unit = UNIT[m[2]];
      assert.ok(it.jpRefs.some(ref => articleHasNumber(ref, value, unit)), `${it.id}: ${m[0]} is in ${it.jpRefs.join('・')}`);
    }
  }
});

// ------------------------------------------------------------------ drawing equals the data
test('bk.jur: one row per item, in the order given — the title, the US value and its rule, the Japanese value and its article', () => {
  for (const it of J.items) {
    const h = bk.jur(it.id), r = rows(h);
    assert.equal(r.length, 1, it.id);
    assert.deepEqual({ id: r[0].id, title: r[0].title, us: r[0].us, jp: r[0].jp }, { id: it.id, title: it.title, us: usText(it), jp: jpText(it) }, it.id);
    assert.match(h, /^<div class="bk-jur"><div class="jur-h"><b>日米の対照<\/b><\/div><table class="bk-t jur-t">/);
    // the numbers drawn are the data's
    for (const n of nums(plain(h))) assert.ok(nums(J.textOf(it)).includes(n), `${it.id}: ${n} is drawn but not in the data`);
    // the version line: each law the Japanese column relies on, under the box, on the Japanese side
    for (const k of it.egov) assert.ok(h.includes(`${J.LAWS[k].name}（${J.LAWS[k].label}）`), `${it.id}: version of ${k}`);
    if (it.egov.length) assert.match(h, /<div class="jur-jp jur-foot"><span class="jur-ver">日本の法令は e-Gov 法令検索の版：/);
    if (it.conf === 'unverified') assert.match(h, /<span class="jur-unk">〔要確認〕<\/span>/, `${it.id}: 〔要確認〕 is marked`);
  }
  const h = bk.jur('alt.transition', 'alt.unit');
  assert.deepEqual(rows(h).map(r => r.id), ['alt.transition', 'alt.unit']);
  assert.equal(bk.jur(['vmc', 'vmc.ad']), bk.jur('vmc', 'vmc.ad'), 'a list or the ids');
  assert.match(h, /<tr><th>項目<\/th><th class="jur-us">米国<\/th><th class="jur-jp">日本<\/th><\/tr>/);
});

test('bk.us・bk.jp・bk.same: an item drawn from the data (data-jur), or the HTML given', () => {
  for (const it of J.items) {
    const us = bk.us(it.id), jp = bk.jp(it.id), same = bk.same(it.id);
    assert.equal(us, `<div class="bk-us" data-jur="${it.id}"><div class="jur-h"><b>米国では</b></div><div class="jur-v"><b>${esc(it.title)}</b>：${esc(it.us)}<span class="jur-src">（${esc(it.usSrc)}）</span></div></div>`, `${it.id}: bk.us`);
    assert.equal(plain(us), `米国では${it.title}：${usText(it)}`, `${it.id}: bk.us`);
    assert.ok(plain(jp).startsWith(`日本では${it.title}：${jpText(it)}`), `${it.id}: bk.jp`);
    assert.ok(plain(same).startsWith(`日本も同じ${it.title}：${jpText(it)}`), `${it.id}: bk.same`);
    assert.match(jp, new RegExp(`^<div class="bk-jp" data-jur="${it.id.replace(/\./g, '\\.')}">`));
    assert.match(same, new RegExp(`^<div class="bk-same" data-jur="${it.id.replace(/\./g, '\\.')}">`));
    for (const k of it.egov) assert.ok(jp.includes(J.LAWS[k].label) && same.includes(J.LAWS[k].label), `${it.id}: the version of ${k}`);
    assert.doesNotMatch(us, /e-Gov|jur-jp|〔要確認〕/, `${it.id}: the US box has nothing of the Japanese side`);
  }
  // HTML as given (a US rule moved into bk.us by W07, a Japanese note in bk.jp)
  assert.equal(bk.us('<p>米国の規則（14 CFR 91.17）。</p>'), '<div class="bk-us"><div class="jur-h"><b>米国では</b></div><p>米国の規則（14 CFR 91.17）。</p></div>');
  assert.equal(bk.jp('日本の決まり'), '<div class="bk-jp"><div class="jur-h"><b>日本では</b></div>日本の決まり</div>');
  assert.equal(bk.same('同じ'), '<div class="bk-same"><div class="jur-h"><b>日本も同じ</b></div>同じ</div>');
  // a typo in an id is an error, not an empty box
  assert.throws(() => bk.jur('alt.transitio'), /not an item of FL\.jur/);
  assert.throws(() => bk.us('fuel'), /not an item of FL\.jur/);
});

test('without book-jur.js the parts draw nothing (a product that does not read it)', () => {
  const saved = FL.jur;
  delete FL.jur;
  try {
    assert.equal(bk.jur('alt.transition'), '');
    assert.equal(bk.us('alcohol'), '');
    assert.equal(bk.jp('alcohol'), '');
    assert.equal(bk.same('fuel.ifr'), '');
    assert.equal(B.jurAppendix(), '');
    assert.equal(B.jurTable('aero'), '');
    assert.match(bk.us('<p>本文</p>'), /<p>本文<\/p>/, 'HTML is still drawn');
  } finally { FL.jur = saved; }
});

test('the Japanese side is only in the boxes CADET leaves out: the 日本 column and the line under bk.jur (jur-jp), bk.jp, bk.same', () => {
  const all = J.items.map(it => it.id);
  const h = bk.jur(...all);
  // every cell of the 日本 column and the line under the box carry jur-jp; the US cells carry jur-us
  assert.equal((h.match(/<td class="jur-jp"/g) || []).length, 47);
  assert.equal((h.match(/<td class="jur-us"/g) || []).length, 47);
  assert.equal((h.match(/<th class="jur-jp">日本<\/th>/g) || []).length, 1);
  const outsideJp = h.replace(/<td class="jur-jp"[\s\S]*?<\/td>/g, '').replace(/<th class="jur-jp">[\s\S]*?<\/th>/g, '').replace(/<div class="jur-jp jur-foot">[\s\S]*?<\/div>/g, '');
  assert.doesNotMatch(plain(outsideJp), /航空法|施行規則|e-Gov|〔要確認〕|勅令|通達/, 'nothing Japanese outside the jur-jp parts');
  for (const it of J.items) assert.ok(!plain(outsideJp).includes(it.jp), `${it.id}: the Japanese value only in its column`);
});

// ------------------------------------------------------------------ links only to sections that are in the book
test('links to Part 7 and the summary chapters: none in R1 (no such section yet); drawn once the section is in, on the Japanese side only', () => {
  assert.ok(!J.items.some(it => it.part7.some(id => B.findSection(id))), 'no Part 7 section in the book yet (R1)');
  const before = bk.jur(...J.items.map(it => it.id)) + J.items.map(it => bk.jp(it.id) + bk.same(it.id) + bk.us(it.id)).join('');
  assert.doesNotMatch(before, /data-sec=|jur-link|第 7 部/, 'no link and no words of a link without a target');
  const app = B.jurAppendix();
  assert.doesNotMatch(app, /jur-link|第 7 部/, 'the appendix: no link to Part 7 or a summary chapter');
  for (const m of app.matchAll(/data-sec="([^"]+)"/g)) assert.ok(B.findSection(m[1]), `the appendix links ${m[1]}, a section of the book`);
  // a Part 7 section and a summary chapter come in (as book-7.js and book-gates.js will add them): the links appear
  const p7 = { id: 'jtest', part: 'p6', t: '日本の空（テスト）', secs: [{ id: 'jair.rules', t: '日本の飛行の規則', h: '<p>テスト</p>' }] };
  const g1 = { id: 'g1', part: 'p1', t: '第 1 部のまとめ（テスト）', secs: [{ id: 'g1.review', t: '振り返り', h: '<p>テスト</p>' }, { id: 'g1.japan', t: '日米の違い', h: '<p>テスト</p>' }] };
  withChapter(p7, () => withChapter(g1, () => {
    const box = bk.jur('alt.transition');
    assert.match(box, /<div class="jur-jp jur-foot">[^]*<button type="button" class="jur-link" data-sec="jair\.rules">→ 第 7 部で詳しく：日本の飛行の規則<\/button><\/div><\/div>$/);
    assert.equal((box.match(/data-sec=/g) || []).length, 1, 'jifr.rules is not in the book: no link to it');
    assert.match(bk.jp('msa'), /class="jur-link" data-sec="jair\.rules"/);
    assert.match(bk.same('msa'), /class="jur-link" data-sec="jair\.rules"/);
    assert.doesNotMatch(bk.us('msa'), /data-sec|jur-link/, 'never on the US side');
    const app = B.jurAppendix(), row = rows(app).find(r => r.id === 'msa');
    assert.ok(row && row.cells.at(-1).includes('第 7 部：日本の飛行の規則') && row.cells.at(-1).includes('第 1 部のまとめ（テスト）'), 'the appendix links Part 7 and the summary chapter');
    assert.match(app, /class="jur-link" data-sec="g1\.japan"/, 'the summary chapter\'s 日米の違い');
  }));
  assert.equal(bk.jur('alt.transition').includes('data-sec'), false, 'gone again with the sections');
});

// ------------------------------------------------------------------ the chapter-end table and the appendix table
test('FL.book.jurTable: the chapter\'s items in reading order, once each, drawn as in the box; nothing for a chapter without a box', () => {
  for (const ch of B.CHAPTERS) {
    const placed = ch.secs.some(s => /data-jur="/.test(B.html(s)));
    if (!placed) assert.equal(B.jurTable(ch.id), '', `${ch.id}: no box yet (W08 places them)`);
  }
  assert.equal(B.jurTable('no-such-chapter'), '');
  const ch = { id: 'jurt', part: 'p1', t: '日米の囲み（テスト）', secs: [
    { id: 'jurt.a', t: 'A', h: () => `<p>本文</p>${bk.jur('vmc', 'vmc.ad')}${bk.us('alcohol')}` },
    { id: 'jurt.b', t: 'B', h: () => `${bk.jp('alcohol')}${bk.same('fuel.ifr')}${bk.jur('vmc')}` }] };
  withChapter(ch, () => {
    const t = B.jurTable('jurt');
    assert.match(t, /^<div class="bk-jur bk-jur-end"><div class="jur-h"><b>この章の日米の違い<\/b><\/div>/);
    const r = rows(t);
    assert.deepEqual(r.map(x => x.id), ['vmc', 'vmc.ad', 'alcohol', 'fuel.ifr']);
    for (const x of r) { const it = J.byId(x.id); assert.deepEqual([x.title, x.us, x.jp], [it.title, usText(it), jpText(it)], x.id); }
  });
});

test('FL.book.jurAppendix: all 47 items in the table\'s order, each drawn as in the box, with 確度 and the sources\' editions', () => {
  const a = B.jurAppendix(), r = rows(a);
  assert.match(a, /^<div class="bk-jur bk-jur-all"><div class="jur-h"><b>日米対照表（47 項目）<\/b><\/div>/);
  assert.deepEqual(r.map(x => x.id), J.items.map(x => x.id));
  for (const x of r) {
    const it = J.byId(x.id);
    // where the book meets it: the box sections that are in the book now (R1: no summary chapter, no Part 7)
    const where = it.boxes.map(id => B.findSection(id)).filter(Boolean).map(f => f.sec.t).join('') || '—';
    assert.deepEqual(x.cells, [it.title, usText(it), jpText(it), J.CONF[it.conf], where], x.id);
  }
  const vmc = a.match(/<tr class="bk-jur-row" data-jur="vmc">[\s\S]*?<\/tr>/)[0];
  assert.match(vmc, /<td class="jur-where" data-label="本の中で"><button type="button" data-sec="law\.vfr">/, 'law.vfr is in the book: linked');
  assert.match(a.match(/<tr class="bk-jur-row" data-jur="time">[\s\S]*?<\/tr>/)[0], /<td class="jur-where" data-label="本の中で">—<\/td>/, 'basics.time is not yet: no link');
  for (const s of Object.values(J.US)) assert.ok(a.includes(s.title), s.title);
  for (const L of Object.values(J.LAWS)) assert.ok(a.includes(`${L.name}（${L.label}）`), L.name);
  assert.ok(a.includes(`${J.CHECKED} に確認`));
});

test('the boxes are styled in FLIGHT LAB and TEXTBOOK (side by side, stacked on a phone)', () => {
  const css = [fs.readFileSync(path.join(SRC, 'style.css'), 'utf8'), fs.readFileSync(new URL('../../textbook/src/style.css', import.meta.url), 'utf8')];
  for (const c of css) {
    for (const cls of ['bk-jur', 'bk-us', 'bk-jp', 'bk-same', 'jur-h', 'jur-t', 'jur-src', 'jur-unk', 'jur-foot']) assert.match(c, new RegExp(`\\.${cls}\\b`), cls);
    assert.match(c, /@media \(max-width: 700px\) \{\s*\.jur-t, \.jur-t tbody, \.jur-t tr, \.jur-t th, \.jur-t td \{ display: block;/);
  }
});

test('book-jur.js: in the one module list once the integrator registers it (CADET and TEXTBOOK read it too)', { skip: !MODULES.includes('book-jur.js') && 'not in src/modules.mjs yet (the integrator registers it: W06 report, needs from others)' }, () => {
  assert.ok(NODE_MODULES.includes('book-jur.js'), 'the Node tests read it');
  assert.ok(MODULES.indexOf('book-jur.js') < MODULES.indexOf('book-1.js'), 'before the chapters');
});
