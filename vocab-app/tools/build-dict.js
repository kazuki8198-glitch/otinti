#!/usr/bin/env node
/*
 * tools/.build/intermediate.json（build_data.py の出力）から public/data/dict.js を作る。
 *  - 辞書の意味を「一覧用の短い訳」と「詳細用の訳」に整形
 *  - 変化形→原形の例外表を、実際にアプリが使う core.js の規則と突き合わせて最小化
 */
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('../public/js/core.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, '.build', 'intermediate.json');
const OUT = path.join(ROOT, 'public', 'data', 'dict.js');
const OUT_DETAIL = path.join(ROOT, 'public', 'data', 'dict-detail.js');
const LONG_MAX = 140;
const SHORT_MAX = 30;

function stripNested(s, re) {
  let prev;
  do { prev = s; s = s.replace(re, ''); } while (s !== prev);
  return s;
}

function cleanSense(s) {
  s = s.replace(/[『』]/g, '').replace(/〈[CU]〉/g, '').replace(/\{[^}]*\}/g, '');
  s = stripNested(s, /《[^《》]*》/g);
  s = s.replace(/(\S)[(（](…[^()（）]*)[)）]/g, '$1、'); // 「A(…の)B」は A、B と区切る
  s = stripNested(s, /\([^()]*\)/g);
  s = stripNested(s, /（[^（）]*）/g);
  return s
    .replace(/\[[^\]]*\]/g, '')
    .replace(/〈[^〉]*〉(?=[をにがのとへで])/g, '…')
    .replace(/〈[^〉]*〉/g, '')
    .replace(/…+/g, '…')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;、:：・\s]+|[,;、:：・\s]+$/g, '');
}

