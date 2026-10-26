// ledgers/src/design.mjs — reads the parts of DESIGN.md that the ledgers are built from (W03 bootstrap only).
// After the bootstrap the JSON ledgers are the record; these readers are kept so the bootstrap can be re-run and
// compared (see ../README.md "作り直すとき").
//   tocRows()    3.3: every row of the table of contents → { part, chapter, secs[{id,isNew}], col2, src, scope }
//   kRefsIn(s)   the basic-course section references in a text (K01.03・01.04, K00.09〜00.11, K00.x1 …)
//   figRefsIn(s) / photoRefsIn(s): figure and photo ids named in a text (ch04-fig4-10・4-11, ch03-fig3-7〜3-10 …)
//   table(head)  the rows of the first markdown table after a heading line that starts with `head`
//   jurItems()   3.4: the 47 Japan/US items
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LEDGERS = path.resolve(HERE, '..');
export const COMBINED = path.resolve(LEDGERS, '..');
export const ROOT = path.resolve(COMBINED, '..', '..', '..');
export const KISO = path.join(ROOT, 'flight-lab', 'kiso');
export const DESIGN_PATH = path.join(COMBINED, 'DESIGN.md');

let TEXT = null;
export const designText = () => (TEXT ??= fs.readFileSync(DESIGN_PATH, 'utf8'));
export const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
export const ticks = s => [...String(s).matchAll(/`([^`]+)`/g)].map(m => m[1]);

// the slice of DESIGN from a heading line that starts with `from` to the next heading of the same or higher level
export function sectionText(from) {
  const lines = designText().split('\n');
  const i = lines.findIndex(l => l.startsWith(from));
  if (i < 0) throw new Error(`DESIGN: heading not found: ${from}`);
  const level = (lines[i].match(/^#+/) || ['#'])[0].length;
  let j = i + 1;
  while (j < lines.length && !(lines[j].match(/^#+\s/) && lines[j].match(/^#+/)[0].length <= level)) j++;
  return lines.slice(i, j).join('\n');
}

// rows of the markdown tables inside a text (header and separator rows dropped)
export function tableRows(text) {
  const out = [];
  let header = null;
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) { header = null; continue; }
    const c = cells(line);
    if (c.every(x => /^:?-+:?$/.test(x))) continue;
    if (!header) { header = c; continue; }
    out.push({ header, c, line });
  }
  return out;
}

// --- basic-course references -------------------------------------------------------------------------------
const KISO_DATA = path.join(KISO, 'data');
let KCACHE = null;
export function kiso() {
  if (KCACHE) return KCACHE;
  const chapters = fs.readdirSync(KISO_DATA).filter(f => /^kiso\d\d\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(KISO_DATA, f), 'utf8')));
  const byNum = new Map();
  for (const c of chapters) for (const s of c.sections) {
    const m = s.id.match(/^kiso(\d\d)\.(\d+|x\d|cover)$/);
    if (m) byNum.set(`${m[1]}:${/^\d+$/.test(m[2]) ? Number(m[2]) : m[2]}`, s.id);
  }
  KCACHE = { chapters, byNum };
  return KCACHE;
}
export const kisoSection = (ch, n) => kiso().byNum.get(`${ch}:${/^\d+$/.test(String(n)) ? Number(n) : n}`) || null;

// a gap between two references with its bracketed remarks removed: "（誤解の表）・" → "・"
function stripBrackets(s) {
  let out = '', d = 0;
  for (const ch of s) {
    if ('（(［['.includes(ch)) d++;
    else if ('）)］]'.includes(ch)) d = Math.max(0, d - 1);
    else if (!d) out += ch;
  }
  return out;
}

// K references: a run starts at "K" + NN.n and continues over "・" / "〜" / "～" with bare NN.n (same run);
// "K00.09〜00.11" expands the range. Unknown ids are returned with ok:false so the caller can report them.
export function kRefsIn(text) {
  const s = String(text), out = [];
  const re = /(K?)(\d\d)\.(\d+|x\d)/g;
  let run = false, last = null, lastEnd = 0, m;
  while ((m = re.exec(s))) {
    const gap = stripBrackets(s.slice(lastEnd, m.index));
    const prevChar = s[m.index - 1] || '';
    if (/[0-9A-Za-z.\-]/.test(prevChar) && !m[1]) { lastEnd = m.index + m[0].length; continue; }   // part of another number (14 CFR 23.2230, 7-18)
    if (m[1]) run = true;
    else if (!run || !/^\s*[・〜～~、]\s*$/.test(gap)) { run = false; lastEnd = m.index + m[0].length; continue; }
    const cur = { ch: m[2], n: /^\d+$/.test(m[3]) ? Number(m[3]) : m[3] };
    if (/^\s*[〜～~]\s*$/.test(gap) && last && last.ch === cur.ch && typeof cur.n === 'number' && typeof last.n === 'number') for (let k = last.n + 1; k < cur.n; k++) out.push({ ch: cur.ch, n: k });
    out.push(cur); last = cur; lastEnd = m.index + m[0].length;
  }
  return out.map(r => ({ ...r, id: kisoSection(r.ch, r.n) }));
}

// figure ids: "ch04-fig4-10・4-11", "ch03-fig3-7〜3-10", "ch00-fig1〜6", "ch07-fig7-2・7-3"
export function figRefsIn(text) {
  const s = String(text), out = [];
  const re = /ch(\d\d)-fig(\d+(?:-\d+)?)((?:\s*[・〜～]\s*(?:fig)?\d+(?:-\d+)?)*)/g;
  for (const m of s.matchAll(re)) {
    const ch = m[1], first = m[2];
    out.push(`ch${ch}-fig${first}`);
    let prev = first;
    for (const t of m[3].matchAll(/\s*([・〜～])\s*(?:fig)?(\d+(?:-\d+)?)/g)) {
      const sep = t[1], v = t[2];
      const full = v.includes('-') || !first.includes('-') ? v : `${first.split('-')[0]}-${v}`;
      if (sep !== '・') {
        const a = Number(prev.split('-').pop()), b = Number(full.split('-').pop());
        const pre = full.includes('-') ? full.split('-')[0] + '-' : '';
        for (let k = a + 1; k < b; k++) out.push(`ch${ch}-fig${pre}${k}`);
      }
      out.push(`ch${ch}-fig${full}`);
      prev = full;
    }
  }
  return out;
}
export const photoRefsIn = text => [...String(text).matchAll(/ch(\d\d)-photo(\d+)/g)].map(m => `ch${m[1]}-photo${m[2]}`);

// --- 3.3 the table of contents -----------------------------------------------------------------------------
export function tocRows() {
  const t = sectionText('### 3.3'), rows = [];
  let part = null, chapter = null;
  for (const line of t.split('\n')) {
    const h = line.match(/^####\s+(序部|第\s*(\d)\s*部)/);
    if (h) { part = h[1] === '序部' ? 'p0' : 'p' + h[2]; chapter = null; continue; }
    if (!part || !line.startsWith('|')) continue;
    const c = cells(line);
    if (c.every(x => /^:?-+:?$/.test(x)) || c[0] === '章') continue;
    const chs = ticks(c[0]).filter(x => /^[a-z0-9]+$/.test(x));
    if (chs.length) chapter = chs[0];
    let col2 = c[1] || '';
    const sw = col2.match(/^`([a-z0-9]+)`：/);
    if (sw) chapter = sw[1];
    // the planned sections of the row: the ids in the column outside brackets (an id inside "（…）" is a pointer,
    // e.g. "`radio.listen`（日本の交信の聞き取りは `jatc.listen`）")
    const secs = [];
    const depthAt = i => { let d = 0; for (const ch of col2.slice(0, i)) { if ('（('.includes(ch)) d++; else if ('）)'.includes(ch)) d = Math.max(0, d - 1); } return d; };
    for (const m of col2.matchAll(/(★)?`([a-z0-9_]+\.[a-z0-9_.-]+)`/g)) if (!depthAt(m.index) && !secs.some(x => x.id === m[2])) secs.push({ id: m[2], isNew: !!m[1] || part === 'p7', at: m.index });
    rows.push({ part, chapter, chapterCell: c[0], secs, col2, src: c[2] || '', scope: c.length >= 4 ? c[3] : (part === 'p7' ? '日本' : ''), line });
  }
  return rows;
}

// the planned sections (id → { part, chapter, isNew }) and chapters in book order
export function plannedBook() {
  const secs = new Map(), chapters = [];
  for (const r of tocRows()) {
    if (r.chapter && !chapters.some(c => c.id === r.chapter)) chapters.push({ id: r.chapter, part: r.part });
    for (const s of r.secs) if (!secs.has(s.id)) secs.set(s.id, { part: r.part, chapter: r.chapter, isNew: s.isNew });
  }
  return { secs, chapters };
}

// --- 3.4 the 47 items --------------------------------------------------------------------------------------
export function jurItems() {
  const t = designText(), a = t.indexOf('**取り違えやすい 47 項目**');
  const out = [];
  let started = false;
  for (const line of t.slice(a).split('\n').slice(1)) {
    if (!line.startsWith('|')) { if (started) break; continue; }
    started = true;
    const c = cells(line);
    if (c[0] === 'ID' || c.every(x => /^-+$/.test(x))) continue;
    out.push({ id: c[0].replace(/〔[^〕]*〕/g, '').trim(), title: c[1], us: c[2], jp: c[3], boxes: ticks(c[4]).length ? ticks(c[4]) : c[4].split('・').map(x => x.trim()), gates: c[5].split('・').map(x => x.trim()), part7: c[6].split('・').map(x => x.trim()), safety: /〔安全〕/.test(c[0]), unverified: /〔要確認〕/.test(c[2] + c[3]) });
  }
  return out;
}
