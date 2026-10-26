// ledgers/src/syllabus.mjs — reads the JCAB「航空従事者技能証明学科試験出題範囲参考」texts (sources/mlit/*.txt, made with
// `pdftotext -layout` from the MLIT PDFs named in understand/curriculum.md [S13][S14][S15]) into a heading tree:
//   科目「１ 航空工学」→ 大項目「（１）航空力学」→「ア 空力の基礎理論」→「（ア）力学の基礎」, with the topics (the
// comma-separated text under a heading). The leaves (headings with no sub-heading) are the rows of JCAB-MAP.json.
import fs from 'node:fs';
import path from 'node:path';
import { HERE } from './design.mjs';

export const SYLLABI = {
  cpl: { file: 'cpl-airplane.txt', title: '事業用操縦士（飛行機）', ref: 'curriculum.md [S13]', url: 'https://www.mlit.go.jp/koku/content/001761069.pdf' },
  ir: { file: 'instrument-rating.txt', title: '計器飛行証明', ref: 'curriculum.md [S14]', url: 'https://www.mlit.go.jp/koku/content/001761080.pdf' },
  ppl: { file: 'ppl-airplane.txt', title: '自家用操縦士（飛行機）', ref: 'curriculum.md [S15]', url: 'https://www.mlit.go.jp/koku/content/001761074.pdf' },
};
const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ';
const FW = '０１２３４５６７８９';
const num = s => Number(String(s).replace(/[０-９]/g, c => FW.indexOf(c)));

export function parseSyllabus(key) {
  const text = fs.readFileSync(path.join(HERE, 'sources', 'mlit', SYLLABI[key].file), 'utf8');
  const lines = text.split('\n').filter(l => !/^#/.test(l));     // the header lines of the copy start with #
  const root = { children: [], level: 0, content: [] };
  const stack = [root];
  let started = false;
  const push = (level, node) => {
    while (stack[stack.length - 1].level >= level) stack.pop();
    const parent = stack[stack.length - 1];
    node.parent = parent; node.children = []; node.content = []; node.level = level;
    parent.children.push(node); stack.push(node);
  };
  for (const raw of lines) {
    const l = raw.replace(/\f/g, '');
    if (/^\s*以上\s*$/.test(l)) break;
    let m;
    if ((m = l.match(/^\s*([１-９])\s+(\S.*)$/))) { started = true; push(1, { n: num(m[1]), label: m[1], title: m[2].trim() }); continue; }
    if (!started) continue;
    if ((m = l.match(/^\s*（([１-９][０-９]?)）\s*(\S.*)$/))) { push(2, { n: num(m[1]), label: `（${m[1]}）`, title: m[2].trim() }); continue; }
    if ((m = l.match(/^\s*([ア-ン])\s+(\S.*)$/)) && KANA.includes(m[1])) { push(3, { n: KANA.indexOf(m[1]) + 1, label: m[1], title: m[2].trim() }); continue; }
    if ((m = l.match(/^\s*（([ア-ン])）\s*(\S.*)$/)) && KANA.includes(m[1])) { push(4, { n: KANA.indexOf(m[1]) + 1, label: `（${m[1]}）`, title: m[2].trim() }); continue; }
    if (l.trim()) stack[stack.length - 1].content.push(l.trim());
  }
  const leaves = [];
  const walk = (node, trail) => {
    for (const c of node.children) {
      const t = [...trail, c];
      if (!c.children.length) {
        const content = c.content.join('').replace(/\s+/g, ' ').trim();
        leaves.push({
          id: `${key}.${t.map(x => x.n).join('.')}`,
          label: t.map(x => x.label).join(''),
          subject: t[0].title,
          path: t.map(x => `${x.label} ${x.title}`.trim()),
          title: c.title,
          topics: content ? content.split(/[、､]/).map(s => s.trim()).filter(Boolean) : [],
        });
      } else walk(c, t);
    }
  };
  walk(root, []);
  const headings = [];
  const all = (node, trail) => { for (const c of node.children) { const t = [...trail, c]; headings.push({ id: `${key}.${t.map(x => x.n).join('.')}`, label: t.map(x => x.label).join(''), title: c.title, leaf: !c.children.length, note: c.children.length && c.content.length ? c.content.join('').replace(/\s+/g, ' ') : null }); all(c, t); } };
  all(root, []);
  return { leaves, headings };
}