function crossRef(meaning) {
  const m = stripNested(meaning, /《[^《》]*》/g).match(/^\s*=\s*([A-Za-z][A-Za-z' -]*)/);
  return m ? m[1].trim().toLowerCase() : null;
}

function shortGloss(meaning, handWritten) {
  const terms = [];
  for (const sense of meaning.split(/\s*\/\s*/)) {
    const cs = cleanSense(sense);
    if (!cs || cs.startsWith('=')) continue;
    let took = 0;
    for (let t of cs.split(/[,;、，；]/)) {
      t = t.trim().replace(/^・+|・+$/g, '');
      if (!t || t === '…' || terms.includes(t) || /^[\s….]+$/.test(t)) continue;
      // EJDict の英語の言い換えや略語の説明（chirp, Old French など）は一覧では省く
      if (!handWritten && /[A-Za-z]{3,}/.test(t)) continue;
      if (/^[A-Za-z .'-]+$/.test(t)) continue;
      terms.push(t);
      if (++took >= 2) break;
    }
    if (terms.join('、').length >= 12 || terms.length >= 4) break;
  }
  let g = terms.join('、');
  if (g.length > SHORT_MAX) {
    const cut = g.lastIndexOf('、', SHORT_MAX);
    g = cut >= 6 ? g.slice(0, cut) : g.slice(0, SHORT_MAX - 1) + '…';
  }
  return g;
}

function longGloss(meaning) {
  let s = meaning.replace(/[『』]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length <= LONG_MAX) return s;
  const cut = s.lastIndexOf(' / ', LONG_MAX);
  return cut > 40 ? s.slice(0, cut) + ' / …' : s.slice(0, LONG_MAX - 1) + '…';
}

function main() {
  const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const entries = data.entries; // word -> {h, m, p}
  const lemmaOf = data.lemmaOf; // form -> lemma
  const words = Object.keys(entries);

  // 純粋な変化形の見出し（went: goの過去 など）は辞書本体から外す（例外表で原形へ飛ばす）
  const pointerOnly = new Set();
  for (const w of words) {
    const m = entries[w].m;
    if (lemmaOf[w] && lemmaOf[w] !== w && !m.includes(' / ') && /の(過去|複数|比較級|最上級|現在分詞|三人称|3人称)/.test(m)) {
      pointerOnly.add(w);
    }
  }
  // 短縮形の断片・略語など、単語として扱わない見出し
  const DROP = new Set(['re', 've', 'll', 'st', 'nd', 'rd', 'th', 'em', 'ca', 'ms', 'dc', 'el', 'un', 'op', 'mt', 'cl', 'cw', 'sf']);
  const kept = new Set(words.filter((w) => !pointerOnly.has(w) && !DROP.has(w)));
  const has = (w) => kept.has(w);

  // 例外表: 規則(core.ruleCandidates)だけでは望む原形にならない語だけを登録
  const ovr = new Map();
  const forms = Object.keys(lemmaOf);
  for (const w of forms) if (has(w) && lemmaOf[w] !== w) ovr.set(w, lemmaOf[w]);
  for (const w of forms) {
    if (ovr.has(w)) continue;
    if (core.lemmatizeWith(w, has, ovr) !== lemmaOf[w]) ovr.set(w, lemmaOf[w]);
  }
  let mismatch = 0;
  for (const w of forms) if (core.lemmatizeWith(w, has, ovr) !== lemmaOf[w]) mismatch++;
  if (mismatch) throw new Error('lemma mismatch: ' + mismatch);

  // 訳の整形
  const glossCache = new Map();
  const glossOf = (w, depth = 0) => {
    if (glossCache.has(w)) return glossCache.get(w);
    const e = entries[w];
    if (!e) return '';
    let g = shortGloss(e.m, e.sup);
    if (!g && depth < 2) {
      const ref = crossRef(e.m);
      if (ref && ref !== w) g = glossOf(ref, depth + 1);
    }
    if (!g) g = cleanSense(e.m).slice(0, SHORT_MAX);
    glossCache.set(w, g);
    return g;
  };

  const ranked = data.ranked.filter((w) => kept.has(w));
  const rankedSet = new Set(ranked);
  const rest = [...kept].filter((w) => !rankedSet.has(w)).sort();
  const lines = [];
  const details = [];
  const emit = (w) => {
    const e = entries[w];
    const sg = glossOf(w);
    const lg = longGloss(e.m);
    const flags = e.p ? 'P' : '';
    const disp = e.h !== w ? e.h : '';
    lines.push([w, sg, flags, disp].join('\t').replace(/\t+$/, ''));
    details.push(lg === sg ? '' : lg);
  };
  ranked.forEach(emit);
  rest.forEach(emit);

  const lemmaLines = [...ovr.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([f, l]) => f + '\t' + l);
  const version = new Date().toISOString().slice(0, 10);
  const header =
    '/* TubeTan 辞書データ（自動生成: tools/build-dict.js）\n' +
    ' * 英和訳: EJDict-hand (パブリックドメイン/CC0) https://github.com/kujirahand/EJDict と tools/supplement.tsv\n' +
    ' * 頻度順位: wordfreq (CC BY-SA 4.0) https://github.com/rspeer/wordfreq から算出\n' +
    ' * このファイルの頻度順位データは CC BY-SA 4.0 で提供されます。 */\n';
  const main = { version, ranked: ranked.length, entries: lines.join('\n'), lemmas: lemmaLines.join('\n') };
  fs.writeFileSync(OUT, header + 'window.TUBETAN_DICT=' + JSON.stringify(main) + ';\n');
  const detail = { version, details: details.join('\n') };
  fs.writeFileSync(OUT_DETAIL, header + 'window.TUBETAN_DICT_DETAIL=' + JSON.stringify(detail) + ';\n');
  const mb = (f) => (fs.statSync(f).size / 1024 / 1024).toFixed(2) + 'MB';
  console.log(`entries=${lines.length} ranked=${ranked.length} lemmas=${lemmaLines.length} dropped=${pointerOnly.size} dict=${mb(OUT)} detail=${mb(OUT_DETAIL)}`);
}

if (require.main === module) main();
module.exports = { shortGloss, longGloss, cleanSense };
