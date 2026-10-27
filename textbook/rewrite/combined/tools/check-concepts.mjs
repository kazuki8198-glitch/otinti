// check-concepts.mjs — DESIGN 3.2「1 つの概念に住所は 1 つ」and 5 章 基準 15:
//  - a bold definition <b>語（English）</b> appears once in the whole book (the other places recall it);
//  - each concept of the ledger CONCEPTS.json (or, until W03 writes it, the known pairs of DESIGN 3.2) has its address
//    section, and each recalling section links to the address (data-sec) in a「思い出そう」(bk-recall) of ≤ 3 lines.
// Read loosely: a row's name in name/concept/id, its address in address/home/at, its recalls in recalls/recall/back.
import { Result, cli } from './lib/report.mjs';
import { textOf, jlen, clip } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';
import { readLedger, pick, asList } from './lib/ledgers.mjs';
import { knownConcepts, toc } from './lib/design.mjs';

export const meta = { id: 'concepts', title: '概念の住所（太字の定義は 1 回・呼び戻しは 3 行以内でリンクつき）', criteria: [15] };
// a bold definition: 語（…English…）— the book's first-use form「正式名（通称、English）」(STYLE.md「用語」, DESIGN 3.5) as well
// as the older「語（English）」: the brackets hold some English. The term must hold Japanese letters: an English-only bold
// (Vyse（88 kt）) or a value (15℃・29.92 inHg（1013.25 hPa）) is not a Japanese term's definition
export const DEF = /^([^（(<]{1,30}?)\s*[（(]([^）)]*[A-Za-z][^）)]*)[）)]$/;
export const defTerm = t => { const d = String(t).match(DEF), key = d ? d[1].trim() : ''; return key && /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9fff]/.test(key) ? key : null; };

export function boldDefinitions(env) {
  const defs = new Map();
  for (const s of sectionsOf(env, { all: true })) {
    const html = s.html.replace(/<svg[\s\S]*?<\/svg>/g, '');
    for (const m of html.matchAll(/<b>([^<]{2,80})<\/b>/g)) {
      const t = textOf(m[1]), key = defTerm(t); if (!key) continue;
      defs.set(key, [...(defs.get(key) || []), { sec: s.id, ch: s.ch.id, text: t }]);
    }
  }
  return defs;
}

export async function run(env) {
  const r = new Result(meta);
  const defs = boldDefinitions(env), checking = new Set(sectionsOf(env).map(s => s.id));
  let repeated = 0;
  for (const [term, places] of defs) {
    r.count('bold definitions');
    if (places.length < 2 || !places.some(p => checking.has(p.sec))) continue;
    repeated++;
    const chs = new Set(places.map(p => p.ch));
    r.warn(chs.size > 1 ? 'definition-repeated' : 'definition-repeated-in-chapter', term, `太字の定義が ${places.length} 回（${places.map(p => p.sec).join('・')}）：「${clip(places[0].text, 40)}」`);
  }
  r.metric('distinct bold definitions / defined more than once', `${defs.size} / ${repeated}`);
  // the concepts' addresses and recalls
  const L = readLedger('CONCEPTS.json');
  let rows;
  if (L.exists && !L.error) rows = L.rows.map(x => ({ name: String(pick(x, ['name', 'concept', 'id', 'title']) || '?'), address: pick(x, ['address', 'home', 'at', 'sec']), recalls: asList(pick(x, ['recalls', 'recall', 'back', 'refs'])).map(String) }));
  else { if (L.error) r.error('ledger-unreadable', L.path, L.error); r.pending('ledger', L.path, '概念の台帳がまだない（W03）：DESIGN 3.2 の既知の対で調べた'); rows = knownConcepts(); }
  const book = new Map(sectionsOf(env, { all: true }).map(s => [s.id, s])), plan = toc().secs;
  const where = id => (book.has(id) ? 'book' : plan.has(id) ? 'planned' : 'unknown');
  for (const c of rows) {
    if (env.only && ![c.address, ...c.recalls].some(id => checking.has(id))) continue;
    r.count('concepts');
    if (!c.address) { r.error('no-address', c.name, '住所の節がない'); continue; }
    const a = where(c.address);
    if (a === 'planned') r.pending('address-not-yet', c.name, `住所 ${c.address} はまだ本にない（DESIGN 3.3 の目次にはある）`);
    else if (a === 'unknown') r.error('address-unknown', c.name, `住所 ${c.address} が本にも目次にもない`);
    for (const id of c.recalls) {
      const w = where(id);
      if (w === 'planned') { r.pending('recall-not-yet', c.name, `呼び戻す節 ${id} はまだ本にない`); continue; }
      if (w === 'unknown') { r.error('recall-unknown', c.name, `呼び戻す節 ${id} が本にも目次にもない`); continue; }
      if (env.only && !checking.has(id)) continue;
      if (a !== 'book') { r.pending('recall-waits-address', `${c.name}（${id}）`, `住所 ${c.address} ができてからリンクを足す（決まり 13）`); continue; }
      const html = book.get(id).html;
      const boxes = [...html.matchAll(/<div class="bk-recall"[\s\S]*?<\/div>/g)].map(m => m[0]);
      const linked = boxes.find(b => b.includes(`data-sec="${c.address}"`));
      if (!linked) { r.warn(html.includes(`data-sec="${c.address}"`) ? 'recall-not-boxed' : 'recall-no-link', `${c.name}（${id}）`, html.includes(`data-sec="${c.address}"`) ? `住所 ${c.address} へのリンクはあるが「思い出そう」の囲みでない` : `住所 ${c.address} へのリンクがない（同じ説明を 2 回書いていないか）`); continue; }
      const t = textOf(linked), n = (t.match(/。/g) || []).length;
      if (n > 3 || jlen(t) > 200) r.warn('recall-long', `${c.name}（${id}）`, `「思い出そう」が ${n} 文・${jlen(t)} 字（3 行以内）`);
    }
  }
  return r;
}

await cli(import.meta.url, meta, run);
