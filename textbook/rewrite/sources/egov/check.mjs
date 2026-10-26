#!/usr/bin/env node
// textbook/rewrite/sources/egov/check.mjs — e-Gov の条文の写しの検査（ネットワークは使わない）。
//
//   node textbook/rewrite/sources/egov/check.mjs            検査して数を出す（失敗があれば終了コード 1）
//   node textbook/rewrite/sources/egov/check.mjs --verbose  通った検査も 1 行ずつ出す
//
// 確かめること：
//   1. index.json・manifest.json・articles/ の 3 つが同じ条を持つ（足りない・余分な写しがない）
//   2. どの写しにもメタデータ（法令名・法令 ID・条・版の施行日・写した日・確認した日・URL・API の URL）と文字がある。
//      文字は e-Gov の要素（node）から作り直したものと 1 文字も違わず、sha256 も合う。条の番号と見出しの漢数字も合う
//   3. 数と条の引用を読む道具（lib.mjs）が決まった例で正しく動く
//   4. jur-japan.json（47 項目の日本の欄）の引用はすべて写しの条文にそのまま出てくる。数はその条に出てくる。
//      「定めがない」とした語は、index.json の語の数え上げで 0 件
//
// ほかのテストからは、この 1 ファイルを読めば道具が全部使える：
//   import { assertNumberInArticle, assertTextInArticle, articleHasNumber, parseCitations, runChecks } from '…/sources/egov/check.mjs';
//   assertNumberInArticle('kokuho-kisoku:178', 14000, 'ft');   // 施行規則第178条に「一万四千フート」がある
//   assertNumberInArticle('kokuho-kisoku:5', 1500, 'm');       // 「千五百メートル」
//   parseCitations('航空法施行規則第 198 条の 4')[0].refs      // ['kokuho-kisoku:198_4']

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  EGOV_DIR, ARTICLES_DIR, INDEX_FILE, MANIFEST_FILE, JUR_FILE,
  renderArticle, plainText, sha256, articleLabel, articleNum, parseJaNumber, numbersIn, textHasNumber,
  parseCitations, loadArticle, articleHasText, assertNumberInArticle, assertTextInArticle,
} from './lib.mjs';

export * from './lib.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['confirmed', 'corrected', 'partial', 'not-egov', 'absent-in-egov'];
const DESIGN_FILE = path.resolve(EGOV_DIR, '..', '..', 'combined', 'DESIGN.md');

function readJsonSafe(f) {
  try { return { value: JSON.parse(fs.readFileSync(f, 'utf8')) }; } catch (e) { return { error: e.message }; }
}

/** DESIGN.md の 47 項目の ID（表の 1 列目。〔安全〕を外す）。ファイルがなければ null。 */
export function designJurIds(file = DESIGN_FILE) {
  if (!fs.existsSync(file)) return null;
  const s = fs.readFileSync(file, 'utf8');
  const start = s.indexOf('**取り違えやすい 47 項目**');
  if (start < 0) return null;
  const end = s.indexOf('**推測で埋めないもの**', start);
  return s.slice(start, end < 0 ? undefined : end).split('\n')
    .filter(l => l.startsWith('| ') && !l.startsWith('| ID') && !l.startsWith('|---'))
    .map(l => l.split('|')[1].trim().replace(/〔安全〕/g, ''));
}

