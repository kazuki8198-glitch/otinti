// CADET — core/bench-report.js : the bench's result (main.js runBench) as text to paste into README's table of
// measurements on real machines (M8: the PC this game aims at, an Iris Xe laptop, cannot be measured here). Pure.
// One header line for the machine, then a Markdown table: one row per viewpoint, and the worst of them.
export const README_HEAD = '| 日付 | GPU | 画質 | 視点 | 平均 ms | 95% ms | fps（平均） | 描画 | 三角形 |';
export function benchText(r, { build = '', ua = '', date = new Date().toISOString().slice(0, 10), size = '' } = {}) {
  if (!r || !Array.isArray(r.views) || !r.views.length) return '';
  const gpu = String(r.gpu || '不明').replace(/\|/g, '/').replace(/ANGLE \(|\)$/g, '').slice(0, 60);
  const fps = (ms) => (ms > 0 ? Math.round(1000 / ms) : 0);
  const rows = r.views.map(v => `| ${date} | ${gpu} | ${r.preset} ×${(+r.dpr).toFixed(2)} | ${v.label} | ${v.avgMs} | ${v.p95Ms} | ${fps(v.avgMs)} | ${v.calls} | ${Math.round(v.triangles / 1000)}k |`);
  const worst = r.views.reduce((a, v) => (v.p95Ms > a.p95Ms ? v : a), r.views[0]);
  return [
    `CADET の計測（${build || 'build ?'}）${size ? `　画面 ${size}` : ''}`,
    `ブラウザ：${String(ua).slice(0, 160)}`,
    `いちばん重い視点：${worst.label}（95% ${worst.p95Ms} ms ≒ ${fps(worst.p95Ms)} fps）`,
    '',
    README_HEAD,
    '|---|---|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}
