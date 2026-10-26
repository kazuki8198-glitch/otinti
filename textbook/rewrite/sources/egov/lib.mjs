// textbook/rewrite/sources/egov/lib.mjs — e-Gov の条文の写しを読む道具（ネットワークは使わない）。
//
// 写しの形（articles/<法令キー>/<条の番号>.json）は README.md を見る。ここにあるもの：
//   loadIndex() / loadArticle(ref) / allArticles()  写しを読む
//   renderArticle(node)                              e-Gov の JSON（tag/attr/children）から条文の文字を作る
//   parseJaNumber(s) / numbersIn(text)               漢数字・全角数字を数に（「一万四千」→14000、「一、〇一三・二」→1013.2）
//   articleHasNumber(ref, value, unit) / assertNumberInArticle(...)   「この数がこの条に出てくる」
//   articleHasText(ref, s) / assertTextInArticle(...)                 「この言葉がこの条に出てくる」（文字どおり）
//   parseCitations(text)                             本文の「航空法施行規則第 178 条」「第 71 条の 2」などを写しの ref に
//
// ref の形は「<法令キー>:<条の番号>」。条の番号は e-Gov の Num と同じ（第七十一条の二 → 71_2）。
//   kokuho:63（航空法第 63 条）・kokuho-kisoku:198_4（航空法施行規則第 198 条の 4）

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const EGOV_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ARTICLES_DIR = path.join(EGOV_DIR, 'articles');
export const INDEX_FILE = path.join(EGOV_DIR, 'index.json');
export const MANIFEST_FILE = path.join(EGOV_DIR, 'manifest.json');
export const JUR_FILE = path.join(EGOV_DIR, 'jur-japan.json');

// 法令キーと、本文での呼び方。長い名前を先に（「航空法施行規則」を「航空法」と読み違えない）。
export const LAW_NAMES = [
  { key: 'kokuho-kisoku', names: ['航空法施行規則', '施行規則'] },
  { key: 'kokuho', names: ['航空法', '法'] },
];

// ---------------------------------------------------------------------------
// 読み込み

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
let _index = null;
const _articles = new Map();

export function loadIndex() {
  if (!_index) _index = readJson(INDEX_FILE);
  return _index;
}

export function articleFile(ref) {
  const [key, num] = String(ref).split(':');
  return path.join(ARTICLES_DIR, key, `${num}.json`);
}

/** 写しの 1 条を返す。ない条は null。 */
export function loadArticle(ref) {
  if (_articles.has(ref)) return _articles.get(ref);
  const f = articleFile(ref);
  const a = fs.existsSync(f) ? readJson(f) : null;
  _articles.set(ref, a);
  return a;
}

export function allArticles() {
  return loadIndex().articles.map(e => loadArticle(e.ref));
}

export function hasArticle(ref) {
  return loadIndex().articles.some(e => e.ref === ref);
}

// ---------------------------------------------------------------------------
// 条文の文字を作る（e-Gov の画面の並びに合わせる）
//   - 条の見出し（ArticleCaption）は 1 行目
//   - 第 1 項は「第百七十八条　…」、第 2 項からは「２　…」、号は「一　…」、細目は「イ　…」「（１）　…」
//   - 1 つの項・号の中の文（本文とただし書）は続けて書く。号の中の列（Column）は全角空白でつなぐ
//   - 表は 1 行を 1 行に、欄を「｜」でつなぐ
//   - ふりがな（Rt）は外す（「勾こう配」でなく「勾配」）

const isStr = n => typeof n === 'string';
const kids = n => (n && n.children) || [];
const child = (n, tag) => kids(n).find(c => !isStr(c) && c.tag === tag);

/** 要素の中の文字だけ（ふりがなを除く）。 */
export function plainText(n) {
  if (n == null) return '';
  if (isStr(n)) return n;
  if (n.tag === 'Rt') return '';
  if (n.tag === 'Fig') return '［図］';
  return kids(n).map(plainText).join('');
}

// 文の入れ物（ParagraphSentence・ItemSentence・Subitem*Sentence・ListSentence）
function sentenceText(n) {
  if (!n) return '';
  const cols = kids(n).filter(c => !isStr(c) && c.tag === 'Column');
  if (cols.length) return cols.map(c => plainText(c)).join('　');
  return plainText(n);
}

const ITEM_TAGS = ['Item', 'Subitem1', 'Subitem2', 'Subitem3', 'Subitem4', 'Subitem5', 'Subitem6', 'Subitem7', 'Subitem8', 'Subitem9', 'Subitem10'];

