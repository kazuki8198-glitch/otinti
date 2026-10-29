// CADET — content/book.js : the in-game textbook: FLIGHT LAB's (FL.book), filtered for the fictional academy (pure JS).
// Left out: the introduction (it is about the real airline's published course and about FLIGHT LAB itself), the front
// part's chapter on getting ready to learn in English (english: the real course's classes in London and FLIGHT LAB's
// lessons; textbook/rewrite/combined/DESIGN.md 6.3) and the chapter on practising with FLIGHT LAB; every sentence, list item, table row and source line that names the real
// airline or its training partner; and what belongs to FLIGHT LAB's own pages (the "シミュレータで体験" boxes with their
// lesson buttons, the calculators, the notes on its keys, menus and pages). Figures (inline SVG) and tables stay.
// The chapters are numbered for this book, and the cross-references inside the text ({ch:id} → 第 N 章) follow.
// The US–Japan boxes (FLIGHT LAB's bk.jur・bk.us・bk.jp・bk.same, drawn from FL.jur): the academy flies under the FAA's
// rules and its written tests ask them, so the US side stays, headed 「米国の決まり」; only the Japanese side goes (bk.jp,
// bk.same, the 日本 column of bk.jur and the line under it, the links to Part 7 and the summary chapters:
// textbook/rewrite/combined/DESIGN.md 3.4 and 6.3).
// A section is filtered the first time it is asked for, then kept.

const DROP_CHAPTERS = new Set(['intro', 'english', 'sim']);
// the real airline, its call sign, its training partner and their sites (the game's airline and school are fictional)
export const REAL_NAMES = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|All\s*Nippon|全日空|全日本空輸|Acron|ana\.co\.jp|anahd\.co\.jp|acronaviation/i;
// FLIGHT LAB's own user interface: its keys, menus, pages, calculators and simulator notes (the game has its own), and
// its notes on itself as software (its G1000-style display, what it has not built). "この教材" as the course itself stays:
// この教材の Archer（教材値）, この教材の LAB 空域は架空, この教材の課目「…」
const APP_ONLY = new RegExp(['このシミュレータ', 'シミュレータでは', 'メニューの「', 'メニュー →', '本アプリ', '「英語交信」ページ', '同じページの',
  'オーディオパネルも同じ配置', '上の計算機', '教材用の簡略化', 'G1000 型表示', '教材の簡略版', '実装していません', '未実装',
  'この教材には[^。]*自動操縦', 'G1000 の表示と手動の操縦で', 'この教材は IFR'].join('|'));
const bad = (s) => REAL_NAMES.test(s) || APP_ONLY.test(s);

// ---- text helpers (the instructor's lines use them too) ----

const ENT = { '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&' };
const BLOCK_TAG = /<\/?(?:p|li|ul|ol|tr|td|th|table|div|h[1-6]|figure|figcaption|details|summary|br)\b[^>]*>/gi;
// HTML → plain text: figures' drawings left out, blocks kept apart by a space, entities decoded, spaces collapsed
export function plain(html) {
  return String(html ?? '').replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ').replace(BLOCK_TAG, ' ').replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|lt|gt|quot|#39|amp);/g, (m) => ENT[m]).replace(/\s+/g, ' ').trim();
}
// Japanese sentences: split after 。！？ (kept) outside brackets (（エアラインの考え方。単独でも有効） stays whole),
// spaces trimmed, empty pieces dropped
const OPEN = '（(「『', CLOSE = '）)」』';
export function sentences(text) {
  const s = String(text ?? ''), out = [];
  let depth = 0, from = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && '。！？'.includes(c)) { out.push(s.slice(from, i + 1)); from = i + 1; }
  }
  out.push(s.slice(from));
  return out.map(x => x.trim()).filter(Boolean);
}

// ---- filtering one section's HTML ----

