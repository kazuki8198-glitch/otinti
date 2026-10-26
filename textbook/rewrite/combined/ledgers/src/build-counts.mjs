// ledgers/src/build-counts.mjs — W03: COUNTS.json, the design's numbers (DESIGN 1.2, 3.1, 3.3, 4.2, 8.1, 10) recounted
// from DESIGN's own table of contents and the original JSON, so the built book can be compared with them later (each row
// has `design` = what DESIGN says, `recount` = what W03 counted now, and `built` = null until a unit counts the book).
//   node build-counts.mjs [--write [--force]]
import fs from 'node:fs';
import path from 'node:path';
import { LEDGERS, tocRows, plannedBook, kRefsIn, sectionText, designText, jurItems, kiso } from './design.mjs';
import { DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const BOOK = plannedBook();
const rows = [];
const add = (id, what, design, recount, source, note = '') => {
  const exact = typeof design === 'number' && typeof recount === 'number';
  rows.push({ id, what, design, recount, match: exact ? design === recount : null, source, built: null, builtBy: null, builtOn: null, note });
};

// --- the table of contents (3.3) ----------------------------------------------------------------------------
const parts = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const secsOf = p => [...BOOK.secs.entries()].filter(([, v]) => v.part === p);
const chOf = p => BOOK.chapters.filter(c => c.part === p);
const heads = {};
for (const line of sectionText('### 3.3').split('\n')) {
  const m = line.match(/^####\s+(序部|第\s*(\d)\s*部).*?—\s*(\d+)\s*章・(\d+)\s*節（今\s*(\d+)・新\s*(\d+)）/) || line.match(/^####\s+(序部|第\s*(\d)\s*部).*?—\s*(\d+)\s*章・(\d+)\s*節（すべて新）/);
  if (m) { const p = m[1] === '序部' ? 'p0' : 'p' + m[2]; heads[p] = { ch: +m[3], sec: +m[4], old: m[5] !== undefined ? +m[5] : 0, nw: m[6] !== undefined ? +m[6] : +m[4] }; }
}
for (const p of parts) {
  const s = secsOf(p), h = heads[p] || {};
  add(`toc.${p}.chapters`, `${p} の章の数`, h.ch ?? null, chOf(p).length, 'DESIGN 3.3 の部の見出し');
  add(`toc.${p}.sections`, `${p} の節の数`, h.sec ?? null, s.length, 'DESIGN 3.3 の部の見出し');
  add(`toc.${p}.existing`, `${p} の今の節（教科書）`, h.old ?? null, s.filter(([, v]) => !v.isNew).length, 'DESIGN 3.3 の部の見出し（今 n）');
  add(`toc.${p}.new`, `${p} の新しい節（★）`, h.nw ?? null, s.filter(([, v]) => v.isNew).length, 'DESIGN 3.3 の部の見出し（新 n）');
}
add('toc.parts', '部の数', 8, new Set([...BOOK.secs.values()].map(v => v.part)).size, 'DESIGN 3.3 の見出し・3.1');
add('toc.chapters', '章の数', 48, BOOK.chapters.length, 'DESIGN 3.3 の見出し・3.1');
add('toc.sections', '節の数', 289, BOOK.secs.size, 'DESIGN 3.3 の見出し・3.1・1.2');
add('toc.existing', '今の教科書の節（ID のまま残す）', 154, [...BOOK.secs.values()].filter(v => !v.isNew).length, 'DESIGN 3.1・1.2');
add('toc.new', '新しい節', 135, [...BOOK.secs.values()].filter(v => v.isNew).length, 'DESIGN 3.1');
add('toc.chapters.new', '新しい章', 21, BOOK.chapters.length - 27, 'DESIGN 3.1（今の 27 章＋新しい 21 章）');
// new sections by origin (1.2: 基礎教材をもとにした 67・新しく書く 68 = 第 7 部 38・まとめ 14・その他 16)
const kisoBased = [], written = [], part7 = [], gates = [];
for (const r of tocRows()) for (const [i, s] of r.secs.entries()) {
  if (!s.isNew) continue;
  if (/^g\d\./.test(s.id)) { gates.push(s.id); continue; }
  if (r.part === 'p7') { part7.push(s.id); continue; }
  const seg = r.col2.slice(s.at, i + 1 < r.secs.length ? r.secs[i + 1].at : undefined);
  (kRefsIn(seg + ' ' + r.src).some(k => k.id) ? kisoBased : written).push(s.id);
}
add('origin.kiso', '基礎教材をもとにした新しい節', 67, kisoBased.length, 'DESIGN 1.2', `W03 の数え方：★ の節のうち、元にするものの列に K の参照がある節（第 7 部とまとめの章を除く）。DESIGN の 67・16 は中身の主な出どころで分けたとみられ、K の参照が一部だけの節（例 intro.japan・aero.struct・sys.radio・wx.stab・ifr.pbn）の数え方で差が出る（数の定義の違いで、節の数そのものは合う）`);
add('origin.written.part7', '新しく書く節：第 7 部（g7 を除く）', 38, part7.length, 'DESIGN 1.2', '第 7 部の節は K の参照があっても「出発点」なので新しく書く節に数える（1.2 の数え方）');
add('origin.written.gates', '新しく書く節：部のまとめ（g1〜g7）', 14, gates.length, 'DESIGN 1.2');
add('origin.written.other', '新しく書く節：英語の準備や両方にない大事なこと', 16, written.length, 'DESIGN 1.2', `W03 の数え方では K の参照がない ★ の節：${written.join('・')}`);
add('origin.textbook', '教科書の節', 154, [...BOOK.secs.values()].filter(v => !v.isNew).length, 'DESIGN 1.2');

// --- the basic course (the original JSON) --------------------------------------------------------------------
const K = kiso();
const n = f => K.chapters.reduce((a, c) => a + f(c), 0);
add('kiso.sections', '基礎教材の節（扉 14・導入 3 を含む）', 393, n(c => c.sections.length), 'DESIGN 4.2・基準 11（原本の JSON）');
add('kiso.covers', '基礎教材の章の扉', 14, n(c => c.sections.filter(s => /\.cover$/.test(s.id)).length), 'DESIGN 4.2');
add('kiso.intros', '基礎教材の導入の節（x1）', 3, n(c => c.sections.filter(s => /\.x\d$/.test(s.id)).length), 'DESIGN 4.2');
add('kiso.questions', '基礎教材の記述問題', 376, n(c => c.qa.length), 'DESIGN 4.2・README');
add('kiso.figures', '基礎教材の図', 161, n(c => c.figures.length), 'DESIGN 4.2');
add('kiso.photos', '基礎教材の写真', 85, n(c => c.photos.length), 'DESIGN 4.2');
add('kiso.glossary', '基礎教材の用語', 555, n(c => c.glossary.length), 'DESIGN 4.2・8.1');
add('kiso.qa.broken', '見出しが開きタグのない </b> で終わる問題', 188, n(c => c.qa.filter(q => /^<p>[^<]*<\/b>/.test(q.q) || /^<p>[^<]*<\/b>/.test(q.a)).length), 'DESIGN 2.4・10.2 aero K-1');
add('kiso.photos.annotated', '注記入りの写真（クレジットに「注記」）', 41, n(c => c.photos.filter(p => /注記/.test(p.credit)).length), 'DESIGN 3.5・4.2', '「注記は本書で追加」35 枚と「注記を加えて使用」6 枚');

// --- PROVENANCE (from the ledger) -----------------------------------------------------------------------------
const P = JSON.parse(fs.readFileSync(path.join(LEDGERS, 'PROVENANCE.json'), 'utf8')).rows;
const cnt = f => P.filter(f).length;
add('prov.sections.placed', '行き先のある基礎教材の節', 392, cnt(r => r.kind === 'section' && r.to.length), 'DESIGN 1.2');
add('prov.sections.dropped', '外す基礎教材の節（kiso06.22）', 1, cnt(r => r.kind === 'section' && !r.to.length), 'DESIGN 1.2・4.2');
add('prov.figures.redraw', '描き直す図（DESIGN 3.3 が名指し）', '約 55', cnt(r => r.kind === 'figure' && r.plan === 'redraw'), 'DESIGN 4.2・8.1');
add('prov.figures.drop', '使わない図', '約 105', cnt(r => r.kind === 'figure' && r.plan === 'drop'), 'DESIGN 4.2');
add('prov.photos.use', '使う写真', 52, cnt(r => r.kind === 'photo' && r.plan === 'use-file'), 'DESIGN 4.2');
add('prov.photos.conditional', '条件つきの写真', 4, cnt(r => r.kind === 'photo' && r.plan === 'conditional'), 'DESIGN 4.2');
add('prov.photos.drop', '使わない写真', 29, cnt(r => r.kind === 'photo' && r.plan === 'drop'), 'DESIGN 4.2');
add('prov.photos.annotatedUsed', '使う写真のうち注記入り', 25, cnt(r => r.kind === 'photo' && r.plan === 'use-file' && r.annotated), 'DESIGN 4.2');

// --- errata and rulings (10) ----------------------------------------------------------------------------------
const E = JSON.parse(fs.readFileSync(path.join(LEDGERS, 'ERRATA.json'), 'utf8')).rows;
const R = JSON.parse(fs.readFileSync(path.join(LEDGERS, 'RULINGS.json'), 'utf8')).rows;
add('errata.textbook', '教科書の誤り（10.1）', 79, E.filter(r => r.book === 'textbook').length, 'DESIGN 10.1 の見出し・2.4');
add('errata.kiso', '基礎教材の誤り・欠落（10.2）', 53, E.filter(r => r.book === 'kiso').length, 'DESIGN 10.2 の見出し・2.4');
add('errata.app', 'アプリとデータの不具合（10.3 の表の行）', 15, E.filter(r => r.book === 'app').length - 1, 'DESIGN 10.3', 'ERRATA.json の行は 16：W03 が 1 行（課目 c1 と k1・k2）を 2 行に分けた');
add('errata.sync', '教科書と課目・ゲームの食い違い（10.5）', 5, E.filter(r => r.book === 'syllabus').length, 'DESIGN 10.5');
add('errata.safety', '〔安全〕の誤りの行', null, E.filter(r => r.safety).length, 'DESIGN 10', '命に関わる 7 項目（基準 7）は ERRATA 9 行と RULINGS の〔安全〕の行にまたがる');
add('rulings.rows', '食い違い（10.4 の見出しの件数と表の行）', 74, R.length, 'DESIGN 10.4 の見出し・2.4', '見出しは 74 件、表は 80 行（DESIGN 自身が「行は少し細かく分けた」と書く）。RULINGS.json は表の 80 行');
const has = k => R.filter(r => r.classes.includes(k)).length;
add('rulings.A', '食い違い A（国の違い。混合を含む）', '約 30', has('A'), 'DESIGN 2.4', `主の分類が A の行は ${R.filter(r => r.class === 'A').length}`);
add('rulings.B', '食い違い B（片方が誤り・弱い。混合を含む）', '約 25', has('B'), 'DESIGN 2.4', `主の分類が B の行は ${R.filter(r => r.class === 'B').length}`);
add('rulings.C', '食い違い C（言葉と強さ。混合を含む）', '約 19', has('C'), 'DESIGN 2.4', `主の分類が C の行は ${R.filter(r => r.class === 'C').length}。2.4 の約 19 は 10.4 の表の数と合わない（表は C を広く使う）`);
add('jur.items', '取り違えやすい日米の項目', 47, jurItems().length, 'DESIGN 3.4');
add('jur.safety', '〔安全〕の日米の項目', null, jurItems().filter(x => x.safety).length, 'DESIGN 3.4');
add('jur.unverified', '〔要確認〕を含む日米の項目', null, jurItems().filter(x => x.unverified).length, 'DESIGN 3.4');

// --- the targets for the built book (8.1 and 1.2): no recount possible yet --------------------------------------
const T = [
  ['book.figures', '図', '約 198（教科書 100（約 12 を直す）＋基礎教材の描き直し 約 55＋新しい図 約 43（第 7 部 18 を含む））', 'DESIGN 8.1'],
  ['book.photos', '写真', '81〜85（教科書 30＋基礎教材から 51＋条件つき 0〜4。ch09-photo4 は holdShort の差し替え）', 'DESIGN 8.1'],
  ['book.chapterQuiz', '章末の 4 択', '約 255（今の 135＋新しい章 約 70＋既存の章の後ろに 約 50）', 'DESIGN 8.1'],
  ['book.quiz', '学科テスト', '14 分野 約 205 問（今 145。common・us だけ）＋JCAB 形式 6 分野 約 300 問', 'DESIGN 8.1・基準 18・19'],
  ['book.written', '説明してみよう・口述の練習', '約 280（基礎教材から）＋部のまとめの問い 約 100', 'DESIGN 8.1・4.2'],
  ['book.kisoQuestions', '基礎教材の記述問題の行き先', '約 280 を説明してみよう・口述へ、約 90 を 4 択へ（一部は両方）、約 20 を理由つきで外す', 'DESIGN 4.2'],
  ['book.terms', '用語', '約 800（教科書 446＋基礎教材 555 を整理）。用語の表 FL.terms は約 150 語', 'DESIGN 8.1・3.5'],
  ['book.boxes', '囲み', '基礎教材からの「もっと深く・判断の目・ここを混同しない・計算演習」約 120、日米の囲み 約 60', 'DESIGN 8.1・1.2'],
  ['book.text', '本文の量（1.2 の数え方）', '約 40.5 万字（教科書から 約 17 万・基礎教材から 約 10.5 万・新しく 約 13 万）。序部〜第 6 部の「まず読む節」約 25〜26 万字（今の教科書 約 18.2 万字の 1.4 倍まで）、第 7 部 約 8 万字', 'DESIGN 1.2・8.1・基準 22'],
  ['book.japanShare', '日本の内容の割合', '約 25%（約 10 万字）', 'DESIGN 1.2'],
  ['book.size', '容量', 'FLIGHT-LAB.html 12 MiB 以下（R1 のあと 約 9.6 MB）、CADET 15 MiB 以下、教科書の写真はデコード後 1 枚 120 KB 以下・合計 4.0 MiB 以下、CADET の AI 教官の目次 2.5 万字以下（約 224 節）', 'DESIGN 8.2・基準 25・6.3'],
  ['book.textbookModules', 'TEXTBOOK の読み込みファイル', '14 → 19', 'DESIGN 3.1・6.2 の決まり 11'],
  ['book.aeroLiftNumber', '#aero.lift の章・節の番号', 'R1 で 5.2、R2 で 5.3', 'DESIGN 6.1・6.2 の決まり 11'],
  ['book.lessons', '課目とそのリンク', '37 課目・book 51 本（後ろに足すだけ。k1・k2 に inst.pfd、c1 は solo.check）', 'DESIGN 6.1'],
];
for (const [id, what, design, source] of T) add(id, what, design, null, source, '作った本で数える（built に記入）');

const mism = rows.filter(r => r.match === false);
const out = {
  ledger: 'COUNTS', version: 1, updated: DATE, by: 'W03',
  about: 'この設計の数（DESIGN 1.2・3.1・3.3・4.2・8.1・10）を目次と原本の JSON から数え直したもの（DESIGN 5 章の終わり）。design は設計書の値、recount は W03 が今数えた値、built は作った本の値（版の確かめの単位が記入）。match:false は設計書の中の食い違い',
  counts: { rows: rows.length, exact: rows.filter(r => r.match !== null).length, mismatch: mism.length },
  mismatches: mism.map(r => `${r.id}: design ${r.design} / recount ${r.recount}`),
  rows,
};
console.log(JSON.stringify(out.counts), out.mismatches);
if (import.meta.url === `file://${process.argv[1]}`) writeLedger(path.join(LEDGERS, 'COUNTS.json'), out);