function renderBlocks(n, out) {
  for (const c of kids(n)) {
    if (isStr(c)) continue;
    if (ITEM_TAGS.includes(c.tag)) renderItem(c, out);
    else if (c.tag === 'TableStruct') renderTableStruct(c, out);
    else if (c.tag === 'List') renderList(c, out);
    else if (c.tag === 'FigStruct') out.push('［図］' + plainText(child(c, 'FigStructTitle')));
    else if (c.tag === 'Remarks') renderRemarks(c, out);
  }
}

function renderItem(n, out) {
  const title = plainText(kids(n).find(c => !isStr(c) && /Title$/.test(c.tag)));
  const sent = sentenceText(kids(n).find(c => !isStr(c) && /Sentence$/.test(c.tag)));
  out.push(title ? `${title}　${sent}` : sent);
  renderBlocks(n, out);
}

function renderList(n, out) {
  out.push(sentenceText(child(n, 'ListSentence')));
  for (const c of kids(n)) if (!isStr(c) && /^Sublist/.test(c.tag)) out.push(plainText(c));
}

function renderRemarks(n, out) {
  const label = plainText(child(n, 'RemarksLabel'));
  const rest = kids(n).filter(c => !isStr(c) && c.tag !== 'RemarksLabel');
  const lines = [];
  for (const c of rest) {
    if (ITEM_TAGS.includes(c.tag)) renderItem(c, lines);
    else lines.push(plainText(c));
  }
  if (lines.length) { out.push(`${label}　${lines[0]}`); out.push(...lines.slice(1)); }
  else out.push(label);
}

function cellText(col) {
  // 欄の中の文・号・項を全角空白でつなぐ（1 行に収める）
  const parts = [];
  for (const c of kids(col)) {
    if (isStr(c)) { if (c.trim()) parts.push(c); continue; }
    if (ITEM_TAGS.includes(c.tag)) { const tmp = []; renderItem(c, tmp); parts.push(tmp.join('　')); }
    else if (c.tag === 'Paragraph') { const tmp = []; renderParagraph(c, tmp, ''); parts.push(tmp.join('　')); }
    else parts.push(plainText(c));
  }
  return parts.join('　');
}

function renderTableStruct(n, out) {
  const title = child(n, 'TableStructTitle');
  if (title) out.push(plainText(title));
  for (const c of kids(n)) {
    if (isStr(c)) continue;
    if (c.tag === 'Table') {
      for (const row of kids(c)) {
        if (isStr(row)) continue;
        if (row.tag === 'TableRow' || row.tag === 'TableHeaderRow') {
          out.push(kids(row).filter(x => !isStr(x)).map(cellText).join('｜'));
        }
      }
    } else if (c.tag === 'Remarks') renderRemarks(c, out);
  }
}

function renderParagraph(p, out, articleTitle) {
  const cap = child(p, 'ParagraphCaption');
  if (cap) out.push(plainText(cap));
  const num = plainText(child(p, 'ParagraphNum'));
  const head = articleTitle || num;
  const sent = sentenceText(child(p, 'ParagraphSentence'));
  out.push(head ? `${head}　${sent}` : sent);
  renderBlocks(p, out);
}

/** e-Gov の Article 要素（JSON）から条文の文字を作る。行は「\n」で区切る。 */
export function renderArticle(article) {
  if (!article || article.tag !== 'Article') throw new Error('renderArticle: Article 要素ではありません');
  const out = [];
  const cap = child(article, 'ArticleCaption');
  if (cap) out.push(plainText(cap));
  const title = plainText(child(article, 'ArticleTitle'));
  const paras = kids(article).filter(c => !isStr(c) && c.tag === 'Paragraph');
  paras.forEach((p, i) => renderParagraph(p, out, i === 0 ? title : ''));
  return out.join('\n');
}

export const sha256 = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// ---------------------------------------------------------------------------
// 数（漢数字・全角数字）

const KANJI_DIGIT = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
const KANJI_SMALL = { '十': 10, '百': 100, '千': 1000 };
const KANJI_BIG = { '万': 1e4, '億': 1e8 };

/** 全角の数字・記号を半角に（数のところだけ使う）。 */
export function toHalfWidth(s) {
  return String(s).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/，/g, ',').replace(/．/g, '.');
}

function digitOf(ch) {
  if (ch in KANJI_DIGIT) return KANJI_DIGIT[ch];
  if (/[0-9]/.test(ch)) return Number(ch);
  return null;
}

