// check-figures.mjs — DESIGN 5 章 基準 16 (extends textbook/rewrite/tools/figshot.mjs to every figure, with numbers):
//  static: viewBox width 360–440; role="img" and aria-label = the caption; the caption starts「図：」; no white board
//   (a full-size light rect: the figures sit on the dark board #0b1422); no bare & (the SVG must load on its own as
//   XML: CADET draws it as data:image/svg+xml); no id used twice in one chapter's page (TEXTBOOK's chapter view) —
//   twice in the whole book is counted (TEXTBOOK's #all view);
//  headless Chromium at 390 px (each chapter's figures on one page, the figure CSS of figshot.mjs): every text box
//   inside the viewBox, no two text boxes overlapping, the smallest text ≥ 10 px on the screen, and the SVG parses
//   on its own (DOMParser image/svg+xml). --no-browser skips this part (static checks only).
// The figures are named <section>#<n> (FIG:<key> when a FL.bookFigs function draws the same SVG); the known
// overflows of DESIGN 5 章 基準 16 (fuelSystem, positionLights, leftTurning, dragCurve, axes, scan, compassErrors)
// are reported one by one.   --out DIR also writes a 390 px PNG of every figure with a problem.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Result, cli, outOf } from './lib/report.mjs';
import { textOf, decode, clip } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';

