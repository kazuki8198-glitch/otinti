// FLIGHT LAB — avionics.js
// The G1000-TYPE (G1000型) displays of the teaching cockpit: the arithmetic behind them (headings, magnetic
// variation, the altimeter setting, radio frequencies in 25 kHz steps, the CDI, distances, cross-track, ETE)
// and the drawing of the PFD (left) and the MFD (right) on canvases. This is a teaching layout that follows the
// G1000's arrangement and basic ideas; it is NOT a copy of the Garmin software and not for navigation.
// No autopilot: the heading bug and the selected altitude are references only — the aircraft does not follow them.
(function (FL) {
  'use strict';
  const DEG = Math.PI / 180, NM = 1852;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const wrap360 = a => ((a % 360) + 360) % 360;
  const wrap180 = a => ((a + 540) % 360) - 180;
  const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);

  // ---------------------------------------------------------------- headings and magnetic variation
  // variation in degrees, positive WEST (Sanford area: about 6°W as a teaching value; charts give the current one).
  // "East is least, west is best": magnetic = true + west variation.
  const trueToMag = (t, varW) => wrap360(t + varW);
  const magToTrue = (m, varW) => wrap360(m - varW);
  const hdgDiff = (a, b) => wrap180(b - a);        // shortest turn from a to b, + = right
  const hdgFmt = h => String(Math.round(wrap360(h)) || 360).padStart(3, '0');   // 000 shown as 360

  // ---------------------------------------------------------------- the altimeter setting (teaching approximation)
  // Indicated altitude = true altitude + (setting - actual sea-level pressure) × 1,000 ft per inHg.
  // A setting HIGHER than the real pressure makes the altimeter read HIGHER than the aircraft really is.
  const FT_PER_INHG = 1000;
  const indicatedAlt = (altTrueFt, qnhActual, setting) => altTrueFt + (setting - qnhActual) * FT_PER_INHG;
  const inhgToHpa = v => v * 33.8639;
  const hpaToInhg = v => v / 33.8639;

  // ---------------------------------------------------------------- radios (kHz integers: no float drift)
  const COM_MIN = 118000, COM_MAX = 136975, COM_STEP = 25;
  const NAV_MIN = 108000, NAV_MAX = 117950, NAV_STEP = 50;
  // the outer knob (MHz) and the inner knob (kHz) of a frequency, wrapping like the panel's knobs
  function tune(kHz, part, dir, kind = 'COM') {
    const [mn, mx, st] = kind === 'NAV' ? [NAV_MIN, NAV_MAX, NAV_STEP] : [COM_MIN, COM_MAX, COM_STEP];
    let mhz = Math.floor(kHz / 1000), k = kHz % 1000;
    if (part === 'MHz') {
      const lo = Math.floor(mn / 1000), hi = Math.floor(mx / 1000);
      mhz += dir; if (mhz > hi) mhz = lo; if (mhz < lo) mhz = hi;
    } else {
      k += dir * st; if (k >= 1000) k = 0; if (k < 0) k = 1000 - st;
    }
    return clamp(mhz * 1000 + k, mn, mx);
  }
  const fmtCom = kHz => (kHz / 1000).toFixed(3);
  const fmtNav = kHz => (kHz / 1000).toFixed(2);
  const validCom = kHz => Number.isInteger(kHz) && kHz >= COM_MIN && kHz <= COM_MAX && kHz % COM_STEP === 0;

  // ---------------------------------------------------------------- positions: the local plane and lat/lon
  // The sim's world is a flat local plane (north, east in metres) around the display origin near Sanford.
  const ORIGIN = { lat: 28.777, lon: -81.238 };
  const R_E = 6371008.8;
  const neToLatLon = (n, e, o = ORIGIN) => ({ lat: o.lat + n / R_E / DEG, lon: o.lon + e / (R_E * Math.cos(o.lat * DEG)) / DEG });
  const latLonToNe = (lat, lon, o = ORIGIN) => ({ n: (lat - o.lat) * DEG * R_E, e: (lon - o.lon) * DEG * R_E * Math.cos(o.lat * DEG) });
  // great-circle distance (nm) and initial true bearing between two lat/lon points
  function gcDistNm(a, b) {
    const f1 = a.lat * DEG, f2 = b.lat * DEG, df = (b.lat - a.lat) * DEG, dl = (b.lon - a.lon) * DEG;
    const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return 2 * R_E * Math.asin(Math.min(1, Math.sqrt(h))) / NM;
  }
  function gcBearing(a, b) {
    const f1 = a.lat * DEG, f2 = b.lat * DEG, dl = (b.lon - a.lon) * DEG;
    return wrap360(Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) / DEG);
  }
  // on the local plane (short distances): distance nm, true bearing
  const neDistNm = (a, b) => Math.hypot(b.n - a.n, b.e - a.e) / NM;
  const neBearing = (a, b) => wrap360(Math.atan2(b.e - a.e, b.n - a.n) / DEG);
  // cross-track distance (nm) of point p from the leg a→b: positive when p is RIGHT of the course
  function xtkNm(a, b, p) {
    const dx = b.e - a.e, dy = b.n - a.n, L = Math.hypot(dx, dy) || 1;
    return ((p.e - a.e) * dy - (p.n - a.n) * dx) / L / NM;
  }
  // along-track distance remaining to b (nm)
  function atkToGoNm(a, b, p) {
    const dx = b.e - a.e, dy = b.n - a.n, L = Math.hypot(dx, dy) || 1;
    return (L - ((p.e - a.e) * dx + (p.n - a.n) * dy) / L) / NM;
  }
  // ETE (seconds) for a distance at a ground speed; null when not moving
  const eteSec = (distNm, gsKt) => (gsKt > 5 ? distNm / gsKt * 3600 : null);
  const eteFmt = s => (s == null || !Number.isFinite(s) ? '--:--' : s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}` : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

  // ---------------------------------------------------------------- the CDI
  // dots: + = needle RIGHT (the course is to the right of the aircraft: fly right). The G1000 HSI scale: two dots each
  // side, full-scale deflection at the second dot (the needle pegs a little beyond, at 2.5).
  // GPS: from the cross-track distance and the full-scale distance (nm; the G1000 uses 2.0 en route, 1.0 terminal, 0.3 approach)
  const cdiGps = (xtk, fullScaleNm = 1.0) => clamp(-xtk / fullScaleNm * 2, -2.5, 2.5);
  // VOR: from the radial the aircraft is on and the selected course (OBS); ±10° full scale (5° a dot); TO / FROM
  function cdiVor(radial, obs) {
    const off = wrap180(radial - obs), from = Math.abs(off) < 90;
    const devDeg = from ? wrap180(obs - radial) : wrap180(radial - obs - 180);
    return { dots: clamp(devDeg / 5, -2.5, 2.5), toFrom: from ? 'FROM' : 'TO', devDeg };
  }
  // localizer: ±2.5° full scale (1.25° a dot; real localizers are tailored to about 700 ft wide at the threshold);
  // glide slope: ±0.7° full scale (0.35° a dot; + = the path is above: fly up)
  function cdiLoc(angleOffDeg) { return clamp(-angleOffDeg / 1.25, -2.5, 2.5); }
  const gsDots = (aboveDeg) => clamp(-aboveDeg / 0.35, -2.5, 2.5);

  // ---------------------------------------------------------------- fictional training points (架空訓練点)
  // Positions on the local plane (metres from the display origin). NOT real fixes, NOT for navigation.
  const WAYPOINTS = [
    { id: 'LABRW', name: 'LAB RWY 36（架空）', n: -1200, e: -40000, kind: 'apt' },
    { id: 'LABEA', name: 'LAB-A（架空）', n: 9000, e: -34000, kind: 'wpt' },
    { id: 'LABEB', name: 'LAB-B（架空）', n: 15000, e: -21000, kind: 'wpt' },
    { id: 'LABEC', name: 'LAB-C（架空）', n: -6000, e: -24000, kind: 'wpt' },
    { id: 'LABED', name: 'LAB-D（架空）', n: -16000, e: -38000, kind: 'wpt' },
    { id: 'LABEF', name: 'LAB-F（架空・目的地変更先）', n: -2000, e: -33000, kind: 'wpt' },
    { id: 'SFBVW', name: 'Sanford 概略表示原点（模式図）', n: 0, e: 0, kind: 'ref' },
  ];
  const wpt = id => WAYPOINTS.find(w => w.id === id);
  // fictional radio aids for the CDI practice: a VOR-like station and a localizer for LAB RWY 36
  const NAVAIDS = [
    { id: 'LBV', name: 'LAB VOR（架空局）', freq: 113500, n: 4000, e: -30000, type: 'VOR' },
    { id: 'ILAB', name: 'I-LAB LOC 36（架空）', freq: 109900, type: 'LOC' },
  ];

  // ---------------------------------------------------------------- the avionics state and its controls
  function createAvionics() {
    return {
      com1: { act: 118300, stby: 121700 }, com2: { act: 126950, stby: 120100 },   // (teaching frequencies, not real assignments)
      nav1: { act: 109900, stby: 113500 }, nav2: { act: 113500, stby: 110300 },
      audio: { mic: 'COM1', monitor: { COM1: true, COM2: false, NAV1: false, NAV2: false } },
      comSel: 'COM1', navSel: 'NAV1',
      hdgBug: 360, altSel: 3000, baro: 29.92, baroUnit: 'IN', crs: 360,
      cdi: 'GPS',                 // GPS → VOR1/LOC1 → VOR2/LOC2 → GPS (the CDI softkey)
      obs: false,                 // GPS OBS mode: hold on the active waypoint with the CRS course (the OBS softkey)
      brg1: null, brg2: null,     // HSI bearing pointers: null | 'NAV1' | 'NAV2' | 'GPS'
      xpdrIdent: 0,               // seconds of IDENT left (the IDENT softkey; read by radio scoring as av.xpdrIdent > 0)
      fplEdit: false, fplCursor: 1, fplPick: 0,   // the FPL page's editor: cursor row, the catalog pick (FMS/ENT/CLR)
      nrstSel: 0,                 // the NRST page's cursor
      proc: null,                 // a loaded procedure (A2-lite): { name: 'ILS 36', missed: bool } | null
      _ack: {},                   // CAS: the alert ids the pilot has seen on the ALERTS page
      xpdr: { code: 1200, mode: 'ALT', entry: '' },   // the transponder: the code ATC assigns, set from the XPDR menu
      pfdMenu: 'TOP',             // the PFD's softkey level: TOP / PFD / ALTUNIT / XPDR
      wind: true, mfdPage: 'MAP', mfdRangeIdx: 4, mapNorthUp: true,
      fpl: { wps: ['LABRW', 'LABEA', 'LABEB'], active: 1 },
      direct: null, directFrom: null,   // D→ target id (overrides the flight plan leg) and where the D→ leg starts
      timer: 0,
    };
  }
  const RANGES = [0.5, 1, 2, 5, 10, 15, 20, 30, 50];     // nm (the MFD map range)
  // every control of the panel, one entry: returns a short description for the screen reader / the log
  function control(av, what, dir = 1, big = false) {
    switch (what) {
      case 'HDG': av.hdgBug = wrap360(Math.round(av.hdgBug + dir * (big ? 10 : 1))) || 360; return `HDG ${hdgFmt(av.hdgBug)}`;
      case 'HDG_SYNC': av.hdgBug = Math.round(dir) || 360; return `HDG ${hdgFmt(av.hdgBug)}`;
      case 'ALT': av.altSel = clamp(Math.round(av.altSel / 100) * 100 + dir * (big ? 1000 : 100), 0, 18000); return `ALT SEL ${av.altSel}`;
      case 'BARO': av.baro = +clamp(av.baro + dir * 0.01, 27.5, 31.5).toFixed(2); return `BARO ${av.baro.toFixed(2)}`;
      case 'STD_BARO': av.baro = 29.92; return 'BARO STD 29.92';
      case 'ALT_UNIT': av.baroUnit = av.baroUnit === 'IN' ? 'HPA' : 'IN'; return `BARO 単位 ${av.baroUnit}`;
      case 'CRS': av.crs = wrap360(Math.round(av.crs + dir * (big ? 10 : 1))) || 360; return `CRS ${hdgFmt(av.crs)}`;
      case 'COM_MHZ': { const c = av[av.comSel.toLowerCase()]; c.stby = tune(c.stby, 'MHz', dir); return `${av.comSel} STBY ${fmtCom(c.stby)}`; }
      case 'COM_KHZ': { const c = av[av.comSel.toLowerCase()]; c.stby = tune(c.stby, 'kHz', dir); return `${av.comSel} STBY ${fmtCom(c.stby)}`; }
      case 'COM_SWAP': { const c = av[av.comSel.toLowerCase()]; [c.act, c.stby] = [c.stby, c.act]; return `${av.comSel} ACT ${fmtCom(c.act)}`; }
      case 'COM_SEL': av.comSel = av.comSel === 'COM1' ? 'COM2' : 'COM1'; return `周波数の操作：${av.comSel}`;
      case 'NAV_MHZ': { const c = av[av.navSel.toLowerCase()]; c.stby = tune(c.stby, 'MHz', dir, 'NAV'); return `${av.navSel} STBY ${fmtNav(c.stby)}`; }
      case 'NAV_KHZ': { const c = av[av.navSel.toLowerCase()]; c.stby = tune(c.stby, 'kHz', dir, 'NAV'); return `${av.navSel} STBY ${fmtNav(c.stby)}`; }
      case 'NAV_SWAP': { const c = av[av.navSel.toLowerCase()]; [c.act, c.stby] = [c.stby, c.act]; return `${av.navSel} ACT ${fmtNav(c.act)}`; }
      case 'NAV_SEL': av.navSel = av.navSel === 'NAV1' ? 'NAV2' : 'NAV1'; return `周波数の操作：${av.navSel}`;
      case 'CDI': av.cdi = av.cdi === 'GPS' ? 'NAV1' : av.cdi === 'NAV1' ? 'NAV2' : 'GPS'; return `CDI ${cdiName(av)}`;
      case 'MIC': av.audio.mic = av.audio.mic === 'COM1' ? 'COM2' : 'COM1'; return `MIC ${av.audio.mic}（送信はできません）`;
      case 'MON': av.audio.monitor[dir] = !av.audio.monitor[dir]; return `${dir} 受信 ${av.audio.monitor[dir] ? 'ON' : 'OFF'}`;
      case 'MFD_PAGE': { const pages = ['MAP', 'FPL', 'ENGINE', 'SYSTEM', 'NRST']; av.mfdPage = pages[(pages.indexOf(av.mfdPage) + 1) % pages.length]; return `MFD ${av.mfdPage}`; }
      case 'MFD_MAP': av.mfdPage = 'MAP'; return 'MFD MAP';
      case 'MFD_FPL': av.mfdPage = 'FPL'; return 'MFD FPL';
      case 'MFD_ENG': av.mfdPage = 'ENGINE'; return 'MFD ENGINE';
      case 'MFD_SYS': av.mfdPage = 'SYSTEM'; return 'MFD SYSTEM';
      case 'MFD_NRST': av.mfdPage = 'NRST'; return 'MFD NRST — 最寄り';
      case 'NRST_SEL': av.nrstSel = clamp((av.nrstSel || 0) + dir, 0, WAYPOINTS.filter(p => p.kind !== 'ref').length - 1); return `NRST ${WAYPOINTS.filter(p => p.kind !== 'ref')[av.nrstSel].id}`;
      // the FPL editor (the bezel's ENT / CLR, the FMS knob as the cursor): ENT enters the editor, then
      // inserts the catalog pick at the cursor; CLR deletes the point at the cursor (the plan keeps ≥2)
      case 'FPL_PICK': { const cat = fplCatalog(); av.fplPick = (av.fplPick + dir + cat.length) % cat.length; return `挿入先 ${cat[av.fplPick]}`; }
      case 'FPL_INSERT': { if (!av.fplEdit) return ''; const cat = fplCatalog(), id = cat[av.fplPick]; const at = clamp(av.fplCursor, 0, av.fpl.wps.length);
        av.fpl.wps.splice(at, 0, id); if (at <= av.fpl.active) av.fpl.active++; av.direct = null; return `${id} を挿入（${av.fpl.wps.length} 点）`; }
      case 'FPL_DEL': { if (!av.fplEdit || av.fpl.wps.length <= 2) return av.fplEdit ? '計画は2点以上で' : ''; const at = clamp(av.fplCursor, 0, av.fpl.wps.length - 1);
        const [gone] = av.fpl.wps.splice(at, 1); if (at < av.fpl.active) av.fpl.active--; av.fpl.active = clamp(av.fpl.active, 1, av.fpl.wps.length - 1);
        av.fplCursor = clamp(av.fplCursor, 0, av.fpl.wps.length - 1); av.direct = null; return `${gone} を削除`; }
      case 'KEY_ENT': {
        if (av.mfdPage === 'NRST') { const list = av._nrts && av._nrts.length ? av._nrts : fplCatalog(); const id = list[clamp(av.nrstSel || 0, 0, list.length - 1)]; if (id) { av.direct = id; av.directFrom = null; av.mfdPage = 'MAP'; return `D→ ${id}`; } return ''; }
        if (av.mfdPage === 'FPL') { if (!av.fplEdit) { av.fplEdit = true; av.fplCursor = av.fpl.active; return 'FPL 編集：FMS で点と挿入先、ENT で挿入、CLR で削除'; } return control(av, 'FPL_INSERT'); }
        return ''; }
      case 'KEY_CLR': {
        if (av.fplEdit) return control(av, 'FPL_DEL');
        if (av.mfdPage === 'NRST') { av.mfdPage = 'MAP'; return 'MFD MAP'; }
        if (av.direct) { av.direct = null; av.directFrom = null; return 'D→ 解除'; }
        return ''; }
      // one hand-built procedure (A2-lite): the fictional ILS 36 at LAB, loaded from the PROC key; pressing
      // PROC again in the approach sequences the missed approach (direct to the hold point, 3,000 ft), a
      // third press unloads it. There is no procedure database behind this — it is the one approach LAB has.
      case 'PROC': {
        if (!av.proc) { av.proc = { name: 'ILS 36', missed: false }; av.nav1.act = 109900; av.cdi = 'NAV1'; return 'PROC：ILS 36 をロード（LOC 109.90）'; }
        if (!av.proc.missed) { av.proc.missed = true; av.direct = 'LABED'; av.directFrom = null; av.crs = 360; if (av.altSel < 3000) av.altSel = 3000; return 'ミストアプローチ：LAB-D へ直行・3,000 ft へ上昇'; }
        av.proc = null; return 'PROC 解除'; }
      case 'RANGE': av.mfdRangeIdx = clamp(av.mfdRangeIdx + dir, 0, RANGES.length - 1); return `RANGE ${RANGES[av.mfdRangeIdx]} NM`;
      case 'NORTH_UP': av.mapNorthUp = !av.mapNorthUp; return av.mapNorthUp ? 'MAP NORTH UP' : 'MAP TRACK UP';
      case 'PFD_MENU': av.pfdMenu = dir; return `PFD ${dir}`;
      case 'XPDR': av.pfdMenu = av.pfdMenu === 'XPDR' ? 'TOP' : 'XPDR'; av.xpdr.entry = ''; return `XPDR ${String(av.xpdr.code).padStart(4, '0')}`;
      case 'XPDR_DIGIT': { const x = av.xpdr; if (x.entry.length >= 4) x.entry = ''; x.entry += clamp(dir | 0, 0, 7);
        if (x.entry.length === 4) { x.code = parseInt(x.entry, 10); x.entry = ''; return `XPDR ${String(x.code).padStart(4, '0')} セット`; } return `XPDR ${x.entry}`; }
      case 'XPDR_BKSP': av.xpdr.entry = av.xpdr.entry.slice(0, -1); return `XPDR ${av.xpdr.entry || String(av.xpdr.code).padStart(4, '0')}`;
      case 'XPDR_MODE': { const modes = ['ALT', 'ON', 'STBY']; av.xpdr.mode = modes[(modes.indexOf(av.xpdr.mode) + 1) % modes.length]; return `XPDR ${av.xpdr.mode}`; }
      case 'XPDR_IDENT': av.xpdrIdent = 18; return 'XPDR IDENT — 18秒';
      case 'OBS': av.obs = !av.obs; return `OBS ${av.obs ? 'ON（CRS でコース）' : 'OFF'}`;
      case 'BRG1': { const srcs = [null, 'NAV1', 'GPS']; av.brg1 = srcs[(srcs.indexOf(av.brg1) + 1) % srcs.length]; return `BRG1 ${av.brg1 || 'OFF'}`; }
      case 'BRG2': { const srcs = [null, 'NAV2', 'GPS']; av.brg2 = srcs[(srcs.indexOf(av.brg2) + 1) % srcs.length]; return `BRG2 ${av.brg2 || 'OFF'}`; }
      case 'ALERTS': av.pfdMenu = av.pfdMenu === 'ALERTS' ? 'TOP' : 'ALERTS'; return av.pfdMenu === 'ALERTS' ? 'ALERTS — 警告一覧' : 'ALERTS 閉じる';
      case 'WIND': av.wind = !av.wind; return `WIND ${av.wind ? 'ON' : 'OFF'}`;
      case 'DIRECT': av.direct = dir || null; av.directFrom = null; return dir ? `D→ ${dir}` : 'D→ 解除';
      case 'FPL_NEXT': {
        // the FMS knob's meaning follows the page: on NRST it walks the cursor, in the FPL editor it walks
        // the edit cursor, everywhere else it advances the active leg (its original job)
        if (av.mfdPage === 'NRST') return control(av, 'NRST_SEL', dir);
        if (av.mfdPage === 'FPL' && av.fplEdit) { av.fplCursor = clamp(av.fplCursor + dir, 0, av.fpl.wps.length - 1); return `カーソル ${av.fpl.wps[av.fplCursor]}`; }
        av.fpl.active = clamp(av.fpl.active + dir, 1, av.fpl.wps.length - 1); av.direct = null; return `ACTIVE LEG → ${av.fpl.wps[av.fpl.active]}`; }
      default: return '';
    }
  }
  // the transponder's effective mode: ALT on the ground answers as GND (the GTX behaviour the radio syllabus
  // assumes), whatever the knob says; STBY / ON pass through
  const xpdrEffMode = (av, onGround) => (av.xpdr && av.xpdr.mode === 'ALT' && onGround ? 'GND' : av.xpdr ? av.xpdr.mode : 'ALT');
  // ---------------------------------------------------------------- the CAS (crew alerting) collector
  // One place that turns the aircraft's state into the alert stack the PFD draws. When the systems model
  // provides o.alerts (an array of strings, or { id, tier: 'WARN'|'CAUT', text }), it is authoritative;
  // until then the stack is derived from the signals that already exist (the bus, the oil, the tanks).
  function collectAlerts(av, o, d) {
    o = o || {};
    if (Array.isArray(o.alerts)) return o.alerts.map(a => (typeof a === 'string' ? { id: a, tier: 'CAUT', text: a }
      : { id: (a && (a.id || a.text)) || 'ALERT', tier: a && (a.tier === 'WARN' || a.level === 'warn') ? 'WARN' : 'CAUT', text: (a && a.text) || String((a && a.id) || 'ALERT') }));
    const out = [];
    const engs = d && d.eng && d.eng.length ? d.eng : [{ run: true, rpm: fin(o.rpm) }];
    const anyRun = engs.some(e => e.run);
    if (fin(o.volts, 99) < 12.2 && fin(o.amps, 0) < -0.5) out.push({ id: 'LOW VOLTS', tier: 'CAUT', text: 'LOW VOLTS — 電圧低下' });
    const oilP = o.oilP || [];
    if (anyRun && oilP.length && oilP.some(v => fin(v, 99) < 25)) out.push({ id: 'LOW OIL PRESSURE', tier: 'WARN', text: 'LOW OIL PRESSURE — 油圧低下' });
    const fuel = o.fuel || [];
    if (fuel.length > 1) {
      if (fin(fuel[0], 99) < 3) out.push({ id: 'LOW FUEL L', tier: 'CAUT', text: 'LOW FUEL L — 左タンク残りわずか' });
      if (fin(fuel[1], 99) < 3) out.push({ id: 'LOW FUEL R', tier: 'CAUT', text: 'LOW FUEL R — 右タンク残りわずか' });
    }
    // (the systems model's fuel pressure is a 0..1 teaching scale: 1 normal, 0.85 boost-pump only,
    // 0.3 sagging — under half is a starving engine, not a number of psi)
    if (o.fuelPress != null && anyRun && fin(o.fuelPress, 99) < 0.5) out.push({ id: 'LOW FUEL PRESSURE', tier: 'CAUT', text: 'LOW FUEL PRESS — 燃料圧低下' });
    return out;
  }
  // the catalog the FPL editor and the NRST page work from: every fictional point that can be flown to
  const fplCatalog = () => WAYPOINTS.filter(p => p.kind !== 'ref').map(p => p.id);
  // the NRST list: the catalog sorted by distance from pos, with bearing (mag) and distance for the page
  function nrstList(av, pos, varW) {
    if (!pos) return fplCatalog().map(id => ({ id, brg: null, dis: null }));
    return WAYPOINTS.filter(p => p.kind !== 'ref')
      .map(p => ({ id: p.id, name: p.name, brg: trueToMag(neBearing(pos, p), varW), dis: neDistNm(pos, p) }))
      .sort((a, b) => a.dis - b.dis);
  }
  function cdiName(av) {
    if (av.cdi === 'GPS') return 'GPS';
    const r = av[av.cdi.toLowerCase()], aid = NAVAIDS.find(x => x.freq === r.act);
    return (aid && aid.type === 'LOC' ? 'LOC' : 'VOR') + av.cdi.slice(3);
  }

  // ---------------------------------------------------------------- navigation solution for the displays
  // pos: { n, e } (metres), o: the physics outputs (gs, trk, hdgTrue, altTrue), magvar W
  function navSolve(av, pos, o, varW, rwy) {
    const out = { src: cdiName(av), dots: 0, toFrom: '', dtk: null, dis: null, ete: null, xtk: null, gsDots: null, brg: null, from: '', to: '', flag: '', crs: av.crs, cdiScale: null };
    // the GPS leg: direct-to, or the flight plan's active leg
    let A = null, B = null;
    if (av.direct) {
      // D→ starts a new leg from where the aircraft was when it was set (latched on the first solution after D→)
      B = wpt(av.direct);
      if (!av.directFrom) av.directFrom = { n: pos.n, e: pos.e, id: 'P.POS' };
      A = av.directFrom;
    }
    else { const w = av.fpl.wps; B = wpt(w[av.fpl.active]); A = wpt(w[av.fpl.active - 1]); }
    const gpsFail = !!(av.fail && av.fail.gps);
    if (A && B && !gpsFail) {
      out.from = A.id || ''; out.to = B.id; out.dtk = trueToMag(neBearing(A, B), varW);
      out.dis = neDistNm(pos, B); out.ete = eteSec(out.dis, o.gs); out.xtk = xtkNm(A, B, pos); out.brg = trueToMag(neBearing(pos, B), varW);
    }
    if (av.cdi === 'GPS') {
      out.crs = out.dtk ?? av.crs;
      // the GPS CDI's full scale follows the flight phase, as the real G1000's does: 2.0 NM en route (more than
      // 30 NM from the leg's destination), 1.0 NM terminal (within 30 NM), 0.3 NM on the final leg into an
      // airport waypoint within 5 NM (a direct-to counts as a final leg)
      const finalLeg = av.direct ? true : av.fpl.active >= av.fpl.wps.length - 1;
      out.cdiScale = B && B.kind === 'apt' && finalLeg && out.dis != null && out.dis <= 5 ? 0.3 : out.dis != null && out.dis > 30 ? 2.0 : 1.0;
      out.dots = out.xtk != null ? cdiGps(out.xtk, out.cdiScale) : 0; out.toFrom = 'TO'; out.flag = gpsFail ? 'NO GPS' : B ? '' : 'NO LEG';
      // OBS: the needle resolves against the selected course TO the waypoint, as a VOR's would — the leg's
      // geometry stops mattering and the CRS knob flies the intercept / the hold
      if (av.obs && B && !gpsFail) {
        const radial = trueToMag(neBearing(B, pos), varW), v = cdiVor(radial, av.crs);
        out.dots = v.dots; out.toFrom = v.toFrom; out.crs = av.crs; out.obs = true;
      }
    } else {
      const r = av[av.cdi.toLowerCase()], aid = NAVAIDS.find(x => x.freq === r.act);
      if (!aid) { out.flag = 'NO SIGNAL'; out.dots = 0; out.toFrom = ''; }
      else if (aid.type === 'VOR') {
        const radial = trueToMag(neBearing(aid, pos), varW), d = neDistNm(aid, pos);
        if (d > 40) { out.flag = 'NO SIGNAL'; }
        else { const v = cdiVor(radial, av.crs); out.dots = v.dots; out.toFrom = v.toFrom; out.radial = radial; out.dme = d; }
        out.crs = av.crs;
      } else {
        // the localizer: along runway 36's centre line from its far end; a 3° glide path to a point 300 m in
        const c = FL.physics.rwyCoords(rwy, pos.n, pos.e), ant = rwy.len + 300, dist = ant - c.along;
        out.crs = trueToMag(rwy.trueHdg, varW);
        if (dist < 300 || dist > 35000 || Math.abs(Math.atan2(c.cross, dist)) > 35 * DEG) out.flag = 'NO LOC';
        else {
          out.dots = cdiLoc(Math.atan2(c.cross, dist) / DEG); out.toFrom = 'TO';
          // the glide path: 3° up from a point 300 m past the threshold
          const h = (o.altTrue - rwy.elevFt) / 3.28084, dGp = 300 - c.along;
          out.gsDots = dGp > 200 ? gsDots(Math.atan2(h, dGp) / DEG - 3) : null;
        }
      }
    }
    av._nrts = nrstList(av, pos, varW).map(x => x.id);   // (the NRST page's order, for its ENT key)
    return out;
  }

  // ---------------------------------------------------------------- drawing helpers
  const C = { sky: '#2f6fbd', skyTop: '#1d4f9a', gnd: '#7a5434', gndBot: '#5a3c24', white: '#f2f4f7', cyan: '#33d6ff', magenta: '#ff4fd8', green: '#3be36b', yellow: '#ffd23a', red: '#ff3b30', grey: '#9aa3ad', panel: '#0b0f14', box: '#000000', line: '#5d6670' };
  function txt(g, s, x, y, size = 16, col = C.white, align = 'center', weight = 600, font = 'ui-monospace, Menlo, Consolas, monospace') {
    g.font = `${weight} ${fin(size, 12)}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(String(s), fin(x), fin(y));
  }
  const jp = 'system-ui, "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif';
  function box(g, x, y, w, h, fill = C.box, stroke = C.line, lw = 1.5) { g.fillStyle = fill; g.fillRect(fin(x), fin(y), fin(w), fin(h)); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeRect(fin(x), fin(y), fin(w), fin(h)); } }
  function line(g, x1, y1, x2, y2, col = C.white, lw = 2) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(fin(x1), fin(y1)); g.lineTo(fin(x2), fin(y2)); g.stroke(); }
  function poly(g, pts, fill, stroke, lw = 1.5) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(fin(x), fin(y)) : g.moveTo(fin(x), fin(y)))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }

  // ---------------------------------------------------------------- PFD (left screen)
  // d: { o (physics outputs), av, nav, varW, qnh, engine: { running }, hood }
  function drawPFD(g, W, H, d) {
    const o = d.o, av = d.av, nav = d.nav;
    const pitch = fin(o.pitch), bank = fin(o.bank), ias = Math.max(0, fin(o.ias)), vsi = fin(o.vsi);
    const altInd = indicatedAlt(fin(o.altTrue), fin(d.qnh, 29.92), av.baro);
    const hdgMag = trueToMag(fin(o.hdgTrue), d.varW), trkMag = trueToMag(fin(o.trk), d.varW);
    g.save();
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    // --- attitude (the whole background, like the real display) ---
    const cx = W * 0.47, cy = H * 0.36, ppd = H * 0.0115;                    // pixels per degree of pitch
    g.save();
    g.beginPath(); g.rect(0, 26, W, H - 26); g.clip();
    g.translate(cx, cy); g.rotate(-bank * DEG); g.translate(0, pitch * ppd);
    g.fillStyle = C.sky; g.fillRect(-W * 2, -H * 3, W * 4, H * 3);
    g.fillStyle = C.gnd; g.fillRect(-W * 2, 0, W * 4, H * 3);
    line(g, -W * 2, 0, W * 2, 0, C.white, 2);
    // the pitch ladder: every 2.5°, numbers every 10°
    for (let a = -30; a <= 30; a += 2.5) {
      if (a === 0) continue;
      const y = -a * ppd, big = a % 10 === 0, mid = a % 5 === 0, w = big ? 70 : mid ? 40 : 20;
      if (Math.abs(a - pitch) > 22) continue;
      line(g, -w, y, w, y, C.white, big ? 2 : 1.5);
      if (big) { txt(g, Math.abs(a), -w - 18, y, 14); txt(g, Math.abs(a), w + 18, y, 14); }
    }
    g.restore();
    // --- the bank scale (fixed arc at the top) and the roll pointer ---
    const rr = H * 0.25;
    g.strokeStyle = C.white; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, rr, (-90 - 60) * DEG, (-90 + 60) * DEG); g.stroke();
    for (const a of [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60]) {
      const L = Math.abs(a) % 30 === 0 ? 14 : 8, t = (-90 + a) * DEG;
      line(g, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, cx + Math.cos(t) * (rr + L), cy + Math.sin(t) * (rr + L), C.white, 2);
    }
    poly(g, [[cx, cy - rr], [cx - 8, cy - rr - 12], [cx + 8, cy - rr - 12]], C.white);       // zero index
    g.save(); g.translate(cx, cy); g.rotate(-bank * DEG);
    poly(g, [[0, -rr + 2], [-9, -rr + 16], [9, -rr + 16]], C.white);                      // roll pointer
    const sl = clamp(fin(o.slip), -1.5, 1.5) * 16;                                         // slip / skid trapezoid
    poly(g, [[-10 + sl, -rr + 19], [10 + sl, -rr + 19], [12 + sl, -rr + 25], [-12 + sl, -rr + 25]], C.white);
    g.restore();
    // --- AHRS failure (a lesson's failure): the attitude and the heading are lost; the standby instruments remain ---
    const ahrsFail = !!(av.fail && av.fail.ahrs);
    if (ahrsFail) {
      g.fillStyle = '#000'; g.fillRect(0, 26, W, H * 0.62 - 26);
      line(g, cx - W * 0.2, 44, cx + W * 0.2, H * 0.6, C.red, 4); line(g, cx + W * 0.2, 44, cx - W * 0.2, H * 0.6, C.red, 4);
      box(g, cx - 120, cy - 52, 240, 26, '#000', C.red); txt(g, 'AHRS FAIL — 右下の予備計器へ', cx, cy - 39, 14, C.red, 'center', 800, jp);
    }
    // --- the aircraft symbol ---
    if (!ahrsFail) poly(g, [[cx - 70, cy], [cx - 28, cy], [cx - 22, cy + 8], [cx - 70, cy + 8]], C.yellow, '#000');
    if (!ahrsFail) { poly(g, [[cx + 70, cy], [cx + 28, cy], [cx + 22, cy + 8], [cx + 70, cy + 8]], C.yellow, '#000'); poly(g, [[cx, cy], [cx - 26, cy + 18], [cx, cy + 10], [cx + 26, cy + 18]], C.yellow, '#000'); }
    // --- the airspeed tape (left), teaching V-speed bands ---
    const V = d.V || { s0: 45, s1: 50, fe: 102, no: 125, ne: 154, rotate: 60, x: 64, y: 76, glide: 76 };
    const tx = W * 0.07, tw = W * 0.12, ty0 = cy - H * 0.22, th = H * 0.44, kpp = th / 60;   // 60 kt on the tape
    box(g, tx, ty0, tw, th, 'rgba(0,0,0,0.55)', C.line);
    g.save(); g.beginPath(); g.rect(tx, ty0, tw, th); g.clip();
    const yOf = k => cy - (k - ias) * kpp;
    const band = (k1, k2, col, x, w) => { const y1 = yOf(k2), y2 = yOf(k1); g.fillStyle = col; g.fillRect(x, y1, w, y2 - y1); };
    band(V.s0, V.fe, C.white, tx + tw - 6, 6); band(V.s1, V.no, C.green, tx + tw - 12, 6); band(V.no, V.ne, C.yellow, tx + tw - 12, 6); band(V.ne, V.ne + 60, C.red, tx + tw - 12, 6); band(0, V.s1, C.red, tx + tw - 12, 6);
    for (let k = Math.floor((ias - 35) / 10) * 10; k <= ias + 35; k += 5) {
      if (k < 20) continue;
      const y = yOf(k); line(g, tx + tw - 22, y, tx + tw - 12, y, C.white, 2);
      if (k % 10 === 0) txt(g, k, tx + tw * 0.42, y, 15);
    }
    // twins: the red radial line (Vmc, minimum control speed with one engine out) and the blue line (Vyse)
    if (V.mc) { const y = yOf(V.mc); g.fillStyle = C.red; g.fillRect(tx, y - 2, tw, 4); }
    if (V.yse) { const y = yOf(V.yse); g.fillStyle = '#3d8bff'; g.fillRect(tx, y - 2, tw, 4); }
    for (const [lab, k] of [['R', V.rotate], ['X', V.x], ['Y', V.y], ['G', V.glide]]) { const y = yOf(k); if (y > ty0 && y < ty0 + th) { box(g, tx + tw + 2, y - 8, 18, 16, '#000', C.cyan, 1); txt(g, lab, tx + tw + 11, y, 12, C.cyan); } }
    g.restore();
    poly(g, [[tx + 4, cy - 15], [tx + tw - 6, cy - 15], [tx + tw + 4, cy], [tx + tw - 6, cy + 15], [tx + 4, cy + 15]], '#000', C.white, 2);
    txt(g, ias < 20 ? '---' : Math.round(ias), tx + tw * 0.45, cy, 22, o.stallWarn ? C.red : C.white, 'center', 700);
    box(g, tx, ty0 + th, tw, 22, '#000', C.line); txt(g, `TAS ${Math.round(fin(o.tas))}KT`, tx + tw / 2, ty0 + th + 11, 12);
    // --- the altitude tape (right), selected altitude, baro ---
    const ax = W * 0.75, aw = W * 0.12, fpp = th / 600;          // 600 ft on the tape
    box(g, ax, ty0, aw, th, 'rgba(0,0,0,0.55)', C.line);
    g.save(); g.beginPath(); g.rect(ax, ty0, aw, th); g.clip();
    for (let f = Math.floor((altInd - 350) / 100) * 100; f <= altInd + 350; f += 20) {
      const y = cy - (f - altInd) * fpp;
      if (f % 100 === 0) { line(g, ax, y, ax + 12, y, C.white, 2); txt(g, f, ax + aw * 0.58, y, 14); } else line(g, ax, y, ax + 6, y, C.white, 1);
    }
    const ySel = cy - (av.altSel - altInd) * fpp;
    poly(g, [[ax, clamp(ySel, ty0, ty0 + th) - 8], [ax + 10, clamp(ySel, ty0, ty0 + th) - 8], [ax + 10, clamp(ySel, ty0, ty0 + th) + 8], [ax, clamp(ySel, ty0, ty0 + th) + 8], [ax + 5, clamp(ySel, ty0, ty0 + th)]], C.cyan);
    g.restore();
    poly(g, [[ax + aw - 2, cy - 15], [ax + 12, cy - 15], [ax + 2, cy], [ax + 12, cy + 15], [ax + aw - 2, cy + 15]], '#000', C.white, 2);
    txt(g, Math.round(altInd / 20) * 20, ax + aw * 0.55, cy, 20, C.white, 'center', 700);   // (the drum reads in 20 ft steps, as the real one)
    box(g, ax, ty0 - 24, aw, 22, '#000', C.line); txt(g, av.altSel, ax + aw / 2, ty0 - 13, 15, C.cyan);
    box(g, ax, ty0 + th, aw, 22, '#000', C.line);
    txt(g, av.baroUnit === 'IN' ? `${av.baro.toFixed(2)}IN` : `${Math.round(inhgToHpa(av.baro))}HPA`, ax + aw / 2, ty0 + th + 11, 14, C.cyan);
    // --- the VSI ---
    const vx = ax + aw + 4, vw = W * 0.05;
    box(g, vx, ty0 + th * 0.15, vw, th * 0.7, 'rgba(0,0,0,0.55)', C.line);
    for (const f of [-2000, -1000, -500, 0, 500, 1000, 2000]) { const y = cy - Math.sign(f) * Math.sqrt(Math.abs(f) / 2000) * th * 0.33; line(g, vx, y, vx + 8, y, C.white, 1.5); if (Math.abs(f) >= 1000) txt(g, Math.abs(f) / 1000, vx + vw * 0.65, y, 12); }
    const yV = cy - Math.sign(vsi) * Math.sqrt(Math.min(Math.abs(vsi), 2000) / 2000) * th * 0.33;
    poly(g, [[vx + 2, yV], [vx + 14, yV - 9], [vx + vw + 18, yV - 9], [vx + vw + 18, yV + 9], [vx + 14, yV + 9]], '#000', C.white, 1.5);
    txt(g, Math.abs(vsi) < 50 ? '0' : Math.round(vsi / 50) * 50, vx + vw * 0.75 + 8, yV, 12);
    // --- the HSI ---
    const hx = cx, hy = H * 0.80, hr = H * 0.16;
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.arc(hx, hy, hr + 6, 0, 7); g.fill();
    g.save(); g.translate(hx, hy); g.rotate(-hdgMag * DEG);
    for (let a = 0; a < 360; a += 5) {
      const L = a % 10 === 0 ? 12 : 6, t = (a - 90) * DEG;
      line(g, Math.cos(t) * (hr - L), Math.sin(t) * (hr - L), Math.cos(t) * hr, Math.sin(t) * hr, C.white, 1.5);
      if (a % 30 === 0) { g.save(); g.rotate(a * DEG); txt(g, a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : a === 270 ? 'W' : a / 10, 0, -hr + 24, 14); g.restore(); }
    }
    // heading bug (cyan)
    g.save(); g.rotate(av.hdgBug * DEG); poly(g, [[-9, -hr - 1], [-9, -hr + 6], [-3, -hr + 6], [0, -hr + 2], [3, -hr + 6], [9, -hr + 6], [9, -hr - 1]], C.cyan); g.restore();
    // the course pointer and the deviation bar (magenta: GPS, green: VOR / LOC)
    const ccol = av.cdi === 'GPS' ? C.magenta : C.green;
    g.save(); g.rotate(fin(nav.crs, av.crs) * DEG);
    if (!nav.flag) {
      line(g, 0, -hr + 30, 0, -hr * 0.42, ccol, 4); poly(g, [[0, -hr + 22], [-8, -hr + 34], [8, -hr + 34]], ccol);
      line(g, 0, hr * 0.42, 0, hr - 30, ccol, 4);
      for (const k of [-2, -1, 1, 2]) { g.strokeStyle = C.white; g.lineWidth = 1.5; g.beginPath(); g.arc(k * hr * 0.17, 0, 4, 0, 7); g.stroke(); }
      const dx = clamp(fin(nav.dots), -2.5, 2.5) * hr * 0.17;
      line(g, dx, -hr * 0.38, dx, hr * 0.38, ccol, 4);
      if (nav.toFrom) { const s = nav.toFrom === 'TO' ? -1 : 1; poly(g, [[hr * 0.3, s * hr * 0.15], [hr * 0.24, s * hr * 0.06], [hr * 0.36, s * hr * 0.06]], C.white); }
    }
    g.restore();
    // track (magenta diamond on the rose)
    g.save(); g.rotate(trkMag * DEG); poly(g, [[0, -hr + 2], [-5, -hr + 9], [0, -hr + 16], [5, -hr + 9]], C.magenta); g.restore();
    // the bearing pointers (BRG1: a single arrow, BRG2: a double one) at the bearing TO their source —
    // a tuned VOR/LOC, or the GPS's active waypoint (its bearing is the nav solution's own)
    const brgPtr = (srcKind, dbl) => {
      if (!srcKind) return;
      let b = null;
      if (srcKind === 'GPS') b = nav.brg;
      else if (d.pos) { const r = av[srcKind.toLowerCase()], aid = r && NAVAIDS.find(x => x.freq === r.act); if (aid && aid.n != null) b = trueToMag(neBearing(d.pos, aid), d.varW); }
      if (b == null || !Number.isFinite(b)) return;
      g.save(); g.rotate(b * DEG);
      line(g, 0, -hr + 26, 0, hr - 34, dbl ? '#8fd8ff' : C.cyan, 1.8);
      poly(g, [[0, -hr + 20], [-5, -hr + 30], [5, -hr + 30]], dbl ? '#8fd8ff' : C.cyan);
      if (dbl) poly(g, [[0, -hr + 30], [-5, -hr + 40], [5, -hr + 40]], '#8fd8ff');
      g.restore();
    };
    if (!ahrsFail) { brgPtr(av.brg1, false); brgPtr(av.brg2, true); }
    g.restore();
    poly(g, [[hx, hy - hr + 4], [hx - 7, hy - hr - 8], [hx + 7, hy - hr - 8]], C.white);   // lubber line
    // aircraft symbol in the middle of the HSI
    line(g, hx, hy - 16, hx, hy + 14, C.white, 2.5); line(g, hx - 14, hy - 4, hx + 14, hy - 4, C.white, 2.5); line(g, hx - 6, hy + 12, hx + 6, hy + 12, C.white, 2);
    if (ahrsFail) { g.fillStyle = '#000'; g.beginPath(); g.arc(hx, hy, hr + 6, 0, 7); g.fill(); line(g, hx - hr * 0.7, hy - hr * 0.7, hx + hr * 0.7, hy + hr * 0.7, C.red, 4); line(g, hx + hr * 0.7, hy - hr * 0.7, hx - hr * 0.7, hy + hr * 0.7, C.red, 4); }
    box(g, hx - 26, hy - hr - 34, 52, 22, '#000', ahrsFail ? C.red : C.white); txt(g, ahrsFail ? '---' : hdgFmt(hdgMag) + '°', hx, hy - hr - 23, 16, ahrsFail ? C.red : C.white, 'center', 700);
    // HDG / CRS readouts, nav source
    box(g, hx - hr - 92, hy - hr - 10, 86, 22, '#000', C.line); txt(g, `HDG ${hdgFmt(av.hdgBug)}°`, hx - hr - 49, hy - hr + 1, 14, C.cyan);
    box(g, hx + hr + 6, hy - hr - 10, 86, 22, '#000', C.line); txt(g, `CRS ${hdgFmt(fin(nav.crs, av.crs))}°`, hx + hr + 49, hy - hr + 1, 14, av.cdi === 'GPS' ? C.magenta : C.green);
    txt(g, nav.src, hx - hr * 0.55, hy - hr * 0.3, 14, ccol);
    if (nav.dme != null && av.cdi !== 'GPS') { box(g, hx - hr - 92, hy - hr + 16, 86, 22, '#000', C.line); txt(g, `DME ${nav.dme.toFixed(1)}NM`, hx - hr - 49, hy - hr + 27, 13, C.green); }
    // the transponder: the code in use (cyan while a new one is being typed in the XPDR menu), the mode when not ALT
    if (av.xpdr) { const editing = av.xpdr.entry.length > 0;
      box(g, hx + hr + 6, hy - hr + 16, 92, 22, '#000', C.line);
      txt(g, `XPDR ${editing ? (av.xpdr.entry + '---').slice(0, 4) : String(av.xpdr.code).padStart(4, '0')}`, hx + hr + 52, hy - hr + 27, 13, editing ? C.cyan : C.green);
      // the effective mode (ALT answers as GND on the ground), IDENT while it lasts, and the pressure
      // altitude the transponder reports (the altitude at the standard setting, for the ATC cross-check)
      const eff = xpdrEffMode(av, o.onGround);
      if (eff !== 'ALT') txt(g, eff, hx + hr + 104, hy - hr + 27, 10, C.yellow, 'left');
      if (av.xpdrIdent > 0) { av.xpdrIdent = Math.max(0, av.xpdrIdent - 1 / 30); if (Math.floor(av.xpdrIdent * 2) % 2 === 0) txt(g, 'IDNT', hx + hr + 104, hy - hr + 27, 10, C.magenta, 'left'); }
      txt(g, `PA ${Math.round((fin(o.altTrue) + (29.92 - fin(d.qnh, 29.92)) * FT_PER_INHG) / 100) * 100}`, hx + hr + 52, hy - hr + 47, 10, C.grey);
    }
    if (nav.flag) txt(g, nav.flag, hx, hy + hr * 0.55, 13, C.yellow);
    // --- the glide slope (LOC with a glide path) ---
    if (nav.gsDots != null && av.cdi !== 'GPS') {
      const gx = ax - 18, gh = th * 0.5;
      box(g, gx - 8, cy - gh / 2, 16, gh, 'rgba(0,0,0,0.6)', C.line);
      for (const k of [-2, -1, 1, 2]) { g.strokeStyle = C.white; g.lineWidth = 1.2; g.beginPath(); g.arc(gx, cy + k * gh / 5, 3, 0, 7); g.stroke(); }
      const gy = cy - clamp(nav.gsDots, -2.5, 2.5) * gh / 5;
      poly(g, [[gx, gy - 7], [gx + 6, gy], [gx, gy + 7], [gx - 6, gy]], C.green);
      txt(g, 'G', gx, cy - gh / 2 - 9, 12, C.green);
    }
    // --- the top bar: NAV / COM, the active leg ---
    box(g, 0, 0, W, 26, '#05070a', null);
    txt(g, `NAV1 ${fmtNav(av.nav1.act)} ↔ ${fmtNav(av.nav1.stby)}`, 8, 13, 12, av.navSel === 'NAV1' ? C.cyan : C.green, 'left');
    txt(g, `COM1 ${fmtCom(av.com1.act)} ↔ ${fmtCom(av.com1.stby)}`, W - 8, 13, 12, av.comSel === 'COM1' ? C.cyan : C.green, 'right');
    txt(g, nav.to ? `${nav.from || ''} → ${nav.to}  DIS ${fin(nav.dis).toFixed(1)}NM  DTK ${nav.dtk == null ? '---' : hdgFmt(nav.dtk)}°` : 'NO FLIGHT PLAN', W / 2, 13, 12, C.magenta);
    // --- GS, TRK, wind, OAT ---
    box(g, 8, H - 90, 128, 82, 'rgba(0,0,0,0.75)', C.line);
    txt(g, `GS  ${Math.round(fin(o.gs))}KT`, 14, H - 78, 13, C.white, 'left');
    txt(g, `TRK ${hdgFmt(trkMag)}°`, 14, H - 60, 13, C.magenta, 'left');
    txt(g, `OAT ${Math.round(fin(o.oat))}°C`, 14, H - 42, 13, C.white, 'left');
    if (av.wind) {
      const wRel = (fin(o.windFrom) + d.varW - hdgMag + 180) * DEG;   // the arrow points where the wind goes, relative to the nose
      g.save(); g.translate(112, H - 50); g.rotate(wRel); line(g, 0, 12, 0, -12, C.white, 2); poly(g, [[0, -14], [-5, -6], [5, -6]], C.white); g.restore();
      txt(g, `${Math.round(fin(o.windKt))}KT`, 14, H - 22, 13, C.white, 'left');
    }
    // --- AOA (teaching indicator) ---
    const aoX = W * 0.215, aoY = ty0 + 6, aoH = th * 0.42, f = clamp(fin(o.aoaFrac), 0, 1.2);
    box(g, aoX, aoY, 12, aoH, '#000', C.line);
    g.fillStyle = C.green; g.fillRect(aoX + 1, aoY + aoH * 0.45, 10, aoH * 0.55 - 1);
    g.fillStyle = C.yellow; g.fillRect(aoX + 1, aoY + aoH * 0.2, 10, aoH * 0.25);
    g.fillStyle = C.red; g.fillRect(aoX + 1, aoY + 1, 10, aoH * 0.2);
    const ayy = aoY + aoH * (1 - clamp(f, 0, 1)); poly(g, [[aoX + 14, ayy], [aoX + 24, ayy - 6], [aoX + 24, ayy + 6]], C.white);
    txt(g, 'AOA', aoX + 6, aoY + aoH + 10, 10, C.grey);
    // --- the standby instruments (inset) ---
    const sx = W - 132, sy = H - 112;
    box(g, sx, sy, 124, 104, '#05070a', C.grey);
    txt(g, 'STBY 予備（教材）', sx + 62, sy + 9, 10, C.grey, 'center', 600, jp);
    g.save(); g.beginPath(); g.arc(sx + 40, sy + 58, 30, 0, 7); g.clip();
    g.translate(sx + 40, sy + 58); g.rotate(-bank * DEG); g.translate(0, pitch * 1.2);
    g.fillStyle = C.sky; g.fillRect(-80, -100, 160, 100); g.fillStyle = C.gnd; g.fillRect(-80, 0, 160, 100); line(g, -80, 0, 80, 0, C.white, 1);
    g.restore();
    line(g, sx + 24, sy + 58, sx + 34, sy + 58, C.yellow, 3); line(g, sx + 46, sy + 58, sx + 56, sy + 58, C.yellow, 3);
    txt(g, `${ias < 20 ? '---' : Math.round(ias)}`, sx + 96, sy + 36, 14); txt(g, 'KT', sx + 96, sy + 50, 9, C.grey);
    txt(g, `${Math.round(altInd / 20) * 20}`, sx + 96, sy + 72, 14); txt(g, 'FT', sx + 96, sy + 86, 9, C.grey);
    // --- the engine status (this teaching layout shows it on the PFD too) ---
    const engs = d.eng && d.eng.length ? d.eng : [{ run: true, rpm: o.rpm }], run = engs.some(e => e.run), allRun = engs.every(e => e.run);
    const ey = H - 136;
    if (engs.length === 1) {
      box(g, 8, ey, 128, 40, '#05070a', run ? C.line : C.red);
      txt(g, run ? 'ENG RUN' : 'ENG STOP', 14, ey + 12, 13, run ? C.green : C.red, 'left', 700);
      txt(g, `${Math.round(fin(engs[0].rpm))} RPM`, 14, ey + 30, 13, C.white, 'left');
    } else {
      box(g, 8, ey, 150, 40, '#05070a', allRun ? C.line : C.red);
      engs.forEach((e, i) => { const x = 14 + i * 72; txt(g, `${i ? 'R' : 'L'} ${e.run ? 'RUN' : e.feather ? 'FTHR' : 'STOP'}`, x, ey + 12, 12, e.run ? C.green : C.red, 'left', 700); txt(g, `${Math.round(fin(e.rpm))}`, x, ey + 30, 12, C.white, 'left'); });
    }
    // --- alerts ---
    if (o.stallWarn) { box(g, cx - 60, cy + 70, 120, 26, C.red, null); txt(g, 'STALL', cx, cy + 83, 18, '#fff', 'center', 800); }
    if (!run && !o.onGround) { box(g, cx - 90, cy + 100, 180, 22, '#3a0d0d', C.red); txt(g, 'ENGINE STOP — 滑空', cx, cy + 111, 13, C.red, 'center', 700, jp); }
    else if (!allRun) { box(g, cx - 100, cy + 100, 200, 22, '#3a2a0d', C.yellow); txt(g, `${engs[0].run ? 'R' : 'L'} ENGINE INOP — 片発`, cx, cy + 111, 13, C.yellow, 'center', 700, jp); }
    // --- the CAS stack: every alert the collector raises, warning (red) over caution (amber), newest
    // system first; the ALERTS page lists them all and acknowledges them (av._alertsUnacked feeds the key)
    const alerts = collectAlerts(av, o, d);
    if (av.pfdMenu === 'ALERTS') for (const a of alerts) (av._ack || (av._ack = {}))[a.id] = true;
    av._alertsUnacked = alerts.some(a => !(av._ack || {})[a.id]) ? 1 : 0;
    alerts.slice(0, 3).forEach((a, i) => {
      const warn = a.tier === 'WARN', yy = cy + 130 + i * 24;
      box(g, cx - 110, yy, 220, 22, warn ? '#3a0d0d' : '#3a2a0d', warn ? C.red : C.yellow);
      txt(g, a.text, cx, yy + 11, 12, warn ? C.red : C.yellow, 'center', 700, jp);
    });
    if (alerts.length > 3) txt(g, `+ ${alerts.length - 3} ALERTS`, cx, cy + 130 + 3 * 24 + 8, 11, C.yellow);
    // --- the ALERTS page: the whole stack, tier-coloured, over the attitude (BACK / ALERTS で戻る) ---
    if (av.pfdMenu === 'ALERTS') {
      box(g, cx - 200, 44, 400, Math.min(H - 190, 74 + Math.max(1, alerts.length) * 26), '#05070a', C.line);
      txt(g, 'ALERTS — 警告一覧', cx, 62, 15, C.white, 'center', 800, jp);
      if (!alerts.length) txt(g, 'NO ALERTS — 警告はありません', cx, 96, 13, C.green, 'center', 700, jp);
      alerts.forEach((a, i) => { const warn = a.tier === 'WARN'; txt(g, `${warn ? '■ WARNING' : '■ CAUTION'}  ${a.text}`, cx - 184, 92 + i * 26, 13, warn ? C.red : C.yellow, 'left', 700, jp); });
    }
    // the teaching label
    txt(g, 'G1000型 教材表示 · NOT FOR NAVIGATION', W / 2, H - 8, 10, C.grey, 'center', 600, jp);
    g.restore();
  }

  // ---------------------------------------------------------------- MFD (right screen): engine strip + MAP / FPL
  function drawMFD(g, W, H, d) {
    const o = d.o, av = d.av, nav = d.nav;
    g.save();
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    // --- the engine strip (what this teaching model computes; '—' where it has nothing) ---
    const ew = W * 0.2;
    box(g, 0, 0, ew, H, '#05070a', C.line);
    txt(g, 'ENGINE', ew / 2, 14, 13, C.white, 'center', 700);
    // RPM arc
    const engs = d.eng && d.eng.length ? d.eng : [{ run: true, rpm: o.rpm }], twin = engs.length > 1, cap = d.fuelCap || 24;
    g.lineWidth = twin ? 5 : 7;
    engs.forEach((e, i) => {
      const rx = twin ? ew * (0.27 + 0.46 * i) : ew / 2, ry = 70, rr = ew * (twin ? 0.19 : 0.34), rpm = clamp(fin(e.rpm), 0, 2800);
      const arc = (a, b, col) => { g.strokeStyle = col; g.beginPath(); g.arc(rx, ry, rr, (210 - 240 * a / 2800) * -DEG, (210 - 240 * b / 2800) * -DEG, false); g.stroke(); };
      arc(500, 2700, C.green); arc(2700, 2800, C.red);
      const ta = (210 - 240 * rpm / 2800) * -DEG; line(g, rx, ry, rx + Math.cos(ta) * (rr - 4), ry + Math.sin(ta) * (rr - 4), e.run ? C.white : C.red, 3);
      txt(g, Math.round(rpm), rx, ry + 22, twin ? 13 : 16, e.run ? C.white : C.red, 'center', 700); txt(g, twin ? (i ? 'R RPM' : 'L RPM') : 'RPM', rx, ry + 38, 11, C.grey);
    });
    const run = engs.some(e => e.run);
    // the engine's own gauges, all from the models now: the oil (per engine: the twin reads L/R) and the bus from
    // the electrical model (physics' own, or CADET's systems through the glass), the manifold pressure (the twin)
    // and the exhaust temperatures from the powerplant model — leaning is flown by the EGT, and the Seminole's
    // power is set by the manifold pressure
    const egts = o.egts && o.egts.length ? o.egts : [o.egt || 0], manIns = o.manIns && o.manIns.length ? o.manIns : [o.manIn || 0];
    const oilP = o.oilP || [], oilT = o.oilT || [];
    const pair = (a, fmt) => (a.length > 1 ? `${fmt(a[0])}/${fmt(a[1])}` : a.length ? fmt(a[0]) : '—');
    const rows = [
      ['出力 PWR', run ? `${fin(o.powerPct)} %` : '0 %', run ? fin(o.powerPct) / 100 : 0, '教材モデルの出力'],
      ['FFLOW GPH', fin(o.fuelFlow).toFixed(1), fin(o.fuelFlow) / (twin ? 24 : 12), ''],
      ...(twin ? [['MAN IN', pair(manIns, v => fin(v).toFixed(1)), Math.max(fin(manIns[0]), fin(manIns[1] || 0)) / 30, '']] : []),
      ['OIL PSI', pair(oilP, v => `${Math.round(fin(v))}`), twin || !oilP.length ? null : fin(oilP[0]) / 85, oilP.length ? '' : '未実装'],
      ['OIL °F', pair(oilT, v => `${Math.round(fin(v))}`), null, oilT.length ? '' : '未実装'],
      ['EGT °F', pair(egts, v => `${Math.round(fin(v))}`), Math.max(fin(egts[0]), fin(egts[1] || 0)) / 1700, ''],
      ['FUEL L GAL', fin(o.fuel && o.fuel[0]).toFixed(1), fin(o.fuel && o.fuel[0]) / cap, ''],
      ['FUEL R GAL', fin(o.fuel && o.fuel[1]).toFixed(1), fin(o.fuel && o.fuel[1]) / cap, ''],
      ['VOLTS', o.volts == null ? '—' : fin(o.volts).toFixed(1), null, o.volts == null ? '未実装' : '', o.volts != null && fin(o.volts) < 11.5 ? C.red : o.volts != null && fin(o.volts) < 12.2 ? C.yellow : null],
      ['AMPS', o.amps == null ? '—' : `${fin(o.amps) > 0 ? '+' : ''}${Math.round(fin(o.amps))}`, null, o.amps == null ? '未実装' : '', o.amps != null && fin(o.amps) < 0 ? C.yellow : null],
    ];
    let y = 124; const dy = Math.max(26, Math.min(38, (H - 150) / rows.length));
    for (const [lab, val, frac, note, vcol] of rows) {
      txt(g, lab, 8, y, 11, C.grey, 'left', 600, jp); txt(g, val, ew - 8, y, 13, val === '—' ? C.grey : vcol || C.white, 'right', 700);
      if (frac != null) { box(g, 8, y + 9, ew - 16, 6, '#1b222b', null); g.fillStyle = C.green; g.fillRect(8, y + 9, (ew - 16) * clamp(frac, 0, 1), 6); }
      else txt(g, note, ew - 8, y + 12, 9, C.grey, 'right', 500, jp);
      y += dy;
    }
    txt(g, '— = 未実装（架空値は出しません）', ew / 2, H - 12, 9, C.grey, 'center', 500, jp);
    // --- the page area ---
    const px = ew, pw = W - ew;
    if (av.fail && av.fail.gps) { g.fillStyle = '#000'; g.fillRect(px, 0, pw, H); txt(g, 'GPS 信号なし — 地図・位置は使えません', px + pw / 2, H / 2, 16, C.yellow, 'center', 700, jp); txt(g, 'VOR（NAV1）と DME で位置を確かめる', px + pw / 2, H / 2 + 24, 13, C.grey, 'center', 600, jp); }
    else if (av.mfdPage === 'FPL') drawFPL(g, px, 0, pw, H, d);
    else if (av.mfdPage === 'ENGINE') drawEnginePage(g, px, 0, pw, H, d);
    else if (av.mfdPage === 'SYSTEM') drawSystemPage(g, px, 0, pw, H, d);
    else if (av.mfdPage === 'NRST') drawNrstPage(g, px, 0, pw, H, d);
    else drawMap(g, px, 0, pw, H, d);
    // data bar (both pages)
    box(g, px, 0, pw, 26, '#05070a', null);
    const fld = (lab, v, x, col = C.magenta) => { txt(g, lab, x, 13, 11, C.grey, 'left'); txt(g, v, x + 34, 13, 13, col, 'left', 700); };
    fld('GS', `${Math.round(fin(o.gs))}KT`, px + 8, C.white);
    fld('DTK', nav.dtk == null ? '---°' : hdgFmt(nav.dtk) + '°', px + pw * 0.2);
    fld('TRK', hdgFmt(trueToMag(fin(o.trk), d.varW)) + '°', px + pw * 0.4, C.white);
    fld('ETE', eteFmt(nav.ete), px + pw * 0.6);
    fld('XTK', nav.xtk == null ? '--.-' : `${Math.abs(nav.xtk).toFixed(2)}${nav.xtk >= 0 ? 'R' : 'L'}`, px + pw * 0.8);
    txt(g, `DIS ${nav.dis == null ? '--.-' : fin(nav.dis).toFixed(1)}NM → ${nav.to || '---'}`, px + pw - 8, 40, 12, C.magenta, 'right');
    txt(g, 'G1000型 教材表示 · 架空訓練点 · NOT FOR NAVIGATION', px + pw / 2, H - 8, 10, C.grey, 'center', 600, jp);
    g.restore();
  }
  function drawMap(g, x0, y0, w, h, d) {
    const o = d.o, av = d.av, pos = d.pos, rng = RANGES[av.mfdRangeIdx];
    g.save(); g.beginPath(); g.rect(x0, y0 + 26, w, h - 26); g.clip();
    g.fillStyle = '#0a1420'; g.fillRect(x0, y0, w, h);
    const cx = x0 + w / 2, cy = y0 + h * 0.58, ppn = (h * 0.42) / rng;           // pixels per nm
    const up = av.mapNorthUp ? 0 : trueToMag(fin(o.trk), d.varW) - d.varW;       // rotation (true degrees at the top)
    const toScr = (n, e) => { const dn = (n - pos.n) / NM, de = (e - pos.e) / NM, a = -up * DEG; const X = de * Math.cos(a) - dn * Math.sin(a), Y = de * Math.sin(a) + dn * Math.cos(a); return [cx + X * ppn, cy - Y * ppn]; };
    // range rings
    g.strokeStyle = '#26384a'; g.lineWidth = 1;
    for (const k of [0.5, 1]) { g.beginPath(); g.arc(cx, cy, rng * k * ppn, 0, 7); g.stroke(); }
    txt(g, `${rng / 2}`, cx + rng * 0.5 * ppn * 0.7, cy - rng * 0.5 * ppn * 0.7, 11, C.grey);
    // the Sanford runways (schematic, at the display origin) and LAB RWY 36
    if (FL.sanford) for (const r of FL.sanford.RUNWAYS) {
      const [a, b] = [toScr(r.n1, r.e1), toScr(r.n2, r.e2)]; line(g, a[0], a[1], b[0], b[1], '#8b96a3', Math.max(2, r.w / 1852 * ppn));
    }
    if (FL.physics) {
      const R = FL.physics.LAB_RWY, a = FL.physics.rwyToNE(R, 0, 0), b = FL.physics.rwyToNE(R, R.len, 0), [p, q] = [toScr(a[0], a[1]), toScr(b[0], b[1])];
      line(g, p[0], p[1], q[0], q[1], '#d6dde5', Math.max(3, R.wid / 1852 * ppn)); txt(g, 'LAB 36', q[0] + 8, q[1], 11, '#d6dde5', 'left');
    }
    // the flight plan: legs (white), the active one (magenta)
    const fp = av.fpl.wps.map(wpt).filter(Boolean);
    for (let i = 1; i < fp.length; i++) { const a = toScr(fp[i - 1].n, fp[i - 1].e), b = toScr(fp[i].n, fp[i].e); line(g, a[0], a[1], b[0], b[1], !av.direct && i === av.fpl.active ? C.magenta : '#e6e9ec', 2.5); }
    if (av.direct) { const B = wpt(av.direct), A = av.directFrom || pos; const a = toScr(A.n, A.e), b = toScr(B.n, B.e); line(g, a[0], a[1], b[0], b[1], C.magenta, 3); }
    // the training points
    for (const p of WAYPOINTS) {
      const [sx, sy] = toScr(p.n, p.e);
      if (p.kind === 'wpt') { poly(g, [[sx, sy - 6], [sx + 6, sy], [sx, sy + 6], [sx - 6, sy]], null, C.cyan, 2); txt(g, p.id, sx + 9, sy - 8, 11, C.cyan, 'left'); }
      else if (p.kind === 'ref') { g.strokeStyle = C.grey; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, 5, 0, 7); g.stroke(); txt(g, 'SFB 模式図', sx + 8, sy + 10, 10, C.grey, 'left', 600, jp); }
    }
    // a fictional VOR
    for (const n of NAVAIDS) if (n.type === 'VOR') { const [sx, sy] = toScr(n.n, n.e); poly(g, [[sx - 6, sy - 4], [sx, sy - 7], [sx + 6, sy - 4], [sx + 6, sy + 4], [sx, sy + 7], [sx - 6, sy + 4]], null, C.green, 1.5); txt(g, n.id, sx + 9, sy + 9, 10, C.green, 'left'); }
    // the fictional airspace: a 10 NM ring round LAB, and the practice area's boundary through its points
    {
      const lab = wpt('LABRW');
      if (lab) { const [lx, ly] = toScr(lab.n, lab.e);
        g.save(); g.strokeStyle = 'rgba(51,214,255,0.5)'; g.lineWidth = 1.2; if (g.setLineDash) g.setLineDash([7, 5]);
        g.beginPath(); g.arc(lx, ly, 10 * ppn, 0, 7); g.stroke();
        const pa = ['LABEA', 'LABEB', 'LABEC', 'LABED'].map(wpt).filter(Boolean);
        if (pa.length === 4) { g.beginPath(); pa.forEach((p, i) => { const [sx, sy] = toScr(p.n, p.e); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.closePath(); g.stroke(); }
        if (g.setLineDash) g.setLineDash([]);
        g.restore();
        txt(g, 'LAB AIRSPACE', lx + 10 * ppn * 0.72, ly - 10 * ppn * 0.72, 10, 'rgba(51,214,255,0.8)', 'left');
      }
    }
    // traffic (CADET hands the pattern traffic's poses in as d.traffic: { n, e, altFt?, hdg? }); the
    // standalone has none and simply draws nothing
    if (Array.isArray(d.traffic)) for (const t of d.traffic) {
      if (!t || !Number.isFinite(t.n) || !Number.isFinite(t.e)) continue;
      const [sx, sy] = toScr(t.n, t.e);
      if (sx < x0 - 20 || sx > x0 + w + 20 || sy < y0 || sy > y0 + h) continue;
      const rel = ((t.hdg != null ? fin(t.hdg) : fin(o.hdgTrue)) - (av.mapNorthUp ? 0 : up)) * DEG;
      g.save(); g.translate(sx, sy); g.rotate(rel);
      poly(g, [[0, -8], [2.5, 0], [8, 4], [8, 6.5], [2.5, 4], [1.5, 8], [-1.5, 8], [-2.5, 4], [-8, 6.5], [-8, 4], [-2.5, 0]], '#dfe7ee', '#000', 0.8);
      g.restore();
      if (t.altFt != null && Number.isFinite(t.altFt)) txt(g, `${Math.round(t.altFt / 100)}`, sx + 10, sy - 6, 10, '#dfe7ee', 'left');
    }
    // the aircraft
    const trkRel = (av.mapNorthUp ? fin(o.hdgTrue) : fin(o.hdgTrue) - up) * DEG;
    g.save(); g.translate(cx, cy); g.rotate(trkRel);
    poly(g, [[0, -14], [3, -4], [12, 2], [12, 5], [3, 3], [2, 10], [6, 13], [-6, 13], [-2, 10], [-3, 3], [-12, 5], [-12, 2], [-3, -4]], C.white, '#000', 1);
    g.restore();
    txt(g, av.mapNorthUp ? 'NORTH UP' : 'TRACK UP', x0 + 8, y0 + 40, 11, C.grey, 'left');
    txt(g, `RNG ${rng} NM`, x0 + 8, y0 + 56, 11, C.white, 'left');
    g.restore();
  }
  function drawFPL(g, x0, y0, w, h, d) {
    const av = d.av, o = d.o, pos = d.pos;
    g.fillStyle = '#05070a'; g.fillRect(x0, y0, w, h);
    txt(g, 'ACTIVE FLIGHT PLAN（教材）', x0 + w / 2, y0 + 44, 14, C.white, 'center', 700, jp);
    const cols = [x0 + 30, x0 + w * 0.42, x0 + w * 0.62, x0 + w * 0.82];
    ['WPT', 'DTK', 'DIS', 'ETE'].forEach((c, i) => txt(g, c, cols[i], y0 + 70, 12, C.grey, i ? 'center' : 'left'));
    const ids = av.fpl.wps; let cum = 0, prev = pos;
    for (let i = 0; i < ids.length; i++) {
      const p = wpt(ids[i]); if (!p) continue;
      const yy = y0 + 96 + i * 30, act = !av.direct && i === av.fpl.active, done = i < av.fpl.active;
      if (act) { box(g, x0 + 10, yy - 13, w - 20, 26, '#2a0f28', C.magenta); }
      const A = i ? wpt(ids[i - 1]) : null, dtk = A ? trueToMag(neBearing(A, p), d.varW) : null;
      let dis = null; if (!done) { dis = neDistNm(prev, p); cum += dis; prev = p; }
      txt(g, (act ? '➔ ' : '   ') + p.id, cols[0], yy, 14, act ? C.magenta : done ? C.grey : C.white, 'left');
      txt(g, dtk == null ? '---' : hdgFmt(dtk) + '°', cols[1], yy, 14, act ? C.magenta : C.white);
      txt(g, dis == null ? '---' : dis.toFixed(1), cols[2], yy, 14, act ? C.magenta : C.white);
      txt(g, dis == null ? '--:--' : eteFmt(eteSec(cum, o.gs)), cols[3], yy, 14, act ? C.magenta : C.white);
    }
    if (av.direct) { const yy = y0 + 96 + ids.length * 30 + 10; box(g, x0 + 10, yy - 13, w - 20, 26, '#2a0f28', C.magenta); txt(g, `D→ ${av.direct}  ${d.nav.dis == null ? '' : fin(d.nav.dis).toFixed(1) + ' NM'}`, x0 + 30, yy, 14, C.magenta, 'left'); }
    // the editor: the cursor row outlined, and the pick + key guide along the bottom
    if (av.fplEdit) {
      const cy2 = y0 + 96 + clamp(av.fplCursor, 0, ids.length - 1) * 30;
      box(g, x0 + 10, cy2 - 13, w - 20, 26, null, C.cyan, 1.5);
      const cat = fplCatalog();
      txt(g, `編集：FMS＝カーソル移動 · D→キー＝挿入先 [ ${cat[av.fplPick] || ''} ] · ENT＝挿入 · CLR＝削除`, x0 + w / 2, y0 + h - 30, 11, C.cyan, 'center', 600, jp);
    } else if (av.proc) txt(g, `PROC：${av.proc.name}${av.proc.missed ? ' — MISSED APPROACH（LAB-D で保持）' : ' ロード済み'}`, x0 + w / 2, y0 + h - 30, 11, C.magenta, 'center', 700, jp);
    else txt(g, '飛行計画は教材用の架空訓練点です。実際の飛行計画には使えません。', x0 + w / 2, y0 + h - 30, 11, C.grey, 'center', 500, jp);
  }
  // per-cylinder data, however the systems model hands it over: [{ egt: [], cht: [] } | [{egt, cht}, …], …]
  function normCyl(cyl) {
    if (!Array.isArray(cyl)) return null;
    const out = [];
    for (const e of cyl) {
      if (Array.isArray(e)) out.push(e.map(c => ({ egt: fin(c && (c.egt != null ? c.egt : c.e)), cht: fin(c && (c.cht != null ? c.cht : c.c)) })));
      else if (e && Array.isArray(e.egt)) out.push(e.egt.map((v, i) => ({ egt: fin(v), cht: fin(e.cht && e.cht[i]) })));
    }
    return out.length && out.every(e => e.length) ? out : null;
  }
  function drawEnginePage(g, x0, y0, w, h, d) {
    const o = d.o, av = d.av;
    g.fillStyle = '#05070a'; g.fillRect(x0, y0, w, h);
    txt(g, 'ENGINE — エンジン', x0 + w / 2, y0 + 44, 14, C.white, 'center', 700, jp);
    // the systems model publishes o.cyls per engine (o.cyl is engine 1's flat array): prefer the former
    const cylIn = Array.isArray(o.cyls) && o.cyls.length ? o.cyls
      : Array.isArray(o.cyl) && o.cyl.length ? (Array.isArray(o.cyl[0]) || (o.cyl[0] && Array.isArray(o.cyl[0].egt)) ? o.cyl : [o.cyl]) : null;
    const cyl = normCyl(cylIn), engs = d.eng && d.eng.length ? d.eng : [{ run: true, rpm: o.rpm }];
    if (cyl) {
      // bar graphs per cylinder: EGT (cyan) with the leaned peak marked, CHT (green → amber → red)
      av._egtPeak = av._egtPeak || [];
      cyl.forEach((eng, ei) => {
        const yy = y0 + 78 + ei * 150, hot = Math.max(...eng.map(c => c.egt));
        if (engs[ei] && engs[ei].run) av._egtPeak[ei] = Math.max(av._egtPeak[ei] || 0, hot);
        const peak = av._egtPeak[ei] || hot, bw = (w - 150) / Math.max(4, eng.length);
        txt(g, engs.length > 1 ? (ei ? 'RIGHT' : 'LEFT') : 'ENGINE', x0 + 26, yy, 12, C.grey, 'left', 700);
        eng.forEach((c, ci) => {
          const bx = x0 + 60 + ci * bw;
          box(g, bx, yy + 8, bw * 0.36, 64, '#1b222b', null); g.fillStyle = C.cyan; g.fillRect(bx, yy + 8 + 64 * (1 - clamp(c.egt / 1800, 0, 1)), bw * 0.36, 64 * clamp(c.egt / 1800, 0, 1));
          box(g, bx + bw * 0.45, yy + 8, bw * 0.36, 64, '#1b222b', null); g.fillStyle = c.cht > 450 ? C.red : c.cht > 400 ? C.yellow : C.green; g.fillRect(bx + bw * 0.45, yy + 8 + 64 * (1 - clamp(c.cht / 500, 0, 1)), bw * 0.36, 64 * clamp(c.cht / 500, 0, 1));
          txt(g, `${ci + 1}`, bx + bw * 0.4, yy + 84, 11, C.grey);
        });
        // the peak tick on the hottest cylinder's EGT bar: lean until the needle falls this far from it
        const hi = eng.findIndex(c => c.egt === hot), hx = x0 + 60 + hi * bw, hy = yy + 8 + 64 * (1 - clamp(peak / 1800, 0, 1));
        line(g, hx - 3, hy, hx + bw * 0.36 + 3, hy, C.white, 2);
        txt(g, `EGT 最熱 ${Math.round(hot)} °F · PEAK ${Math.round(peak)} · ${Math.round(hot - peak)} °F`, x0 + 26, yy + 106, 12, C.cyan, 'left');
        txt(g, `CHT 最熱 ${Math.round(Math.max(...eng.map(c => c.cht)))} °F`, x0 + w * 0.55, yy + 106, 12, C.green, 'left');
      });
      txt(g, '左の棒：EGT（水色）／右の棒：CHT。PEAK は運転中に記録した最熱 EGT（リーン補助）。', x0 + w / 2, y0 + h - 30, 10, C.grey, 'center', 500, jp);
    } else {
      // no per-cylinder model (yet): the honest per-engine numbers, and '—' where there are none
      const egts = o.egts && o.egts.length ? o.egts : [o.egt || 0], manIns = o.manIns && o.manIns.length ? o.manIns : [o.manIn || 0];
      const rows = [
        ['RPM', engs.map(e => `${Math.round(fin(e.rpm))}`).join(' / ')],
        ['EGT °F', egts.map(v => `${Math.round(fin(v))}`).join(' / ')],
        ...(engs.length > 1 ? [['MAN IN', manIns.map(v => fin(v).toFixed(1)).join(' / ')]] : []),
        ['OIL PSI', (o.oilP || []).length ? (o.oilP || []).map(v => `${Math.round(fin(v))}`).join(' / ') : '—'],
        ['OIL °F', (o.oilT || []).length ? (o.oilT || []).map(v => `${Math.round(fin(v))}`).join(' / ') : '—'],
        ['FFLOW GPH', fin(o.fuelFlow).toFixed(1)],
        ['FUEL PRESS', o.fuelPress == null ? '—' : `${Math.round(fin(o.fuelPress) * 100)} %（定格比）`],
        ['CHT', '— （気筒別の温度モデルなし）'],
      ];
      rows.forEach(([lab, val], i) => { const yy = y0 + 84 + i * 34; txt(g, lab, x0 + 30, yy, 13, C.grey, 'left', 600, jp); txt(g, val, x0 + w - 30, yy, 15, val.startsWith('—') ? C.grey : C.white, 'right', 700, jp); });
    }
  }
  function drawSystemPage(g, x0, y0, w, h, d) {
    const o = d.o, av = d.av;
    g.fillStyle = '#05070a'; g.fillRect(x0, y0, w, h);
    txt(g, 'SYSTEM — 電気・燃料', x0 + w / 2, y0 + 44, 14, C.white, 'center', 700, jp);
    const amps = fin(o.amps, 0);
    const bus = o.elecState || (o.volts == null ? '—' : amps > 0.5 ? 'オルタネーター充電中' : amps < -0.5 ? 'バッテリーのみ（放電中）' : '均衡');
    const fuel = o.fuel || [], tot = fuel.reduce((a, v) => a + fin(v), 0), cap = (d.fuelCap || 24) * Math.max(1, fuel.length);
    if (tot > 0 && av._fuelInit == null) av._fuelInit = tot;               // (the totalizer latches its start)
    const used = av._fuelInit != null ? Math.max(0, av._fuelInit - tot) : 0;
    const ff = fin(o.fuelFlow), endH = ff > 0.2 ? tot / ff : null;
    const rows = [
      ['VOLTS', o.volts == null ? '—' : fin(o.volts).toFixed(1), o.volts != null && fin(o.volts) < 12.2 ? C.yellow : C.white],
      ['AMPS', o.amps == null ? '—' : `${amps > 0 ? '+' : ''}${Math.round(amps)}`, amps < 0 ? C.yellow : C.white],
      ['BUS', bus, C.white],
      ['FUEL TOTAL', `${tot.toFixed(1)} GAL`, C.white],
      ['FUEL USED', av._fuelInit == null ? '—' : `${used.toFixed(1)} GAL`, C.white],
      ['ENDURANCE', endH == null ? '--:--' : eteFmt(endH * 3600), C.white],
      ['XPDR', av.xpdr ? `${String(av.xpdr.code).padStart(4, '0')} ${xpdrEffMode(av, o.onGround)}` : '—', C.green],
      ...(o.hobbs != null ? [['HOBBS', fin(o.hobbs).toFixed(1), C.white]] : []),
    ];
    rows.forEach(([lab, val, col], i) => { const yy = y0 + 84 + i * 32; txt(g, lab, x0 + 30, yy, 13, C.grey, 'left', 600, jp); txt(g, val, x0 + w - 30, yy, 15, col, 'right', 700, jp); });
    // the tanks as bars under the numbers
    fuel.forEach((v, i) => { const yy = y0 + 84 + rows.length * 32 + 12 + i * 30;
      txt(g, i ? 'FUEL R' : 'FUEL L', x0 + 30, yy, 12, C.grey, 'left', 600, jp);
      box(g, x0 + 110, yy - 7, w - 170, 12, '#1b222b', null); g.fillStyle = fin(v) < 3 ? C.yellow : C.green; g.fillRect(x0 + 110, yy - 7, (w - 170) * clamp(fin(v) / (cap / Math.max(1, fuel.length)), 0, 1), 12);
      txt(g, `${fin(v).toFixed(1)}`, x0 + w - 30, yy, 13, C.white, 'right', 700); });
  }
  function drawNrstPage(g, x0, y0, w, h, d) {
    const av = d.av, pos = d.pos;
    g.fillStyle = '#05070a'; g.fillRect(x0, y0, w, h);
    txt(g, 'NEAREST — 最寄りの訓練点', x0 + w / 2, y0 + 44, 14, C.white, 'center', 700, jp);
    const cols = [x0 + 30, x0 + w * 0.5, x0 + w * 0.68, x0 + w * 0.86];
    ['WPT', 'BRG', 'DIS', 'ETE'].forEach((c, i) => txt(g, c, cols[i], y0 + 70, 12, C.grey, i ? 'center' : 'left'));
    const list = nrstList(av, pos, d.varW), sel = clamp(av.nrstSel || 0, 0, list.length - 1);
    list.forEach((p, i) => {
      const yy = y0 + 96 + i * 30;
      if (i === sel) box(g, x0 + 10, yy - 13, w - 20, 26, '#0d2a3a', C.cyan);
      txt(g, p.id, cols[0], yy, 14, i === sel ? C.cyan : C.white, 'left', 700);
      txt(g, p.brg == null ? '---' : hdgFmt(p.brg) + '°', cols[1], yy, 14);
      txt(g, p.dis == null ? '--.-' : p.dis.toFixed(1), cols[2], yy, 14);
      txt(g, p.dis == null ? '--:--' : eteFmt(eteSec(p.dis, d.o.gs)), cols[3], yy, 14);
    });
    txt(g, 'FMS＝カーソル · ENT＝その点へ DIRECT', x0 + w / 2, y0 + h - 30, 11, C.cyan, 'center', 600, jp);
  }

  FL.avionics = { trueToMag, magToTrue, hdgDiff, hdgFmt, wrap360, wrap180, indicatedAlt, inhgToHpa, hpaToInhg, FT_PER_INHG, tune, fmtCom, fmtNav, validCom,
    COM_MIN, COM_MAX, COM_STEP, ORIGIN, neToLatLon, latLonToNe, gcDistNm, gcBearing, neDistNm, neBearing, xtkNm, atkToGoNm, eteSec, eteFmt,
    cdiGps, cdiVor, cdiLoc, gsDots, WAYPOINTS, wpt, NAVAIDS, createAvionics, control, cdiName, navSolve, RANGES, drawPFD, drawMFD, COLORS: C,
    collectAlerts, xpdrEffMode, nrstList, fplCatalog };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
