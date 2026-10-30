// CADET — flight/recorder.js : the flight recorder (audit v2 §4, item 2-2). While a flight runs it keeps a
// state snapshot ten times a second — where the aircraft is (Sorajima NE + height), its quaternion, its
// speeds, the control surfaces, the gear and flaps, the engines — a few hundred KB for a whole lesson. The
// debrief can then play the flight back ("watch the landing again") with the cockpit, chase and fixed
// cameras, and the same samples are what the logbook exports as CSV / GPX (item 4-6). Pure logic: the
// caller hands it the bridge's state each frame; playback interpolates between the snapshots.
// The samples are plain data (no three.js, no physics), so a recording can be stored, tested and exported.

export const REC_HZ = 10;                       // snapshots per second
const DT = 1 / REC_HZ;

const q4 = (q) => (Array.isArray(q) && q.length >= 4 ? q : [0, 0, 0, 1]);

// one snapshot of the bridge state (flight.s / flight.s.out), taken defensively: anything missing is 0
export function snapshot(s, t) {
  const o = s && s.out ? s.out : {};
  const e0 = s && s.eng && s.eng[0] ? s.eng[0] : {};
  const q = q4(s && s.q);
  return {
    t: +t || 0,
    n: s ? +s.n || 0 : 0, e: s ? +s.e || 0 : 0, h: s && s.pos ? +s.pos.y || 0 : 0,
    q: [+q[0], +q[1], +q[2], +q[3]],
    ias: o.ias || 0, gs: o.gs || 0, vs: o.vs || 0, alt: o.alt || 0,
    pIn: s ? s.pIn || 0 : 0, rIn: s ? s.rIn || 0 : 0, rud: s ? s.rud || 0 : 0,
    thr: s ? (e0.thr != null ? e0.thr : s.thr || 0) : 0,
    gear: s ? (s.gearPos == null ? 1 : s.gearPos) : 1, flap: s && s.flaps ? s.flaps.deg || 0 : 0,
    onGround: !!(s && s.onGround),
    rpm: e0.rpm || 0, failed: !!(e0.failed),
  };
}

// the recorder: start(meta) begins a flight, push(s, t) keeps a snapshot when its time has come (call it
// every frame; it thins to REC_HZ itself), done() closes it. last() is the most recent finished recording
export function createRecorder() {
  let cur = null;                               // { meta, samples: [] }
  let lastRec = null;
  return {
    start(meta = {}) {
      cur = { meta: { ...meta }, samples: [] };
      return cur;
    },
    push(s, t) {
      if (!cur || !s) return;
      const last = cur.samples[cur.samples.length - 1];
      if (last && t - last.t < DT - 1e-9) return;
      cur.samples.push(snapshot(s, t));
    },
    // a forced snapshot (the touchdown, the crash): kept even inside the thinning interval
    mark(s, t) { if (cur && s) cur.samples.push(snapshot(s, t)); },
    done() { const r = cur; cur = null; if (r && r.samples.length) lastRec = r; return r; },
    recording() { return !!cur; },
    current() { return cur; },
    last() { return lastRec; },
    clear() { lastRec = null; },
  };
}

// the pose at time t: linear in position / speeds / surfaces, slerp in attitude. Returns a fresh object
// shaped like a snapshot (null when the recording has nothing)
export function sampleAt(rec, t) {
  const xs = rec && rec.samples;
  if (!xs || !xs.length) return null;
  if (t <= xs[0].t) return { ...xs[0], q: [...xs[0].q] };
  const lastX = xs[xs.length - 1];
  if (t >= lastX.t) return { ...lastX, q: [...lastX.q] };
  let lo = 0, hi = xs.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid].t <= t) lo = mid; else hi = mid; }
  const a = xs[lo], b = xs[hi], span = Math.max(1e-9, b.t - a.t), f = (t - a.t) / span;
  const mix = (k) => a[k] + (b[k] - a[k]) * f;
  // quaternion slerp (shortest path)
  let [ax, ay, az, aw] = a.q; const [bx, by, bz, bw] = b.q;
  let dot = ax * bx + ay * by + az * bz + aw * bw, s0, s1;
  if (dot < 0) { dot = -dot; s1 = -1; } else s1 = 1;
  if (dot > 0.9995) { s0 = 1 - f; s1 = s1 * f; }
  else { const th = Math.acos(Math.min(1, dot)), sn = Math.sin(th); s0 = Math.sin((1 - f) * th) / sn; s1 = s1 * Math.sin(f * th) / sn; }
  return {
    t, n: mix('n'), e: mix('e'), h: mix('h'),
    q: [ax * s0 + bx * s1, ay * s0 + by * s1, az * s0 + bz * s1, aw * s0 + bw * s1],
    ias: mix('ias'), gs: mix('gs'), vs: mix('vs'), alt: mix('alt'),
    pIn: mix('pIn'), rIn: mix('rIn'), rud: mix('rud'), thr: mix('thr'),
    gear: mix('gear'), flap: mix('flap'), onGround: f < 0.5 ? a.onGround : b.onGround,
    rpm: mix('rpm'), failed: a.failed || b.failed,
  };
}

export function duration(rec) {
  const xs = rec && rec.samples;
  return xs && xs.length ? xs[xs.length - 1].t - xs[0].t : 0;
}

// position at t as a { n, e, y } in the Sorajima frame (the same the map and the poses use)
export function poseAt(rec, t) {
  const x = sampleAt(rec, t);
  return x ? { n: x.n, e: x.e, y: x.h, q: x.q, x } : null;
}

// ------------------------------------------------------------------ exports (item 4-6)
// the flight as a spreadsheet: one row per snapshot
export function toCSV(rec) {
  const head = 't_s,north_m,east_m,height_m,ias_kt,gs_kt,vs_fpm,alt_ft,pitch_in,roll_in,rudder,thr,gear,flap_deg,on_ground,rpm';
  const rows = (rec.samples || []).map(x => [x.t.toFixed(1), x.n.toFixed(1), x.e.toFixed(1), x.h.toFixed(1),
    x.ias.toFixed(1), x.gs.toFixed(1), Math.round(x.vs), Math.round(x.alt), x.pIn.toFixed(3), x.rIn.toFixed(3),
    x.rud.toFixed(3), x.thr.toFixed(3), x.gear.toFixed(2), Math.round(x.flap), x.onGround ? 1 : 0, Math.round(x.rpm)].join(','));
  return [head, ...rows].join('\n') + '\n';
}

// the flight as a GPX track: the layout turns Sorajima NE metres into lat/lon around the airfield's origin
// (toLatLon(ne) → [lat, lon]); the wall-clock start comes from meta.startISO when the caller kept one
export function toGPX(rec, toLatLon) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const t0 = rec.meta && rec.meta.startISO ? Date.parse(rec.meta.startISO) : NaN;
  const pts = (rec.samples || []).map(x => {
    const [lat, lon] = toLatLon([x.n, x.e]);
    const when = Number.isFinite(t0) ? `<time>${new Date(t0 + x.t * 1000).toISOString()}</time>` : '';
    return `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${x.h.toFixed(1)}</ele>${when}</trkpt>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="CADET" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${esc(rec.meta && rec.meta.title || 'CADET flight')}</name></metadata>\n  <trk><name>${esc(rec.meta && rec.meta.title || 'CADET flight')}</name><trkseg>\n${pts}\n  </trkseg></trk>\n</gpx>\n`;
}
