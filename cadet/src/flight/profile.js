// CADET — flight/profile.js : the debrief's profile graphs (game-quality wave, item 5). The recorder
// keeps every flight at 10 Hz and the logbook already exports it (recorder.js toCSV / toGPX); what the
// debrief could not do was SHOW the flight — the shape of the altitude and the speed over time, and
// the last landing's final minute against the ground. This module turns a recording (and its landing
// analysis, flight/analysis.js) into plain series and into pixel geometry for a canvas; the drawing
// itself is a few strokes in the logbook (ui/day-hud.js). Pure logic: samples in, numbers out.
import { altFtOf, aglFtOf } from './analysis.js';

const r1 = v => Math.round(v * 10) / 10;

// the whole flight as two series (altitude ft MSL, IAS kt), thinned evenly to at most maxPts points
// so a long cross-country draws as cheaply as a circuit; t is seconds from the first sample
export function seriesOf(rec, maxPts = 240) {
  const xs = (rec && rec.samples) || [];
  if (!xs.length) return null;
  const t0 = xs[0].t, step = Math.max(1, Math.ceil(xs.length / Math.max(2, maxPts)));
  const t = [], alt = [], ias = [];
  for (let i = 0; i < xs.length; i += step) { const x = xs[i]; t.push(r1(x.t - t0)); alt.push(Math.round(altFtOf(x))); ias.push(r1(x.ias || 0)); }
  const lastX = xs[xs.length - 1];
  if (t[t.length - 1] !== r1(lastX.t - t0)) { t.push(r1(lastX.t - t0)); alt.push(Math.round(altFtOf(lastX))); ias.push(r1(lastX.ias || 0)); }
  return { t, alt, ias, dur: r1(lastX.t - t0) };
}

// the last landing's profile: from 30 s before the touchdown to 5 s after it — height AGL and IAS
// against seconds-to-touchdown, with the 500 ft gate's moment kept when the analysis found one.
// td is the analysis' landing ({ t, i, ... }); rec.samples[i] is the touchdown sample itself.
export function touchdownOf(rec, a) {
  const xs = (rec && rec.samples) || [];
  const td = a && a.landings && a.landings.length ? a.landings[a.landings.length - 1] : null;
  if (!xs.length || !td || td.i == null) return null;
  const lo = Math.max(0, td.i - 300), hi = Math.min(xs.length - 1, td.i + 50);   // 10 Hz samples: −30 s … +5 s
  const dt = [], agl = [], ias = [];
  for (let i = lo; i <= hi; i++) { const x = xs[i]; dt.push(r1(x.t - td.t)); agl.push(Math.round(aglFtOf(x))); ias.push(r1(x.ias || 0)); }
  return { dt, agl, ias, tdAt: r1(0), gateDt: td.gate ? r1(td.gate.t - td.t) : null, sinkFpm: td.sinkFpm, along: td.along, floatM: td.floatM };
}

// scale a series into a w×h box (with padding): returns the polyline as [x, y] pixel pairs and the
// value range used, so the caller can label the axes. A flat series still gets a sane range.
export function scaleLine(vals, w, h, pad = 4, range = null) {
  if (!vals || !vals.length) return { pts: [], min: 0, max: 0 };
  let min = range ? range[0] : Math.min(...vals), max = range ? range[1] : Math.max(...vals);
  if (!(max > min)) { max = min + 1; }
  const iw = Math.max(1, w - pad * 2), ih = Math.max(1, h - pad * 2);
  const pts = vals.map((v, i) => [pad + (vals.length === 1 ? iw / 2 : i / (vals.length - 1) * iw), pad + ih - (v - min) / (max - min) * ih]);
  return { pts, min, max };
}

// the geometry of one graph panel: two series sharing the x axis (the sample index stands in for
// time — the series are evenly thinned / evenly sampled), each scaled on its own range
export function panelGeometry(a, b, w, h) {
  return { a: scaleLine(a, w, h), b: scaleLine(b, w, h) };
}
