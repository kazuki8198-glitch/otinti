// check-jur.mjs — DESIGN 3.4「3 回会わせる」and 5 章 基準 9: each of the 47 Japan/US items is met in its three places —
//  ① a box in every section it names (bk-jur / bk-us / bk-jp / bk-same with data-jur="<item id>"),
//  ② the part's summary chapter (gN) table, ③ the Part 7 section(s) —
//  and the numbers drawn in a box are the numbers of the data (FL.jur). The items come from FL.jur when book-jur.js is
//  loaded (W06), else from the table in DESIGN 3.4 (then the numbers are not compared: the design's values are still to
//  be checked against e-Gov). A place whose section or chapter does not exist yet is "pending", not an error.
import { Result, cli } from './lib/report.mjs';
import { textOf, clip } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';
import { jurItems, toc } from './lib/design.mjs';
import { pick, asList, rowsOf } from './lib/ledgers.mjs';

export const meta = { id: 'jur', title: '日米の取り違えやすい項目（囲み・部のまとめ・第 7 部の 3 か所、数字がデータと同じ）', criteria: [9] };

// the outer HTML of the element whose start tag holds index i
export function elementAt(html, i) {
  const start = html.lastIndexOf('<', i), tag = (html.slice(start).match(/^<([a-zA-Z0-9-]+)/) || [])[1];
  if (!tag) return '';
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g'); re.lastIndex = start; let d = 0, m;
  while ((m = re.exec(html))) { if (m[1]) { if (--d === 0) return html.slice(start, re.lastIndex); } else if (!m[0].endsWith('/>')) d++; }
  return html.slice(start);
}
const NUM = /\d[\d,]*(?:\.\d+)?/g;
const nums = s => [...String(s).matchAll(NUM)].map(m => m[0].replace(/,/g, '')).filter(x => x.length >= 2 || Number(x) >= 2);

export function items(FL) {
  if (FL.jur) {
    const rows = Array.isArray(FL.jur) ? FL.jur : Array.isArray(FL.jur.items) ? FL.jur.items : rowsOf(FL.jur);
    return { from: 'FL.jur', list: rows.map(x => ({ id: String(pick(x, ['id']) || ''), title: pick(x, ['title', 't', '題']) || '', us: String(pick(x, ['us', 'usValue', 'US', '米国']) ?? ''), jp: String(pick(x, ['jp', 'jpValue', 'JP', '日本']) ?? ''), boxes: asList(pick(x, ['boxes', 'box', 'secs', 'sections', 'at'])).map(String), gates: asList(pick(x, ['gates', 'gate', 'g'])).map(String), part7: asList(pick(x, ['part7', 'p7', 'jp7', 'japan'])).map(String), safety: !!pick(x, ['safety', '安全']), conf: pick(x, ['conf', 'confidence', 'status', '確度']) })) };
  }
  return { from: 'DESIGN 3.4', list: jurItems() };
}

export async function run(env) {
  const r = new Result(meta);
  const { from, list } = items(env.FL);
  r.metric('items', `${list.length}（${from}）`);
  if (from !== 'FL.jur') r.pending('no-data', 'book-jur.js', '日米の対照データ FL.jur（W06）がまだない：DESIGN 3.4 の表で場所だけ調べ、数字は比べていない');
  const secs = new Map(sectionsOf(env, { all: true }).map(s => [s.id, s])), chapters = new Map(env.FL.book.CHAPTERS.map(c => [c.id, c])), plan = toc();
  const checking = env.only ? new Set(sectionsOf(env).map(s => s.id)) : null;
  const tally = { box: [0, 0, 0], gate: [0, 0, 0], part7: [0, 0, 0] };           // [found, missing, pending]
  const boxOf = (html, id) => { const i = html.indexOf(`data-jur="${id}"`); return i < 0 ? null : elementAt(html, i); };
  for (const it of list) {
    if (!it.id) { r.error('item-without-id', from, JSON.stringify(it).slice(0, 60)); continue; }
    r.count('items');
    // ① the boxes
    for (const sid of it.boxes) {
      if (checking && !checking.has(sid)) continue;
      const s = secs.get(sid);
      if (!s) { tally.box[2]++; r.pending('box-section-not-yet', `${it.id} → ${sid}`, plan.secs.has(sid) ? 'その節はまだ本にない' : 'その節は本にも DESIGN 3.3 の目次にもない'); continue; }
      const box = boxOf(s.html, it.id);
      if (!box) { tally.box[1]++; r.error('box-missing', `${it.id} → ${sid}`, `「${it.title}」の囲み（data-jur="${it.id}"）がない`); continue; }
      tally.box[0]++;
      if (!/class="[^"]*\bbk-(jur|us|jp|same)\b/.test(box)) r.warn('box-class', `${it.id} → ${sid}`, 'data-jur の要素が bk-jur・bk-us・bk-jp・bk-same のどれでもない');
      if (from === 'FL.jur') { const allowed = new Set(nums(it.us + ' ' + it.jp)); for (const n of nums(textOf(box))) if (!allowed.has(n)) r.error('box-number', `${it.id} → ${sid}`, `囲みの数字 ${n} がデータ（米国：${clip(it.us, 30)}／日本：${clip(it.jp, 30)}）にない`); }
      if (/data-sec="(j[a-z]+\.|g\d)/.test(box) && !/class="[^"]*\b(jur-jp|bk-jp|bk-same)\b/.test(box)) r.info('box-link', `${it.id} → ${sid}`, '第 7 部・まとめへのリンクがある（日本の側の入れ物の中か確かめる：決まり 6）');
    }
    if (checking) continue;
    // ② the summary chapters, ③ Part 7
    for (const [kind, places] of [['gate', it.gates], ['part7', it.part7]]) for (const p of places) {
      const isChapter = !p.includes('.');
      const html = isChapter ? (chapters.get(p) ? chapters.get(p).secs.map(x => (secs.get(x.id) || {}).html || '').join('') : null) : (secs.get(p) || {}).html;
      if (html == null || html === undefined) { tally[kind][2]++; r.pending(`${kind}-not-yet`, `${it.id} → ${p}`, kind === 'gate' ? 'まとめの章はまだない' : '第 7 部の節はまだない'); continue; }
      if (html.includes(`data-jur="${it.id}"`)) tally[kind][0]++;
      else { tally[kind][1]++; r.error(`${kind}-missing`, `${it.id} → ${p}`, `「${it.title}」がない（data-jur="${it.id}"）`); }
    }
  }
  const fmt = t => `found ${t[0]} · missing ${t[1]} · pending ${t[2]}`;
  r.metric('① boxes in the sections', fmt(tally.box));
  if (!checking) { r.metric('② summary chapters (gN)', fmt(tally.gate)); r.metric('③ Part 7 sections', fmt(tally.part7)); }
  r.metric('safety items', list.filter(x => x.safety).map(x => x.id).join('・') || '—');
  return r;
}

await cli(import.meta.url, meta, run);