/** 写しの全部を検査する。返り値：{ passed, failed, warnings: [...], failures: [...], lines: [...], summary } */
export function runChecks() {
  let passed = 0;
  const failures = [], warnings = [], lines = [];
  const check = (name, cond, why = '') => {
    if (cond) { passed++; lines.push(`ok   ${name}`); }
    else { failures.push(`${name}${why ? ' — ' + why : ''}`); lines.push(`FAIL ${name}${why ? ' — ' + why : ''}`); }
    return !!cond;
  };
  const tryCheck = (name, fn) => {
    try { fn(); return check(name, true); } catch (e) { return check(name, false, e.message); }
  };

  // ---- 1. 索引・一覧・ファイル
  const idx = readJsonSafe(INDEX_FILE);
  const man = readJsonSafe(MANIFEST_FILE);
  if (!check('index.json が読める', !idx.error, idx.error) || !check('manifest.json が読める', !man.error, man.error)) {
    return finish();
  }
  const index = idx.value, manifest = man.value;
  check('index.json：fetched が日付', ISO.test(index.fetched || ''), String(index.fetched));
  check('index.json：法令と条がある', Array.isArray(index.laws) && index.laws.length > 0 && Array.isArray(index.articles) && index.articles.length > 0);
  const lawByKey = new Map((index.laws || []).map(l => [l.key, l]));

  for (const law of index.laws || []) {
    const n = `index.json：${law.title || law.key}`;
    check(`${n}：key・title・lawNum・lawType・amendment がある`, ['key', 'title', 'lawNum', 'lawType', 'amendment'].every(k => typeof law[k] === 'string' && law[k]));
    check(`${n}：lawId の形`, /^[0-9A-Z]{15}$/.test(law.lawId || ''), law.lawId);
    check(`${n}：version・checked が日付`, ISO.test(law.version || '') && ISO.test(law.checked || ''), `${law.version} ${law.checked}`);
    check(`${n}：revisionId が lawId と施行日を含む`, (law.revisionId || '').startsWith(`${law.lawId}_${(law.version || '').replace(/-/g, '')}_`), law.revisionId);
    check(`${n}：url が e-Gov の版のページ`, (law.url || '') === `https://laws.e-gov.go.jp/law/${law.lawId}/${(law.revisionId || '').split('_').slice(1).join('_')}`, law.url);
    check(`${n}：確認した日に固定の版が施行中だった`, law.statusOnChecked === 'CurrentEnforced', law.statusOnChecked);
    check(`${n}：語の数え上げ（terms）がある`, law.terms && typeof law.terms === 'object');
    for (const r of law.newer || []) {
      if (r.status === 'CurrentEnforced') warnings.push(`${law.title}：新しい施行中の版 ${r.version}（${r.revisionId}）がある。manifest の版を見直す`);
      if ((r.changedArticles || []).length) warnings.push(`${law.title}：${r.version} の版（${r.status}）で写しの条が変わる：${r.changedArticles.map(articleLabel).join('・')}`);
    }
  }

  const manRefs = [];
  for (const l of manifest.laws || []) {
    const il = lawByKey.get(l.key);
    check(`manifest：${l.title} が index.json にあり版が同じ`, il && il.revisionId === l.revisionId && il.lawId === l.lawId, il ? il.revisionId : 'index にない');
    for (const a of l.articles || []) manRefs.push(`${l.key}:${a.num}`);
  }
  const idxRefs = (index.articles || []).map(a => a.ref);
  check('manifest と index.json の条が同じ', JSON.stringify([...manRefs].sort()) === JSON.stringify([...idxRefs].sort()),
    `manifest だけ：${manRefs.filter(r => !idxRefs.includes(r)).join(', ') || 'なし'}／index だけ：${idxRefs.filter(r => !manRefs.includes(r)).join(', ') || 'なし'}`);
  check('index.json の ref に重なりがない', new Set(idxRefs).size === idxRefs.length);
  const onDisk = [];
  if (fs.existsSync(ARTICLES_DIR)) {
    for (const key of fs.readdirSync(ARTICLES_DIR)) {
      const d = path.join(ARTICLES_DIR, key);
      if (!fs.statSync(d).isDirectory()) { onDisk.push(path.relative(EGOV_DIR, d)); continue; }
      for (const f of fs.readdirSync(d)) onDisk.push(path.relative(EGOV_DIR, path.join(d, f)).split(path.sep).join('/'));
    }
  }
  const idxFiles = (index.articles || []).map(a => a.file);
  check('articles/ のファイルと index.json が同じ（余分・不足なし）', JSON.stringify([...onDisk].sort()) === JSON.stringify([...idxFiles].sort()),
    `ファイルだけ：${onDisk.filter(f => !idxFiles.includes(f)).join(', ') || 'なし'}／index だけ：${idxFiles.filter(f => !onDisk.includes(f)).join(', ') || 'なし'}`);

  // ---- 2. 写しの 1 条ずつ
  const REQUIRED = ['ref', 'law', 'lawKey', 'lawId', 'lawNum', 'revisionId', 'version', 'versionLabel', 'num', 'article', 'label', 'url', 'api', 'fetched', 'checked', 'sha256', 'text'];
  for (const entry of index.articles || []) {
    const n = entry.ref;
    const f = path.join(EGOV_DIR, entry.file || '');
    const r = readJsonSafe(f);
    if (!check(`${n}：写しが読める（${entry.file}）`, !r.error, r.error)) continue;
    const a = r.value;
    const law = lawByKey.get(a.lawKey) || {};
    const missing = REQUIRED.filter(k => typeof a[k] !== 'string' || !a[k]);
    if (!check(`${n}：メタデータと文字がある`, missing.length === 0, `ない：${missing.join(', ')}`)) continue;
    check(`${n}：use が配列`, Array.isArray(a.use));
    check(`${n}：ref・ファイルの場所・index が合う`, a.ref === n && a.ref === `${a.lawKey}:${a.num}` && entry.file === `articles/${a.lawKey}/${a.num}.json`);
    check(`${n}：法令名・法令 ID・版が index の法令と同じ`, a.law === law.title && a.lawId === law.lawId && a.revisionId === law.revisionId && a.version === law.version && a.lawNum === law.lawNum,
      `${a.law} ${a.revisionId}`);
    check(`${n}：日付の形と順（版の施行日 ≦ 写した日 ≦ 確認した日）`, ISO.test(a.version) && ISO.test(a.fetched) && ISO.test(a.checked) && a.version <= a.fetched && a.fetched <= a.checked,
      `${a.version} / ${a.fetched} / ${a.checked}`);
    check(`${n}：url が e-Gov の版のページのこの条`, a.url.startsWith(`${law.url}#Mp-`) && a.url.endsWith(`-At_${a.num}`), a.url);
    check(`${n}：api が e-Gov API v2 のこの版・この条`, a.api.startsWith(`https://laws.e-gov.go.jp/api/2/law_data/${a.revisionId}?`) && a.api.includes(`elm=MainProvision-Article_${a.num}`), a.api);
    check(`${n}：label と num が合う`, a.label === articleLabel(a.num), `${a.label} / ${a.num}`);
    check(`${n}：見出しの漢数字（${a.article}）と num が合う`, articleNum(a.article) === a.num, `${articleNum(a.article)} / ${a.num}`);
    const node = a.node;
    if (!check(`${n}：e-Gov の要素（node）がこの条`, node && node.tag === 'Article' && node.attr && node.attr.Num === a.num)) continue;
    let rendered = null;
    try { rendered = renderArticle(node); } catch (e) { rendered = `（作れない：${e.message}）`; }
    check(`${n}：文字が e-Gov の要素から作り直したものと同じ`, rendered === a.text, '文字と node が食い違う（手で直した？ fetch.mjs で写し直す）');
    check(`${n}：sha256 が文字と index に合う`, sha256(a.text) === a.sha256 && a.sha256 === entry.sha256);
    check(`${n}：文字に見出しの条（${a.article}）がある・削除の条でない`, a.text.includes(a.article) && !/^(（[^）]*）\n)?第[^　]*条[^　]*　削除$/.test(a.text) && a.text.length > a.article.length + 10);
    const cap = node.children.find(c => typeof c !== 'string' && c.tag === 'ArticleCaption');
    check(`${n}：条の見出し（caption）が要素と同じ`, (a.caption || '') === (cap ? plainText(cap) : ''));
  }

  // ---- 3. 道具の例
  const NUM_CASES = [
    ['一万四千', 14000], ['一、〇一三・二', 1013.2], ['二九、〇〇〇', 29000], ['千五百', 1500], ['五千七百', 5700],
    ['二百五十', 250], ['百八十', 180], ['三十七・五', 37.5], ['四千九十六', 4096], ['一万', 10000], ['十', 10],
    ['四十', 40], ['一八〇', 180], ['１５', 15], ['2,000', 2000], ['三百', 300], ['九百', 900], ['百十', 110],
  ];
  for (const [s, v] of NUM_CASES) check(`道具：parseJaNumber('${s}') = ${v}`, parseJaNumber(s) === v, String(parseJaNumber(s)));
  check('道具：単位つきの数（一万四千フート → 14000 ft）', textHasNumber('一万四千フート未満の高度', 14000, 'ft'));
  check('道具：キロメートルをメートルと読まない', !textHasNumber('百十キロメートル', 110, 'm') && textHasNumber('百十キロメートル', 110, 'km'));
  check('道具：位取りの「、」と読点を分ける', JSON.stringify(numbersIn('飛行機、回転翼航空機及び二九、〇〇〇フート').map(x => x.value)) === '[29000]');
  check('道具：単位なしの数も拾う', textHasNumber('四千九十六以上の応答符号', 4096));
  const C = [
    ['航空法施行規則第 178 条', ['kokuho-kisoku:178']],
    ['施行規則第198条の4', ['kokuho-kisoku:198_4']],
    ['航空法第 71 条の 2', ['kokuho:71_2']],
    ['航空法第七十一条の二', ['kokuho:71_2']],
    ['施行規則第 180〜186 条', ['kokuho-kisoku:180', 'kokuho-kisoku:181', 'kokuho-kisoku:182', 'kokuho-kisoku:183', 'kokuho-kisoku:184', 'kokuho-kisoku:185', 'kokuho-kisoku:186']],
    ['施行規則第 197 条〜第 197 条の 3', ['kokuho-kisoku:197', 'kokuho-kisoku:197_2', 'kokuho-kisoku:197_3']],
    ['航空法第 76 条・第 76 条の 2', ['kokuho:76']],
  ];
  for (const [s, refs] of C) check(`道具：parseCitations('${s}')`, JSON.stringify(parseCitations(s)[0]?.refs) === JSON.stringify(refs), JSON.stringify(parseCitations(s)[0]?.refs));
  const inherit = parseCitations('航空法第 94 条ただし書・施行規則第 198 条の 4・第 206 条');
  check('道具：法令名のない「第 n 条」は前の法令名を引き継ぐ', inherit.map(c => c.refs[0]).join(',') === 'kokuho:94,kokuho-kisoku:198_4,kokuho-kisoku:206', inherit.map(c => c.refs[0]).join(','));
  tryCheck('道具：assertNumberInArticle が無い数で例外を出す', () => {
    let threw = false;
    try { assertNumberInArticle('kokuho-kisoku:178', 18000, 'ft'); } catch { threw = true; }
    if (!threw) throw new Error('18000 ft で例外が出なかった');
  });

  // ---- 4. 47 項目の日本の欄
  const jr = readJsonSafe(JUR_FILE);
  if (check('jur-japan.json が読める', !jr.error, jr.error)) {
    const items = jr.value.items || [];
    const ids = items.map(i => i.id);
    check('jur-japan.json：47 項目・ID の重なりなし', items.length === 47 && new Set(ids).size === ids.length, `${items.length} 項目`);
    const dids = designJurIds();
    if (dids) {
      const same = JSON.stringify([...dids].sort()) === JSON.stringify([...ids].sort());
      if (!same) warnings.push(`jur-japan.json の ID が DESIGN 3.4 の 47 項目と違う（DESIGN だけ：${dids.filter(x => !ids.includes(x)).join(', ') || 'なし'}／写しだけ：${ids.filter(x => !dids.includes(x)).join(', ') || 'なし'}）`);
      else check('jur-japan.json：ID が DESIGN 3.4 の 47 項目と同じ', true);
    }
    for (const it of items) {
      const n = `47 項目 ${it.id}`;
      check(`${n}：status・finding・design がある`, STATUSES.includes(it.status) && typeof it.finding === 'string' && it.finding && typeof it.design === 'string', it.status);
      if (['confirmed', 'corrected', 'partial'].includes(it.status)) check(`${n}：条文の引用がある`, (it.quotes || []).length > 0);
      if (it.status === 'corrected') check(`${n}：直し方（correction）がある`, typeof it.correction === 'string' && it.correction);
      for (const ref of it.refs || []) check(`${n}：${ref} が写しにある`, !!loadArticle(ref));
      (it.quotes || []).forEach((qt, k) => {
        check(`${n}：引用 ${k + 1} は refs の条`, (it.refs || []).includes(qt.ref), qt.ref);
        tryCheck(`${n}：引用 ${k + 1} が ${qt.ref} にそのまま出てくる`, () => assertTextInArticle(qt.ref, qt.text));
      });
      (it.numbers || []).forEach(x => tryCheck(`${n}：${x.ref} に ${x.value}${x.unit ? ' ' + x.unit : ''}`, () => assertNumberInArticle(x.ref, x.value, x.unit)));
      for (const ab of it.absent || []) {
        const law = lawByKey.get(ab.law);
        for (const t of ab.terms) check(`${n}：${law ? law.title : ab.law} の全文に「${t}」がない`, law && law.terms && law.terms[t] && law.terms[t].total === 0,
          law && law.terms && law.terms[t] ? `${law.terms[t].total} 件` : '数え上げにない語（manifest の searchTerms に足して fetch.mjs）');
      }
      (it.outside || []).forEach((o, k) => check(`${n}：e-Gov の外の資料 ${k + 1} に出典・https の URL・確認日・引用がある`,
        typeof o.source === 'string' && o.source && /^https:\/\//.test(o.url || '') && ISO.test(o.checked || '') && Array.isArray(o.quotes) && o.quotes.length > 0));
      for (const tc of it.terms || []) {
        const law = lawByKey.get(tc.law);
        const got = law && law.terms && law.terms[tc.term];
        check(`${n}：${law ? law.title : tc.law} の全文の「${tc.term}」は ${tc.total} 件（${tc.articles.join('・')}）`,
          got && got.total === tc.total && JSON.stringify(got.articles) === JSON.stringify(tc.articles), got ? `${got.total} 件（${got.articles.join('・')}）` : 'なし');
      }
    }
    // 写したのに 47 項目のどれも引かない条（R1 の節だけで使う条）を知らせる
    const used = new Set(items.flatMap(i => i.refs || []));
    const unused = idxRefs.filter(r => !used.has(r));
    if (unused.length) warnings.push(`47 項目のどれも引いていない写し：${unused.join(', ')}（節で使うなら問題ない）`);
  }

  return finish();

  function finish() {
    const summary = `e-Gov の写しの検査：pass ${passed} / fail ${failures.length} / warn ${warnings.length}`;
    return { passed, failed: failures.length, failures, warnings, lines, summary };
  }
}

// ---- コマンドとして動かしたとき
const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const verbose = process.argv.includes('--verbose');
  const r = runChecks();
  const idx = readJsonSafe(INDEX_FILE).value;
  const jur = readJsonSafe(JUR_FILE).value;
  if (verbose) for (const l of r.lines) console.log(l);
  if (idx) {
    for (const l of idx.laws) {
      console.log(`${l.title}（${l.lawNum}）${l.versionLabel}の版 ${l.revisionId}・確認 ${l.checked}・写し ${l.articles} 条`);
      for (const nw of l.newer || []) {
        const ch = nw.changedArticles ? `・写しの条の変化 ${nw.changedArticles.length ? nw.changedArticles.join(',') : 'なし'}（${nw.comparedOn} に比較）` : '';
        console.log(`  これより新しい版：${nw.version}（${nw.status}）${nw.amendment}${ch}`);
      }
    }
  }
  if (jur) {
    const c = {};
    for (const i of jur.items) c[i.status] = (c[i.status] || 0) + 1;
    console.log(`47 項目の日本の欄：${Object.entries(c).map(([k, v]) => `${k} ${v}`).join('・')}`);
  }
  for (const w of r.warnings) console.log(`warn ${w}`);
  for (const f of r.failures) console.log(`FAIL ${f}`);
  console.log(r.summary);
  process.exit(r.failed ? 1 : 0);
}
