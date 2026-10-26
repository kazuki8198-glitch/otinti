// ledgers/src/build-errata.mjs — W03 bootstrap of ERRATA.json: every row of DESIGN 10.1 (the textbook, 79), 10.2 (the
// basic course, 53), 10.3 (the app and data, 15 — one row split in two) and 10.5 (the textbook vs the lessons and the
// game, 5), each with a stable id, the place, the problem, the correction the report proposes, the report's place and
// the primary sources it names, the confidence, the safety flag, the unit that will close it (DESIGN 7.2) and
// status "open". The corrections are the reports' proposals: DESIGN 10 says they are made only after the fixer checks
// the primary source ("直すのは作るときに一次資料で確かめてから"), so every row starts with verified:false.
//   node build-errata.mjs [--write [--force]]
import path from 'node:path';
import { LEDGERS, sectionText, tableRows, ticks } from './design.mjs';
import { reportErrata, REPORT_FILE } from './reports.mjs';
import { DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const OUT = path.join(LEDGERS, 'ERRATA.json');
const R = reportErrata();
const conf = s => (String(s).match(/[高中低]/) || [null])[0];
const CONF = { 高: 'high', 中: 'mid', 低: 'low' };
const slug = s => s.replace(/[（）()\s]/g, '').replace(/\./g, '-').replace(/不足/, 'gap-');

// --- the unit that closes each row (DESIGN 7.2): textbook rows by the part of the book they are in (W07a: part 1,
// W07b: parts 2-3, W07c: parts 4-6, W10: 序部), basic-course rows by the unit that rewrites the destination section
// (and W11 writes all 53 into ERRATA-FOR-WORD.md and lays the safety/Japan-law ones over the original's page).
const UNIT = {
  'T.overview.T1': ['W07c'], 'T.overview.T2': ['W10'], 'T.overview.T3': ['W07c'],
  ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`T.aero.T-${i + 1}`, ['W07a']])),
  ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`T.systems.T${i + 1}`, ['W07a']])),
  'T.systems.T1': ['W07a', 'W22'],
  'T.instruments.E-T1': ['W07a'], 'T.instruments.E-T2': ['W07a', 'W07c'], 'T.instruments.E-T3': ['W07a'], 'T.instruments.E-T4': ['W07c'],
  'T.wb-perf.T1': ['W07a'], 'T.wb-perf.T2': ['W07a'], 'T.wb-perf.T3': ['W07a'], 'T.wb-perf.T4': ['W07a'], 'T.wb-perf.T5': ['W07a'], 'T.wb-perf.T6': ['W07b'],
  ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`T.weather.T${i + 1}`, ['W07a']])),
  'T.navigation.T1': ['W07b'], 'T.navigation.T2': ['W07b'], 'T.navigation.T3': ['W07b'],
  'T.law.q_radio': ['W07a'], 'T.law.comm-option': ['W07a'], 'T.law.law-special': ['W07a'], 'T.law.comm-mayday': ['W07a'], 'T.law.comm-icao': ['W07a'],
  ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`T.human.T${i + 1}`, ['W07a']])),
  'T.human.T8': ['W28', 'W07a'], 'T.human.T10': ['W07c'], 'T.human.T11': ['W07c'],
  'T.vfr.E1': ['W07b'], 'T.vfr.E2': ['W07b'],
  'T.ifr.E-T1': ['W07c'], 'T.ifr.E-T2': ['W07c'], 'T.ifr.E-T3': ['W07c'], 'T.ifr.E-T4': ['W07c'], 'T.ifr.E-T5': ['W30'], 'T.ifr.E-T6': ['W07c'], 'T.ifr.E-T7': ['W07c'],
  ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`T.multi.T-${i + 1}`, ['W07c']])),
  // the basic course
  'K.overview.K1': ['W11', 'W10', 'W23'], 'K.overview.K2': ['W10'], 'K.overview.K3': ['W10'], 'K.overview.K4': ['W10'], 'K.overview.K5': ['W13'], 'K.overview.K6': ['W10'],
  'K.aero.K-1': ['W11', 'W23', 'W34'], 'K.aero.K-2': ['W13'],
  'K.systems.K1': ['W14'], 'K.systems.K2': ['W14'], 'K.systems.K3': ['W32'],
  'K.instruments.gap-1': ['W15'], 'K.instruments.gap-2': ['W29'],
  'K.wb-perf.K1': ['W16'], 'K.wb-perf.K2': ['W16', 'W04'], 'K.wb-perf.K3': ['W16'], 'K.wb-perf.K4': ['W16', 'W18', 'W29', 'W41', 'W23', 'W34'], 'K.wb-perf.K5': ['W16', 'W21'], 'K.wb-perf.K6': ['W22'], 'K.wb-perf.K7': ['W16'],
  'K.weather.K1': ['W17', 'W40', 'W23'], 'K.weather.K2': ['W40', 'W17'], 'K.weather.K3': ['W17'], 'K.weather.K4': ['W17', 'W40'], 'K.weather.K5': ['W21'], 'K.weather.K6': ['W17'],
  'K.navigation.K1': ['W18', 'W23', 'W34'], 'K.navigation.K2': ['W38'], 'K.navigation.K3': ['W18'],
  'K.law.kiso09-9': ['W38'], 'K.law.kiso09-16': ['W39'], 'K.law.kiso09-26': ['W39'], 'K.law.kiso09-14': ['W38'], 'K.law.kiso09-17': ['W39'],
  'K.human.K1': ['W20'], 'K.human.K2': ['W32'], 'K.human.K3': ['W32'], 'K.human.K4': ['W20'], 'K.human.K5': ['W20', 'W38'], 'K.human.K6': ['W20'], 'K.human.K7': ['W20'], 'K.human.K8': ['W21'],
  'K.vfr.E3': ['W28'],
  'K.ifr.K-1': ['W30', 'W22'], 'K.ifr.K-2': ['W30', 'W34'], 'K.ifr.K-3': ['W41'], 'K.ifr.K-4': ['W30', 'W41'], 'K.ifr.K-5': ['W30', 'W41'], 'K.ifr.K-6': ['W11'],
  'K.multi.K-1': ['W31', 'W34'], 'K.multi.K-2': ['W31'], 'K.multi.K-3': ['W31'], 'K.multi.K-4': ['W31'],
};
// the basic-course rows W11 lays over the original's page (DESIGN 6.1: the safety and Japan-law ones, about 25).
// W11 decides the final list; these are the candidates with the reason.
const OVERLAY = {
  'K.wb-perf.K4': '安全', 'K.navigation.K1': '安全', 'K.human.K5': '安全', 'K.ifr.K-2': '安全', 'K.multi.K-1': '安全',
  'K.human.K1': '安全（定番の対処）', 'K.multi.K-2': '安全（片発の横滑り）',
  'K.law.kiso09-9': '日本の法令', 'K.law.kiso09-16': '日本の法令', 'K.law.kiso09-26': '日本の法令', 'K.law.kiso09-14': '日本の法令', 'K.law.kiso09-17': '日本の法令（要確認）',
  'K.ifr.K-3': '日本の法令', 'K.ifr.K-5': '日本の法令', 'K.ifr.K-4': '日本の方式', 'K.human.K6': '日本の法令', 'K.instruments.gap-1': '日本の法令（14,000 ft）',
  'K.instruments.gap-2': '日本の制度（MSAS）', 'K.weather.K1': '日本の気象情報の型', 'K.weather.K2': '日本の気象情報の型', 'K.weather.K4': '日本の気象情報',
  'K.navigation.K2': '日本の制度（SWIM）', 'K.vfr.E3': '日本の公文書名', 'K.overview.K2': '日本の法令（第 73 条）', 'K.aero.K-2': '日本の基準（耐空性審査要領）',
};
// sources a report leaves implicit (it points at its own discussion section)
const SOURCE_FIX = {
  'T.instruments.E-T2': 'PHAK 第 8 章（同じ柱のピトー静圧）、instruments.md §7 C-1',
  'T.instruments.E-T3': 'PHAK 第 8 章 図 8-36', 'T.instruments.E-T4': 'Chromium での描画（instruments.md §8.1）',
  'T.ifr.E-T6': 'Chromium での描画（ifr.md §8.1、instruments.md E-T4 と同じ）', 'T.ifr.E-T5': '進入図の凡例（周回の最低気象条件は HAA）',
  'K.ifr.K-6': 'kiso12.cover の版の行（原本の体裁）', 'K.ifr.K-1': 'flight-lab/kiso/data/kiso12.json の photos・photo/ フォルダ',
  'K.instruments.gap-1': '施行規則第 178 条、日本の METAR の RMK（inHg）', 'K.instruments.gap-2': 'MSAS（国土交通省 航空局）',
  'K.law.kiso09-17': 'AIP Japan GEN 2.1（未確認：UNVERIFIED.json）',
  'K.human.K7': 'human.md §8（文体）', 'K.wb-perf.K6': 'kiso05・kiso06 の写真', 'K.wb-perf.K7': 'Archer III POH VB-2266',
  'T.wb-perf.T6': 'Archer III POH VB-2266 第 5 章（出力設定表。速度ごとの燃料流量）', 'T.multi.T-6': 'AFH 3C 第 13 章（非対称推力の腕）・基礎教材の図 ch13-fig13-2 の描き方',
  'K.wb-perf.K1': '日本の METAR の RMK の A 群（inHg）・PHAK 第 4 章（1 inHg ≈ 1,000 ft）', 'K.wb-perf.K2': '基礎教材 第 0・4・8・12・13 章の用語（気圧高度）・DESIGN 3.5',
  'K.wb-perf.K5': '記号の慣例（D は抗力）', 'K.vfr.E3': '国土交通省「航空従事者技能証明学科試験出題範囲参考」（curriculum.md [S13]〜[S15]）',
  'K.ifr.K-4': 'AIM 5-3-8・ICAO PANS-OPS（Doc 8168）の待機の時間（ifr.md §7 C-2）', 'K.ifr.K-5': '施行規則第 153 条の表（ifr.md §7 C-3）・14 CFR 91.167',
};
// errata rows that are the same thing seen twice
const DUP = { 'T.ifr.E-T6': 'T.instruments.E-T4', 'SYNC.glide-model': 'T.vfr.E1' };
// errata ↔ the rulings (RULINGS.json) that decide the same point
export const ERRATA_RULING = {
  'T.aero.T-3': ['R.stall-recovery'], 'T.aero.T-4': ['R.base-final-stall'], 'T.aero.T-2': ['R.vn-line'], 'T.aero.T-10': ['R.lift-lower-surface'], 'T.aero.T-11': ['R.load-factor-unit'],
  'T.systems.T1': ['R.o360-license'], 'T.systems.T4': ['R.engine-without-electric'], 'T.systems.T5': ['R.fixed-pitch-rpm'], 'T.systems.T11': ['R.carb-ice-temp'],
  'T.instruments.E-T1': ['R.cas'], 'T.instruments.E-T2': ['R.cross-check'], 'T.navigation.T1': ['R.fuel-reserve'], 'T.law.law-special': ['R.notam-term'], 'T.law.comm-icao': ['R.readback'], 'T.law.q_radio': ['R.nordo-landing'],
  'T.weather.T2': ['R.microburst'], 'T.human.T10': ['R.tem-words'], 'K.overview.K2': ['R.pic-meaning'], 'K.overview.K3': ['R.pressure-unit'], 'K.overview.K5': ['R.weight-unit'],
  'K.wb-perf.K2': ['R.pressure-altitude-term'], 'K.wb-perf.K3': ['R.fast-landing'], 'K.wb-perf.K4': ['R.fuel-reserve', 'R.vfr-fuel-law'], 'K.navigation.K1': ['R.fuel-reserve'],
  'K.ifr.K-2': ['R.circling-lost-visual'], 'K.ifr.K-4': ['R.hold-numbers'], 'K.ifr.K-5': ['R.ifr-fuel'], 'K.multi.K-1': ['R.failed-engine-id'], 'K.multi.K-2': ['R.zero-sideslip'], 'K.multi.K-3': ['R.counter-rotation'],
  'K.human.K5': ['R.alcohol'], 'K.systems.K1': ['R.manifold-pressure'], 'K.systems.K2': ['R.carb-ice-temp'], 'K.weather.K1': ['R.taf-groups'],
};

