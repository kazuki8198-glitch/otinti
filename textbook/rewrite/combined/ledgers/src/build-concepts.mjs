// ledgers/src/build-concepts.mjs — W03 bootstrap of CONCEPTS.json (DESIGN 3.2「1 つの概念に住所は 1 つ」, 5 章の基準 15):
// concept → its address (the one section with the full explanation and the bold definition) → the sections that recall
// it (a「思い出そう」box of 3 lines or fewer with a link). Rows: the known pairs of DESIGN 3.2, the other addresses and
// recalls DESIGN 3.3 and appendix A name ("…の住所", "…を 3 行で"), and the "必ず区別するもの" of 3.5 (kind:distinguish:
// two concepts with one address each, kept apart by name).  Also writes the empty frames JCAB-CALIBRATION.json and
// CLAIMS.json.   node build-concepts.mjs [--write [--force]]
import path from 'node:path';
import { LEDGERS, plannedBook } from './design.mjs';
import { unitForDest, DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const BOOK = plannedBook();
// [id, name, address, recalls, max lines of a recall, basis]
const PAIRS = [
  ['C.pitot-static-blockage', 'ピトー静圧の詰まりの表', 'sys.g1000', ['ifr.instr'], 2, 'DESIGN 3.2 既知の対・3.3 ifr.instr「詰まりの表は sys.g1000 を 2 行で」'],
  ['C.compass-errors', 'コンパスの誤差', 'sys.compass', ['ifr.partial'], 3, 'DESIGN 3.2 既知の対'],
  ['C.altimeter-errors', '高度計の誤差', 'inst.alt', ['wx.atm'], 3, 'DESIGN 3.2 既知の対・3.3 inst.alt（高度計の誤差の住所）・wx.atm「高度計の誤差は inst.alt を 3 行で」'],
  ['C.wind-triangle', '風の三角形', 'navb.wind', ['nav.plan', 'basics.speed'], 3, 'DESIGN 3.2 既知の対・3.3 navb.wind（風の三角形の住所）・nav.plan「風の原理は navb.wind を 3 行で」'],
  ['C.control-handover', '操縦の受け渡し', 'ground.crew', ['crm.pm'], 2, 'DESIGN 3.2 既知の対・3.3 ground.crew（住所をここへ）・crm.pm「受け渡しは ground.crew を 2 行で」'],
  ['C.tem-words', 'TEM の言葉', 'crm.tem', ['adm.risk', 'ifr.case'], 3, 'DESIGN 3.2 既知の対'],
  ['C.flight-rules-conditions', 'VFR/IFR と VMC/IMC', 'basics.rules', ['law.basis'], 3, 'DESIGN 3.2 既知の対'],
  ['C.personal-minimums', '個人の最低基準', 'adm.risk', ['wx.brief'], 3, 'DESIGN 3.2 既知の対'],
  ['C.autopilot-modes', '自動操縦のモード', 'inst.ap', ['ifr.auto', 'crm.auto'], 3, 'DESIGN 3.2 既知の対・3.3 ifr.auto「基礎は inst.ap を 3 行で」'],
  ['C.wake-turbulence', '後方乱気流', 'ops.wake', ['hf.vision'], 1, 'DESIGN 3.2 既知の対・3.3 hf.vision「後方乱気流の段落は ops.wake へ（ここは 1 行の案内）」'],
  ['C.spatial-disorientation', '空間識失調', 'hf.body', ['emg.imc', 'ifr.scan'], 3, 'DESIGN 3.2 既知の対'],
  ['C.night-vision', '夜の目', 'hf.vision', ['ops.night'], 3, 'DESIGN 3.2 既知の対'],
  ['C.surprise-startle', '驚きと驚愕', 'adm.review', ['crm.upset', 'ifr.upset'], 3, 'DESIGN 3.2 既知の対・3.3 ifr.upset「驚きと驚愕の基礎は adm.review を 3 行で」'],
  ['C.speed-kinds', '速度の種類（IAS・TAS・GS）', 'basics.speed', ['perf.tol'], 3, 'DESIGN 3.3 perf.tol「速度の区別は basics.speed を 3 行で」'],
  ['C.density-altitude', '密度高度', 'perf.da', ['basics.alt'], 1, 'DESIGN 付録 A「密度高度の住所は perf.da。ここは 1 行で区別だけ」'],
  ['C.time', '時刻（UTC・EST/EDT・JST）と方位の基準', 'basics.time', [], 3, 'DESIGN 3.3 basics.time（time の住所）。呼び戻す節は設計に名指しがない'],
  ['C.cg-performance', '重心の位置が性能に与える影響', 'perf.wb', ['perf.chart'], 3, 'DESIGN 3.3 perf.chart「重心の影響は perf.wb の囲み」'],
];
// DESIGN 3.5 "必ず区別するもの": two names that must not be mixed; each keeps one address
const DISTINCT = [
  ['C.vmc-speed-vs-vmc', 'V<sub>MC</sub>（最小操縦速度）と VMC（有視界気象状態）', [['最小操縦速度（V<sub>MC</sub>。本文に「Vmc とも書く」を残す）', 'me.vmc'], ['有視界気象状態（VMC）', 'basics.rules']]],
  ['C.pressure-altitude', '気圧高度（「圧力高度」は使わない）', [['気圧高度（pressure altitude）', 'basics.alt']]],
  ['C.notam-vs-ais', 'ノータム（NOTAM）と航空情報（AIP・NOTAM などの総称）', [['ノータム（NOTAM）', 'law.special'], ['航空情報', 'jair.ais']]],
  ['C.pic-vs-captain', '機長（PIC）とキャプテン（職位）・PF と PM', [['機長（PIC）・職位・PF/PM の 3 層', 'basics.crew']]],
  ['C.ceiling-vs-cloudbase', '雲高（シーリング）と雲底', [['雲高（シーリング）', 'wx.metar'], ['雲底', 'wx.cloud']]],
  ['C.weight-units', '重量（実務では lb・kg）', [['重量（Weight）', 'aero.forces'], ['単位と換算', 'basics.units']]],
];
const rows = [];
for (const [id, name, address, recalls, lines, basis] of PAIRS) rows.push({ id, kind: 'address', name, address, recalls, maxLines: lines, basis, unit: unitForDest(address), recallUnits: [...new Set(recalls.map(unitForDest))], status: 'open', where: null, by: null, checkedBy: null, note: '' });
for (const [id, name, pairs] of DISTINCT) rows.push({ id, kind: 'distinguish', name, address: pairs[0][1], recalls: [], distinct: pairs.map(([term, at]) => ({ term, address: at })), maxLines: null, basis: 'DESIGN 3.5「必ず区別するもの」', unit: unitForDest(pairs[0][1]), recallUnits: [], status: 'open', where: null, by: null, checkedBy: null, note: '用語の表（FL.terms・W04）でも区別する' });
const bad = rows.flatMap(r => [r.address, ...r.recalls, ...(r.distinct || []).map(d => d.address)].filter(s => !BOOK.secs.has(s)).map(s => `${r.id}:${s}`));
if (bad.length) { console.error('unknown sections', bad.join(' ')); process.exitCode = 1; }
const out = {
  ledger: 'CONCEPTS', version: 1, updated: DATE, by: 'W03',
  about: '1 つの概念に住所は 1 つ（DESIGN 3.2・5 章の基準 15）。address の節に完全な説明と太字の定義（<b>語（English）</b>）を 1 回だけ。recalls の節は「思い出そう」（maxLines 行以内）で address へリンクする。kind:distinguish は 3.5 の「必ず区別するもの」。行は増やしてよい（README.md）',
  counts: { rows: rows.length, address: rows.filter(r => r.kind === 'address').length, distinguish: rows.filter(r => r.kind === 'distinguish').length },
  rows,
};
console.log(JSON.stringify(out.counts));
if (import.meta.url === `file://${process.argv[1]}`) {
  writeLedger(path.join(LEDGERS, 'CONCEPTS.json'), out);
  writeLedger(path.join(LEDGERS, 'JCAB-CALIBRATION.json'), {
    ledger: 'JCAB-CALIBRATION', version: 1, updated: DATE, by: 'W03',
    about: 'JCAB 形式の問題の水準の物差し（DESIGN 5 章の基準 19）。CBT 化の前に国土交通省が公開していた学科試験の問題で、形式・難しさ・論点の分布だけを測る。問題文は写さない。資料の公開の有無・期・利用の条件は W37 が確かめる（UNVERIFIED.json U.cbt-past-papers）。本文と問題には書かない。手に入らなければ「見出しごとに 2 問以上・計算問題 2 割以上」を目安にし、その旨を 1 行書く',
    format: { id: 'CAL.<科目>.<期>（例 CAL.jlaw.2019-07）', subject: 'JCAB の科目（航空工学・航空気象・空中航法・航空通信・航空法規・計器飛行一般）', source: '「形式の参考：国土交通省 航空従事者学科試験（○年○月期）」と URL', terms: '利用の条件（確かめた文と確認日）', measured: '{ questions, minutes, calcShare, perHeading: { JCAB-MAP の id: 問の数 } }', note: '問題文は写さない', by: '記録した単位', checkedBy: '確かめ役' },
    rows: [],
  });
  writeLedger(path.join(LEDGERS, 'CLAIMS.json'), {
    ledger: 'CLAIMS', version: 1, updated: DATE, by: 'W03',
    about: '主張の台帳（DESIGN 5 章の基準 3）。書き直した文と新しい文のうち、数字と単位・条番号・14 CFR・AIM・航空法を含む文に出典の札を付ける。行は check-claims.mjs（W01）が抜き出す主張の id で書く。執筆の単位が足し、書いた人と別の確認役が一次資料で確かめる。札のない未確認の主張をゼロにする',
    format: { id: '<節ID>#<文を正規化した sha1 の先頭 8 桁>（check-claims.mjs の claimId）', sec: '節 ID', text: '文', tag: '教材値／参考値／条文／推測・要確認', source: '出典（参考値は資料名と場所、条文は法令名・条番号・e-Gov の版と確認日）', by: '書いた単位', checkedBy: '確かめた人（書いた人と別）', checkedOn: '確認日' },
    rows: [],
  });
}
