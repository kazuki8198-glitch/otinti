// Stage 10 data extraction: line.js's tables + free-mode golden combinations.
import fs from 'node:fs';
const T = '/home/hatch/workspace/cadet-wt-free/cadet/src';
const line = await import(T + '/flight/line.js');
const data = {
  ROUTES: line.ROUTES, CAPTAINS: line.CAPTAINS, DISPATCH_CASES: line.DISPATCH_CASES,
  PM_TASK_TEMPLATES: line.PM_TASK_TEMPLATES, PM_TASKS_PER_RIDE: line.PM_TASKS_PER_RIDE, EVENT_KINDS: line.EVENT_KINDS,
};
fs.writeFileSync('/home/hatch/workspace/cadet-unity/data/line.json', JSON.stringify(data));
console.log('line.json:', data.ROUTES.length, 'routes,', data.DISPATCH_CASES.length, 'dispatch cases,', data.PM_TASK_TEMPLATES.length, 'task templates');

const fm = await import(T + '/content/free-mode.js');
const combos = [];
const realNow = Date.now;
Date.now = () => 1700000000000;
for (const aircraft of fm.FREE_AIRCRAFT.map(x => x[0]))
  for (const start of fm.FREE_STARTS.map(x => x[0]))
    combos.push({ sel: { aircraft, start, hour: '15', wind: 'cross', loading: 'heavy', fail: 'pitot', failWhen: 'alt', failAlt: '5000' }, cfg: fm.buildFreeCfg({ aircraft, start, hour: '15', wind: 'cross', loading: 'heavy', fail: 'pitot', failWhen: 'alt', failAlt: '5000' }) });
for (const wind of fm.FREE_WIND_OPTS.map(x => x[0])) { const f = { aircraft: 'pa28', start: 'rwy', hour: 9, wind, windRel: '45', windKt: '12', loading: 'std', fail: 'none', failWhen: 'time', failMin: '7' }; combos.push({ sel: f, cfg: fm.buildFreeCfg(f) }); }
for (const fail of fm.FREE_FAIL_OPTS.map(x => x[0])) { const f = { aircraft: 'b737', start: 'area', hour: 0, wind: 'calm', loading: 'light', fail, failWhen: 'now' }; combos.push({ sel: f, cfg: fm.buildFreeCfg(f) }); }
combos.push({ sel: { sim: {} }, cfg: fm.simDeviceCfg({}) });
combos.push({ sel: { sim: { aircraft: 'pa44', start: 'area' } }, cfg: fm.simDeviceCfg({ aircraft: 'pa44', start: 'area' }) });
Date.now = realNow;
fs.writeFileSync('/home/hatch/workspace/cadet-unity/flight/test/golden-freemode.json', JSON.stringify({
  FREE_AIRCRAFT: fm.FREE_AIRCRAFT, FREE_STARTS: fm.FREE_STARTS, FREE_HOURS: fm.FREE_HOURS,
  FREE_WIND_OPTS: fm.FREE_WIND_OPTS, FREE_WIND_MAP: fm.FREE_WIND_MAP, FREE_LOAD_OPTS: fm.FREE_LOAD_OPTS,
  FREE_LOAD_MAP: fm.FREE_LOAD_MAP, FREE_FAIL_OPTS: fm.FREE_FAIL_OPTS, combos,
}));
console.log('freemode golden combos:', combos.length);