// places: the section ids, figures (図 x) and quiz ids a DESIGN 節 cell names
function placesOf(cell) {
  const out = ticks(cell).filter(x => /^[a-z0-9_.\-]+$/.test(x));
  for (const m of cell.matchAll(/図\s*([A-Za-z][A-Za-z0-9]+)/g)) out.push(`FIG.${m[1]}`);
  for (const m of cell.matchAll(/\b(q_[a-z]+)\b/g)) if (!out.includes(m[1])) out.push(m[1]);
  for (const m of cell.matchAll(/(kiso\d\d(?:\.\d+)?|ch\d\d-fig[\d-]+(?:〜[\d-]+)?)/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

const rows = [];
const base = { status: 'open', where: null, by: null, checkedBy: null, reason: null, note: '' };
function fromReportTable(heading, book) {
  for (const { c } of tableRows(sectionText(heading))) {
    const [num, sec, problem, fix, cf] = c;
    let rep, local;
    const m = num.match(/^(\S+)\s+(.+)$/) || num.match(/^(instruments)（(不足 \d)）$/);
    if (/^instruments（不足/.test(num)) { rep = 'instruments'; local = num.match(/不足 (\d)/)[1]; }
    else { rep = m[1]; local = m[2]; }
    const prefix = book === 'textbook' ? 'T' : 'K';
    const id = rep === 'instruments' && book === 'kiso' ? `K.instruments.gap-${local}` : `${prefix}.${rep}.${slug(local)}`;
    const key = rep === 'law' ? `${prefix}:${local === 'q_radio' ? 'comm.nordo' : local}` : `${prefix}:${local}`;
    const found = R[rep] && R[rep].get(key);
    const units = UNIT[id];
    if (!units) throw new Error(`no unit for ${id}`);
    rows.push({
      id, ref: num, book, design: book === 'textbook' ? '10.1' : '10.2',
      places: placesOf(sec), section: sec, problem, correction: fix, confidence: cf, conf: CONF[conf(cf)] || null,
      safety: /〔安全〕/.test(problem + fix + cf),
      source: { report: `understand/${REPORT_FILE[rep]} ${found ? found.section + ' ' : ''}${rep === 'instruments' && book === 'kiso' ? '§8.2（不足 ' + local + '）' : local}`, primary: SOURCE_FIX[id] || (found && found.source) || '' },
      unit: units[0], alsoUnits: units.slice(1),
      ...(book === 'kiso' ? { word: true, overlay: OVERLAY[id] || null } : {}),
      rulings: ERRATA_RULING[id] || [], dupOf: DUP[id] || null, verified: false, ...base,
      note: id === 'T.overview.T3' ? '閉じ方の見込み：直さない（節 ID は変えない：6.2 の決まり 1）。状態 wontfix と理由で閉じる' : id === 'T.overview.T2' ? '要確認の項目でもある（UNVERIFIED.json U.ac61-136）' : id === 'K.law.kiso09-17' ? '要確認の項目でもある（UNVERIFIED.json U.qnh-unit）' : '',
    });
  }
}
fromReportTable('### 10.1', 'textbook');
fromReportTable('### 10.2', 'kiso');

// --- 10.3 the app and data (not content errors) -------------------------------------------------------------
const APP = [
  ['APP.max-bytes', 'W02', ['flight-lab/build.mjs']], ['APP.index-photos', 'W02', ['flight-lab/src/index.html']],
  ['APP.menu-read-count', 'W02', ['flight-lab/src/pages.js']], ['APP.record-textbook-row', 'W02', ['flight-lab/src/pages.js']],
  ['APP.lesson-links', null, ['flight-lab/src/syllabus.js']],
  ['APP.kiso-svg-ids-alt', 'W11', ['flight-lab/src/pages.js（原本のページ）']], ['APP.kiso-cover-airline', 'W10', ['kiso00.cover', 'ch00-photo1']],
  ['APP.old-doc-numbers', 'W49', ['flight-lab/README.md', 'flight-lab/kiso/README.md（変えない）', 'flight-lab/outputs/FLIGHT-LAB-使い方.md']],
  ['APP.kiso-photo-credits', 'W22', ['photoCreditsHtml', 'flight-lab/PHOTO-CREDITS.md']], ['APP.ch00-photo7-license', 'W22', ['ch00-photo7']],
  ['APP.annotated-credit', 'W22', ['基礎教材の写真 41 枚のクレジット']], ['APP.base64-xxx', 'W01', ['textbook/rewrite/combined/tools']],
  ['APP.bk-photo-mod', 'W22', ['FL.book bk.photo']], ['APP.style-md', 'W04b', ['textbook/rewrite/STYLE.md']], ['APP.london-equivalent', 'W09', ['PARTS p1', 'syllabus s0']],
];
const W02_DONE = 'W02 の報告（reports/W02.md）では直した。統合役が確かめ役の署名を付けて閉じる';
tableRows(sectionText('### 10.3')).forEach(({ c }, i) => {
  const [problem, fix, cf] = c, [id, unit, places] = APP[i];
  if (id === 'APP.lesson-links') {
    rows.push({ id: 'APP.lesson-c1', ref: `10.3 行 ${i + 1}（前半を分けた）`, book: 'app', design: '10.3', places: ['syllabus c1', 'intro.course', 'solo.check'], section: '課目 c1 の book', problem: '課目 c1 のリンク先が `intro.course`（中身は `solo.check`）', correction: '`solo.check` に直す（CADET の lessonSections のテストを意図して直す。DESIGN 6.1）', confidence: cf, conf: CONF[conf(cf)], safety: false, source: { report: 'DESIGN 10.3・6.1', primary: 'flight-lab/src/syllabus.js' }, unit: 'W07d', alsoUnits: [], rulings: [], dupOf: null, verified: false, ...base });
    rows.push({ id: 'APP.lesson-k1k2', ref: `10.3 行 ${i + 1}（後半を分けた）`, book: 'app', design: '10.3', places: ['syllabus k1', 'syllabus k2', 'inst.pfd'], section: '課目 k1・k2 の book', problem: '課目 k1・k2 に教科書のリンクがない', correction: '`inst.pfd` を足す（節ができたコミットで。6.2 の決まり 13）', confidence: cf, conf: CONF[conf(cf)], safety: false, source: { report: 'DESIGN 10.3・6.1', primary: 'flight-lab/src/syllabus.js' }, unit: 'W15', alsoUnits: [], rulings: [], dupOf: null, verified: false, ...base });
    return;
  }
  rows.push({ id, ref: `10.3 行 ${i + 1}`, book: 'app', design: '10.3', places, section: places.join('・'), problem, correction: fix, confidence: cf, conf: CONF[conf(cf)], safety: false, source: { report: 'DESIGN 10.3', primary: `リポジトリのファイル（${places.join('・')}）` }, unit, alsoUnits: [], rulings: [], dupOf: null, verified: false, ...base, note: unit === 'W02' ? W02_DONE : '' });
});

// --- 10.5 the textbook vs the lessons and the game ----------------------------------------------------------
const SYNC = [['SYNC.stall-recovery', 'W07d'], ['SYNC.x3-short-field', 'W07d'], ['SYNC.comm-tower-sim', 'W07d'], ['SYNC.comm-option-sim', 'W07d'], ['SYNC.glide-model', 'W07b']];
tableRows(sectionText('### 10.5')).forEach(({ c }, i) => {
  const [problem, where, fix, cf] = c, [id, unit] = SYNC[i];
  const SYNC_PLACES = { 'SYNC.stall-recovery': ['syllabus a7 brief', 'syllabus a8 brief', 'syllabus stallRecovery（say・g）', 'cadet/src/content/dialog/instructor.js', 'aero.stall', 'ops.slow', 'FIG.stallRecovery'], 'SYNC.x3-short-field': ['syllabus x3', 'ops.short', 'perf.tol'], 'SYNC.comm-tower-sim': ['comm.tower', 'syllabus t1'], 'SYNC.comm-option-sim': ['comm.option', 'syllabus t2', 'syllabus t4'], 'SYNC.glide-model': ['emg.glide', 'flight-lab/src/physics（滑空のモデル）'] };
  rows.push({ id, ref: `10.5 行 ${i + 1}`, book: 'syllabus', design: '10.5', places: SYNC_PLACES[id], section: where, problem, correction: fix, confidence: cf, conf: CONF[conf(cf)], safety: /〔安全〕/.test(problem + fix), source: { report: 'textbook/rewrite/NOTES.md（DESIGN 10.5）', primary: id === 'SYNC.stall-recovery' ? 'AFH 3C 第 5 章（失速からの回復の型）' : id === 'SYNC.x3-short-field' ? 'Archer の訓練校のチェックリスト（教科書 ops.short）' : id === 'SYNC.glide-model' ? 'POH VB-2266（最良滑空 76 KIAS は最大重量）・AFH 第 3 章' : '課目 t1・t2・t4 の実際（flight-lab/src/syllabus.js）' }, unit, alsoUnits: id === 'SYNC.stall-recovery' ? ['W12'] : [], rulings: id === 'SYNC.stall-recovery' ? ['R.stall-recovery'] : [], dupOf: DUP[id] || null, verified: false, ...base, note: id === 'SYNC.stall-recovery' ? 'CADET の教官がブリーフを読み上げる（cadet/src/content/dialog/instructor.js:253）。〔安全〕⑤の直しと同じコミットで直す（DESIGN 6.1）' : '' });
});

const ids = new Set();
for (const r of rows) { if (ids.has(r.id)) throw new Error('duplicate ' + r.id); ids.add(r.id); }
const by = k => rows.reduce((a, r) => ((a[r[k]] = (a[r[k]] || 0) + 1), a), {});
const out = {
  ledger: 'ERRATA', version: 1, updated: DATE, by: 'W03',
  about: 'DESIGN 10.1（教科書 79）・10.2（基礎教材 53）・10.3（アプリとデータ 15。1 行を 2 つに分けた）・10.5（課目・ゲームとの食い違い 5）の全行。correction は報告の提案で、直す人が一次資料で確かめてから直す（verified を true に）。閉じ方は README.md',
  counts: { rows: rows.length, byBook: by('book'), safety: rows.filter(r => r.safety).length, byUnit: by('unit') },
  rows,
};
console.log(JSON.stringify(out.counts));
console.log('rows without a primary source:', rows.filter(r => !r.source.primary).map(r => r.id).join(' '));
export const ERRATA = out;
if (import.meta.url === `file://${process.argv[1]}`) writeLedger(OUT, out);
