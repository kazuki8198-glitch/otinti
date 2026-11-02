// Avionics equivalence (JS reference): tune / control / navSolve / alerts.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = path.resolve(process.env.HOME + '/workspace/cadet-wt-all/flight-lab/src');
const FL = {};
const g = { FL, console, Math, JSON };
vm.createContext(g);
for (const f of ['physics.js', 'avionics.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), g, { filename: f });
const A = FL.avionics, P = FL.physics;

const out = [];
const stable = (v) => {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  const o = {};
  for (const k of Object.keys(v).sort()) { const x = stable(v[k]); if (x !== undefined) o[k] = x; }
  return o;
};
const emit = (o) => out.push(JSON.stringify(stable(o)));

// tune sweeps
for (const kind of ['COM', 'NAV'])
  for (const start of [118000, 121700, 136975, 108000, 113500, 117950])
    for (const part of ['MHz', 'kHz'])
      for (const dir of [-1, 1])
        emit({ tag: 'tune', kind, start, part, dir, r: A.tune(start, part, dir, kind) });

// control script on one avionics state
{
  const av = A.createAvionics();
  const script = [
    ['HDG', 1], ['HDG', -1, true], ['ALT', 1], ['ALT', -1, true], ['BARO', 1], ['BARO', -30], ['STD_BARO'], ['CRS', 5], ['CRS', -370],
    ['COM_MHZ', 1], ['COM_KHZ', -1], ['COM_SWAP'], ['COM_SEL'], ['COM_KHZ', 3], ['NAV_MHZ', -1], ['NAV_KHZ', 1], ['NAV_SWAP'], ['NAV_SEL'],
    ['CDI'], ['CDI'], ['CDI'], ['MIC'], ['MON', 'COM2'], ['MFD_PAGE'], ['MFD_PAGE'], ['NRST_SEL', 1], ['KEY_ENT'],
    ['PROC'], ['PROC'], ['PROC'], ['PROC_RNAV'], ['PROC_RNAV'], ['PROC_RNAV'],
    ['XPDR'], ['XPDR_DIGIT', 4], ['XPDR_DIGIT', 5], ['XPDR_DIGIT', 2], ['XPDR_DIGIT', 7], ['XPDR_MODE'], ['XPDR_IDENT'], ['XPDR_BKSP'],
    ['OBS'], ['BRG1'], ['BRG1'], ['BRG2'], ['RANGE', 1], ['RANGE', -9], ['NORTH_UP'], ['WIND'], ['ALERTS'], ['ALERTS'],
    ['MFD_FPL'], ['KEY_ENT'], ['FPL_PICK', 2], ['FPL_INSERT'], ['FPL_NEXT', 1], ['FPL_INSERT'], ['KEY_CLR'], ['KEY_CLR'],
    ['FPL_NEXT', 1], ['DIRECT', 'LABEC'], ['KEY_CLR'], ['ALT_UNIT'], ['HDG_SYNC', 123],
  ];
  const rets = script.map(([w, d, big]) => A.control(av, w, d, big));
  emit({ tag: 'control', rets, av });
}

// navSolve grid
{
  const positions = [
    { n: 0, e: -40000 }, { n: 9000, e: -34000 }, { n: 5000, e: -30000 }, { n: 4000, e: -30000 },
    { n: -10000, e: -39000 }, { n: 20000, e: -25000 }, { n: -4600, e: -40000 }, { n: 30000, e: -10000 },
  ];
  const setups = [
    (av) => {},
    (av) => { av.direct = 'LABED'; },
    (av) => { av.obs = true; av.crs = 90; },
    (av) => { av.cdi = 'NAV1'; av.nav1.act = 113500; av.crs = 270; },
    (av) => { av.cdi = 'NAV1'; av.nav1.act = 109900; },
    (av) => { av.cdi = 'NAV2'; av.nav2.act = 110300; },
    (av) => { A.control(av, 'PROC_RNAV'); },
    (av) => { av.fail = { gps: true }; },
    (av) => { av.fpl.active = 2; },
  ];
  for (const setup of setups)
    for (const pos of positions)
      for (const altTrue of [255, 2000, 4500])
      {
        const av = A.createAvionics(); setup(av);
        const nav = A.navSolve(av, pos, { gs: 95, altTrue }, P.MAGVAR_W, P.LAB_RWY);
        emit({ tag: 'nav', nav, nrts: av._nrts });
      }
}

// collectAlerts
{
  const cases = [
    { o: { volts: 11.9, amps: -2, rpm: 2000, oilP: [60], fuel: [10, 10], fuelPress: 1 }, d: { eng: [{ run: true }] } },
    { o: { volts: 14, amps: 5, rpm: 2000, oilP: [10, 60], fuel: [2, 10], fuelPress: 0.3 }, d: { eng: [{ run: true }, { run: true }] } },
    { o: { volts: 14, amps: 5, rpm: 0, oilP: [0], fuel: [1, 1] }, d: { eng: [{ run: false }] } },
    { o: { alerts: ['CUSTOM', { id: 'X1', level: 'warn', text: 'X one' }, { text: 'no id' }] }, d: {} },
    { o: { volts: 12.6, amps: 0, rpm: 0, oilP: [], fuel: [20, 20], fuelPress: 0 }, d: { eng: [{ run: false }] } },
  ];
  for (const c of cases) emit({ tag: 'alerts', r: A.collectAlerts(null, c.o, c.d) });
}

emit({ tag: 'misc', xpdrGnd: A.xpdrEffMode(A.createAvionics(), true), xpdrAir: A.xpdrEffMode(A.createAvionics(), false),
  fpl: A.fplCatalog(), hdgFmt: [0, 1, 359.6, 360, 720].map(x => A.hdgFmt(x)), ete: [null, 0, 65, 3661].map(x => A.eteFmt(x)) });

fs.writeFileSync(new URL('./digest-av-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('av js digest lines:', out.length);
