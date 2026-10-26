// tools/lib/design.mjs — reads the plan out of DESIGN.md (so the checks follow the design without a copy of it):
//  - toc(): the planned table of contents (3.3): section id → { part, chapter, isNew }
//  - jurItems(): the 47 Japan/US items (3.4): { id, title, us, jp, boxes[], gates[], part7[], safety }
//  - photoPlan(): the basic course's photos (4.2): use (id → section), conditional, notUse
//  - knownConcepts(): the known concept pairs (3.2 "既知の対"): { name, address, recalls[] }
// When FL.jur / the ledgers exist, the checks prefer them; DESIGN is the fallback.
import fs from 'node:fs';
import { DESIGN } from './paths.mjs';

let TEXT = null;
const text = () => (TEXT ??= fs.existsSync(DESIGN) ? fs.readFileSync(DESIGN, 'utf8') : '');
const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
const noParens = s => { let out = '', d = 0; for (const c of s) { if (c === '（' || c === '(') d++; else if (c === '）' || c === ')') d = Math.max(0, d - 1); else if (!d) out += c; } return out; };
const ticks = s => [...String(s).matchAll(/`([^`]+)`/g)].map(m => m[1]);

export function toc() {
  const t = text(), a = t.indexOf('### 3.3'), b = t.indexOf('### 3.4');
  const secs = new Map(), chapters = new Map(); if (a < 0 || b < 0) return { secs, chapters };
  let part = null, chapter = null;
  for (const line of t.slice(a, b).split('\n')) {
    const h = line.match(/^####\s+(序部|第\s*(\d)\s*部)/);
    if (h) { part = h[1] === '序部' ? 'p0' : 'p' + h[2]; chapter = null; continue; }
    if (!part || !line.startsWith('|') || /^\|\s*-/.test(line) || /^\|\s*章\s*\|/.test(line)) continue;
    const c = cells(line); if (c.length < 2) continue;
    const chs = ticks(c[0]).filter(x => /^[a-z0-9]+$/.test(x));
    if (chs.length) { chapter = chs[0]; for (const x of chs) if (!chapters.has(x)) chapters.set(x, part); }
    let col = c[1];
    const sw = col.match(/^`([a-z0-9]+)`：/); if (sw) { chapter = sw[1]; if (!chapters.has(chapter)) chapters.set(chapter, part); }
    col = noParens(col);
    const scopeText = c.length >= 4 ? c[3] : part === 'p7' ? '日本' : '';
    const kFrom = kRefs(c[2] || '');
    for (const m of col.matchAll(/(★)?`([a-z0-9_]+\.[a-z0-9_.-]+)`/g)) if (!secs.has(m[2])) secs.set(m[2], { part, chapter, isNew: !!m[1] || part === 'p7', scopeText, scope: plannedScope(scopeText), kFrom, source: c[2] || '' });
  }
  return { secs, chapters };
}

// the basic course's sections named in a「元にするもの」cell: K01.03・01.04・01.06, K00.09〜00.11 → [{ ch: '01', n: 3 }, …]
// (resolve them with kisoId(): kiso00/01 write kiso01.03, kiso03 writes kiso03.1)
export function kRefs(cell) {
  const s = noParens(String(cell)), out = [];
  let run = false, last = null, lastEnd = 0;
  for (const m of s.matchAll(/(K?)(\d\d)\.(\d+)/g)) {
    const gap = s.slice(lastEnd, m.index).trim();
    if (m[1]) run = true;
    else if (!run || !/^[・〜~]$/.test(gap)) { run = false; lastEnd = m.index + m[0].length; continue; }
    const cur = { ch: m[2], n: Number(m[3]) };
    if (!m[1] && /^[〜~]$/.test(gap) && last && last.ch === cur.ch) for (let k = last.n + 1; k < cur.n; k++) out.push({ ch: cur.ch, n: k });
    out.push(cur); last = cur; lastEnd = m.index + m[0].length;
  }
  return out;
}

// the 範囲 column → the scope it implies (日米 = a common section with Japan/US boxes)
export function plannedScope(t) {
  t = String(t || '').trim();
  if (/^米国/.test(t)) return 'us';
  if (/^日本/.test(t)) return 'jp';
  if (/^(共通|日米|公開情報|アプリ)/.test(t)) return 'common';
  return null;
}

export function jurItems() {
  const t = text(), a = t.indexOf('**取り違えやすい 47 項目**'); if (a < 0) return [];
  const out = [];
  let started = false;
  for (const line of t.slice(a).split('\n').slice(1)) {
    if (!line.startsWith('|')) { if (started) break; continue; }
    started = true;
    if (/^\|\s*-/.test(line) || /^\|\s*ID\s*\|/.test(line)) continue;
    const c = cells(line); if (c.length < 7) continue;
    const safety = /〔安全〕/.test(c[0]);
    const list = s => s.split(/[・、]/).map(x => x.replace(/[`\s]/g, '')).filter(x => /^[a-z0-9]+(\.[a-z0-9]+)?$/.test(x));
    out.push({ id: c[0].replace(/〔[^〕]*〕/g, '').trim(), title: c[1], us: c[2], jp: c[3], boxes: list(c[4]), gates: list(c[5]), part7: list(c[6]), safety });
  }
  return out;
}

export function photoPlan() {
  const t = text(), use = new Map(), conditional = new Map(), notUse = new Set();
  for (const line of t.split('\n')) {
    const m = line.match(/^\s*\|\s*(使う|条件つき|使わない)（\d+）\s*\|(.*)\|\s*$/); if (!m) continue;
    if (m[1] === '使わない') { for (const x of m[2].matchAll(/(ch\d\d-photo\d+)/g)) notUse.add(x[1]); continue; }
    const map = m[1] === '使う' ? use : conditional;
    for (const x of m[2].matchAll(/(ch\d\d-photo\d+)\s*→\s*`([^`]+)`/g)) if (!map.has(x[1])) map.set(x[1], x[2]);
    for (const x of m[2].matchAll(/(ch\d\d-photo\d+)/g)) if (!map.has(x[1])) map.set(x[1], null);
  }
  return { use, conditional, notUse };
}

export function knownConcepts() {
  const t = text(), a = t.indexOf('既知の対：'); if (a < 0) return [];
  const end = t.indexOf('\n', a), s = t.slice(a + 5, end < 0 ? undefined : end);
  const out = [];
  for (const m of s.matchAll(/([^、。（]+?)（([^（）]*`[^（）]*)）/g)) {
    const ids = ticks(m[2]).filter(x => x.includes('.'));
    if (ids.length >= 2) out.push({ name: m[1].replace(/^[、\s]+/, '').trim(), address: ids[0], recalls: ids.slice(1) });
  }
  return out;
}
