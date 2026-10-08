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
  // dots: + = needle RIGHT (the course is to the right of the aircraft: fly right). 5 dots full scale.
  // GPS: from the cross-track distance and the full-scale distance (nm)
  const cdiGps = (xtk, fullScaleNm = 1.0) => clamp(-xtk / fullScaleNm * 5, -5, 5);
  // VOR: from the radial the aircraft is on and the selected course (OBS); ±10° full scale; TO / FROM
  function cdiVor(radial, obs) {
    const off = wrap180(radial - obs), from = Math.abs(off) < 90;
    const devDeg = from ? wrap180(obs - radial) : wrap180(radial - obs - 180);
    return { dots: clamp(devDeg / 2, -5, 5), toFrom: from ? 'FROM' : 'TO', devDeg };
  }
  // localizer: ±2.5° full scale; glide slope: ±0.7° full scale (+ = the path is above: fly up)
  function cdiLoc(angleOffDeg) { return clamp(-angleOffDeg / 0.5, -5, 5); }
  const gsDots = (aboveDeg) => clamp(-aboveDeg / 0.14, -2.5, 2.5);

  // ---------------------------------------------------------------- fictional training points (架空訓練点)
  // Positions on the local plane (metres from the display origin). NOT real fixes, NOT for navigation.
  const WAYPOINTS = [
    { id: 'LABRW', name: 'LAB RWY 36（架空）', n: -1200, e: -40000, kind: 'apt' },
    { id: 'LABEA', name: 'LAB-A（架空）', n: 9000, e: -34000, kind: 'wpt' },
    { id: 'LABEB', name: 'LAB-B（架空）', n: 15000, e: -21000, kind: 'wpt' },
    { id: 'LABEC', name: 'LAB-C（架空）', n: -6000, e: -24000, kind: 'wpt' },
    { id: 'LABED', name: 'LAB-D（架空）', n: -16000, e: -38000, kind: 'wpt' },
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
      pfdMenu: 'TOP',             // the PFD's softkey level: TOP / PFD / ALTUNIT
      wind: true, mfdPage: 'MAP', mfdRangeIdx: 4, mapNorthUp: true,
      fpl: { wps: ['LABRW', 'LABEA', 'LABEB'], active: 1 },
      direct: null,               // D→ target id (overrides the flight plan leg)
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
      case 'MFD_PAGE': av.mfdPage = av.mfdPage === 'MAP' ? 'FPL' : 'MAP'; return `MFD ${av.mfdPage}`;
      case 'MFD_MAP': av.mfdPage = 'MAP'; return 'MFD MAP';
      case 'MFD_FPL': av.mfdPage = 'FPL'; return 'MFD FPL';
      case 'RANGE': av.mfdRangeIdx = clamp(av.mfdRangeIdx + dir, 0, RANGES.length - 1); return `RANGE ${RANGES[av.mfdRangeIdx]} NM`;
      case 'NORTH_UP': av.mapNorthUp = !av.mapNorthUp; return av.mapNorthUp ? 'MAP NORTH UP' : 'MAP TRACK UP';
      case 'PFD_MENU': av.pfdMenu = dir; return `PFD ${dir}`;
      case 'WIND': av.wind = !av.wind; return `WIND ${av.wind ? 'ON' : 'OFF'}`;
      case 'DIRECT': av.direct = dir || null; return dir ? `D→ ${dir}` : 'D→ 解除';
      case 'FPL_NEXT': av.fpl.active = clamp(av.fpl.active + dir, 1, av.fpl.wps.length - 1); av.direct = null; return `ACTIVE LEG → ${av.fpl.wps[av.fpl.active]}`;
      default: return '';
    }
  }
  function cdiName(av) {
    if (av.cdi === 'GPS') return 'GPS';
    const r = av[av.cdi.toLowerCase()], aid = NAVAIDS.find(x => x.freq === r.act);
    return (aid && aid.type === 'LOC' ? 'LOC' : 'VOR') + av.cdi.slice(3);
  }

  // ---------------------------------------------------------------- navigation solution for the displays
  // pos: { n, e } (metres), o: the physics outputs (gs, trk, hdgTrue, altTrue), magvar W
  function navSolve(av, pos, o, varW, rwy) {
    const out = { src: cdiName(av), dots: 0, toFrom: '', dtk: null, dis: null, ete: null, xtk: null, gsDots: null, brg: null, from: '', to: '', flag: '', crs: av.crs };
    // the GPS leg: direct-to, or the flight plan's active leg
    let A = null, B = null;
    if (av.direct) { B = wpt(av.direct); A = av.directFrom || { n: pos.n, e: pos.e, id: 'P.POS' }; }
    else { const w = av.fpl.wps; B = wpt(w[av.fpl.active]); A = wpt(w[av.fpl.active - 1]); }
    if (A && B) {
      out.from = A.id || ''; out.to = B.id; out.dtk = trueToMag(neBearing(A, B), varW);
      out.dis = neDistNm(pos, B); out.ete = eteSec(out.dis, o.gs); out.xtk = xtkNm(A, B, pos); out.brg = trueToMag(neBearing(pos, B), varW);
    }
    if (av.cdi === 'GPS') {
      out.crs = out.dtk ?? av.crs;
      out.dots = out.xtk != null ? cdiGps(out.xtk, 1.0) : 0; out.toFrom = 'TO'; out.flag = B ? '' : 'NO LEG';
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
    // --- the aircraft symbol ---
    poly(g, [[cx - 70, cy], [cx - 28, cy], [cx - 22, cy + 8], [cx - 70, cy + 8]], C.yellow, '#000');
    poly(g, [[cx + 70, cy], [cx + 28, cy], [cx + 22, cy + 8], [cx + 70, cy + 8]], C.yellow, '#000');
    poly(g, [[cx, cy], [cx - 26, cy + 18], [cx, cy + 10], [cx + 26, cy + 18]], C.yellow, '#000');
    // --- the airspeed tape (left), teaching V-speed bands ---
    const V = FL.physics ? FL.physics.TRAINER.V : { s0: 48, s1: 53, fe: 102, no: 125, ne: 154, r: 55, x: 64, y: 76, glide: 76 };
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
    for (const [lab, k] of [['R', V.r], ['X', V.x], ['Y', V.y], ['G', V.glide]]) { const y = yOf(k); if (y > ty0 && y < ty0 + th) { box(g, tx + tw + 2, y - 8, 18, 16, '#000', C.cyan, 1); txt(g, lab, tx + tw + 11, y, 12, C.cyan); } }
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
    txt(g, Math.round(altInd), ax + aw * 0.55, cy, 20, C.white, 'center', 700);
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
      const dx = clamp(fin(nav.dots), -2.5, 2.5) * hr * 0.17 * (5 / 5);
      line(g, dx, -hr * 0.38, dx, hr * 0.38, ccol, 4);
      if (nav.toFrom) { const s = nav.toFrom === 'TO' ? -1 : 1; poly(g, [[hr * 0.3, s * hr * 0.15], [hr * 0.24, s * hr * 0.06], [hr * 0.36, s * hr * 0.06]], C.white); }
    }
    g.restore();
    // track (magenta diamond on the rose)
    g.save(); g.rotate(trkMag * DEG); poly(g, [[0, -hr + 2], [-5, -hr + 9], [0, -hr + 16], [5, -hr + 9]], C.magenta); g.restore();
    g.restore();
    poly(g, [[hx, hy - hr + 4], [hx - 7, hy - hr - 8], [hx + 7, hy - hr - 8]], C.white);   // lubber line
    // aircraft symbol in the middle of the HSI
    line(g, hx, hy - 16, hx, hy + 14, C.white, 2.5); line(g, hx - 14, hy - 4, hx + 14, hy - 4, C.white, 2.5); line(g, hx - 6, hy + 12, hx + 6, hy + 12, C.white, 2);
    box(g, hx - 26, hy - hr - 34, 52, 22, '#000', C.white); txt(g, hdgFmt(hdgMag) + '°', hx, hy - hr - 23, 16, C.white, 'center', 700);
    // HDG / CRS readouts, nav source
    box(g, hx - hr - 92, hy - hr - 10, 86, 22, '#000', C.line); txt(g, `HDG ${hdgFmt(av.hdgBug)}°`, hx - hr - 49, hy - hr + 1, 14, C.cyan);
    box(g, hx + hr + 6, hy - hr - 10, 86, 22, '#000', C.line); txt(g, `CRS ${hdgFmt(fin(nav.crs, av.crs))}°`, hx + hr + 49, hy - hr + 1, 14, av.cdi === 'GPS' ? C.magenta : C.green);
    txt(g, nav.src, hx - hr * 0.55, hy - hr * 0.3, 14, ccol);
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
    txt(g, `${Math.round(altInd / 10) * 10}`, sx + 96, sy + 72, 14); txt(g, 'FT', sx + 96, sy + 86, 9, C.grey);
    // --- the engine status (this teaching layout shows it on the PFD too) ---
    const run = d.engine && d.engine.running;
    box(g, 8, 32, 128, 40, '#05070a', run ? C.line : C.red);
    txt(g, run ? 'ENG RUN' : 'ENG STOP', 14, 44, 13, run ? C.green : C.red, 'left', 700);
    txt(g, `${Math.round(fin(o.rpm))} RPM`, 14, 62, 13, C.white, 'left');
    // --- alerts ---
    if (o.stallWarn) { box(g, cx - 60, cy + 70, 120, 26, C.red, null); txt(g, 'STALL', cx, cy + 83, 18, '#fff', 'center', 800); }
    if (!run && !o.onGround) { box(g, cx - 90, cy + 100, 180, 22, '#3a0d0d', C.red); txt(g, 'ENGINE STOP — 滑空', cx, cy + 111, 13, C.red, 'center', 700, jp); }
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
    const rx = ew / 2, ry = 70, rr = ew * 0.34, rpm = clamp(fin(o.rpm), 0, 2800);
    g.lineWidth = 7;
    const arc = (a, b, col) => { g.strokeStyle = col; g.beginPath(); g.arc(rx, ry, rr, (210 - 240 * a / 2800) * -DEG, (210 - 240 * b / 2800) * -DEG, true); g.stroke(); };
    arc(500, 2700, C.green); arc(2700, 2800, C.red);
    const ta = (210 - 240 * rpm / 2800) * -DEG; line(g, rx, ry, rx + Math.cos(ta) * (rr - 4), ry + Math.sin(ta) * (rr - 4), C.white, 3);
    txt(g, Math.round(rpm), rx, ry + 22, 16, C.white, 'center', 700); txt(g, 'RPM', rx, ry + 38, 11, C.grey);
    const rows = [
      ['出力 PWR', d.engine.running ? `${fin(o.powerPct)} %` : '0 %', d.engine.running ? fin(o.powerPct) / 100 : 0, '教材モデルの出力'],
      ['FFLOW GPH', fin(o.fuelFlow).toFixed(1), fin(o.fuelFlow) / 12, ''],
      ['OIL PSI', '—', null, '未実装'],
      ['OIL °F', '—', null, '未実装'],
      ['EGT °F', '—', null, '未実装'],
      ['FUEL L GAL', fin(o.fuel && o.fuel[0]).toFixed(1), fin(o.fuel && o.fuel[0]) / 24, ''],
      ['FUEL R GAL', fin(o.fuel && o.fuel[1]).toFixed(1), fin(o.fuel && o.fuel[1]) / 24, ''],
      ['VOLTS', '—', null, '未実装'],
      ['AMPS', '—', null, '未実装'],
    ];
    let y = 130;
    for (const [lab, val, frac, note] of rows) {
      txt(g, lab, 8, y, 11, C.grey, 'left', 600, jp); txt(g, val, ew - 8, y, 13, val === '—' ? C.grey : C.white, 'right', 700);
      if (frac != null) { box(g, 8, y + 9, ew - 16, 6, '#1b222b', null); g.fillStyle = C.green; g.fillRect(8, y + 9, (ew - 16) * clamp(frac, 0, 1), 6); }
      else txt(g, note, ew - 8, y + 13, 9, C.grey, 'right', 500, jp);
      y += 38;
    }
    txt(g, '— = 未実装（架空値は出しません）', ew / 2, H - 12, 9, C.grey, 'center', 500, jp);
    // --- the page area ---
    const px = ew, pw = W - ew;
    if (av.mfdPage === 'FPL') drawFPL(g, px, 0, pw, H, d); else drawMap(g, px, 0, pw, H, d);
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
    txt(g, '飛行計画は教材用の架空訓練点です。実際の飛行計画には使えません。', x0 + w / 2, y0 + h - 30, 11, C.grey, 'center', 500, jp);
  }

  FL.avionics = { trueToMag, magToTrue, hdgDiff, hdgFmt, wrap360, wrap180, indicatedAlt, inhgToHpa, hpaToInhg, FT_PER_INHG, tune, fmtCom, fmtNav, validCom,
    COM_MIN, COM_MAX, COM_STEP, ORIGIN, neToLatLon, latLonToNe, gcDistNm, gcBearing, neDistNm, neBearing, xtkNm, atkToGoNm, eteSec, eteFmt,
    cdiGps, cdiVor, cdiLoc, gsDots, WAYPOINTS, wpt, NAVAIDS, createAvionics, control, cdiName, navSolve, RANGES, drawPFD, drawMFD, COLORS: C };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
