// usage: node figshot.mjs <outDir> <sectionId|FIG:key>...   renders each figure (every <figure class="bk-fig"> with an svg, and
// every bk-photo) of the given sections at 390 px (phone) and 760 px wide into PNGs, and checks each SVG as a standalone image
// (data:image/svg+xml, as CADET draws it). Prints the files and problems.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { load, CORE } from '../../../flight-lab/test/load.mjs';
const require = createRequire(import.meta.url);
const FL = load(...CORE, 'book-figs.js', 'book-core.js', ...(fs.existsSync(new URL('../../../flight-lab/src/book-photos.js', import.meta.url)) ? ['book-photos.js'] : []), 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js');
const [out, ...ids] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const items = [];
for (const id of ids) {
  if (id.startsWith('FIG:')) { const k = id.slice(4); const f = FL.bookFigs[k]; items.push([k, typeof f === 'function' ? f() : '']); continue; }
  const x = FL.book.findSection(id); if (!x) { console.error('no section', id); continue; }
  const h = FL.book.html(x.sec); let i = 0;
  for (const m of h.matchAll(/<figure class="bk-(?:fig|photo)"[\s\S]*?<\/figure>/g)) items.push([`${id}-${++i}`, m[0]]);
}
const { chromium } = require('playwright');
const browser = await chromium.launch();
const css = `body{margin:0;padding:12px;background:#07101d;color:#e8f0fa;font-family:"Noto Sans CJK JP","Hiragino Sans",sans-serif}
.bk-fig{margin:0;padding:10px;background:#0b1422;border:1px solid #23344d;border-radius:8px;text-align:center}
.bk-fig svg{width:100%;height:auto;display:block;margin:0 auto;background:#0b1422}
.bk-fig figcaption,.bk-photo figcaption{font-size:12px;color:#92a5be;margin-top:4px;line-height:1.5}
.bk-photo{margin:0;padding:8px;background:#0b1422;border:1px solid #23344d;border-radius:8px}.bk-photo img{width:100%;height:auto;display:block}`;
const problems = [];
for (const [name, html] of items) {
  for (const w of [390, 760]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: w === 390 ? 2 : 1 });
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style>${html}`);
    // text overflow outside the viewBox, and smallest rendered font size
    const r = await page.evaluate(() => {
      const svg = document.querySelector('svg'); if (!svg) return null;
      const vb = svg.viewBox.baseVal, k = svg.getBoundingClientRect().width / vb.width, bad = [], sizes = [];
      for (const t of svg.querySelectorAll('text')) {
        const b = t.getBBox(), fs = parseFloat(t.getAttribute('font-size') || 12);
        sizes.push(fs * k);
        const ctm = t.getScreenCTM(), p1 = new DOMPoint(b.x, b.y).matrixTransform(ctm), p2 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(ctm);
        const sm = svg.getScreenCTM().inverse(), q1 = p1.matrixTransform(sm), q2 = p2.matrixTransform(sm);
        const x0 = Math.min(q1.x, q2.x), x1 = Math.max(q1.x, q2.x), y0 = Math.min(q1.y, q2.y), y1 = Math.max(q1.y, q2.y);
        if (x0 < vb.x - 1 || y0 < vb.y - 1 || x1 > vb.x + vb.width + 1 || y1 > vb.y + vb.height + 1) bad.push(`outside: "${t.textContent}" [${x0.toFixed(0)},${y0.toFixed(0)},${x1.toFixed(0)},${y1.toFixed(0)}] vb ${vb.width}x${vb.height}`);
      }
      // overlapping text boxes
      const boxes = [...svg.querySelectorAll('text')].map(t => { const r = t.getBoundingClientRect(); return [t.textContent, r]; });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i][1], b = boxes[j][1], ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) bad.push(`overlap: "${boxes[i][0]}" × "${boxes[j][0]}"`);
      }
      return { bad, min: Math.min(...sizes), w: vb.width, h: vb.height, aria: svg.getAttribute('aria-label') || '', role: svg.getAttribute('role') };
    });
    const f = path.join(out, `${name}-${w}.png`);
    await (await page.$('figure') || page).screenshot({ path: f });
    if (r && w === 390) {
      if (r.min < 9.5) problems.push(`${name}: smallest text ${r.min.toFixed(1)} px at 390`);
      if (r.role !== 'img' || !r.aria) problems.push(`${name}: role/aria-label missing`);
      for (const b of r.bad) problems.push(`${name}: ${b}`);
    }
    if (w === 390) console.log(f, r ? `vb ${r.w}x${r.h} min ${r.min.toFixed(1)}px` : '(no svg)');
    await page.close();
  }
  // standalone SVG as an image (CADET's board): must be well-formed XML
  const m = html.match(/<svg\b[\s\S]*?<\/svg>/);
  if (m) {
    const page = await browser.newPage();
    const svg = m[0].replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"').replace(/^<svg /, '<svg width="1200" height="760" ');
    const ok = await page.evaluate(src => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); }), svg);
    if (!ok) problems.push(`${name}: the SVG does not load as an image (not well-formed XML?)`);
    await page.close();
  }
}
await browser.close();
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no problems found');