const VOID = new Set(['br', 'img', 'hr', 'wbr']);
// the inline tags of a piece open and close within it (so dropping the piece cannot break the markup around it)
function balanced(s) {
  const depth = {};
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g)) {
    const name = m[2].toLowerCase();
    if (VOID.has(name) || m[3]) continue;
    depth[name] = (depth[name] || 0) + (m[1] ? -1 : 1);
    if (depth[name] < 0) return false;
  }
  return Object.values(depth).every(d => d === 0);
}
// the sentences of an element's content without the bad ones (a sentence in brackets goes with the one around it);
// null when the element should go as a whole
function keepSentences(inner) {
  if (!bad(inner)) return inner;
  const kept = [];
  for (const piece of sentences(inner)) {
    if (!bad(piece)) kept.push(piece);
    else if (!balanced(piece)) return null;
  }
  const out = kept.join('').trim();
  return plain(out) ? out : null;
}
// a table without the columns whose heading is about FLIGHT LAB's keys, and without the rows that name what must go
function filterTable(table) {
  const rows = table.match(/<tr\b[\s\S]*?<\/tr>/g) || [];
  const cells = (row) => row.match(/<t([hd])\b[^>]*>[\s\S]*?<\/t\1>/g) || [];
  const drop = new Set();
  if (rows.length) cells(rows[0]).forEach((c, i) => { if (/^<th/.test(c) && APP_ONLY.test(c)) drop.add(i); });
  let out = table;
  for (const row of rows) {
    let r = row;
    if (drop.size) { let i = 0; r = row.replace(/<t([hd])\b[^>]*>[\s\S]*?<\/t\1>/g, (c) => (drop.has(i++) ? '' : c)); }
    out = out.replace(row, () => (bad(r) ? '' : r));
  }
  return /<td\b/.test(out) ? out : '';                                         // only the heading row left: no table
}

// ---- the US–Japan boxes: the Japanese side goes, the US side stays as 「米国の決まり」 ----

// classes of what goes: the Japanese boxes, the 日本 column and the line under a bk.jur box (jur-jp), and the links to
// Part 7 and the summary chapters (jur-link; this book has neither)
export const JAPAN_SIDE = Object.freeze(['bk-jp', 'bk-same', 'jur-jp', 'jur-link']);
export const US_HEAD = '米国の決まり';
// the index just past the element whose start tag is at `start` (elements of the same tag inside it counted)
function endOf(s, tag, start) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi');
  re.lastIndex = start;
  let depth = 0;
  for (let m; (m = re.exec(s));) {
    if (m[1]) { if (--depth === 0) return re.lastIndex; } else if (!m[2]) depth++;
  }
  return s.length;
}
// the elements whose class list has one of `classes`, taken out whole
function dropByClass(html, classes) {
  const re = new RegExp(`<([a-zA-Z][\\w-]*)\\b[^>]*?\\bclass="(?:[^"]*\\s)?(?:${classes.join('|')})(?:\\s[^"]*)?"[^>]*>`, 'g');
  let h = String(html);
  for (let m; (m = re.exec(h));) {
    h = h.slice(0, m.index) + h.slice(endOf(h, m[1].toLowerCase(), m.index));
    re.lastIndex = m.index;
  }
  return h;
}
// the Japanese side out; the heads of what is left (bk.jur's 日米の対照, bk.us's 米国では) read 「米国の決まり」
export function usSideOnly(html) {
  return dropByClass(html, JAPAN_SIDE).replace(/<div class="jur-h"><b>[^<]*<\/b><\/div>/g, `<div class="jur-h"><b>${US_HEAD}</b></div>`);
}

