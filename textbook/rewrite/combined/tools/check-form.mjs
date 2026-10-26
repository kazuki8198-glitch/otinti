// check-form.mjs — the section form of DESIGN 3.2 (CADET builds its summary, key points and classroom board from it):
//  ねらい (bk-aim) first → the first figure → explanation → もっと深く/計算演習 (bk-deep/bk-drill) → 判断の目 (bk-judge)
//  → ここを混同しない (bk-dont) → ここが大切 (bk-key: 2–4 items, each ≤ 60 characters) → ここに注意 (bk-warn) → 日米
//  (bk-jur・bk-jp・bk-us・bk-same) → 思い出そう (bk-recall: ≤ 3 lines with a link) → 考えてみよう (bk-q) → シミュレータ
//  で体験 (bk-sim) last; a photo never before the first figure.
import { Result, cli } from './lib/report.mjs';
import { walk, textOf, jlen, clip } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';

export const meta = { id: 'form', title: '節の形（ねらい → 図 → 説明 → 囲み → ここが大切 → … → シミュレータ）', criteria: [] };

export const RANK = { 'bk-deep': 1, 'bk-drill': 1, 'bk-judge': 2, 'bk-dont': 3, 'bk-key': 4, 'bk-warn': 5, 'bk-jur': 6, 'bk-jp': 6, 'bk-us': 6, 'bk-same': 6, 'bk-recall': 7, 'bk-q': 8, 'bk-sim': 9 };
const NAME = { 'bk-deep': 'もっと深く', 'bk-drill': '計算演習', 'bk-judge': '判断の目', 'bk-dont': 'ここを混同しない', 'bk-key': 'ここが大切', 'bk-warn': 'ここに注意', 'bk-jur': '日米の対照', 'bk-jp': '日本では', 'bk-us': '米国では', 'bk-same': '日本も同じ', 'bk-recall': '思い出そう', 'bk-q': '考えてみよう', 'bk-sim': 'シミュレータで体験' };

// the top-level elements of a section: [{ tag, cls: Set, start, end, html }]
export function topLevel(html) {
  const out = []; let cur = null, depth = 0;
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g; let m;
  const VOID = /^(br|img|hr|input|meta|link|wbr|col|source)$/i;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase(), close = m[0][1] === '/', self = m[2] === '/' || VOID.test(tag);
    if (!close) {
      if (depth === 0) { const c = (m[0].match(/class="([^"]*)"/) || [])[1] || ''; cur = { tag, cls: new Set(c.split(/\s+/).filter(Boolean)), start: m.index }; if (self) { cur.end = re.lastIndex; cur.html = m[0]; out.push(cur); cur = null; continue; } }
      if (!self) depth++;
    } else if (depth > 0) {
      depth--;
      if (depth === 0 && cur) { cur.end = re.lastIndex; cur.html = html.slice(cur.start, cur.end); out.push(cur); cur = null; }
    }
  }
  return out;
}
const kindOf = el => Object.keys(RANK).find(k => el.cls.has(k)) || (el.cls.has('bk-aim') ? 'bk-aim' : el.cls.has('bk-fig') ? 'bk-fig' : el.cls.has('bk-photo') ? 'bk-photo' : null);

export function checkSection(r, s) {
  const els = topLevel(s.html);
  if (!els.length) { r.error('empty', s.id, '要素がない'); return; }
  if (!els[0].cls.has('bk-aim')) r.error('aim-not-first', s.id, `最初の要素が「ねらい」（bk-aim）でない：<${els[0].tag} class="${[...els[0].cls].join(' ')}">`);
  const fi = els.findIndex(e => e.cls.has('bk-fig'));
  if (fi < 0) r.info('no-figure', s.id, '図がない（CADET の教室の画面に映すものがない）');
  else { const before = els.slice(0, fi).filter(e => !e.cls.has('bk-aim')); if (before.length) r.warn('figure-not-first', s.id, `最初の図の前に説明がある（${before.map(e => e.tag).join('・')}）`); }
  const pi = els.findIndex(e => e.cls.has('bk-photo'));
  // a photo can sit inside a paragraph or box too: look in the whole HTML
  const firstFigAt = s.html.indexOf('<figure class="bk-fig"'), firstPhotoAt = s.html.indexOf('<figure class="bk-photo"');
  if (firstPhotoAt >= 0 && firstFigAt >= 0 && firstPhotoAt < firstFigAt) r.error('photo-before-figure', s.id, '写真が最初の図より前にある');
  if (firstPhotoAt >= 0 && firstFigAt < 0) r.info('photo-without-figure', s.id, '写真はあるが図がない（CADET は写真を出さないので教室の画面は空）');
  void pi;
  // ここが大切
  const keys = els.filter(e => e.cls.has('bk-key'));
  if (!keys.length) r.warn('no-key', s.id, '「ここが大切」がない');
  if (keys.length > 1) r.warn('several-keys', s.id, `「ここが大切」が ${keys.length} 個`);
  for (const k of keys) {
    const items = [...k.html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => textOf(m[1]));
    if (items.length < 2 || items.length > 4) r.warn('key-items', s.id, `「ここが大切」の項目が ${items.length}（2〜4）`);
    for (const it of items) if (jlen(it) > 60) r.warn('key-item-long', s.id, `${jlen(it)} 字（60 字まで）：「${clip(it, 40)}」`);
  }
  // 思い出そう: ≤ 3 lines, with a link
  for (const e of els.filter(x => x.cls.has('bk-recall'))) {
    const t = textOf(e.html), lines = (t.match(/。/g) || []).length;
    if (lines > 3 || jlen(t) > 200) r.warn('recall-long', s.id, `「思い出そう」が長い（${lines} 文・${jlen(t)} 字。3 行以内）`);
    if (!/data-sec="/.test(e.html)) r.warn('recall-no-link', s.id, '「思い出そう」に節へのリンク（bk.see）がない');
  }
  // the order of the boxes
  let maxRank = 0, maxName = '';
  const seq = [];
  for (const e of els) {
    const k = kindOf(e); if (!k || !RANK[k]) continue;
    seq.push(NAME[k]);
    if (RANK[k] < maxRank) { r.warn('order', s.id, `「${NAME[k]}」が「${maxName}」より後にある（順：${seq.join(' → ')}）`); }
    if (RANK[k] > maxRank) { maxRank = RANK[k]; maxName = NAME[k]; }
  }
  const si = els.findIndex(e => e.cls.has('bk-sim'));
  if (si >= 0 && si !== els.length - 1) r.warn('sim-not-last', s.id, `「シミュレータで体験」の後に ${els.length - 1 - si} 個の要素`);
}

export async function run(env) {
  const r = new Result(meta);
  for (const s of sectionsOf(env)) { r.count('sections'); if (s.err) { r.error('render', s.id, s.err); continue; } checkSection(r, s); }
  r.metric('sections without a figure', r.items.filter(x => x.code === 'no-figure').length);
  return r;
}

await cli(import.meta.url, meta, run);