export const meta = { id: 'figures', title: '図（暗い板・viewBox・aria-label・390 px で文字の箱・重なり・最小 10 px）', criteria: [16] };
export const LIMITS = { vbMin: 360, vbMax: 440, minPx: 10, width: 390 };
export const KNOWN = ['fuelSystem', 'positionLights', 'leftTurning', 'dragCurve', 'axes', 'scan', 'compassErrors'];
const require = createRequire(import.meta.url);
export function loadChromium() {
  for (const p of [process.env.PLAYWRIGHT, 'playwright', '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(p).chromium; } catch (e) { /* next */ } }
  return null;
}
const CSS = `body{margin:0;padding:12px;background:#07101d;color:#e8f0fa;font-family:"Noto Sans CJK JP","Hiragino Sans",sans-serif}
.bk-fig{margin:0 0 12px;padding:10px;background:#0b1422;border:1px solid #23344d;border-radius:8px;text-align:center}
.bk-fig svg{width:100%;height:auto;display:block;margin:0 auto;background:#0b1422}
.bk-fig figcaption{font-size:12px;color:#92a5be;margin-top:4px;line-height:1.5}`;

export function figuresOf(env, { all = false } = {}) {
  const keyOf = new Map();
  for (const [k, f] of Object.entries(env.FL.bookFigs || {})) if (typeof f === 'function') { try { const s = f(); const m = typeof s === 'string' && s.match(/<svg\b[\s\S]*?<\/svg>/); if (m && !keyOf.has(m[0])) keyOf.set(m[0], k); } catch (e) { /* needs arguments */ } }
  const out = [];
  for (const s of sectionsOf(env, { all })) {
    let n = 0;
    for (const m of s.html.matchAll(/<figure class="bk-fig">([\s\S]*?)<\/figure>/g)) {
      const svg = (m[1].match(/<svg\b[\s\S]*?<\/svg>/) || [])[0]; if (!svg) continue;
      const cap = (m[1].match(/<figcaption>([\s\S]*?)<\/figcaption>/) || [])[1] || '';
      const key = keyOf.get(svg);
      out.push({ name: `${s.id}#${++n}${key ? ` (FIG:${key})` : ''}`, sec: s.id, ch: s.ch.id, key, html: m[0], svg, cap });
    }
  }
  return out;
}

function staticChecks(r, f) {
  const open = f.svg.match(/^<svg\b[^>]*>/)[0];
  const vb = (open.match(/viewBox="([^"]+)"/) || [])[1];
  const nums = vb ? vb.trim().split(/[\s,]+/).map(Number) : null;
  if (!nums || nums.length !== 4) r.error('no-viewbox', f.name, 'viewBox がない');
  else if (nums[2] < LIMITS.vbMin || nums[2] > LIMITS.vbMax) r.error('viewbox-width', f.name, `viewBox の幅 ${nums[2]}（${LIMITS.vbMin}〜${LIMITS.vbMax}）`);
  const aria = decode((open.match(/aria-label="([^"]*)"/) || [])[1] || '');
  if (!/role="img"/.test(open) || !aria.trim()) r.error('aria', f.name, 'role="img" か aria-label がない');
  const cap = textOf(f.cap);
  if (aria && cap && textOf(aria) !== cap) r.warn('aria-caption', f.name, `aria-label とキャプションが違う：「${clip(textOf(aria), 30)}」／「${clip(cap, 30)}」`);
  if (cap && !/^図：/.test(cap)) r.warn('caption-form', f.name, `キャプションが「図：」で始まらない：「${clip(cap, 30)}」`);
  if (!cap) r.warn('no-caption', f.name, 'キャプションがない');
  if (/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/.test(f.svg)) r.error('xml-amp', f.name, '& がそのまま（&amp; に）：単独の画像として読めない');
  if (nums) for (const m of f.svg.matchAll(/<rect\b[^>]*>/g)) {
    const w = parseFloat((m[0].match(/\swidth="([\d.]+)"/) || [])[1]), h = parseFloat((m[0].match(/\sheight="([\d.]+)"/) || [])[1]), fill = ((m[0].match(/\sfill="([^"]+)"/) || [])[1] || '').toLowerCase();
    if (w >= nums[2] * 0.9 && h >= nums[3] * 0.9 && /^(#fff|#ffffff|white|#fefefe|#fafafa|#f[0-9a-f]f[0-9a-f]f[0-9a-f])$/.test(fill)) { r.error('white-board', f.name, `図いっぱいの白い四角（fill ${fill}）：暗い板の上に描く`); break; }
  }
}

async function browserChecks(r, figs, o, pngDir) {
  const chromium = loadChromium();
  if (!chromium) { r.skip('Chromium（Playwright）が見つからない：静的な検査だけ'); return null; }
  let browser;
  try { browser = await chromium.launch(); } catch (e) { r.skip(`Chromium を起動できない（${e.message.split('\n')[0]}）：静的な検査だけ`); return null; }
  const byCh = new Map(); for (const f of figs) byCh.set(f.ch, [...(byCh.get(f.ch) || []), f]);
  const smallest = [];
  try {
    for (const [ch, list] of byCh) {
      const page = await browser.newPage({ viewport: { width: LIMITS.width, height: 900 }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${list.map(f => f.html).join('\n')}`);
      const res = await page.evaluate(({ minPx, srcs }) => [...document.querySelectorAll('figure.bk-fig > svg')].map((svg, idx) => {
        const vb = svg.viewBox.baseVal, out = { outside: [], near: [], wide: [], shapes: [], overlap: [], min: Infinity, minText: '', parse: true };
        const sm = svg.getScreenCTM().inverse();
        const texts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() && t.getBBox().width > 0);
        for (const t of texts) {
          const b = t.getBBox(), ctm = t.getScreenCTM();
          const scale = Math.sqrt(Math.abs(ctm.a * ctm.d - ctm.b * ctm.c));
          const px = parseFloat(getComputedStyle(t).fontSize) * scale;
          if (px < out.min) { out.min = px; out.minText = t.textContent.trim(); }
          const p1 = new DOMPoint(b.x, b.y).matrixTransform(ctm).matrixTransform(sm), p2 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(ctm).matrixTransform(sm);
          const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);
          if (x0 < vb.x - 1 || y0 < vb.y - 1 || x1 > vb.x + vb.width + 1 || y1 > vb.y + vb.height + 1) out.outside.push(`"${t.textContent.trim().slice(0, 24)}" [${x0.toFixed(0)},${y0.toFixed(0)}–${x1.toFixed(0)},${y1.toFixed(0)}] / ${vb.width}×${vb.height}`);
          else if (x0 < vb.x + 3 || x1 > vb.x + vb.width - 3) out.near.push(`"${t.textContent.trim().slice(0, 24)}" [${x0.toFixed(0)}–${x1.toFixed(0)}] / ${vb.width}`);
          // the same text in a wider font (CJK 1 em, capitals and digits 0.66 em, others 0.56 em, spaces 0.3 em): would it still fit?
          else if (Math.abs(ctm.b) < 1e-6 && Math.abs(ctm.c) < 1e-6) {      // (a rotated label is left to the box test above)
            const fsU = parseFloat(getComputedStyle(t).fontSize), lines = [...t.querySelectorAll('tspan')].filter(x => x.hasAttribute('x') || x.hasAttribute('dy'));
            const est = Math.max(...(lines.length ? lines : [t]).map(l => [...l.textContent].reduce((a, c) => a + (/[^\x00-\x7f]/.test(c) ? 1 : /[A-Z0-9]/.test(c) ? 0.66 : /\s/.test(c) ? 0.3 : 0.56), 0) * fsU));
            const k = Math.sqrt(Math.abs(ctm.a * ctm.d - ctm.b * ctm.c)) / Math.sqrt(Math.abs(svg.getScreenCTM().a * svg.getScreenCTM().d));
            const w = est * k, anchor = getComputedStyle(t).textAnchor, cx = (x0 + x1) / 2;
            const [e0, e1] = anchor === 'end' ? [x1 - w, x1] : anchor === 'middle' ? [cx - w / 2, cx + w / 2] : [x0, x0 + w];
            if (e0 < vb.x - 2 || e1 > vb.x + vb.width + 2) out.wide.push(`"${t.textContent.trim().slice(0, 24)}" 推定 [${e0.toFixed(0)}–${e1.toFixed(0)}] / ${vb.width}`);
          }
        }
        // shapes cut by the edge (a light's sector, an arrow): more than 2 units outside the viewBox
        for (const g of svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line')) {
          let b; try { b = g.getBBox(); } catch (e) { continue; }
          if (!b.width && !b.height) continue;
          const ctm = g.getScreenCTM(), p1 = new DOMPoint(b.x, b.y).matrixTransform(ctm).matrixTransform(sm), p2 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(ctm).matrixTransform(sm);
          const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);
          if (x0 < vb.x - 2 || y0 < vb.y - 2 || x1 > vb.x + vb.width + 2 || y1 > vb.y + vb.height + 2) out.shapes.push(`<${g.tagName}> [${x0.toFixed(0)},${y0.toFixed(0)}–${x1.toFixed(0)},${y1.toFixed(0)}] / ${vb.width}×${vb.height}`);
        }
        const boxes = texts.map(t => [t.textContent.trim(), t.getBoundingClientRect()]);
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const [ta, a] = boxes[i], [tb, b] = boxes[j];
          if (ta === tb && Math.abs(a.left - b.left) < 1.5 && Math.abs(a.top - b.top) < 1.5) continue;     // a halo drawn under the text
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 2 && oy > 2) out.overlap.push(`"${ta.slice(0, 20)}" × "${tb.slice(0, 20)}"`);
        }
        const src = srcs[idx].replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"');
        out.parse = !new DOMParser().parseFromString(src, 'image/svg+xml').querySelector('parsererror');
        out.small = out.min < minPx;
        return out;
      }), { minPx: LIMITS.minPx, srcs: list.map(f => f.svg) });
      for (let i = 0; i < list.length; i++) {
        const f = list[i], x = res[i]; if (!x) continue;
        r.count('figures drawn at 390 px');
        for (const s of x.outside) r.error('text-outside', f.name, `文字の箱が図の外：${s}`);
        for (const s of x.overlap) r.error('text-overlap', f.name, `文字の箱が重なる：${s}`);
        for (const s of x.near) r.warn('text-near-edge', f.name, `文字の箱が図の端から 3 未満（字の幅が広いフォントでははみ出す）：${s}`);
        for (const s of x.wide) r.warn('text-may-overflow', f.name, `字の幅の広いフォントなら図の外へ出る：${s}`);
        for (const s of x.shapes.slice(0, 3)) r.warn('shape-outside', f.name, `図形が図の外へ出て切れる：${s}${x.shapes.length > 3 ? `（ほか ${x.shapes.length - 3}）` : ''}`);
        if (x.min !== Infinity) { smallest.push([x.min, f.name]); if (x.small) r.error('text-small', f.name, `最小の文字 ${x.min.toFixed(1)} px（390 px で ${LIMITS.minPx} px 以上）：「${clip(x.minText, 16)}」`); }
        if (!x.parse) r.error('not-xml', f.name, '単独の SVG として読めない（XML の誤り）');
        f.problem = x.outside.length || x.overlap.length || x.small || !x.parse;
      }
      if (pngDir) {
        fs.mkdirSync(pngDir, { recursive: true });
        const els = await page.$$('figure.bk-fig');
        for (let i = 0; i < list.length; i++) if (list[i].problem && els[i]) await els[i].screenshot({ path: path.join(pngDir, `${list[i].name.replace(/[^\w.#-]+/g, '_')}-390.png`) });
      }
      await page.close();
    }
  } finally { await browser.close(); }
  smallest.sort((a, b) => a[0] - b[0]);
  return smallest;
}

export async function run(env) {
  const r = new Result(meta);
  const figs = figuresOf(env), all = figuresOf(env, { all: true });
  for (const f of figs) { r.count('figures'); staticChecks(r, f); }
  // ids: twice in one chapter (one TEXTBOOK chapter page), twice in the book (the #all page)
  const idsBy = (list, keyFn) => { const m = new Map(); for (const f of list) for (const x of f.svg.matchAll(/\sid="([^"]+)"/g)) { const k = keyFn(f) + '|' + x[1]; m.set(k, [...(m.get(k) || []), f.name]); } return m; };
  for (const [k, names] of idsBy(figs, f => f.ch)) if (new Set(names).size > 1) r.error('duplicate-id-chapter', k.split('|')[0], `id "${k.split('|')[1]}" が同じ章の ${names.length} 枚の図に：${[...new Set(names)].join('・')}`);
  let bookDup = 0; for (const [, names] of idsBy(all, () => 'book')) if (new Set(names).size > 1) bookDup++;
  if (bookDup && !env.only) r.info('duplicate-id-book', 'book', `${bookDup} の id が本の中の 2 枚以上の図に（TEXTBOOK の全体表示で重なる）`);
  const smallest = env.o && env.o.browser === false ? (r.skip('--no-browser：静的な検査だけ'), null) : await browserChecks(r, figs, env.o, outOf(env, 'figures'));
  if (smallest && smallest.length) r.metric('smallest text at 390 px', smallest.slice(0, 5).map(([px, n]) => `${px.toFixed(1)} px ${n}`).join(' · '));
  // the known overflows
  if (!env.only) {
    const st = KNOWN.map(k => { const f = all.find(x => x.key === k); if (!f) return `${k}: 本にない`; const e = r.items.filter(x => x.where === f.name && x.level === 'error').length, w = r.items.filter(x => x.where === f.name && x.level === 'warn').map(x => x.code); return `${k}: ${e ? `error ${e}` : ''}${w.length ? `${e ? '・' : ''}warn ${[...new Set(w)].join('/')}` : ''}${!e && !w.length ? 'OK' : ''}`; });
    r.metric('known overflows (DESIGN 基準 16)', st.join(' · '));
  }
  r.metric('figures with a FIG key', `${figs.filter(f => f.key).length} / ${figs.length}`);
  return r;
}

await cli(import.meta.url, meta, run, { usage: '[--no-browser] [--out PNGDIR]' });