function filterHtml(html, sectionExists) {
  let h = usSideOnly(html);
  // FLIGHT LAB's own pages: "try it in the simulator" boxes, calculators, notes on its keys and its unbuilt parts
  h = h.replace(/<div class="bk-sim">[\s\S]*?<\/div>/g, '').replace(/<div class="bk-calc[^"]*"[^>]*>\s*<\/div>/g, '');
  h = h.replace(/<p class="(?:small )?mute">([\s\S]*?)<\/p>/g, (m, t) => (/シミュレータ|教材/.test(t) ? '' : m));
  h = h.replace(/<span class="tag unk">[^<]*シミュレータ[^<]*<\/span>/g, '').replace(/（この教材の使い方）/g, '');
  // a sentence about the real aircraft that goes on about FLIGHT LAB's own build: the real half stays
  // (実機の G1000 機には自動操縦…が多いですが、この教材では…実装していません（…）。 → …が多いです。)
  h = h.replace(/ですが、この教材では(?:(?!。)[\s\S])*実装していません(?:<\/b>)?(?:（[^）]*）)?。/g, 'です。');
  // its keys in brackets after a Japanese word: 右ラダー（E） → 右ラダー (Restricted Area（R）, 荷重倍数（G） stay)
  h = h.replace(/([ぁ-んァ-ヶー\u4e00-\u9fff])（\s*[WASDQERFTVBZXU](?:\s*[/／]\s*[WASDQERFTVBZXU])*\s*）/g, '$1');
  // figures are set aside while the text is filtered (their drawings hold text too), then put back
  const figs = [];
  h = h.replace(/<figure\b[\s\S]*?<\/figure>/g, (f) => { if (REAL_NAMES.test(f)) return ''; figs.push(f); return `\u0000${figs.length - 1}\u0000`; });
  h = h.replace(/<table\b[\s\S]*?<\/table>/g, filterTable);
  // list items: the innermost first (a kept one is renamed for a moment, so the item around it is looked at next)
  for (let prev = ''; prev !== h; ) {
    prev = h;
    h = h.replace(/<li\b([^>]*)>((?:(?!<li\b|<\/li>)[\s\S])*)<\/li>/g, (m, attr, t) => (bad(t) ? '' : `<\u0001li${attr}>${t}</\u0001li>`));
  }
  h = h.replace(/<(\/?)\u0001li/g, '<$1li');
  // paragraphs and the like: sentence by sentence
  h = h.replace(/<(p|figcaption|summary|h3|h4)(\s[^>]*)?>([\s\S]*?)<\/\1>/g, (m, tag, attr = '', t) => {
    const k = keepSentences(t);
    return k === null ? '' : `<${tag}${attr}>${k}</${tag}>`;
  });
  h = h.replace(/<div class="bk-(warn|f)">([\s\S]*?)<\/div>/g, (m, cls, t) => { const k = keepSentences(t); return k === null ? '' : `<div class="bk-${cls}">${k}</div>`; });
  h = h.replace(/<details\b[^>]*>(?:(?!<summary)[\s\S])*?<\/details>/g, '');  // a question that lost its question
  // FLIGHT LAB's notes on what is published or only guessed about the real course: the academy's own book states its
  // course plainly (公開情報では、Archer の次に… → Archer の次に…; （どちらで教わるかは推測・要確認） goes)
  h = h.replace(/（[^（）<]*<span class="tag unk">[^<]*<\/span>[^（）<]*）/g, '').replace(/<span class="tag (?:fact|unk)">[^<]*<\/span>/g, '')
    .replace(/(^|[>。])公開情報では、/g, '$1');
  // what emptied out
  for (let prev = ''; prev !== h; ) {
    prev = h;
    h = h.replace(/<(ul|ol)\b[^>]*>\s*<\/\1>/g, '').replace(/<p\b[^>]*>\s*<\/p>/g, '')
      .replace(/<div class="bk-key"><b>[^<]*<\/b>\s*<\/div>/g, '');
  }
  // FLIGHT LAB's links to other sections: kept as marked text (the reader may follow it), only to sections of this book
  h = h.replace(/<button type="button" data-sec="([^"]+)">([\s\S]*?)<\/button>/g,
    (m, id, label) => (sectionExists(id) ? `<span class="bk-see" data-sec="${id}">${label}</span>` : `<span class="bk-see">${label}</span>`));
  h = h.replace(/<button\b[^>]*data-lesson[^>]*>[\s\S]*?<\/button>/g, '');
  return h.replace(/\u0000(\d+)\u0000/g, (m, i) => figs[+i]).replace(/\n{3,}/g, '\n\n').trim();
}

// the sentences of the section's prose in reading order (paragraphs and list items; not tables, figures, questions,
// cautions or sources)
function proseSentences(html) {
  const h = html.replace(/<table\b[\s\S]*?<\/table>|<figure\b[\s\S]*?<\/figure>|<details\b[\s\S]*?<\/details>/g, ' ')
    .replace(/<div class="bk-(?:warn|f|key)">[\s\S]*?<\/div>/g, ' ').replace(/<p class="[^"]*(?:bk-src|mute)[^"]*">[\s\S]*?<\/p>/g, ' ');
  const out = [];
  for (const m of h.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g))
    out.push(...sentences(plain(m[2].replace(/<(ul|ol)\b[\s\S]*$/, ''))));      // a list item's own words, not its sub-list
  return out.filter(s => !/[：:]$/.test(s));                                    // "…は次のとおり：" leads into a list
}

