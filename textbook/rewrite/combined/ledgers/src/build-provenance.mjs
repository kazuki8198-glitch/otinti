// ledgers/src/build-provenance.mjs — W03 bootstrap of PROVENANCE.json: one row for each of the basic course's
// 393 sections (covers and intros included), 376 questions, 161 figures and 85 photos (flight-lab/kiso/data/*.json,
// read only), with where it goes in the combined book or why it is left out (DESIGN 3.3, 3.2, 4.2).
//   node build-provenance.mjs            prints what it would write and the counts (does not write)
//   node build-provenance.mjs --write    writes ../PROVENANCE.json (refuses when the file exists: the JSON is the
//                                        record after the bootstrap; units change it with patches, README)
//   node build-provenance.mjs --write --force   overwrites (loses every patch applied since — only for a re-bootstrap)
import fs from 'node:fs';
import path from 'node:path';
import { LEDGERS, tocRows, plannedBook, kRefsIn, figRefsIn, photoRefsIn, kiso, sectionText, designText } from './design.mjs';
import { unitForDest, unitForFigure, unitForPhoto, partOfChapter, DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const OUT = path.join(LEDGERS, 'PROVENANCE.json');
const K = kiso();
const book = plannedBook();
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// ---- 1. sections: DESIGN 3.3 (the table of contents) ------------------------------------------------------
const dest = new Map();      // kiso section id → Set of destinations
const figDest = new Map();   // figure id → Set of sections (3.3 names it: redraw)
const add = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
for (const r of tocRows()) {
  if (!r.secs.length) continue;
  const segs = r.secs.map((s, i) => ({ id: s.id, text: r.col2.slice(s.at, i + 1 < r.secs.length ? r.secs[i + 1].at : undefined) }));
  for (const sg of segs) {
    for (const k of kRefsIn(sg.text)) if (k.id) add(dest, k.id, sg.id);
    for (const f of figRefsIn(sg.text)) add(figDest, f, sg.id);
  }
  for (const s of r.secs) {
    for (const k of kRefsIn(r.src)) if (k.id) add(dest, k.id, s.id);
    for (const f of figRefsIn(r.src)) add(figDest, f, s.id);
  }
}
// the cell "K08.27 を入口に＋T（…）。章末課題：K08.28" gives K08.28 to the chapter end, not to nav.lost
dest.get('kiso08.28')?.delete('nav.lost');
// DESIGN 3.3 (g3) "★g3.review（K08.28「計画を説明する」を口述の練習に）" is read above; the chapter-end task too:
const extra = {
  // 4.2 — the chapter covers (their goals become a part door or a chapter's aim) and the intro sections
  'kiso00.cover': ['door:p0'], 'kiso01.cover': ['summary:aero'], 'kiso02.cover': ['summary:sys', 'summary:tsys'],
  'kiso03.cover': ['summary:sys', 'summary:me', 'summary:tsys'], 'kiso04.cover': ['summary:inst'], 'kiso05.cover': ['summary:wb'],
  'kiso06.cover': ['summary:perf'], 'kiso07.cover': ['summary:wx', 'summary:jwx'], 'kiso08.cover': ['summary:navb', 'summary:navp'],
  'kiso09.cover': ['summary:law', 'door:p7'], 'kiso10.cover': ['summary:hf', 'summary:adm'], 'kiso11.cover': ['door:p2'],
  'kiso12.cover': ['door:p4'], 'kiso13.cover': ['door:p5'],
  'kiso00.x1': ['door:p0'], 'kiso01.x1': ['door:p1', 'summary:aero'], 'kiso02.x1': ['door:p1', 'basics.docs'],
  // 3.2 "Archer に当てはめる課題" and 4.2: the "自分の機体に対応付ける" sections go to the chapter-end task and g1's oral practice
  'kiso03.28': ['written:sys', 'g1.review'], 'kiso04.28': ['written:inst', 'g1.review'], 'kiso05.28': ['written:wb', 'g1.review'],
  'kiso08.28': ['written:navd'],
  // 4.2 rows that name a destination 3.3 does not repeat
  'kiso01.25': ['sys.engine', 'me.prop'], 'kiso06.6': ['perf.wb'], 'kiso06.21': ['emg.glide'],
};
for (const [id, ds] of Object.entries(extra)) for (const d of ds) add(dest, id, d);
const dropSections = { 'kiso06.22': '`aero.stall`・`aero.turn` と重複するので外す（DESIGN 4.2・1.2）' };

// how a section is used: goals (door/summary), chapter-end task, or rewritten into a section or box
function planOf(id, ds) {
  if (dropSections[id]) return 'drop';
  if (/\.cover$/.test(id)) return 'goals';
  if (ds.every(d => /^(door|summary):/.test(d))) return 'goals';
  if (ds.every(d => /^written:/.test(d) || /^g\d\.review$/.test(d))) return 'task';
  return 'rewrite';
}
export const PLANS = {
  goals: '「この章でできるようになること」を部の扉・章のねらいの学習目標に書き直す（版の記録・注意書き・数の行は使わない。DESIGN 3.2・4.2）',
  task: '章末の「説明してみよう」の課題（Archer の POH で調べて書く）と部のまとめの口述の練習に（DESIGN 3.2・4.2）',
  rewrite: '書き直して入れる（転記しない）。行き先の節に `from` を付け、画面に「第 3 版 第 N 章 x 節をもとに改稿」と出す（DESIGN 3.2・基準 11）',
  drop: '外す（reason に理由）。図は図の単位が、問いは問題の単位が確かめ、使うことにしたら行き先を足して plan を変える',
  written: '章末の「説明してみよう」（答えは開いて見る）・部のまとめの口述の練習の候補。約 280 問をそこへ、約 90 問を 4 択に作り替え（一部は両方）、重複など約 20 問は理由を付けて外す（DESIGN 4.2）。どれにするかは問題の単位（W10・W23・W34・W42）が決め、答えの誤り（errata）を直す',
  redraw: '暗い板に描き直す（中身は同じ、文字 12 以上、viewBox の幅 360〜440）。元の図番号と元の出典を記録する。FAA のハンドブックが元ならパブリックドメインの出典を書く（DESIGN 4.2・基準 16）',
  'use-file': 'ファイルのまま（バイト一致・ハッシュ）。クレジットを教科書の形 {author, license, licenseUrl, source} に移し、元のページで 1 枚ずつ確かめる。加工の表示は写真ごと（DESIGN 4.2・基準 17・W22）',
  conditional: 'condition を元の画像で確かめてから use-file と同じ扱い。だめなら drop にして理由を書く（DESIGN 4.2）',
};

const rows = [];
const blank = { status: 'open', where: null, by: null, checkedBy: null, note: '' };

for (const c of K.chapters) for (const s of c.sections) {
  const ds = [...(dest.get(s.id) || [])];
  const plan = planOf(s.id, ds);
  const units = [...new Set(ds.map(unitForDest))];
  const basis = extra[s.id] ? (/(cover|x1)$/.test(s.id) ? 'DESIGN 3.2・4.2（章の扉と導入の節）' : 'DESIGN 3.2・4.2') : 'DESIGN 3.3';
  rows.push({
    id: s.id, kind: 'section', chapter: c.id, title: strip(s.title),
    to: ds, plan, reason: dropSections[s.id] || null,
    basis: dest.has(s.id) && extra[s.id] && dest.get(s.id).size > extra[s.id].length ? 'DESIGN 3.3・4.2' : basis,
    unit: plan === 'drop' ? 'W13' : units[0] || null, units, ...blank,
  });
}

// ---- 2. questions ------------------------------------------------------------------------------------------
// which section each question belongs to: kiso03〜13 "各問は同じ番号の本文節に対応"; kiso01 "〔NN 節〕" in the answer;
// kiso02 "本文の第N節" in the answer; kiso00 by reading (W03).
const KANJI = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const kanjiNum = s => { if (/^\d+$/.test(s)) return Number(s); let n = 0; const m = s.match(/^(?:(.)?十)?(.)?$/); if (!m) return NaN; if (s.includes('十')) n += (m[1] ? KANJI[m[1]] : 1) * 10; if (m[2]) n += KANJI[m[2]]; return n; };
const K00Q = { 1: [1], 2: [2], 3: [3, 4], 4: [6], 5: [5], 6: [9], 7: [12], 8: [14], 9: [7], 10: [7], 11: [11], 12: [8], 13: [10], 14: [12], 15: [2], 16: [14], 17: [6], 18: [11, 1], 19: [2], 20: [15] };
function questionSections(c, q) {
  const chn = c.id.slice(4), a = strip(q.a);
  const sec = n => K.byNum.get(`${chn}:${n}`);
  if (c.id === 'kiso00') return (K00Q[q.n] || []).map(sec);
  if (c.id === 'kiso01') {
    const out = [];
    for (const m of a.matchAll(/〔([\d・〜～]+)\s*節〕/g)) {
      const parts = m[1].split('・');
      for (const p of parts) { const r = p.split(/[〜～]/).map(Number); if (r.length === 2) for (let k = r[0]; k <= r[1]; k++) out.push(sec(k)); else out.push(sec(r[0])); }
    }
    return [...new Set(out)];
  }
  if (c.id === 'kiso02') {
    const out = [];
    for (const m of a.matchAll(/第([一二三四五六七八九十]+)節/g)) out.push(sec(kanjiNum(m[1])));
    return [...new Set(out)];
  }
  return [sec(q.n)];
}
const qErrata = {
  'kiso00.q8': ['K.overview.K1'], 'kiso00.q14': ['K.overview.K1'], 'kiso00.q20': ['K.overview.K1'],
  'kiso06.q3': ['K.wb-perf.K1'], 'kiso07.q21': ['K.weather.K1'], 'kiso08.q11': ['K.navigation.K1', 'K.wb-perf.K4'],
  'kiso08.q25': ['K.navigation.K1', 'K.wb-perf.K4'], 'kiso12.q25': ['K.ifr.K-2'], 'kiso13.q22': ['K.multi.K-1'],
};
const qExtra = {
  // DESIGN 3.3: the questions named for the part reviews and the case study
  ...Object.fromEntries([2, 3, 6, 12, 14, 16].map(n => [`kiso11.q${n}`, ['g2.review']])),
  ...Object.fromEntries([1, 12, 13, 14, 19, 20, 21, 22, 24, 27].map(n => [`kiso12.q${n}`, ['g4.review']])),
  'kiso13.q22': ['g5.review'], 'kiso09.q20': ['jatc.case'],
};
const qPool = { kiso08: 'g3.review の候補（DESIGN 3.3：kiso08 の記述問題）', kiso09: 'g7.review・g7.oral の候補（DESIGN 3.3：kiso09 の記述問題）' };
for (let i = 1; i <= 10; i++) { const id = 'kiso' + String(i).padStart(2, '0'); qPool[id] = (qPool[id] ? qPool[id] + '／' : '') + 'g1.review の候補（DESIGN 3.3：kiso01〜kiso10 の記述問題）'; }

const secRow = new Map(rows.map(r => [r.id, r]));
for (const c of K.chapters) for (const q of c.qa) {
  const id = `${c.id}.q${q.n}`;
  const related = questionSections(c, q).filter(Boolean);
  // the chapter the question's section mostly goes to (its first destination that is a planned section)
  // (a section that is itself a chapter-end task gives its `written:` place to its question)
  let near = null, written = null;
  for (const sid of related) {
    const r = secRow.get(sid); if (!r) continue;
    const w = r.to.find(x => x.startsWith('written:')), d = r.to.find(x => book.secs.has(x) && !/^g\d\./.test(x)) || r.to.find(x => book.secs.has(x));
    if (w && r.plan === 'task') { written = w; near = d || null; break; }
    if (d) { near = d; break; }
  }
  if (!near && related.some(sid => dropSections[sid])) near = 'aero.stall';
  const ch = near ? book.secs.get(near).chapter : null;
  // a part review chapter (gN) has no chapter-end "説明してみよう": its questions go to gN.review itself
  const own = written ? [written] : ch && /^g\d$/.test(ch) ? [`${ch}.review`] : ch ? [`written:${ch}`] : [];
  const to = [...new Set([...own, ...(qExtra[id] || [])])];
  const flags = [];
  if (/^<p>[^<]*<\/b>/.test(q.q) || /^<p>[^<]*<\/b>/.test(q.a)) flags.push('見出しが開きタグのない </b> で終わる（K.aero.K-1）');
  if (/問題 \d+〜\d+ では|見直してください|本文を閉じて|各解説の〔節番号〕/.test(strip(q.q))) flags.push('次の問題群の案内文・見直しの注意文が混入（K.overview.K1・K.aero.K-1）');
  rows.push({
    id, kind: 'question', chapter: c.id, title: clip(strip(q.q), 70),
    related, near, to, plan: 'written',
    reason: null,
    pool: qPool[c.id] || null, errata: qErrata[id] || [], flags,
    basis: qExtra[id] ? 'DESIGN 3.3・4.2' : 'DESIGN 4.2（問 → 本文節 → その行き先の章）',
    unit: ch ? unitForDest(`written:${ch}`) : 'W23', units: [...new Set(to.map(unitForDest))], ...blank,
  });
}

// ---- 3. figures ---------------------------------------------------------------------------------------------
// 3.3 names about 55 to redraw on the dark board; 4.2 names some it leaves out; the rest are left out with a reason
// (4.2 "残り約 105 点は理由を付けて使わない") — W03 classified them from the caption (basis says so); the figure units
// (W10・W21・W33・W43) confirm or pick one up (then the row gets a destination).
const FIG_OUT_42 = {
  'ch04-fig4-2': '重複する図（DESIGN 4.2。ピトー静圧の入力関係は `sys.g1000` の図で足りる）',
  'ch04-fig4-7': '重複する図（DESIGN 4.2。風と針路・航跡は `navb.wind` の図で扱う）',
  'ch07-fig7-5': '教科書の図の方が情報が多い。注意の文だけ移す（DESIGN 4.2）', 'ch07-fig7-6': '教科書の図の方が情報が多い。注意の文だけ移す（DESIGN 4.2）',
  'ch07-fig7-7': '教科書の図の方が情報が多い。注意の文だけ移す（DESIGN 4.2。消散期の注意は `wx.ts` の図に足す）', 'ch07-fig7-8': '教科書の図の方が情報が多い。注意の文だけ移す（DESIGN 4.2）',
  'ch08-fig8-1': '使わない（DESIGN 4.2。章の扉の概念図）', 'ch08-fig8-4': '誤解のおそれ：修正が足りない例と書いていない（DESIGN 4.2・3.3 `navb.wind`「図 8-4 は使わない」・K.navigation.K3）',
  'ch08-fig8-8': '使わない（DESIGN 4.2。ラジアルは `nav.vor` の図で扱う）', 'ch08-fig8-10': '使わない（DESIGN 4.2。GNSS は `nav.gps` で扱う）', 'ch08-fig8-12': '使わない（DESIGN 4.2。目的地変更は `nav.divert` で扱う）',
  'ch10-fig10-1': '総論の箱の図（DESIGN 4.2・K.human.K8。教科書の表と図で置き換え）', 'ch10-fig10-6': 'IMSAFE の箱の図（DESIGN 4.2・K.human.K8。教科書の表で置き換え）',
  'ch10-fig10-9': 'PAVE の箱の図（DESIGN 4.2・K.human.K8。教科書の表で置き換え）', 'ch10-fig10-11': 'TEM を一直線に描く図（誤解のおそれ。DESIGN 4.2・K.human.K2。教科書の図 tem で置き換え）',
};
const FIG_OUT_W03 = {
  'ch00-fig2': ['aero.axes', '三軸と回転は教科書の図（`aero.axes`）で扱う'],
  'ch00-fig3': ['aero.forces', '四つの力は `aero.forces` の図（ch01-fig12 を描き直す）で扱う'],
  'ch00-fig4': ['aero.aoa', '姿勢・経路・迎角は教科書の `aero.aoa` の図で扱う'],
  'ch01-fig2': ['aero.aoa', '迎角は教科書の `aero.aoa` の図と役割が重なる（式 α＝θ＋i−γ は本文で）'],
  'ch01-fig3': ['aero.lift', '揚力の二つの説明は教科書の `aero.lift` の図と役割が重なる'],
  'ch01-fig5': ['aero.aoa', 'CL−α の曲線は教科書の図と重複（旅客機中心の図の一部・教科書の図と重複：DESIGN 4.2）'],
  'ch01-fig6': ['aero.drag', '翼端渦は教科書の図・写真（vortex）と重複（DESIGN 4.2）'],
  'ch01-fig7': ['aero.drag', '抗力曲線は教科書の図 dragCurve と重複（DESIGN 4.2）'],
  'ch01-fig9': ['aero.ge', '地面効果は教科書の図と重複（DESIGN 4.2）'],
  'ch01-fig10': ['aero.turn', '旋回の力は `aero.turn` の図（ch01-fig11 を描き直す）と教科書の図で扱う'],
  'ch02-fig2': ['sys.airframe', '翼根の曲げの片持ち梁の模式図。`sys.airframe` は ch02-fig1 を描き直す'],
  'ch02-fig3': ['tsys.power', '操縦の指令と動力の比較図。`tsys.power` は ch02-fig5 を描き直す'],
  'ch02-fig4': ['sys.elec', '仮想の直流分配図。`sys.elec` は教科書の elecSystem（Archer の 28 V）で扱う'],
  'ch02-fig6': ['me.basics', '仮想の双発の燃料系統。クロスフィードは Seminole の図で扱う（K02.12 は本文へ）'],
  'ch02-fig7': ['me.sys', '引込脚の機能モデル。`me.sys` は ch13-fig13-9 を描き直す'],
  'ch02-fig8': ['tsys.power', 'アンチスキッドの機能モデル（輸送機の細部）。`tsys.power` は ch02-fig5 を使う'],
  'ch02-fig9': ['tsys.env', '空調の機能図（輸送機の細部）。DESIGN 4.2 は kiso02 の空調の細部を範囲外とする'],
  'ch02-fig10': ['tsys.env', '与圧の機能モデル（仮想の絶対圧）。本文の計算で足りる'],
  'ch02-fig11': ['inst.flow', 'センサーから表示への依存は `inst.flow` の図（ch04-fig4-1・4-8 を描き直す）で扱う'],
  'ch03-fig3-1': ['summary:sys', '章の扉の図（扉は学習目標だけを使う）'],
  'ch03-fig3-3': ['sys.piston', '過給は `sys.piston` の発展の折りたたみだけ（訓練機は自然吸気。DESIGN 3.3・3.6）'],
  'ch03-fig3-4': ['sys.engine', '始動と点火の経路は教科書の engineFlow の図で扱う'],
  'ch03-fig3-5': ['aero.left', 'ブレード角と迎角は教科書の図と役割が重なる（K01.25 冒頭を本文で）'],
  'ch04-fig4-9': ['nav.vor', 'コースからの偏位は教科書の CDI・HSI の図で扱う'],
  'ch04-fig4-12': ['wx.info', '気象画像の時間差の仮想例。NEXRAD の遅れは本文と表で扱う'],
  'ch05-fig5-2': ['wb.limits', '仮想機（kg・m）の模式図。合本は Archer の POH の数字で描く（K.wb-perf.K7）'],
  'ch05-fig5-3': ['perf.wbex', '仮想機の模式図。モーメントの計算は教科書の例①②③で扱う（K.wb-perf.K7）'],
  'ch05-fig5-4': ['wb.limits', '仮想機の重量の段階図。Archer のランプ・離陸・着陸の重量で描く（K.wb-perf.K7）'],
  'ch05-fig5-5': ['wb.limits', '仮想機の搭載配分図（K.wb-perf.K7）'],
  'ch05-fig5-6': ['wb.graph', '仮想機の包囲線（900〜1140 kg）。`wb.graph` は Archer の POH の Loading Graph で描く（K.wb-perf.K7）'],
  'ch05-fig5-7': ['tsys.wb', '%MAC の模式図。`tsys.wb` で新しく描くかは W32・W33 が決める'],
  'ch05-fig5-9': ['wb.shift', '燃料による重心移動は `wb.shift` の図（ch05-fig5-8 を描き直す）で扱う'],
  'ch05-fig5-10': ['perf.wb', '尾翼の下向き荷重（もっと深く）。使うなら記号 D を Ft に直して描き直す（K.wb-perf.K5）。3.3 は図を名指ししていない'],
  'ch05-fig5-11': ['perf.wb', '重心と縦の静安定の概念図（もっと深く）。本文と教科書の図で扱う'],
  'ch05-fig5-12': ['tsys.wb', '床の局所荷重（DESIGN 4.2：計量の手順・床荷重は短く）'],
  'ch06-fig6-1': ['summary:perf', '章の扉の図（扉は学習目標だけを使う）'],
  'ch06-fig6-2': ['perf.da', '密度高度の概算例。教科書の計算機 `da` と図で扱う'],
  'ch06-fig6-3': ['perf.da', '密度低下の影響の概念図。本文で扱う'],
  'ch06-fig6-4': ['ops.xwind', '風の成分の模式図。教科書の横風の図で扱う'],
  'ch06-fig6-5': ['perf.tol', '仮想機の離陸距離（圧力高度 2000 ft・20℃）。Archer の POH の表で描く（K.wb-perf.K7・K2：「気圧高度」）'],
  'ch06-fig6-6': ['perf.chart', '仮想機の補間の例。`perf.chart` は PHAK 図 11-15 型・Archer の POH で描く（DESIGN 3.3）'],
  'ch06-fig6-7': ['perf.climb', '上昇角と上昇率は教科書の図と役割が重なる（`perf.climb` は ch06-fig6-8 を描き直す）'],
  'ch06-fig6-10': ['nav.log', '降下の計算例。`nav.log` の表で扱う'],
  'ch06-fig6-11': ['emg.glide', '滑空距離の模式図。`emg.glide` の教科書の図で扱う'],
  'ch06-fig6-12': ['perf.tol', '接地速度と運動エネルギーの仮想例。本文の式と数（10% 速いと少なくとも 21%）で扱う'],
  'ch07-fig7-11': ['jwx.report', '学習用の電文の対応図。日本の METAR は `jwx.report` で新しく描く（NOSIG・RMK を足す：K.weather.K2）。描き直すかは W43'],
  'ch07-fig7-12': ['wx.taf', 'TAF の有効期間は教科書の図 tafTimeline（UTC・EDT・JST の 3 本に）で扱う'],
  'ch08-fig8-7': ['nav.dr', '位置の照合の概念図。教科書の `nav.dr` の図と写真 ch08-photo2 で扱う'],
  'ch08-fig8-11': ['nav.log', '航法記録の整理図。教科書の航法ログで扱う'],
  'ch11-fig11-1': ['door:p2', '章の扉の図（扉は学習目標だけを使う）'],
  'ch11-fig11-2': ['ground.walk', '外部点検の概念図。教科書の外部点検の図で扱う'],
  'ch11-fig11-3': ['ops.sl', '外部目標と計器の照合の概念図。教科書の図で扱う'],
  'ch11-fig11-4': ['ops.trim', '姿勢と出力の概念図。教科書の図で扱う'],
  'ch11-fig11-6': ['aero.turn', 'バンクと揚力の成分は `aero.turn` の図で扱う'],
  'ch11-fig11-8': ['ops.takeoff', '離陸の流れの概念図。教科書の図で扱う'],
  'ch11-fig11-10': ['ops.pattern', '場周経路は教科書の図で扱う（入り方の別法は本文）'],
  'ch11-fig11-11': ['ops.landing', '安定進入の条件の箱の図。教科書の表で扱う'],
  'ch11-fig11-12': ['ops.goaround', '復行の流れの概念図。教科書の図で扱う'],
  'ch10-fig10-4': ['hf.body', '感覚の不一致の概念図。教科書の図 vestibular で扱う'],
};
const BOX = '概念の箱の図（DESIGN 4.2：kiso09「概念の箱の図（約 10）」）。日本の空域の断面図・VMC の図などは第 7 部で新しく描く（W43）';
for (let n = 1; n <= 12; n++) FIG_OUT_W03[`ch09-fig9-${n}`] = [null, BOX];
for (const n of [1, 2, 3, 4, 5, 6, 8, 9, 10, 12]) FIG_OUT_W03[`ch12-fig12-${n}`] = [null, n === 1 ? '章の扉の図（扉は学習目標だけを使う）' : '教科書の図と重複（DESIGN 4.2：kiso12「図 9 点（教科書の図と重複）」）'];
for (const n of [1, 3, 4, 6, 7, 8, 10, 11, 12]) FIG_OUT_W03[`ch13-fig13-${n}`] = [null, n === 1 ? '章の扉の図（扉は学習目標だけを使う）' : '文字の箱の図・概念図（DESIGN 4.2：kiso13「文字の箱の図 5 点」）。片発の考え方は教科書の図と本文で扱う'];

const figRows = [];
for (const c of K.chapters) for (const f of c.figures) {
  const home = c.sections.find(s => s.html.includes(`data-fig="${f.id}"`));
  const ds = [...(figDest.get(f.id) || [])];
  const w03 = FIG_OUT_W03[f.id];
  const reason = ds.length ? null : FIG_OUT_42[f.id] || (w03 ? w03[1] : null);
  const near = ds[0] || (w03 && w03[0]) || null;
  figRows.push({
    id: f.id, kind: 'figure', chapter: c.id, title: clip(strip(f.caption), 70), home: home ? home.id : null,
    to: ds, plan: ds.length ? 'redraw' : 'drop', reason, near: ds.length ? null : near,
    basis: ds.length ? 'DESIGN 3.3' : FIG_OUT_42[f.id] ? 'DESIGN 4.2' : 'W03 の分類（DESIGN 4.2「残り約 105 点は理由を付けて使わない」に従い、キャプションと行き先の節から）。図の単位が確かめる',
    unit: unitForFigure(ds[0] || near), ...blank,
  });
}
rows.push(...figRows);

// ---- 4. photos: DESIGN 4.2's table (52 use, 4 conditional, 29 not) ------------------------------------------
const pt = {};
for (const line of designText().split('\n')) {
  const m = line.match(/^\s*\|\s*(使う|条件つき|使わない)（(\d+)）\s*\|(.*)\|\s*$/);
  if (m) pt[m[1]] = m[3];
}
const usePh = new Map(), condPh = new Map(), notPh = new Map();
for (const m of pt['使う'].matchAll(/(ch\d\d-photo\d+)\s*→\s*`([^`]+)`(?:\s*の差し替え（`([^`]+)`）)?/g)) usePh.set(m[1], m[1] === 'ch09-photo4' ? { to: 'comm.mistakes', note: '教科書の写真 `holdShort` の差し替え（ID は holdShort のまま。教科書の版が切り抜かれていなければ教科書の版を残し、ch09-photo4 は使わない。DESIGN 4.2 重複 3 組）' } : { to: m[2] });
for (const seg of pt['条件つき'].split(/、/)) {
  const cond = (seg.match(/（([^）]*)）/) || [])[1] || '';
  for (const m of seg.matchAll(/(ch\d\d-photo\d+)\s*→\s*`([^`]+)`/g)) condPh.set(m[1], { to: m[2], cond });
}
const condText = { 'ch09-photo2': '顔がはっきり写っていないことを元の画像で確かめる。だめなら使わない' };
for (const id of condPh.keys()) condPh.get(id).cond = condText[id] || '旅客機の塗装・ロゴが目立たないことを元の画像で確かめる。だめなら使わない';
for (const seg of pt['使わない'].split('／')) {
  const [cat, list] = seg.includes('：') ? [seg.slice(0, seg.indexOf('：')), seg.slice(seg.indexOf('：') + 1)] : ['', seg];
  for (const m of list.matchAll(/(ch\d\d-photo\d+)(?:（([^）]*)）)?/g)) notPh.set(m[1], `${cat.trim()}${m[2] ? '：' + m[2] : ''}（DESIGN 4.2）`);
}
for (const c of K.chapters) for (const p of c.photos) {
  const home = c.sections.find(s => s.html.includes(`data-photo="${p.id}"`));
  const u = usePh.get(p.id), cd = condPh.get(p.id), no = notPh.get(p.id);
  const to = u ? [u.to] : cd ? [cd.to] : [];
  rows.push({
    id: p.id, kind: 'photo', chapter: c.id, title: clip(strip(p.caption), 70), home: home ? home.id : null,
    credit: strip(p.credit), annotated: /注記/.test(p.credit),
    to, plan: u ? 'use-file' : cd ? 'conditional' : 'drop', reason: no || null, condition: cd ? cd.cond : null,
    creditFix: (u || cd) && /注記/.test(p.credit) ? `クレジットの「${(p.credit.match(/注記[^。／]*/) || [''])[0]}」を「注記はパイロット基礎教材（第 3 版）で追加」に書き換える（合本の中で「本書」が合本を指さないように。DESIGN 4.2）` : null,
    basis: 'DESIGN 4.2（写真の表）',
    unit: unitForPhoto(to[0] || null), ...blank, note: u && u.note ? u.note : '',
  });
}

// ---- check and write ----------------------------------------------------------------------------------------
const kinds = ['section', 'question', 'figure', 'photo'];
const count = Object.fromEntries(kinds.map(k => [k, rows.filter(r => r.kind === k).length]));
const unplaced = rows.filter(r => !r.to.length && !r.reason);
const unknownDest = rows.flatMap(r => r.to.filter(d => d.includes('.') && !d.includes(':') && !book.secs.has(d)).map(d => `${r.id}→${d}`));
const out = {
  ledger: 'PROVENANCE', version: 1, updated: DATE, by: 'W03',
  about: '基礎教材 第 3 版（flight-lab/kiso/data/kiso00〜13.json、原本は変えない）の 393 節（章の扉 14・導入 3 を含む）・376 問・161 図・85 写真の、合本での行き先か外した理由（DESIGN 3.3・3.2・4.2・基準 11）。1 つの ID に 1 行。行き先は複数でよい。形と状態は README.md',
  counts: { ...count, rows: rows.length, placed: rows.filter(r => r.to.length).length, dropped: rows.filter(r => !r.to.length).length },
  plans: PLANS,
  destinations: '行き先の書き方：節 ID（例 wb.shift。DESIGN 3.3 の目次の節）／door:pN（部の扉）／summary:<章ID>（章のねらい）／written:<章ID>（章末の説明してみよう・課題）',
  rows,
};
console.log(JSON.stringify(out.counts), 'unplaced', unplaced.map(r => r.id).join(' ') || 0, 'unknown destinations', unknownDest.join(' ') || 0);
console.log('sections by plan', JSON.stringify(rows.filter(r => r.kind === 'section').reduce((a, r) => ((a[r.plan] = (a[r.plan] || 0) + 1), a), {})));
console.log('figures by plan', JSON.stringify(figRows.reduce((a, r) => ((a[r.plan] = (a[r.plan] || 0) + 1), a), {})), 'photos', JSON.stringify(rows.filter(r => r.kind === 'photo').reduce((a, r) => ((a[r.plan] = (a[r.plan] || 0) + 1), a), {})));
export const PROVENANCE = out;
if (import.meta.url === `file://${process.argv[1]}`) writeLedger(OUT, out);