function parseIntegerPart(s) {
  s = s.replace(/[、,]/g, '');
  if (!s) return null;
  if (/[十百千万億]/.test(s)) {
    let total = 0, section = 0, current = 0, sawDigit = false;
    for (const ch of s) {
      const d = digitOf(ch);
      if (d !== null) { current = current * 10 + d; sawDigit = true; continue; }
      if (ch in KANJI_SMALL) { section += (sawDigit ? current : 1) * KANJI_SMALL[ch]; current = 0; sawDigit = false; continue; }
      if (ch in KANJI_BIG) { total += (section + current) * KANJI_BIG[ch]; section = 0; current = 0; sawDigit = false; continue; }
      return null;
    }
    return total + section + current;
  }
  let v = 0;
  for (const ch of s) { const d = digitOf(ch); if (d === null) return null; v = v * 10 + d; }
  return v;
}

/** 「一万四千」→14000、「一、〇一三・二」→1013.2、「二九、〇〇〇」→29000、「１５」→15。数でなければ null。 */
export function parseJaNumber(s) {
  s = toHalfWidth(String(s).trim());
  const m = s.split(/[・.]/);
  if (m.length > 2) return null;
  const int = parseIntegerPart(m[0]);
  if (int === null) return null;
  if (m.length === 1) return int;
  let frac = '';
  for (const ch of m[1]) { const d = digitOf(ch); if (d === null) return null; frac += d; }
  return frac ? Number(`${int}.${frac}`) : null;
}

// 単位：e-Gov の書き方（長いものを先に）。本文の書き方（m・ft など）からはこの表で引く。
export const UNITS = {
  km: ['キロメートル'], m: ['メートル'], ft: ['フート', 'フィート'], kt: ['ノット'], hPa: ['ヘクトパスカル'],
  kg: ['キログラム'], kHz: ['キロヘルツ'], MHz: ['メガヘルツ'], '%': ['パーセント'], '°': ['度'],
  min: ['分間', '分'], h: ['時間'], d: ['日'], mo: ['月'], yr: ['年'], times: ['回'], age: ['歳'], people: ['人'],
};
const ALL_UNIT_WORDS = [...new Set(Object.values(UNITS).flat())].sort((a, b) => b.length - a.length);

// 数の塊：①位取りの数字を 3 けたごとの「、」で区切ったもの（「二九、〇〇〇」）か、②数字と十百千万億の並び
// （「一万四千」「二百五十」）。どちらも後ろに小数点「・」と小数の数字が付くことがある（「一、〇一三・二」「三十七・五」）。
const P = '[0-9０-９〇零一二三四五六七八九]';
const D = '[0-9０-９〇零一二三四五六七八九十百千万億]';
const NUM_RE = new RegExp(`(?:${P}{1,3}(?:[、,，]${P}{3}(?!${P}))+|${D}+)(?:[・.．]${P}+)?`, 'g');

/** 文の中の数を全部（値・元の文字・すぐ後の単位・位置）。 */
export function numbersIn(text) {
  const out = [];
  const s = String(text);
  for (const m of s.matchAll(NUM_RE)) {
    const raw = m[0];
    const value = parseJaNumber(raw);
    if (value === null) continue;
    const after = s.slice(m.index + raw.length);
    const unit = ALL_UNIT_WORDS.find(u => after.startsWith(u)) || null;
    out.push({ value, raw, unit, index: m.index });
  }
  return out;
}

function unitWords(unit) {
  if (unit == null) return null;
  return UNITS[unit] || [unit];
}

const sameNumber = (a, b) => Math.abs(a - b) < 1e-9;

/** 文の中に、この数が（単位を言えばその単位つきで）出てくるか。 */
export function textHasNumber(text, value, unit = null) {
  const words = unitWords(unit);
  return numbersIn(text).some(n => sameNumber(n.value, value) && (!words || (n.unit && words.includes(n.unit))));
}

/** 写しのこの条に、この数が出てくるか（例：articleHasNumber('kokuho-kisoku:178', 14000, 'ft')）。 */
export function articleHasNumber(ref, value, unit = null) {
  const a = loadArticle(ref);
  return !!a && textHasNumber(a.text, value, unit);
}

/** 出てこなければ例外（テストから使う）。 */
export function assertNumberInArticle(ref, value, unit = null) {
  const a = loadArticle(ref);
  if (!a) throw new Error(`e-Gov の写しに ${ref} がありません（textbook/rewrite/sources/egov/manifest.json に足して fetch.mjs を流す）`);
  if (!textHasNumber(a.text, value, unit)) {
    const seen = numbersIn(a.text).map(n => `${n.value}${n.unit || ''}`).join(', ');
    throw new Error(`${a.law}${a.label}（${a.version} 施行の版）に ${value}${unit ? ' ' + unit : ''} が見つかりません。条文の数：${seen}`);
  }
  return true;
}

/** 写しのこの条に、この言葉が文字どおり出てくるか。 */
export function articleHasText(ref, s) {
  const a = loadArticle(ref);
  return !!a && a.text.includes(s);
}