// ---- the book ----

const CACHE = new WeakMap();

export function gameBook(FL) {
  const B = FL && FL.book;
  if (!B || !Array.isArray(B.CHAPTERS)) throw new Error('gameBook: FLIGHT LAB\'s textbook (FL.book) is not loaded');
  if (CACHE.has(B)) return CACHE.get(B);

  const issues = [];                                                           // the safety net's findings (tests expect none)
  const chs = B.CHAPTERS.filter(c => !DROP_CHAPTERS.has(c.id) && !REAL_NAMES.test(c.t));
  const num = new Map(chs.map((c, i) => [c.id, i + 1]));
  const where = new Map();                                                     // section id → { ch, sec }
  for (const ch of chs) for (const sec of ch.secs) if (!REAL_NAMES.test(sec.t)) where.set(sec.id, { ch, sec });
  const chapters = chs.map(ch => ({ id: ch.id, n: num.get(ch.id), title: ch.t, part: ch.part,
    sections: ch.secs.filter(s => where.has(s.id)).map(s => ({ id: s.id, title: s.t })) }));
  const exists = (id) => where.has(id);
  // {ch:id} → this book's chapter number (FL.book.html numbers them with the introduction counted)
  const fixRefs = (s) => String(s).replace(/\{ch:([a-z0-9]+)\}/g, (m, id) => (num.has(id) ? `第 ${num.get(id)} 章` : '（別の章）'));
  const chapterSummary = (ch) => { const t = plain(fixRefs(ch.summary || '')); return REAL_NAMES.test(t) ? '' : t; };

  const done = new Map();
  function section(id) {
    if (done.has(id)) return done.get(id);
    const at = where.get(id);
    if (!at) return null;
    const { ch, sec } = at;
    let html = filterHtml(fixRefs(typeof sec.h === 'function' ? sec.h() : sec.h), exists);
    if (REAL_NAMES.test(html)) {                                               // never shown, whatever FLIGHT LAB adds later
      issues.push(`${id}: a real name survived the filter`);
      html = html.replace(new RegExp(REAL_NAMES.source, 'gi'), '');
    }
    const text = plain(html);
    const keys = [];
    for (const k of html.matchAll(/<div class="bk-key">([\s\S]*?)<\/div>/g))
      for (const li of k[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)) { const t = plain(li[1]); if (t) keys.push(t); }
    const prose = proseSentences(html);
    // a section that is all table (よくある間違い): its first rows, read across ("間違い → 正しくは")
    const rows = prose.length ? [] : [...(html.match(/<table\b[\s\S]*?<\/table>/) || [''])[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)]
      .filter(r => /<td\b/.test(r[1])).map(r => [...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(c => plain(c[1])).filter(Boolean).join(' → '));
    const svg = html.match(/<svg\b[\s\S]*?<\/svg>/);
    const fig = html.match(/<figure\b[\s\S]*?<\/figure>/);
    const cap = fig && fig[0].match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/);
    const label = svg && svg[0].match(/aria-label="([^"]*)"/);
    const out = {
      id, title: sec.t,
      chapter: { id: ch.id, n: num.get(ch.id), title: ch.t },
      // the opening sentence or two (one when two would be long), else the chapter's own summary
      summary: (prose.slice(0, 2).join('').length <= 140 ? prose.slice(0, 2).join('') : prose[0] || '') || chapterSummary(ch),
      keyPoints: keys.length ? keys : prose.length ? prose.slice(0, 2) : rows.length ? rows.slice(0, 2) : sentences(text).slice(0, 2),
      html,
      figure: svg ? svg[0] : null,
      caption: cap ? plain(cap[1]) : (label ? label[1] : null),               // what the figure shows, in words
      text,
    };
    done.set(id, out);
    return out;
  }

  const lessons = () => (FL.syllabus && Array.isArray(FL.syllabus.STAGES) ? FL.syllabus.STAGES.flatMap(s => s.lessons || []) : []);
  function lessonSections(lessonId) {
    const l = lessons().find(x => x.id === lessonId);
    return l && Array.isArray(l.book) ? l.book.filter(exists).map(id => ({ id, title: where.get(id).sec.t })) : [];
  }

  const book = { chapters, section, lessonSections, sectionExists: exists, issues };
  CACHE.set(B, book);
  return book;
}
