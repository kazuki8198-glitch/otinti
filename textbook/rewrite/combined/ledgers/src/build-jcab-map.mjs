// ledgers/src/build-jcab-map.mjs — W03 bootstrap of JCAB-MAP.json: every heading of the JCAB「航空従事者技能証明学科
// 試験出題範囲参考」for 事業用操縦士（飛行機）and 計器飛行証明 (and 自家用操縦士（飛行機）for comparison), read from the
// MLIT PDFs (sources/mlit/*.txt), each leaf heading mapped to the planned sections of DESIGN 3.3 that teach it, or
// "対象外（理由）". The leaves are the rows; the parent headings are in each row's path. Law headings with many topics
// also carry topicMap (topic → sections) so W38/W42 can check them one by one.
// status: open (a named section does not exist yet) / mapped (all named sections exist in today's book; JCAB depth not yet
// confirmed) / confirmed (W42/W45 checked the section teaches the heading at JCAB depth) / excluded.
//   node build-jcab-map.mjs [--write [--force]]
import path from 'node:path';
import { LEDGERS, plannedBook } from './design.mjs';
import { parseSyllabus, SYLLABI } from './syllabus.mjs';
import { unitForDest, DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const OUT = path.join(LEDGERS, 'JCAB-MAP.json');
const BOOK = plannedBook();
const sp = s => s.split(/\s+/).filter(Boolean);

// --- 事業用操縦士（飛行機）--------------------------------------------------------------------------------------
const CPL = {
  // 1 航空工学
  '1.1.1.1': 'aero.lift aero.wing basics.units wx.atm', '1.1.1.2': 'inst.speed basics.speed aero.lift', '1.1.1.3': 'aero.wing aero.lift aero.aoa',
  '1.1.1.4': 'aero.drag aero.wing', '1.1.1.5': 'aero.drag aero.stall aero.spin aero.left oei.what aero.flaps', '1.1.1.6': 'aero.stab aero.ge perf.wb',
  '1.1.1.7': 'aero.axes sys.ctl ops.trim', '1.1.1.8': 'aero.left me.prop sys.engine', '1.1.1.9': 'aero.stall aero.spin',
  '1.1.2.1': 'aero.power perf.climb perf.range aero.turn emg.glide', '1.1.2.2': 'aero.struct aero.vn', '1.1.2.3': 'perf.tol perf.chart perf.plan me.perf',
  '1.2.1.1': 'sys.airframe', '1.2.1.2': 'sys.airframe', '1.2.2.1': 'sys.airframe', '1.2.2.2': 'sys.airframe aero.struct',
  '1.3.1.1': 'sys.gear', '1.3.1.2': 'sys.gear me.sys', '1.3.1.3': 'sys.gear tsys.power', '1.3.2.1': 'sys.fuel', '1.3.2.2': 'sys.fuel sys.eis',
  '1.3.3': 'sys.elec tsys.env', '1.3.4': 'wx.ice tsys.env', '1.3.5': 'tsys.env emg.fire', '1.3.6.1': 'tsys.power me.sys', '1.3.6.2': 'tsys.power me.sys',
  '1.4.1.1': 'sys.piston', '1.4.1.2': 'sys.piston', '1.4.1.3': 'sys.piston sys.engine', '1.4.1.4': 'sys.piston sys.fuel', '1.4.1.5': 'me.prop aero.left',
  '1.4.1.6': 'sys.engine sys.piston', '1.4.1.7': 'sys.carb sys.engine', '1.4.1.8': 'sys.engine ground.start', '1.4.1.9': 'sys.eis', '1.4.1.10': 'sys.eis',
  '1.4.1.11': 'sys.engine sys.eis', '1.4.2.1': 'tsys.turbine', '1.4.2.2': 'tsys.turbine', '1.4.2.3': 'tsys.turbine',
  '1.5.1.1': 'sys.radio', '1.5.1.2': 'sys.elec sys.radio tsys.power', '1.5.1.3': 'sys.radio tsys.power', '1.5.1.4': 'sys.elec', '1.5.1.5': 'sys.elec', '1.5.1.6': 'sys.elec',
  '1.5.2.1': 'sys.radio', '1.5.2.2': 'sys.radio', '1.5.2.3': 'sys.radio', '1.5.3.1': 'sys.radio', '1.5.3.2': 'sys.radio radio.equip',
  '1.6.1.1': 'sys.cockpit inst.pfd', '1.6.1.2': 'inst.pfd sys.eis', '1.6.2.1': 'sys.eis inst.flow', '1.6.2.2': 'sys.eis', '1.6.2.3': 'sys.eis inst.flow', '1.6.2.4': 'inst.gyro',
  '1.6.3.1': 'inst.gyro', '1.6.3.2': 'inst.gyro', '1.6.3.3': 'inst.gyro ifr.vacuum', '1.6.4.1': 'sys.g1000 inst.flow', '1.6.4.2': 'inst.alt', '1.6.4.3': 'inst.speed', '1.6.4.4': 'inst.alt',
  '1.6.5.1': 'sys.compass navb.north', '1.6.5.2': 'nav.adf nav.vor nav.dme', '1.6.5.3': 'comm.xpdr jet.fms', '1.6.5.4': 'nav.gps',
  '1.7.1.1': 'wb.limits tsys.wb', '1.7.1.2': 'perf.wb tsys.wb', '1.7.2.1': 'perf.wbex wb.graph tsys.wb', '1.7.2.2': 'wb.limits', '1.7.2.3': 'wb.shift', '1.7.2.4': 'tsys.wb',
  // 2 航空気象
  '2.1.1.1': 'wx.atm', '2.1.1.2': 'wx.atm', '2.1.1.3': 'wx.atm inst.alt', '2.1.1.4': 'wx.cloud', '2.1.1.5': 'wx.stab',
  '2.1.2.1': 'wx.cloud wx.metar', '2.1.2.2': 'wx.cloud', '2.1.2.3': 'wx.fog',
  '2.2.1.1': 'wx.wind wx.metar', '2.2.1.2': 'wx.wind', '2.2.1.3': 'wx.wind jwx.upper', '2.2.1.4': 'wx.wind',
  '2.2.2.1': 'wx.front jwx.season', '2.2.2.2': 'jwx.season', '2.2.3.1': 'wx.front', '2.2.3.2': 'wx.front', '2.2.3.3': 'jwx.season',
  '2.2.4.1': 'wx.wind wx.front', '2.2.4.2': 'wx.front jwx.surface jwx.upper', '2.2.4.3': 'wx.front jwx.season', '2.2.4.4': 'jwx.season jwx.surface',
  '2.2.5.1': 'jwx.season', '2.2.5.2': 'jwx.season wx.ts', '2.3.1.1': 'wx.turb jwx.upper', '2.3.1.2': 'wx.turb jwx.upper',
  '2.3.2.1': 'wx.turb', '2.3.2.2': 'wx.shear jwx.local', '2.3.2.3': 'wx.ts', '2.3.2.4': 'wx.ice', '2.3.2.5': 'wx.fog', '2.3.2.6': 'jwx.local',
  '2.4.1.1': 'jwx.report jwx.sources', '2.4.1.2': 'jwx.report wx.metar wx.taf jwx.local', '2.4.1.3': 'jwx.upper wx.info', '2.4.2.1': 'jwx.surface jwx.upper', '2.4.2.2': 'jwx.upper',
  // 3 空中航法
  '3.1.1.1': 'navb.earth nav.dr nav.vor nav.gps nav.fpl', '3.1.1.2': 'navb.earth basics.time', '3.1.1.3': 'navb.earth navb.wind navb.calc', '3.1.1.4': 'basics.alt inst.alt jair.rules',
  '3.1.1.5': 'navb.earth', '3.1.1.6': 'navb.wind', '3.1.1.7': 'navb.calc', '3.1.1.8': 'jair.fpl', '3.1.1.9': 'jair.vfr nav.chart jifr.enr',
  '3.1.2.1': 'navb.earth nav.plan', '3.1.2.2': 'navb.earth nav.plan', '3.1.2.3': 'navb.north', '3.1.2.4': 'navb.calc', '3.1.2.5': 'navb.calc perf.fuel jair.fpl', '3.1.2.6': 'nav.pnr',
  '3.1.3.1': 'nav.dr', '3.1.3.2': 'nav.dr navb.wind', '3.1.3.3': 'nav.dr nav.log', '3.1.3.4': 'nav.vor nav.dme nav.adf nav.gps sys.compass', '3.1.3.5': 'ifr.scan',
  '3.2.1': 'jair.vfr', '3.2.2': 'jair.airspace', '3.2.3': 'jair.ais',
  '3.3.1.1': 'hf.altitude', '3.3.1.2': 'hf.altitude', '3.3.1.3': 'hf.altitude sys.elec', '3.3.1.4': 'hf.altitude', '3.3.1.5': 'hf.motion', '3.3.1.6': 'hf.vision', '3.3.1.7': 'hf.motion',
  '3.3.2.1': 'hf.body', '3.3.2.2': 'hf.body', '3.3.2.3': 'hf.body emg.imc', '3.3.2.4': 'hf.body emg.imc', '3.3.2.5': 'hf.self hf.motion hf.fatigue',
  '3.3.3.1': 'adm.error', '3.3.3.2': 'adm.error', '3.3.3.3': 'hf.adm adm.risk', '3.3.3.4': 'crm.crm adm.check hf.srm', '3.3.3.5': 'hf.attitude',
  '3.3.3.6': 'crm.auto inst.ap', '3.3.3.7': 'crm.tem', '3.3.3.8': 'hf.self jlaw.pic',
  // 4 航空通信
  '4.1.1.1': 'jatc.ats', '4.1.1.2': 'jatc.ats', '4.1.1.3': 'jatc.ats', '4.1.1.4': 'jatc.ats',
  '4.1.2.1': 'jatc.emerg', '4.1.2.2': 'jatc.emerg', '4.1.2.3': 'jatc.emerg', '4.1.2.4': 'jatc.emerg comm.mayday',
  '4.1.3.1': 'jair.ais', '4.1.3.2': 'jair.ais', '4.1.3.3': 'jair.ais', '4.1.4.1': 'jair.fpl', '4.1.4.2': 'jair.fpl', '4.1.5.1': 'jatc.ats', '4.1.5.2': 'jlaw.airport nav.vor',
  '4.2.1.1': 'jatc.phrase jifr.atc', '4.2.1.2': 'jatc.phrase', '4.2.1.3': 'jatc.phrase',
  '4.2.2.1': 'jatc.ats', '4.2.2.2': 'jatc.ats', '4.2.2.3': 'jatc.phrase', '4.2.2.4': 'jatc.phrase', '4.2.2.5': 'jatc.phrase', '4.2.2.6': 'jatc.phrase jair.rules', '4.2.2.7': 'jatc.phrase comm.numbers',
  '4.2.3.1': 'jatc.ad', '4.2.3.2': 'jatc.ad', '4.2.3.3': 'jatc.ad', '4.2.3.4': 'jatc.ad', '4.2.3.5': 'jatc.ad', '4.2.3.6': 'jatc.ad jatc.emerg', '4.2.3.7': 'jatc.ad',
  '4.2.4.1': 'jatc.ad jair.vfr', '4.2.4.2': 'jatc.ad jair.vmc', '4.2.4.3': 'jair.vfr',
  '4.2.5.1': 'jatc.radar', '4.2.5.2': 'jatc.radar', '4.2.5.3': 'jatc.radar', '4.2.5.4': 'jatc.radar', '4.2.5.5': 'jatc.radar', '4.2.5.6': 'jatc.radar jatc.ats', '4.2.5.7': 'jatc.phrase', '4.2.5.8': 'jatc.radar',
  '4.2.6.1': 'jatc.radar ops.wake', '4.2.6.2': 'jatc.radar ops.wake', '4.2.6.3': 'jatc.radar', '4.2.6.4': 'ops.wake', '4.2.7': 'jatc.emerg', '4.2.8': 'jair.airspace jair.ais',
  // 5 航空法規
  '5.1': 'jlaw.system', '5.2.1': 'jlaw.system', '5.2.2': 'jlaw.aircraft', '5.2.3': 'jlaw.aircraft', '5.2.4': 'jlaw.license jifr.rules', '5.2.5': 'jlaw.airport',
  '5.2.6': 'jlaw.aircraft jlaw.pic jlaw.ops jair.rules jair.vfr jair.fpl jair.airspace jair.ais jifr.rules', '5.2.7': 'jlaw.business',
};
// --- 計器飛行証明 -------------------------------------------------------------------------------------------
const IR = {
  '1.1.1.1': 'navb.earth nav.gps ifr.pbn', '1.1.1.2': 'navb.wind', '1.1.1.3': 'ifr.chart jifr.chart jifr.enr',
  '1.1.2.1': 'nav.vor nav.dme nav.gps', '1.1.2.2': 'nav.log', '1.1.2.3': 'nav.vor ifr.ils nav.gps ifr.pbn sys.compass', '1.1.2.4': 'ifr.scan ifr.upset ifr.hold',
  '1.2.1.1': 'jifr.appr', '1.2.1.2': 'jifr.hold jifr.appr ifr.ils', '1.2.1.3': 'jifr.dep', '1.2.1.4': 'jifr.minima',
  '1.2.2.1': 'jifr.enr', '1.2.2.2': 'jifr.enr', '1.2.2.3': 'jifr.enr', '1.2.3.1': 'jifr.enr jifr.atc', '1.2.3.2': 'jifr.enr jifr.atc', '1.2.3.3': 'jair.airspace', '1.2.3.4': 'jair.ais', '1.2.3.5': 'ifr.pbn jifr.chart',
  '2.1': 'inst.pfd', '2.2': 'sys.eis inst.flow', '2.3': 'inst.gyro inst.pfd', '2.4': 'sys.g1000 inst.speed inst.alt', '2.5.1': 'nav.vor nav.dme nav.adf ifr.ils', '2.5.2': 'comm.xpdr jet.fms',
  '3.1.1.1': 'wx.atm', '3.1.1.2': 'wx.atm inst.alt', '3.1.1.3': 'wx.cloud', '3.1.1.4': 'wx.stab', '3.1.2.1': 'wx.cloud wx.metar', '3.1.2.2': 'wx.cloud', '3.1.2.3': 'wx.fog',
  '3.2.1.1': 'wx.wind', '3.2.1.2': 'wx.wind jwx.upper', '3.2.1.3': 'wx.wind', '3.2.2.1': 'wx.front jwx.season', '3.2.2.2': 'jwx.season',
  '3.2.3.1': 'wx.front', '3.2.3.2': 'wx.front', '3.2.3.3': 'jwx.season', '3.2.4.1': 'wx.wind wx.front', '3.2.4.2': 'wx.front jwx.surface jwx.upper', '3.2.4.3': 'wx.front jwx.season', '3.2.4.4': 'jwx.season jwx.surface',
  '3.2.5': 'jwx.season wx.ts', '3.3.1.1': 'wx.turb jwx.upper', '3.3.1.2': 'wx.turb jwx.upper', '3.3.2.1': 'wx.turb', '3.3.2.2': 'wx.shear jwx.local', '3.3.2.3': 'wx.ts jet.fms', '3.3.2.4': 'wx.ice tsys.env tsys.turbine',
  '3.3.2.5': 'wx.fog', '3.3.2.6': 'jwx.local', '3.4.1': 'jwx.surface jwx.upper', '3.4.2': 'jwx.upper',
  '4.1': 'jwx.report', '4.2': 'jwx.report wx.metar wx.taf', '4.3': 'jwx.upper',
  '5.1': 'jair.fpl jifr.rules', '5.2': 'nav.log jifr.rules', '5.3': 'jair.fpl jifr.rules',
  '6.1': 'jlaw.system', '6.2': 'jlaw.license jifr.rules', '6.3': 'jlaw.airport', '6.4': 'jifr.rules jair.rules jlaw.ops jlaw.aircraft jair.fpl jair.ais',
  '7.1.1': 'jatc.emerg', '7.1.2.1': 'jair.ais', '7.1.2.2': 'jair.ais',
  '7.2.1.1': 'jifr.atc', '7.2.1.2': 'jatc.phrase jifr.atc', '7.2.1.3': 'jifr.atc', '7.2.1.4': 'jifr.atc',
  '7.2.2.1': 'jatc.ats', '7.2.2.2': 'jatc.ats', '7.2.2.3': 'jatc.phrase', '7.2.2.4': 'jatc.phrase', '7.2.2.5': 'jifr.atc', '7.2.2.6': 'jatc.phrase jair.rules', '7.2.2.7': 'jatc.phrase',
  '7.2.3.1': 'jatc.ad', '7.2.3.2': 'jatc.radar', '7.2.4.1': 'jifr.atc', '7.2.4.2': 'jifr.atc jifr.dep', '7.2.4.3': 'jifr.atc jifr.enr', '7.2.4.4': 'jifr.atc jifr.hold', '7.2.4.5': 'jifr.atc jifr.appr',
  '7.2.5.1': 'jatc.radar', '7.2.5.2': 'jatc.radar', '7.2.5.3': 'jatc.radar', '7.2.5.4': 'jatc.radar jifr.atc', '7.2.5.5': 'jatc.radar jifr.atc', '7.2.5.6': 'jifr.atc', '7.2.5.7': 'jifr.atc',
  '7.2.5.8': 'jifr.atc', '7.2.5.9': 'jifr.atc', '7.2.5.10': 'jifr.atc', '7.2.5.11': 'jatc.radar', '7.2.6': 'jatc.radar ops.wake', '7.2.7': 'jatc.emerg', '7.2.8': 'jair.airspace jair.ais',
  '8.1': 'hf.altitude', '8.2.1': 'hf.body', '8.2.2': 'hf.body', '8.2.3': 'hf.body emg.imc ifr.scan', '8.2.4': 'hf.body emg.imc', '8.2.5': 'hf.self hf.motion', '8.3.1': 'adm.error', '8.3.2': 'adm.error', '8.3.3': 'hf.adm',
};
// --- 自家用操縦士（飛行機）: the headings not shaped like the CPL ones (the rest copy the CPL row of the same path) ---
const PPL_ONLY = {
  '1.2.1.1': 'sys.gear', '1.2.1.2': 'sys.gear', '1.2.2': 'sys.fuel', '1.2.3': 'sys.elec', '1.2.4': 'wx.ice',
  '1.2.5.1': 'inst.pfd sys.eis', '1.2.5.2': 'inst.gyro', '1.2.5.3': 'inst.gyro ifr.vacuum', '1.2.5.4': 'sys.g1000 inst.alt inst.speed', '1.2.5.5': 'sys.compass navb.north nav.vor', '1.2.5.6': 'comm.xpdr',
  '1.2.6.1': 'sys.piston', '1.2.6.2': 'sys.piston', '1.2.6.3': 'sys.piston sys.engine', '1.2.6.4': 'sys.piston sys.fuel', '1.2.6.5': 'aero.left', '1.2.6.6': 'sys.engine',
  '1.2.6.7': 'sys.carb sys.engine', '1.2.6.8': 'sys.engine ground.start', '1.2.6.9': 'sys.eis', '1.2.6.10': 'sys.eis', '1.2.6.11': 'sys.engine sys.eis',
  '1.2.7': 'sys.elec', '1.2.8': 'sys.radio radio.equip', '1.3.2': 'perf.wbex wb.graph', '3.1.2.6': 'nav.pnr',
};
// --- law topics → sections (the headings that list many articles) ---------------------------------------------
const LAW_TOPICS = [
  [/国籍|航空日誌|備え付ける書類|安全確保のための装置|状況記録のための装置|救急用具|航空機の灯火|登録|耐空|型式証明|修理改造|整備|運用限界|飛行規程|用途の指定/, 'jlaw.aircraft'],
  [/航空機の燃料/, 'jair.fpl'],
  [/乗り組ませなければならない|携帯する書類|最近の飛行経験|特定操縦技能|危難の場合|報告の義務/, 'jlaw.ops'],
  [/アルコール|薬物|身体障害|見張り|機長の権限|出発前の確認|安全阻害/, 'jlaw.pic'],
  [/離着陸の場所|飛行禁止区域|最低安全高度|捜索又は救助|巡航高度|速度の制限|衝突予防|進路権|編隊飛行|粗暴な操縦|爆発物|物件の曳航|物件の投下|落下傘|曲技飛行|操縦練習飛行/, 'jair.rules'],
  [/間隔の維持|地上移動|空港等付近の航行方法|航空交通管制圏における飛行|航空交通の指示|航空交通情報の入手/, 'jair.vfr'],
  [/民間訓練試験空域/, 'jair.airspace'],
  [/計器飛行及び計器航法|計器気象状態における飛行|計器飛行方式による飛行|特別な方式による航行|計器飛行証明|計器飛行等の練習/, 'jifr.rules'],
  [/飛行計画|到着の通知/, 'jair.fpl'],
  [/情報の提供|おそれのある情報/, 'jair.ais'],
  [/技能証明|欠格|業務範囲|試験の実施|限定|航空身体検査|航空英語|操縦教育証明|操縦練習$|航空機の操縦練習/, 'jlaw.license'],
  [/空港等の設置|航空保安無線施設|航空灯台|飛行場灯火|物件の制限|航空障害灯|昼間障害標識|類似灯火|禁止行為|航空路の指定/, 'jlaw.airport'],
  [/定義|目的|総則/, 'jlaw.system'],
];
// a topic no pattern names takes the heading's own home (申請・資格 under 航空機の安全性 are the airworthiness ones)
const LAW_DEFAULT = { 登録: 'jlaw.aircraft', 航空機の安全性: 'jlaw.aircraft', 航空従事者: 'jlaw.license', '航空路、空港等及び航空保安施設': 'jlaw.airport', 総則: 'jlaw.system' };
function topicMap(row) {
  if (!/航空法規/.test(row.subject) || row.topics.length < 4) return null;
  const out = {};
  for (const t of row.topics) {
    let hit = null;
    if (/^(申請|資格)$/.test(t) && LAW_DEFAULT[row.title]) hit = LAW_DEFAULT[row.title];
    if (!hit) for (const [re, sec] of LAW_TOPICS) if (re.test(t)) { hit = sec; break; }
    // the instrument-rating syllabus asks these articles for IFR flight: the IR law section (jifr.rules)
    if (row.doc === 'ir' && /航空機の燃料|最近の飛行経験|航空交通管制圏における飛行|航空交通の指示|航空交通情報の入手/.test(t)) hit = 'jifr.rules';
    out[t] = [hit || LAW_DEFAULT[row.title]].filter(Boolean);
  }
  return out;
}

const rows = [];
const mapFor = (doc, leaf, cplByPath) => {
  const local = leaf.id.slice(doc.length + 1);
  if (doc === 'cpl') return CPL[local];
  if (doc === 'ir') return IR[local];
  if (PPL_ONLY[local]) return PPL_ONLY[local];
  const twin = cplByPath.get(pathKey(leaf));
  return twin ? CPL[twin.id.slice(4)] : undefined;
};
const pathKey = l => l.subject + '|' + l.path.slice(1).map(x => x.replace(/^\S+\s/, '')).join('|');
const parsed = Object.fromEntries(Object.keys(SYLLABI).map(k => [k, parseSyllabus(k)]));
const cplByPath = new Map(parsed.cpl.leaves.map(l => [pathKey(l), l]));
const cplByTitle = new Map(parsed.cpl.leaves.filter(l => l.subject === '航空気象').map(l => [l.title, l]));
const problems = [];
for (const doc of ['cpl', 'ir', 'ppl']) for (const leaf of parsed[doc].leaves) {
  const m = mapFor(doc, leaf, cplByPath);
  if (!m) { problems.push(`no map: ${leaf.id} ${leaf.title}`); continue; }
  const sections = sp(m);
  for (const s of sections) if (!BOOK.secs.has(s)) problems.push(`unknown section ${s} in ${leaf.id}`);
  const missing = sections.filter(s => BOOK.secs.get(s)?.isNew);
  const sameAs = doc === 'ppl' && !PPL_ONLY[leaf.id.slice(4)] ? cplByPath.get(pathKey(leaf))?.id : doc === 'ir' && leaf.subject === '航空気象' ? cplByTitle.get(leaf.title)?.id || null : null;
  const parts = new Set(sections.map(s => BOOK.secs.get(s)?.part));
  const row = {
    id: leaf.id, doc, docTitle: SYLLABI[doc].title, subject: leaf.subject, label: leaf.label, path: leaf.path, title: leaf.title, topics: leaf.topics,
    sections, topicMap: null, sameAs: sameAs || null,
    japan: parts.size === 1 && parts.has('p7') ? 'jp' : parts.has('p7') ? 'mixed' : 'common',
    excluded: null,
    status: missing.length ? 'open' : 'mapped', missing,
    unit: 'W42', writers: [...new Set(missing.map(unitForDest))],
    where: null, by: null, checkedBy: null, note: '',
  };
  row.topicMap = topicMap(row);
  if (row.topicMap) for (const [t, s] of Object.entries(row.topicMap)) { if (!s.length) problems.push(`topic without section: ${leaf.id} ${t}`); for (const x of s) if (!sections.includes(x)) problems.push(`topic section ${x} not in row sections: ${leaf.id}`); }
  rows.push(row);
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
const by = (k, f) => rows.reduce((a, r) => { const v = f ? f(r) : r[k]; a[v] = (a[v] || 0) + 1; return a; }, {});
const out = {
  ledger: 'JCAB-MAP', version: 1, updated: DATE, by: 'W03',
  about: 'JCAB「航空従事者技能証明学科試験出題範囲参考」（事業用操縦士（飛行機）・計器飛行証明、照合用に自家用操縦士（飛行機））の全見出し × 合本の節（DESIGN 3.3・3.6・5 章の基準 12）。行は末端の見出し（親の見出しは path に）。sections は DESIGN 3.3 の目次の節。status：open（節がまだない）・mapped（節は今の本にあるが JCAB の深さは未確認）・confirmed（W42・W45 が確かめた）・excluded（対象外（理由））。未対応ゼロを W42 で確かめる',
  sources: Object.fromEntries(Object.entries(SYLLABI).map(([k, v]) => [k, { title: `航空従事者技能証明学科試験出題範囲参考 ${v.title}`, url: v.url, ref: v.ref, copy: `ledgers/src/sources/mlit/${v.file}`, made: '2024-08-01（PDF の作成日）', fetched: DATE, note: '出題範囲を限定するものではない、と資料自身が書く' }])),
  headings: Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, { all: v.headings.length, leaves: v.leaves.length }])),
  counts: { rows: rows.length, byDoc: by('doc'), byStatus: by('status'), byJapan: by('japan'), excluded: rows.filter(r => r.excluded).length, unmapped: rows.filter(r => !r.sections.length && !r.excluded).length },
  rows,
};
console.log(JSON.stringify(out.headings), JSON.stringify(out.counts));
export const JCAB_MAP = out;
if (import.meta.url === `file://${process.argv[1]}`) writeLedger(OUT, out);