export function assertTextInArticle(ref, s) {
  const a = loadArticle(ref);
  if (!a) throw new Error(`e-Gov の写しに ${ref} がありません`);
  if (!a.text.includes(s)) throw new Error(`${a.law}${a.label}（${a.version} 施行の版）に「${s}」が文字どおりには出てきません`);
  return true;
}

// ---------------------------------------------------------------------------
// 本文の条番号を写しの ref に

const LAW_ALT = LAW_NAMES.flatMap(l => l.names.filter(n => n !== '法')).join('|');
const NUM_ANY = '[0-9０-９〇一二三四五六七八九十百千]+';
const SP = '[\\s\\u00a0\\u3000]*';
const DASH = '[〜～―\\-]';
// 「第 A 条（の X）」「第 A〜B 条」「第 A 条〜第 C 条（の Y）」
const CITE_RE = new RegExp(
  `(?:(${LAW_ALT}))?${SP}第${SP}(${NUM_ANY})(?:${SP}${DASH}${SP}(${NUM_ANY}))?${SP}条(?:${SP}の${SP}(${NUM_ANY}))?` +
  `(?:${SP}${DASH}${SP}(?:第${SP})?(${NUM_ANY})${SP}条(?:${SP}の${SP}(${NUM_ANY}))?)?`, 'g');

function lawKeyOf(name) {
  for (const l of LAW_NAMES) if (l.names.includes(name)) return l.key;
  return null;
}

/**
 * 文の中の条の引用を ref に。法令名のない「第 n 条」は、同じ文の前に出た法令名を引き継ぐ（なければ law: null）。
 * 「第 180〜186 条」は 180〜186 の全部に広げる。返り値：[{ raw, law, refs: [...] }]
 */
export function parseCitations(text, { defaultLaw = null } = {}) {
  const out = [];
  let current = defaultLaw;
  for (const m of String(text).matchAll(CITE_RE)) {
    const [raw, lawName, a, inner, aSub, c, cSub] = m;
    if (lawName) current = lawKeyOf(lawName);
    const first = parseJaNumber(a);
    let nums;
    if (inner) {
      // 「第 A〜B 条（の X）」：A から B（の X）まで
      nums = rangeNums(current, String(first), aSub ? `${parseJaNumber(inner)}_${parseJaNumber(aSub)}` : String(parseJaNumber(inner)));
    } else {
      const num1 = aSub ? `${first}_${parseJaNumber(aSub)}` : `${first}`;
      nums = c ? rangeNums(current, num1, cSub ? `${parseJaNumber(c)}_${parseJaNumber(cSub)}` : String(parseJaNumber(c))) : [num1];
    }
    out.push({ raw, law: current, refs: current ? nums.map(n => `${current}:${n}`) : [], nums });
  }
  return out;
}

const numKey = num => String(num).split('_').map(Number);
const cmpNum = (x, y) => {
  const a = numKey(x), b = numKey(y);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

/**
 * 範囲の条の番号。「の」のない範囲（180〜186）は全部の番号に広げる。「の」のある範囲（197〜197 の 3）は、
 * 写しにある条のうち範囲に入るものと両端（写しに枝番の条がそろっていなくても両端は必ず入れる）。
 */
function rangeNums(lawKey, from, to) {
  if (cmpNum(to, from) <= 0) return [from, to].filter((v, i, arr) => arr.indexOf(v) === i);
  if (!from.includes('_') && !to.includes('_') && Number(to) - Number(from) <= 50) {
    const out = [];
    for (let n = Number(from); n <= Number(to); n++) out.push(String(n));
    return out;
  }
  let stored = [];
  try { stored = loadIndex().articles.filter(e => e.ref.startsWith(`${lawKey}:`)).map(e => e.ref.split(':')[1]); } catch { stored = []; }
  const inside = stored.filter(n => cmpNum(n, from) > 0 && cmpNum(n, to) < 0);
  return [from, ...inside.sort(cmpNum), to];
}

/** 「第 71 条の 2」→「71_2」。「第七十一条の二」も同じ。 */
export function articleNum(label) {
  const c = parseCitations(label)[0];
  return c ? c.nums[0] : null;
}

/** 「71_2」→「第71条の2」 */
export function articleLabel(num) {
  const [a, ...rest] = String(num).split('_');
  return `第${a}条` + rest.map(r => `の${r}`).join('');
}

/** 令和の年（2019-05-01 から）。'2026-10-01' →「令和8年10月1日」 */
export function reiwaLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (y < 2019 || (y === 2019 && m < 5)) return iso;
  return `令和${y - 2018}年${m}月${d}日`;
}
