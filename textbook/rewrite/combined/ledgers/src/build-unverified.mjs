// ledgers/src/build-unverified.mjs — W03 bootstrap of UNVERIFIED.json: the things DESIGN says not to fill by guessing
// (3.4「推測で埋めないもの」) and every other〔要確認〕of DESIGN (3.3, 3.4's 47 items, 3.5, 2.1, 5 章の基準 19, 10). Until a
// row is resolved, the book writes the point with the〔要確認〕tag or does not write it (DESIGN 1.1・3.4・6.2).
// The rows marked owner:true are the ones DESIGN 9 (decision 7) asks the owner to check before R4.
//   node build-unverified.mjs [--write [--force]]
import path from 'node:path';
import { LEDGERS, jurItems } from './design.mjs';
import { DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const OUT = path.join(LEDGERS, 'UNVERIFIED.json');
const JUR = new Map(jurItems().map(x => [x.id, x]));
const AIP = 'AIP Japan（国土交通省 航空局。閲覧に登録が要る）';
// [id, item, what DESIGN says now (provisional), sections, jur items, primary source to check, owner (decision 7), unit, basis]
const U = [
  ['U.hold-speed-japan', '日本国内での待機速度とバンク', 'ICAO（速度・バンクは〔要確認〕）。時間・入り方・風の考え方は同じ（3.4 hold）', ['ifr.hold', 'jifr.hold'], ['hold'], `${AIP} ENR 1.5`, true, 'W37', 'DESIGN 3.4（推測で埋めないもの・hold）・3.3 jifr.hold・9 判断 7'],
  ['U.vfr-squawk', 'VFR のトランスポンダーのコード（日本）', 'AIP Japan で〔要確認〕（3.4 xpdr）', ['comm.xpdr', 'jatc.radar'], ['xpdr'], `${AIP}（ENR 1.6 など）`, true, 'W37', 'DESIGN 3.4・3.3 jatc.radar・9 判断 7'],
  ['U.qnh-unit', '管制・ATIS で QNH を言う単位（日本）', 'METAR は Q（hPa）と RMK の A（inHg）。管制・ATIS で言う単位は〔要確認〕（3.4 alt.unit）', ['inst.alt', 'wx.metar', 'jatc.phrase', 'basics.alt'], ['alt.unit'], `${AIP} GEN 2.1・ENR 1.5・管制方式基準`, true, 'W37', 'DESIGN 3.4・3.3 jatc.phrase・10.2 law kiso09.17・9 判断 7'],
  ['U.readback-japan', '日本の復唱要領（必ず復唱する項目）', 'ICAO・日本：コード・規正値・周波数・速度も。滑走路に関わる指示は全部（ENR 1.5 は〔要確認〕）（3.4 readback）', ['comm.readback', 'comm.icao', 'jatc.phrase'], ['readback'], `${AIP} ENR 1.5-8（復唱要領）`, true, 'W37', 'DESIGN 3.4・9 判断 7・JCAB 出題範囲（復唱要領 ENR 1.5-8）'],
  ['U.alternate-minima', '代替飛行場の最低気象条件の基準（日本）', 'ENR 1.10 は〔要確認〕（3.3 jifr.minima）', ['jifr.minima'], [], `${AIP} ENR 1.10・運航規程審査要領`, false, 'W37', 'DESIGN 3.4・3.3 jifr.minima'],
  ['U.nordo-time', '施行規則第 206 条の「大臣が定める時間」（IFR の通信途絶）', '承認の航路、故障前の指示と最低高度の高い方を決められた時間（「大臣が定める時間」は〔要確認〕）（3.4 nordo.ifr）', ['ifr.rules', 'jifr.rules', 'jatc.emerg'], ['nordo.ifr'], 'e-Gov 航空法施行規則第 206 条と関係の告示・AIP Japan ENR 1.5', false, 'W37', 'DESIGN 3.4'],
  ['U.oxygen-japan', '日本の酸素の規則（14 CFR 91.211 に当たるもの）', '施行規則に相当の条文が見当たらない〔要確認〕（3.4 oxygen）', ['hf.altitude', 'jlaw.pic'], ['oxygen'], 'e-Gov 航空法・施行規則（装備・運航の条文）、耐空性審査要領', false, 'W37', 'DESIGN 3.4・3.3 jlaw.pic'],
  ['U.adsb-japan', 'ADS-B Out の義務（日本）', '〔要確認〕（3.4 adsb）', ['nav.efb', 'jatc.radar'], ['adsb'], 'e-Gov 施行規則第 147 条ほか・AIP Japan GEN 1.5', false, 'W37', 'DESIGN 3.4・3.3 nav.efb'],
  ['U.icao-class', '日本の空域と ICAO の空域のクラスの対応', 'AIP の空域の分類（ICAO のクラスとの対応は〔要確認〕）（3.3 jair.airspace）', ['jair.airspace', 'law.airspace'], [], `${AIP} ENR 1.4`, false, 'W37', 'DESIGN 3.4・3.3 jair.airspace'],
  ['U.check-standards', '操縦士実地試験実施細則の科目と許容幅', 'JCAB の実地試験の科目と許容幅と ACS の対照（細則で確かめるまで〔要確認〕）（3.3 jexam.check・3.6）', ['jexam.check', 'ops.slow', 'ops.stall', 'ops.short', 'ifr.scan'], ['check.slow', 'check.stall', 'check.short', 'check.basic'], '国土交通省「操縦士実地試験実施細則」（最新の版と附属書）', true, 'W37', 'DESIGN 3.4・3.6・2.1・9 判断 7'],
  ['U.check-slow', '実地試験：低速飛行（日本の許容幅）', '操縦可能な最小速度・±50 ft〔要確認〕（3.4 check.slow）', ['ops.slow', 'jexam.check'], ['check.slow'], '操縦士実地試験実施細則', true, 'W37', 'DESIGN 3.4'],
  ['U.check-stall', '実地試験：失速（日本の組み合わせと回復の基準）', '失速の組み合わせと回復の基準が違う〔要確認〕（3.4 check.stall）', ['ops.stall', 'jexam.check'], ['check.stall'], '操縦士実地試験実施細則', true, 'W37', 'DESIGN 3.4'],
  ['U.check-short', '実地試験：短距離離陸（日本）', 'Vx で浮揚し 200 ft まで Vx〔要確認〕（3.4 check.short）', ['ops.short', 'jexam.check'], ['check.short'], '操縦士実地試験実施細則', true, 'W37', 'DESIGN 3.4'],
  ['U.check-basic', '実地試験：基本計器飛行（日本の許容幅）', '±100 ft・±10°〔要確認〕（3.4 check.basic）', ['ifr.scan', 'jexam.check'], ['check.basic'], '操縦士実地試験実施細則', true, 'W37', 'DESIGN 3.4'],
  ['U.seminole-poh', 'Seminole（PA-44-180）の POH の片発性能と系統', '片発上昇率 約 212 fpm・片発実用上昇限度 約 4,100 ft は参考値（二次資料）。POH 第 5・7 章で確かめるまで「参考値（二次資料）」（3.3 me.perf・me.sys、10.1 multi T-3）', ['me.perf', 'me.sys'], ['multi.rating'], 'Piper PA-44-180 Seminole POH（Section 5・7）', true, 'W31', 'DESIGN 3.4・3.3・5 章の基準 6・9 判断 7'],
  ['U.haneda-report', '2024 年 1 月 2 日の羽田空港の滑走路上の衝突：運輸安全委員会の報告の段階', '公式の報告だけを出典にし、報告の段階と確認日を書く。報告を超えて原因を断定しない（3.3 jatc.case）', ['jatc.case'], [], '運輸安全委員会（JTSB）の公表資料（経過報告・調査報告書）', false, 'W39', 'DESIGN 3.4・3.3 jatc.case'],
  ['U.ana-procedure', 'ANA の手続きと JCAB 学科の受験の時期', '学科の時期は未公表（2.1）。ANA への当てはめは bk.est［推測］', ['intro.japan', 'intro.exams', 'jexam.plan'], [], 'ANA の公開情報（訓練の説明）', false, 'W10', 'DESIGN 3.4・2.1・2.7'],
  ['U.ana-jcab-route', 'ANA の訓練生は JCAB の資格を指定養成で直接取るか', '推測・高（2.1）。intro.japan で bk.est と書く', ['intro.japan'], [], '国土交通省の指定養成施設の資料・ANA の公開情報', false, 'W10', 'DESIGN 2.1・3.3 intro.japan'],
  ['U.jcab-exam-language', 'JCAB 学科を日本語で受けるか', '推測・中〜高（2.1）', ['intro.exams', 'jexam.plan'], [], '国土交通省 航空従事者学科試験の案内（事務処理要領）', false, 'W10', 'DESIGN 2.1'],
  ['U.faa-written', 'ANA の訓練生が FAA の学科試験（PAR・IRA・CAX）を受けるか', '未確認（2.1）。FAA の学科の合格（70%）を前提に書かない', ['intro.exams'], [], 'ANA・訓練校（Acron Aviation）の公開情報', false, 'W10', 'DESIGN 3.4・2.1・ACS-MAP'],
  ['U.us-student-cert', '米国の空で学生操縦士の証明（FAA）が要るか', '推測・中（2.1）', ['intro.exams', 'solo.req'], ['solo'], '14 CFR 61.83・61.87・訓練校の公開情報', false, 'W10', 'DESIGN 2.1'],
  ['U.london-icao', 'ロンドンの座学が英国（ICAO）の書き方（METAR・交信・つづり）を使うか', '座学が英国の書き方を使うかは〔要確認〕（3.3 en.class・wx.metar・comm.icao）', ['en.class', 'wx.metar', 'comm.icao'], ['metar.taf', 'words'], 'ANA・訓練校の公開情報、英国 CAA CAP 413', false, 'W10', 'DESIGN 3.4・2.1・3.3'],
  ['U.jcab-20q70', 'JCAB 学科の「1 科目 20 問・70%」', '個人サイトの情報で〔要確認〕（3.3 jexam.plan、5 章の基準 19）', ['jexam.plan', 'quiz-jcab.js'], [], '国土交通省 航空従事者学科試験の案内・試験の実施要領', false, 'W37', 'DESIGN 3.4・3.3・基準 19'],
  ['U.airworthiness-categories', '日本の耐空類別の正確な名前', '日本の耐空類別は〔要確認〕で耐空性審査要領を確かめる（3.3 aero.struct）', ['aero.struct', 'jlaw.aircraft'], [], '耐空性審査要領・施行規則（耐空類別）', false, 'W37', 'DESIGN 3.4・3.3 aero.struct'],
  ['U.docs-article', '機内の書類の条番号（施行規則）', '第 59 条・施行規則（条番号は〔要確認〕：第 144 条か第 144 条の 2）（3.4 docs）', ['law.aircraft', 'ground.walk', 'jlaw.aircraft'], ['docs'], 'e-Gov 航空法第 59 条・施行規則第 144 条・第 144 条の 2', false, 'W05', 'DESIGN 3.4'],
  ['U.o360-pdself', 'O-360 の写真（教科書 lycoming・基礎教材 ch03-photo1）のライセンス PD-self', '元のページで再確認（4.2・10.1 systems T1）', ['sys.engine'], [], 'Wikimedia Commons の元のファイルページ', false, 'W22', 'DESIGN 3.4・4.2・10.1'],
  ['U.light-japan', '灯火信号の日本の扱い', 'ICAO：飛行中の白の点滅＝着陸してエプロンへ。赤と緑の交互はない（日本の扱いは〔要確認〕）（3.4 light）', ['comm.nordo', 'jatc.emerg', 'jatc.ad'], ['light'], `${AIP}（AD・ENR の可視信号）・施行規則`, false, 'W37', 'DESIGN 3.4 light'],
  ['U.cbt-past-papers', 'CBT 化の前に国土交通省が公開していた学科試験の問題：公開の有無・期・利用の条件', '〔要確認〕。物差しにした資料は JCAB-CALIBRATION.json に記録し、本文と問題には書かない（5 章の基準 19）', ['quiz-jcab.js'], [], '国土交通省 航空局の公開資料（過去の学科試験問題）', false, 'W37', 'DESIGN 5 章の基準 19・7.2 W37'],
  ['U.ac61-136', 'AC 61-136 の現行版（教科書 sim.can・出典）', 'FAA の一覧で確かめる（10.1 overview T2）', ['sim.can'], [], 'FAA Advisory Circulars の一覧', false, 'W10', 'DESIGN 10.1 overview T2'],
  ['U.jcab-term-names', 'JCAB の表記が分からない用語（最小操縦速度／最低操縦速度、加速継続距離／加速続行距離 など）', '耐空性審査要領などで確かめてから決める（3.5）', ['me.vmc', 'me.perf'], [], '耐空性審査要領・JCAB 出題範囲参考・学科試験の用語', false, 'W04', 'DESIGN 3.5'],
  ['U.egov-version', 'e-Gov の版の固定（航空法・航空法施行規則）', '例：航空法は令和 7 年 12 月 1 日施行の版、施行規則は令和 8 年 10 月 1 日施行の版。版は作業の最初に e-Gov で確かめて固定する（3.4）', ['（日本の条文を引く全部の節）'], [], 'e-Gov 法令検索（航空法・航空法施行規則）', false, 'W05', 'DESIGN 3.4・5 章の基準 4'],
];
const rows = U.map(([id, item, says, sections, jur, source, owner, unit, basis]) => {
  for (const j of jur) if (!JUR.has(j)) throw new Error(`unknown jur ${j} in ${id}`);
  return {
    id, item, says, sections, jur, source, owner, unit, basis,
    rule: '確かめるまで〔要確認〕の札で書くか、書かない。数字を推測で埋めない（DESIGN 1.1・3.4）',
    status: 'open', value: null, sourceUrl: null, checkedOn: null, by: null, checkedBy: null, note: '',
  };
});
const ids = new Set(); for (const r of rows) { if (ids.has(r.id)) throw new Error('dup ' + r.id); ids.add(r.id); }
// every 47-item marked〔要確認〕in DESIGN 3.4 must have a row
const jurUnverified = [...JUR.values()].filter(x => x.unverified).map(x => x.id);
const covered = new Set(rows.flatMap(r => r.jur));
const notCovered = jurUnverified.filter(x => !covered.has(x));
if (notCovered.length) { console.error('47 items with 〔要確認〕 not in a row:', notCovered.join(' ')); process.exitCode = 1; }
const out = {
  ledger: 'UNVERIFIED', version: 1, updated: DATE, by: 'W03',
  about: '一次資料で確かめるまで事実として書かないもの（DESIGN 3.4「推測で埋めないもの」とほかの〔要確認〕）。owner:true は所有者に確かめてもらう候補（DESIGN 9 の判断 7。R4 の前に渡す）。解決したら value・sourceUrl・checkedOn・by・checkedBy を書いて status を resolved に（README.md）',
  counts: { rows: rows.length, owner: rows.filter(r => r.owner).length, jurItemsWithTag: jurUnverified.length },
  rows,
};
console.log(JSON.stringify(out.counts));
export const UNVERIFIED = out;
if (import.meta.url === `file://${process.argv[1]}`) writeLedger(OUT, out);
