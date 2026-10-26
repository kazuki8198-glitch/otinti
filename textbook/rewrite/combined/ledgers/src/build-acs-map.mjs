// ledgers/src/build-acs-map.mjs — W03 bootstrap of ACS-MAP.json: the knowledge elements (K) of the FAA ACS for Private
// Pilot – Airplane (6C), Instrument Rating – Airplane (8C) and the multiengine part of Commercial Pilot – Airplane (7B:
// the AMEL/AMES Tasks IX.E–G and X.A–D), each mapped to the planned sections of DESIGN 3.3 or「対象外（理由）」
// (DESIGN 3.2 `faa`, 3.6, 5 章の基準 13). Sub-elements (K2a …) are kept in `sub` and share their element's row.
// status: open / mapped / confirmed / excluded (as in JCAB-MAP).   node build-acs-map.mjs [--write [--force]]
import path from 'node:path';
import { LEDGERS, plannedBook } from './design.mjs';
import { parseAcs, ACS } from './acs.mjs';
import { unitForDest, DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const OUT = path.join(LEDGERS, 'ACS-MAP.json');
const BOOK = plannedBook();
const WX = 'wx.atm wx.wind wx.cloud wx.stab wx.front wx.ts wx.shear wx.turb wx.ice wx.fog';
const PA = {
  'I.A.K1': 'law.pilot intro.cert', 'I.A.K2': 'intro.cert law.pilot', 'I.A.K3': 'hf.self intro.cert', 'I.A.K4': 'law.pic law.pilot', 'I.A.K5': 'intro.cert hf.self',
  'I.B.K1': 'law.aircraft', 'I.B.K2': 'law.aircraft', 'I.B.K3': 'law.aircraft ground.walk', 'I.B.K4': 'law.aircraft',
  'I.C.K1': 'wx.info wx.brief', 'I.C.K2': 'wx.info wx.metar wx.taf wx.brief', 'I.C.K3': WX, 'I.C.K4': 'wx.info nav.efb',
  'I.D.K1': 'nav.plan nav.chart law.airspace', 'I.D.K2': 'nav.log nav.plan law.rules emg.glide', 'I.D.K3': 'nav.log perf.fuel navb.calc', 'I.D.K4': 'nav.xc', 'I.D.K5': 'nav.xc', 'I.D.K6': 'law.special',
  'I.E.K1': 'law.airspace law.vfr', 'I.E.K2': 'nav.chart', 'I.E.K3': 'law.special', 'I.E.K4': 'law.special',
  'I.F.K1': 'perf.chart perf.tol perf.climb perf.range', 'I.F.K2': 'perf.da perf.tol perf.wb wb.limits', 'I.F.K3': 'aero.forces aero.lift aero.stall aero.turn',
  'I.G.K1': 'sys.ctl sys.engine sys.gear sys.fuel sys.elec sys.cockpit inst.pfd sys.g1000 inst.gyro wx.ice hf.altitude', 'I.G.K2': 'emg.elec emg.abnormal',
  'I.H.K1': 'hf.altitude hf.body hf.motion hf.fatigue hf.vision hf.self', 'I.H.K2': 'hf.self law.pilot', 'I.H.K3': 'hf.self', 'I.H.K4': 'hf.adm hf.srm adm.risk crm.crm',
  'II.A.K1': 'hf.self', 'II.A.K2': 'law.aircraft ground.walk', 'II.A.K3': 'ground.walk', 'II.A.K4': 'wx.brief adm.risk ground.day',
  'II.B.K1': 'ground.day hf.srm', 'II.B.K2': 'adm.check', 'II.B.K3': 'nav.fpl nav.gps', 'II.B.K4': 'ground.day',
  'II.C.K1': 'ground.start', 'II.C.K2': 'ground.start', 'II.C.K3': 'ground.start', 'II.C.K4': 'ground.start',
  'II.D.K1': 'nav.chart ground.taxi', 'II.D.K2': 'ground.taxi comm.runway', 'II.D.K3': 'ground.taxi comm.runway', 'II.D.K4': 'ground.taxi ops.xwind', 'II.D.K5': 'sys.lights ground.taxi', 'II.D.K6': 'ground.taxi comm.runway ops.night',
  'II.F.K1': 'ground.runup',
  'III.A.K1': 'radio.equip comm.atis', 'III.A.K2': 'comm.basic comm.pattern comm.tower', 'III.A.K3': 'comm.nordo', 'III.A.K4': 'comm.xpdr', 'III.A.K5': 'comm.nordo', 'III.A.K6': 'radio.equip comm.nordo', 'III.A.K7': 'comm.radar', 'III.A.K8': 'law.pilot', 'III.A.K9': 'comm.runway',
  'III.B.K1': 'ops.pattern comm.ctaf', 'III.B.K2': 'ops.pattern', 'III.B.K3': 'law.rules', 'III.B.K4': 'comm.atis wx.metar',
  'IV.A.K1': 'perf.tol ops.takeoff', 'IV.A.K2': 'perf.climb ops.climb', 'IV.A.K3': 'ops.takeoff',
  'IV.B.K1': 'ops.landing ops.energy', 'IV.B.K2': 'perf.tol ops.landing', 'IV.B.K3': 'ops.xwind',
  'IV.C.K1': 'perf.tol ops.soft', 'IV.C.K2': 'perf.climb', 'IV.C.K3': 'ops.soft', 'IV.C.K4': 'aero.ge', 'IV.C.K5': 'ops.soft', 'IV.C.K6': 'aero.left',
  'IV.D.K1': 'ops.soft ops.energy', 'IV.D.K2': 'perf.tol', 'IV.D.K3': 'ops.xwind ops.soft',
  'IV.E.K1': 'perf.tol ops.short', 'IV.E.K2': 'perf.climb ops.short', 'IV.E.K3': 'ops.short',
  'IV.F.K1': 'ops.short ops.energy', 'IV.F.K2': 'perf.tol', 'IV.F.K3': 'ops.xwind ops.short',
  'IV.M.K1': 'ops.slip ops.energy', 'IV.M.K2': 'ops.slip', 'IV.M.K3': 'ops.slip ops.xwind', 'IV.M.K4': 'ops.slip',
  'IV.N.K1': 'ops.goaround ops.energy', 'IV.N.K2': 'ops.goaround perf.da', 'IV.N.K3': 'ops.goaround ops.xwind',
  'V.A.K1': 'ops.turns', 'V.A.K2': 'aero.turn aero.vn aero.stall',
  'V.B.K1': 'ops.ground', 'V.B.K2': 'ops.ground', 'V.B.K3': 'ops.ground aero.turn', 'V.B.K4': 'ops.ground ops.pattern',
  'VI.A.K1': 'nav.dr nav.plan', 'VI.A.K2': 'sys.compass', 'VI.A.K3': 'nav.chart nav.dr', 'VI.A.K4': 'nav.plan nav.log', 'VI.A.K5': 'nav.plan navb.wind navb.north', 'VI.A.K6': 'nav.log perf.range', 'VI.A.K7': 'nav.log nav.dr',
  'VI.B.K1': 'nav.vor nav.dme', 'VI.B.K2': 'nav.gps nav.fpl', 'VI.B.K3': 'comm.radar', 'VI.B.K4': 'comm.xpdr nav.efb',
  'VI.C.K1': 'nav.divert', 'VI.C.K2': 'nav.divert law.pic', 'VI.D.K1': 'nav.lost', 'VI.D.K2': 'nav.lost comm.radar',
  'VII.A.K1': 'ops.slow aero.stall',
  'VII.B.K1': 'aero.stall ops.stall', 'VII.B.K2': 'aero.stall', 'VII.B.K3': 'ops.stall aero.stall', 'VII.B.K4': 'aero.stall ops.stall',
  'VII.C.K1': 'aero.stall ops.stall', 'VII.C.K2': 'aero.stall', 'VII.C.K3': 'ops.stall aero.stall', 'VII.C.K4': 'aero.stall ops.stall',
  'VII.D.K1': 'aero.spin', 'VII.D.K2': 'aero.spin', 'VII.D.K3': 'aero.spin',
  'VIII.A.K1': 'ifr.scan', 'VIII.B.K1': 'ifr.scan', 'VIII.C.K1': 'ifr.scan', 'VIII.D.K1': 'ifr.scan',
  'VIII.E.K1': 'ifr.upset hf.body', 'VIII.E.K2': 'ifr.upset', 'VIII.E.K3': 'emg.imc', 'VIII.E.K4': 'inst.ap ifr.upset',
  'VIII.F.K1': 'radio.equip', 'VIII.F.K2': 'nav.vor nav.gps', 'VIII.F.K3': 'comm.radar emg.imc',
  'IX.A.K1': 'emg.basic emg.fire', 'IX.A.K2': 'emg.basic', 'IX.A.K3': 'aero.vn emg.basic', 'IX.A.K4': 'emg.basic',
  'IX.B.K1': 'emg.engine emg.forced', 'IX.B.K2': 'emg.glide', 'IX.B.K3': 'emg.forced', 'IX.B.K4': 'emg.forced ops.energy', 'IX.B.K5': 'emg.basic', 'IX.B.K6': 'comm.mayday',
  'IX.C.K1': 'emg.engine sys.carb', 'IX.C.K2': 'emg.elec emg.abnormal ifr.partial', 'IX.C.K3': 'emg.fire', 'IX.C.K4': 'emg.abnormal', 'IX.C.K5': 'emg.abnormal',
  'IX.D.K1': 'emg.basic', 'IX.D.K2': 'emg.fire', 'IX.D.K3': 'emg.basic', 'IX.D.K4': 'emg.basic', 'IX.D.K5': 'emg.basic',
  'IX.E.K1': 'me.vmc', 'IX.E.K2': 'me.speeds', 'IX.E.K3': 'me.perf',
  'IX.F.K1': 'me.vmc', 'IX.F.K2': 'me.speeds', 'IX.F.K3': 'me.perf', 'IX.F.K4': 'me.oei', 'IX.F.K5': 'me.drag me.oei', 'IX.F.K6': 'me.oei',
  'IX.G.K1': 'me.vmc', 'IX.G.K2': 'me.speeds', 'IX.G.K3': 'me.oei', 'IX.G.K4': 'me.drag', 'IX.G.K5': 'me.oei',
  'X.A.K1': 'me.vmc', 'X.A.K2': 'me.speeds', 'X.A.K3': 'me.oei', 'X.A.K4': 'me.drag', 'X.A.K5': 'me.prop me.oei',
  'X.B.K1': 'me.vmc', 'X.B.K2': 'me.speeds', 'X.B.K3': 'me.vmc oei.what', 'X.B.K4': 'me.vmc',
  'X.C.K1': 'me.oei ifr.partial', 'X.D.K1': 'me.land',
  'XI.A.K1': 'hf.vision ops.night', 'XI.A.K2': 'ops.night', 'XI.A.K3': 'sys.lights ops.night', 'XI.A.K4': 'ops.night', 'XI.A.K5': 'ops.night', 'XI.A.K6': 'ops.night', 'XI.A.K7': 'sys.lights', 'XI.A.K8': 'ops.night hf.body',
  'XII.A.K1': 'ground.after', 'XII.A.K2': 'ground.after law.aircraft',
};
const IR = {
  'I.A.K1': 'ifr.rules', 'I.A.K2': 'ifr.rules intro.cert', 'I.A.K3': 'hf.self intro.cert',
  'I.B.K1': 'wx.info', 'I.B.K2': 'wx.info wx.metar wx.taf', 'I.B.K3': WX, 'I.B.K4': 'wx.info nav.efb',
  'I.C.K1': 'ifr.enr ifr.chart ifr.rules', 'I.C.K2': 'ifr.enr', 'I.C.K3': 'nav.log perf.fuel', 'I.C.K4': 'ifr.rules', 'I.C.K5': 'ifr.rules',
  'II.A.K1': 'wx.ice', 'II.A.K2': 'sys.ctl inst.ap',
  'II.B.K1': 'sys.g1000 inst.gyro sys.elec sys.compass ifr.vacuum', 'II.B.K2': 'nav.vor ifr.pbn nav.gps', 'II.B.K3': 'nav.efb',
  'II.C.K1': 'ifr.instr', 'II.C.K2': 'ifr.rules law.aircraft', 'II.C.K3': 'law.aircraft ifr.rules',
  'III.A.K1': 'ifr.rules ifr.dep ifr.enr', 'III.A.K2': 'law.pic ifr.rules', 'III.A.K3': 'ifr.rules', 'III.B.K1': 'ifr.hold',
  'IV.A.K1': 'ifr.scan', 'IV.A.K2': 'ifr.scan ifr.instr', 'IV.A.K3': 'ifr.instr ifr.partial',
  'IV.B.K1': 'ifr.upset', 'IV.B.K2': 'ifr.upset hf.body', 'IV.B.K3': 'emg.imc', 'IV.B.K4': 'ifr.auto inst.ap',
  'V.A.K1': 'nav.vor nav.dme ifr.pt', 'V.A.K2': 'nav.gps ifr.pbn', 'V.B.K1': 'ifr.dep ifr.enr', 'V.B.K2': 'ifr.enr comm.radar',
  'VI.A.K1': 'ifr.np ifr.chart', 'VI.A.K2': 'ifr.pbn ifr.auto', 'VI.A.K3': 'ifr.np ifr.pbn', 'VI.A.K4': 'ifr.np ops.energy',
  'VI.B.K1': 'ifr.ils ifr.chart', 'VI.B.K2': 'ifr.ils ifr.auto', 'VI.B.K3': 'ifr.ils ifr.pbn', 'VI.B.K4': 'ifr.ils',
  'VI.C.K1': 'ifr.np', 'VI.D.K1': 'ifr.circle', 'VI.E.K1': 'ifr.rules ifr.np', 'VI.E.K2': 'ifr.ils ops.night', 'VI.E.K3': 'ifr.np',
  'VII.A.K1': 'ifr.rules', 'VII.B.K1': 'me.oei ifr.partial', 'VII.C.K1': 'me.land', 'VII.D.K1': 'ifr.instr ifr.partial', 'VII.D.K2': 'ifr.instr ifr.partial ifr.vacuum',
  'VIII.A.K1': 'ground.after',
};
const SEAPLANE = '対象外（理由）：水上機（ASES・AMES）の項目。訓練機は陸上機（Piper Archer・Seminole）で、水上機の限定はこの本の範囲の外（DESIGN 3.6 と同じ考え方）';
const CA_ME = /^CA\.(IX\.[EFG]|X\.[A-D])$/;

const rows = [], problems = [];
for (const key of ['PA', 'IR', 'CA']) {
  const { elements } = parseAcs(key);
  for (const e of elements) {
    if (key === 'CA' && !CA_ME.test(e.task)) continue;
    const local = e.code.slice(key.length + 1);
    const seaplane = /\(ASES, AMES\)$/.test(e.taskTitle) || /Water and Seaplane|Seaplane Post-Landing/.test(e.taskTitle);
    const m = key === 'PA' ? PA[local] : key === 'IR' ? IR[local] : PA[local];
    if (!m && !seaplane) problems.push(`no map: ${e.code} ${e.text.slice(0, 50)}`);
    const sections = seaplane ? [] : (m || '').split(/\s+/).filter(Boolean);
    for (const s of sections) if (!BOOK.secs.has(s)) problems.push(`unknown section ${s} (${e.code})`);
    const missing = sections.filter(s => BOOK.secs.get(s)?.isNew);
    rows.push({
      id: e.code, acs: key, acsTitle: ACS[key].title, area: e.area, areaTitle: e.areaTitle, task: e.task, taskTitle: e.taskTitle, text: e.text, sub: e.sub,
      sections, excluded: seaplane ? SEAPLANE : null, sameAs: key === 'CA' ? `PA.${local}` : null,
      status: seaplane ? 'excluded' : missing.length ? 'open' : 'mapped', missing,
      unit: 'W42', writers: [...new Set(missing.map(unitForDest))], where: null, by: null, checkedBy: null,
      note: /^PA\.I\.G\.K1$/.test(e.code) ? 'sub k（Water rudders）は水上機の項目で対象外' : '',
    });
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
const by = (k, f) => rows.reduce((a, r) => { const v = f ? f(r) : r[k]; a[v] = (a[v] || 0) + 1; return a; }, {});
const out = {
  ledger: 'ACS-MAP', version: 1, updated: DATE, by: 'W03',
  about: 'FAA ACS の知識の項目（K）× 合本の節（DESIGN 3.2 の faa・3.6・5 章の基準 13）：自家用 6C の全部、計器 8C の全部、事業用 7B は多発の部分（AMEL・AMES の Task IX.E〜G と X.A〜D）。FAA の学科を受けるかは未公表（UNVERIFIED.json U.faa-written）。事業用の単発の飛行課目は範囲の外（DESIGN 3.6）なので行にしない。status は JCAB-MAP と同じ',
  sources: Object.fromEntries(Object.entries(ACS).map(([k, v]) => [k, { title: v.title, url: v.url, copy: `ledgers/src/sources/acs/${v.file}`, fetched: DATE, note: k === 'CA' ? '多発の部分だけを行にした' : '' }])),
  outOfScope: { CA: 'FAA の事業用の単発の飛行課目（Steep Spiral・Chandelles・Lazy Eights・Eights on Pylons・Power-Off 180° Accuracy Approach・加速失速の課目）は DESIGN 3.6 で範囲の外。事業用 7B の多発以外の Task も、自家用 6C と同じ知識の項目で覆われるので行にしない' },
  counts: { rows: rows.length, byAcs: by('acs'), byStatus: by('status'), unmapped: rows.filter(r => !r.sections.length && !r.excluded).length, subElements: rows.reduce((a, r) => a + r.sub.length, 0) },
  rows,
};
console.log(JSON.stringify(out.counts));
export const ACS_MAP = out;
if (import.meta.url === `file://${process.argv[1]}`) writeLedger(OUT, out);
