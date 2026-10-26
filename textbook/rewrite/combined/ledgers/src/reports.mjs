// ledgers/src/reports.mjs — reads the error tables of the 12 topic reports (understand/*.md) so each ERRATA row can
// carry the report's own place and the primary sources it names. Three report styles exist: a table with a source
// column (出典・根拠), a table without one (the sources are inside the text), and a bullet list (**ID（…）**：…).
import fs from 'node:fs';
import path from 'node:path';
import { COMBINED, cells } from './design.mjs';

export const REPORT_FILE = { overview: 'overview.md', aero: 'aero.md', systems: 'systems.md', instruments: 'instruments.md', 'wb-perf': 'wb-perf.md', weather: 'weather.md', navigation: 'navigation.md', law: 'law-atc-radio.md', human: 'human.md', vfr: 'vfr-flying.md', ifr: 'ifr.md', multi: 'multi.md' };

// the primary sources a text names (for rows whose report has no source column)
const SRC = [
  /PHAK(?:\s?25C)?(?:\s?第\s?\d+\s?章)?(?:\s?[\d-]+)?/g, /AFH(?:\s?3C)?(?:\s?(?:第\s?\d+\s?章|p\.[\d.\-・]+|\d+-\d+(?:〜\d+-\d+)?))?/g, /IFH(?:\s?第\s?\d+\s?章)?(?:\s?Addendum\s?B)?/g,
  /AIM\s?\d+-\d+-\d+/g, /14 CFR\s?(?:Part\s?)?\d+(?:\.\d+)?(?:\([a-z0-9]+\))*/g, /(?<![\d.])(?:23|25|61|91|121)\.\d{1,4}(?:\([a-z0-9]+\))*/g, /AC\s?\d{2,3}-\d+[A-Z]?(?:\s?Change\s?\d)?/g,
  /FAA-P-\d+-\d+/g, /POH(?:\s?VB-\d+)?(?:\s?(?:第\s?\d+\s?章|\d+\.\d+))?/g, /SAIB\s?[A-Z]{2}-\d+-\d+/g, /NWSI\s?10-813/g, /AWH(?:\s?[\d.]+)?/g, /ACS(?:\s?\d[A-C])?/g,
  /航空法(?:施行規則)?\s?第\s?\d+\s?条(?:の\s?\d+)?/g, /施行規則\s?第\s?\d+\s?条(?:の\s?\d+)?/g, /Doc\s?\d{4}/g, /PANS-OPS/g, /耐空性審査要領/g, /気象庁[^、。）]{0,20}/g, /NTSB\s?[A-Z0-9-]+/g, /JO\s?7110\.65[^、。）]{0,10}/g,
];
export function sourcesIn(text) {
  const out = [];
  for (const re of SRC) for (const m of String(text).matchAll(re)) { const s = m[0].trim(); if (!out.includes(s)) out.push(s); }
  return out;
}

const secLabel = (h2, sub) => { const n = (h2.match(/^([\d.]+)/) || [])[1] || ''; const sn = (sub.match(/^([\d.]+)/) || [])[1]; return sn ? `§${sn}` : `§${n.replace(/\.$/, '')}${sub ? `（${sub}）` : ''}`; };

let CACHE = null;
// report key → Map(local id → { text, source, section })
export function reportErrata() {
  if (CACHE) return CACHE;
  CACHE = {};
  for (const [key, file] of Object.entries(REPORT_FILE)) {
    const lines = fs.readFileSync(path.join(COMBINED, 'understand', file), 'utf8').split('\n');
    const map = new Map();
    let inErr = false, head = null, sub = '', h2 = '';
    for (const l of lines) {
      if (/^##\s/.test(l)) { inErr = /誤り/.test(l); h2 = l.replace(/^##\s*/, '').trim(); head = null; continue; }
      if (!inErr) continue;
      if (/^###\s/.test(l)) { sub = l.replace(/^###\s*/, '').trim(); head = null; continue; }
      const book = /基礎教材|kiso/.test(sub) ? 'K' : 'T';
      if (/^\|/.test(l)) {
        const c = cells(l);
        if (c.every(x => /^:?-+:?$/.test(x))) continue;
        if (!head) { head = c; continue; }
        const srcCol = head.findIndex(h => /出典|根拠/.test(h) && !/直し方/.test(h));
        const fixSrcCol = head.findIndex(h => /直し方・根拠/.test(h));
        let id = c[0].replace(/`/g, '');
        if (key === 'law') id = c[0].replace(/`/g, '').replace(/[（(\s].*$/, '');
        const text = c.join(' ｜ ');
        const source = srcCol >= 0 ? c[srcCol] : fixSrcCol >= 0 ? sourcesIn(c[fixSrcCol]).join('、') : sourcesIn(text).join('、');
        map.set(`${book}:${id}`, { text, source, section: secLabel(h2, sub), cells: c });
      } else {
        const m = l.match(/^\s*-\s*\*\*([A-Z]+-?[A-Z]?-?\d+)（([^）]*)）[^*]*\*\*：?(.*)$/);
        if (m) {
          const src = (m[3].match(/出典：([^。]*)/) || [])[1];
          map.set(`${book}:${m[1]}`, { text: m[3], source: src || sourcesIn(m[3]).join('、'), section: secLabel(h2, sub), cells: null });
        }
      }
    }
    CACHE[key] = map;
  }
  return CACHE;
}
